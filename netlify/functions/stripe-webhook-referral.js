/**
 * PROVA — stripe-webhook-referral.js (MEGA²⁷)
 *
 * Stripe-Webhook für Referral-Lifecycle:
 *  - customer.subscription.created → status='active' (wenn FRIEND-50 verwendet)
 *  - customer.subscription.deleted → cancellation-check
 *  - charge.refunded → cancellation-check
 *
 * POST /.netlify/functions/stripe-webhook-referral
 *   Headers: Stripe-Signature (verifiziert via STRIPE_REFERRAL_WEBHOOK_SECRET)
 *
 * Idempotent — gleiches Event 2× verarbeiten ist OK (bestehender Status bleibt).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const FRIEND_COUPON_ID = 'FRIEND-50';
const HOLD_DAYS = 30;

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Detect ob Subscription FRIEND-50-Coupon verwendet hat.
 */
function _hasFriendCoupon(subscription) {
  if (!subscription) return false;
  const discount = subscription.discount;
  if (discount && discount.coupon && discount.coupon.id === FRIEND_COUPON_ID) return true;
  // Auch in items[].discounts (neuer Stripe-API)
  if (Array.isArray(subscription.discounts) && subscription.discounts.length > 0) {
    return subscription.discounts.some(d =>
      d && d.coupon && (d.coupon.id === FRIEND_COUPON_ID || d.coupon === FRIEND_COUPON_ID)
    );
  }
  return false;
}

/**
 * Find referrals-Eintrag via referred_email.
 */
async function findReferralByEmail(sb, email) {
  if (!email) return null;
  try {
    const { data } = await sb.from('referrals')
      .select('id, status, referred_email, referrer_email, code')
      .eq('referred_email', String(email).toLowerCase())
      .in('status', ['pending', 'active', 'hold'])
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0] : null;
  } catch (_) {
    return null;
  }
}

async function handleSubscriptionCreated(sb, sub, customer) {
  if (!_hasFriendCoupon(sub)) return { skipped: 'no_friend_coupon' };
  const email = (customer && customer.email) || (sub && sub.metadata && sub.metadata.email);
  if (!email) return { skipped: 'no_email' };

  const ref = await findReferralByEmail(sb, email);
  if (!ref || ref.status !== 'pending') return { skipped: 'no_pending_referral' };

  const now = new Date();
  const rewardEligibleAt = new Date(now.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);

  try {
    await sb.from('referrals').update({
      status: 'active',
      signed_up_at: now.toISOString(),
      subscribed_at: now.toISOString(),
      reward_eligible_at: rewardEligibleAt.toISOString()
    }).eq('id', ref.id);
    return { ok: true, referral_id: ref.id, status: 'active' };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleSubscriptionDeleted(sb, sub, customer) {
  const email = (customer && customer.email) || (sub && sub.metadata && sub.metadata.email);
  if (!email) return { skipped: 'no_email' };
  const ref = await findReferralByEmail(sb, email);
  if (!ref) return { skipped: 'no_referral' };

  // Wenn noch im Hold-Status: Reward-Verlust
  if (ref.status === 'active' || ref.status === 'hold') {
    try {
      await sb.from('referrals').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      }).eq('id', ref.id);
      return { ok: true, referral_id: ref.id, status: 'cancelled' };
    } catch (e) {
      return { error: e.message };
    }
  }
  // Wenn bereits 'rewarded': Reward bleibt (keine Aktion)
  return { skipped: 'already_rewarded_or_other' };
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.STRIPE_REFERRAL_WEBHOOK_SECRET;
  if (!webhookSecret) return json(event, 503, { error: 'Webhook secret not configured' });
  if (!process.env.STRIPE_SECRET_KEY) return json(event, 503, { error: 'Stripe key not configured' });

  let stripe;
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }); }
  catch (e) { return json(event, 500, { error: 'stripe module load failed' }); }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) return json(event, 400, { error: 'Missing Stripe signature' });

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (e) {
    return json(event, 400, { error: 'Invalid signature', detail: e.message });
  }

  const sb = getSupabase();
  if (!sb) return json(event, 503, { error: 'Supabase not configured' });

  let result = { skipped: 'unknown_event_type', event_type: stripeEvent.type };
  try {
    if (stripeEvent.type === 'customer.subscription.created') {
      const sub = stripeEvent.data.object;
      let customer = null;
      try { customer = await stripe.customers.retrieve(sub.customer); } catch (_) {}
      result = await handleSubscriptionCreated(sb, sub, customer);
    } else if (stripeEvent.type === 'customer.subscription.deleted') {
      const sub = stripeEvent.data.object;
      let customer = null;
      try { customer = await stripe.customers.retrieve(sub.customer); } catch (_) {}
      result = await handleSubscriptionDeleted(sb, sub, customer);
    } else if (stripeEvent.type === 'charge.refunded') {
      // Refund-Behandlung via Customer-Email-Lookup
      const charge = stripeEvent.data.object;
      let customer = null;
      try { customer = await stripe.customers.retrieve(charge.customer); } catch (_) {}
      if (customer && customer.email) {
        result = await handleSubscriptionDeleted(sb, null, customer);
      } else {
        result = { skipped: 'no_customer_for_refund' };
      }
    }
  } catch (e) {
    return json(event, 500, { error: 'handler exception', detail: e.message });
  }

  return json(event, 200, { received: true, result });
}, { functionName: 'stripe-webhook-referral' });

exports._test = {
  _hasFriendCoupon, findReferralByEmail, handleSubscriptionCreated, handleSubscriptionDeleted,
  FRIEND_COUPON_ID, HOLD_DAYS
};
