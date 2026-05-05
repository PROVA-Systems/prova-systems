/**
 * PROVA — check-referral-rewards.js (MEGA²⁷ Cron)
 *
 * Daily-Cron 02:00 UTC: Findet 'active' referrals älter als 30 Tage,
 * verifiziert Stripe-Sub und vergibt Werber-Reward (Coupon WERBER-MONAT-FREI).
 *
 * GET /.netlify/functions/check-referral-rewards
 *   Auth: Header `X-PROVA-Internal: <PROVA_INTERNAL_WRITE_SECRET>`
 *   (Netlify Cron oder externer Trigger)
 *
 * Logic:
 *   1. Finde alle referrals WHERE status='active' AND reward_eligible_at <= NOW
 *   2. Pro Eintrag:
 *      - Stripe-Customer.subscriptions: noch active, kein Refund?
 *      - Wenn ja: Apply WERBER-MONAT-FREI auf Werber-Sub, status='rewarded'
 *      - Wenn nein: status='cancelled'
 *   3. Finde alle referrals WHERE status='pending' AND expires_at <= NOW
 *      → status='expired'
 *
 * Returns: { processed: { rewarded, cancelled, expired }, errors: [...] }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const REWARD_COUPON_ID = 'WERBER-MONAT-FREI';

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Verifiziert via Stripe ob Sub aktiv UND keine Refunds.
 * Returns: { eligible:bool, reason?:string }
 */
async function verifySubscriptionActive(stripe, customerEmail) {
  try {
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return { eligible: false, reason: 'no_customer' };
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 5 });
    if (subs.data.length === 0) return { eligible: false, reason: 'no_active_sub' };
    // Refund-Check: charges der letzten 35 Tage
    const since = Math.floor((Date.now() - 35 * 24 * 60 * 60 * 1000) / 1000);
    const charges = await stripe.charges.list({ customer: customer.id, created: { gte: since }, limit: 100 });
    const refunded = charges.data.find(c => c.refunded || (c.amount_refunded && c.amount_refunded > 0));
    if (refunded) return { eligible: false, reason: 'refund_detected' };
    return { eligible: true, customerId: customer.id, subId: subs.data[0].id };
  } catch (e) {
    return { eligible: false, reason: 'stripe_error: ' + e.message };
  }
}

/**
 * Apply Reward-Coupon auf Werber-Sub.
 */
async function applyRewardToReferrer(stripe, referrerEmail) {
  try {
    const customers = await stripe.customers.list({ email: referrerEmail, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return { ok: false, error: 'no_referrer_customer' };
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    if (subs.data.length === 0) return { ok: false, error: 'no_referrer_sub' };
    const updated = await stripe.subscriptions.update(subs.data[0].id, {
      coupon: REWARD_COUPON_ID
    });
    return { ok: true, sub_id: updated.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }

  // Auth via Internal-Secret (Cron-Trigger)
  const secret = String(event.headers['x-prova-internal'] || event.headers['X-PROVA-Internal'] || '').trim();
  const expected = String(process.env.PROVA_INTERNAL_WRITE_SECRET || '');
  if (!expected || secret !== expected) {
    return json(event, 403, { error: 'Forbidden' });
  }

  const sb = getSupabase();
  if (!sb) return json(event, 503, { error: 'Supabase not configured' });

  let stripe;
  if (process.env.STRIPE_SECRET_KEY) {
    try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }); }
    catch (e) { return json(event, 500, { error: 'stripe module load failed' }); }
  } else {
    return json(event, 503, { error: 'STRIPE_SECRET_KEY missing' });
  }

  const result = { rewarded: 0, cancelled: 0, expired: 0 };
  const errors = [];

  // 1) Process pending → expired
  try {
    const { data: pendingExpired } = await sb.from('referrals')
      .select('id')
      .eq('status', 'pending')
      .lte('expires_at', new Date().toISOString())
      .limit(100);
    if (pendingExpired && pendingExpired.length > 0) {
      for (const r of pendingExpired) {
        try {
          await sb.from('referrals').update({ status: 'expired' }).eq('id', r.id);
          result.expired++;
        } catch (e) {
          errors.push({ id: r.id, error: e.message, phase: 'expire' });
        }
      }
    }
  } catch (e) {
    errors.push({ error: e.message, phase: 'pending_lookup' });
  }

  // 2) Process active eligible
  try {
    const { data: activeReady } = await sb.from('referrals')
      .select('id, referrer_email, referred_email')
      .eq('status', 'active')
      .lte('reward_eligible_at', new Date().toISOString())
      .limit(100);
    if (activeReady && activeReady.length > 0) {
      for (const r of activeReady) {
        try {
          const verify = await verifySubscriptionActive(stripe, r.referred_email);
          if (!verify.eligible) {
            await sb.from('referrals').update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              fraud_flags: [{ reason: verify.reason, ts: new Date().toISOString() }]
            }).eq('id', r.id);
            result.cancelled++;
            continue;
          }
          const apply = await applyRewardToReferrer(stripe, r.referrer_email);
          if (!apply.ok) {
            errors.push({ id: r.id, error: apply.error, phase: 'apply' });
            continue;
          }
          await sb.from('referrals').update({
            status: 'rewarded',
            reward_given_at: new Date().toISOString(),
            reward_stripe_coupon_id: REWARD_COUPON_ID
          }).eq('id', r.id);
          result.rewarded++;
        } catch (e) {
          errors.push({ id: r.id, error: e.message, phase: 'reward' });
        }
      }
    }
  } catch (e) {
    errors.push({ error: e.message, phase: 'active_lookup' });
  }

  return json(event, 200, { ok: true, processed: result, errors });
}, { functionName: 'check-referral-rewards' });

exports._test = { verifySubscriptionActive, applyRewardToReferrer, REWARD_COUPON_ID };
