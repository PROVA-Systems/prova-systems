/**
 * PROVA — admin-mrr-live.js (MEGA³² W11-I6)
 *
 * Live-MRR aus Stripe-API: Active Subscriptions × monatliche Beträge.
 * Founding-Members (Coupon FOUNDING-99) hervorgehoben.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse } = require('./lib/admin-auth-guard');

function getStripeKey() {
  return process.env.PROVA_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || null;
}

async function stripeFetch(path) {
  const key = getStripeKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY nicht gesetzt');
  const fetch = global.fetch || require('node-fetch');
  const res = await fetch('https://api.stripe.com/v1' + path, {
    headers: { 'Authorization': 'Bearer ' + key }
  });
  if (!res.ok) throw new Error('Stripe HTTP ' + res.status);
  return res.json();
}

exports.handler = withSentry(requireAdmin(async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  if (!getStripeKey()) {
    return jsonResponse(event, 503, { error: 'Stripe-Key nicht konfiguriert' });
  }

  try {
    const subs = await stripeFetch('/subscriptions?status=active&limit=100&expand[]=data.discount.coupon');

    let mrrCent = 0;
    let foundingCount = 0;
    let regularCount = 0;
    const breakdown = { solo: 0, team: 0, founding: 0 };

    (subs.data || []).forEach(s => {
      const item = s.items && s.items.data && s.items.data[0];
      const unit = item && item.price && item.price.unit_amount ? item.price.unit_amount : 0;
      const qty = item && item.quantity ? item.quantity : 1;
      const interval = item && item.price && item.price.recurring && item.price.recurring.interval || 'month';
      const monthly = interval === 'year' ? Math.round(unit * qty / 12) : unit * qty;

      const isFounding = s.discount && s.discount.coupon && (s.discount.coupon.id === 'FOUNDING-99' || /founding/i.test(s.discount.coupon.id || ''));
      if (isFounding) {
        foundingCount++; breakdown.founding++;
        // 99€ lifetime
        mrrCent += 9900;
      } else {
        regularCount++;
        // Tier-Detection via amount
        if (monthly >= 30000) breakdown.team++;
        else breakdown.solo++;
        mrrCent += monthly;
      }
    });

    return jsonResponse(event, 200, {
      mrr_eur: Math.round(mrrCent / 100),
      mrr_cent: mrrCent,
      total_active: (subs.data || []).length,
      founding_count: foundingCount,
      regular_count: regularCount,
      breakdown: breakdown,
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}, { functionName: 'admin-mrr-live', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-mrr-live' });
