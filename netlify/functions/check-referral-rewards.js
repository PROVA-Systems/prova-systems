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
 * MEGA²⁷.7 Block 2: Berechne Werber-Stats fuer Reward-Email.
 */
async function calculateReferrerStats(sb, referrerUserId) {
  const stats = { total_sent: 0, total_rewarded: 0, total_active_count: 0 };
  if (!sb || !referrerUserId) return stats;
  try {
    const { data } = await sb.from('referrals')
      .select('status')
      .eq('referrer_user_id', referrerUserId);
    if (!data) return stats;
    data.forEach(row => {
      if (row.status !== 'expired' && row.status !== 'cancelled') stats.total_sent++;
      if (row.status === 'rewarded') stats.total_rewarded++;
      if (['pending', 'active', 'hold', 'rewarded'].indexOf(row.status) !== -1) stats.total_active_count++;
    });
  } catch (_) { /* graceful */ }
  return stats;
}

/**
 * MEGA²⁷.7 Block 2: Send HTML-Reward-Email an Werber via referral-reward.html Template.
 * Fire-and-forget — Failure blockt Cron-Flow nicht.
 */
async function sendRewardEmail(sb, referral, stats) {
  if (!referral || !referral.referrer_email) return { ok: false, skipped: 'no_referrer_email' };
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, skipped: 'no_smtp_env' };
  }
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch (e) { return { ok: false, skipped: 'nodemailer_missing' }; }

  // Werber-Name lookup (best-effort)
  let werberName = referral.referrer_email;
  try {
    const { data: u } = await sb.from('users')
      .select('full_name')
      .eq('id', referral.referrer_user_id)
      .maybeSingle();
    if (u && u.full_name) werberName = u.full_name;
  } catch (_) { /* graceful */ }

  // Next-Billing-Date: erste des nächsten Monats (heuristic)
  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingStr = String(nextBilling.getDate()).padStart(2, '0') + '.'
    + String(nextBilling.getMonth() + 1).padStart(2, '0') + '.' + nextBilling.getFullYear();

  const totalSent = (stats && stats.total_sent) || 0;
  const totalRewarded = (stats && stats.total_rewarded) || 0;
  const totalActive = (stats && stats.total_active_count) || 0;

  let html, text;
  try {
    const Renderer = require('../../lib/email-renderer');
    const vars = {
      WERBER_NAME: werberName,
      GEWORBENER_EMAIL: referral.referred_email || '',
      NEXT_BILLING_DATE: nextBillingStr,
      TOTAL_SENT: String(totalSent),
      TOTAL_REWARDED: String(totalRewarded),
      TOTAL_MONTHS_FREE: String(totalRewarded),
      TOTAL_VALUE_EUR: String(totalRewarded * 99),
      REMAINING_OF_12: String(Math.max(0, 12 - totalActive)),
      DASHBOARD_URL: (process.env.REFERRAL_BASE_URL || 'https://prova-systems.de') + '/dashboard.html'
    };
    const rendered = Renderer.renderTemplate('referral-reward', vars);
    html = rendered.html;
    text = rendered.text;
  } catch (e) {
    text = 'Hallo ' + werberName + ',\n\n'
      + 'Deine Empfehlung an ' + (referral.referred_email || 'einen Kollegen') + ' war erfolgreich!\n'
      + 'Du hast 1 Monat PROVA gewonnen (Wert 99 EUR).\n\n'
      + 'Statistik: ' + totalRewarded + ' erfolgreiche Empfehlungen von ' + totalSent + ' versendet.\n\n'
      + 'PROVA-Systems';
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const mailOptions = {
      from: process.env.SMTP_FROM_REFERRAL || 'PROVA Empfehlung <empfehlung@prova-systems.de>',
      to: referral.referrer_email,
      subject: '🎉 Du hast 1 Monat PROVA gewonnen!',
      text: text
    };
    if (html) mailOptions.html = html;
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
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

          // MEGA²⁷.7 Block 2: HTML-Reward-Email senden (fire-and-forget)
          try {
            const stats = await calculateReferrerStats(sb, r.referrer_user_id);
            await sendRewardEmail(sb, r, stats);
          } catch (emailErr) {
            errors.push({ id: r.id, error: emailErr.message, phase: 'reward_email' });
          }
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

exports._test = {
  verifySubscriptionActive, applyRewardToReferrer,
  calculateReferrerStats, sendRewardEmail,
  REWARD_COUPON_ID
};
