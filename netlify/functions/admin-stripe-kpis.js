/**
 * PROVA — admin-stripe-kpis.js
 * MEGA-MEGA N3 (03.05.2026) — Admin-Cockpit Bereich 2
 *
 * Live-KPIs aus Stripe + Supabase:
 *  - MRR (aktiv + trial)
 *  - Trial-Pilots-Count
 *  - Founding-Members-Count (Coupon FOUNDING-99 redeemed)
 *  - Conversion-Rate (Trial → Paid, last 30d)
 *  - Churn-Rate (last 30d)
 *  - Founding-Coupon-Status (frei/eingeloest)
 */
'use strict';

const Stripe = require('stripe');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');
const { resolveFoundingCouponId } = require('./lib/prova-stripe-prices');

const STRIPE_API_VERSION = '2024-12-18.acacia';

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return jsonResponse(event, 500, { error: 'STRIPE_SECRET_KEY fehlt' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
  const sb = getSupabaseAdmin();

  // 1. Workspaces nach Status zaehlen
  const { data: wsAll } = await sb
    .from('workspaces')
    .select('id, abo_tier, abo_status, gesamtzahlungen_lifetime_eur, abo_aktiv_seit, abo_gekuendigt_am, stripe_subscription_id');

  const counts = { trial: 0, aktiv: 0, ueberfaellig: 0, gekuendigt: 0, pausiert: 0, total: 0 };
  let mrrEur = 0;
  let lifetimeEur = 0;

  // Plan-zu-Preis-Mapping (vereinfacht, Werte aus prova-preise.js)
  const planPreis = { solo: 99, team: 279 }; // Founding-Solo lifetime 99
  const planPreisRegular = { solo: 149, team: 279 };

  for (const w of (wsAll || [])) {
    counts.total++;
    counts[w.abo_status] = (counts[w.abo_status] || 0) + 1;
    lifetimeEur += Number(w.gesamtzahlungen_lifetime_eur || 0);
    if (w.abo_status === 'aktiv' && w.abo_tier && planPreis[w.abo_tier]) {
      mrrEur += planPreis[w.abo_tier];
    }
  }

  // 2. Founding-Coupon-Status via Stripe-API
  let foundingCoupon = null;
  try {
    const couponId = resolveFoundingCouponId();
    if (couponId) {
      const c = await stripe.coupons.retrieve(couponId);
      foundingCoupon = {
        id: c.id,
        valid: c.valid,
        amount_off: c.amount_off,
        currency: c.currency,
        duration: c.duration,
        max_redemptions: c.max_redemptions,
        times_redeemed: c.times_redeemed,
        remaining: c.max_redemptions != null ? (c.max_redemptions - (c.times_redeemed || 0)) : null
      };
    }
  } catch (e) {
    foundingCoupon = { error: e.message };
  }

  // 3. Conversion + Churn last 30d
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recentChanges } = await sb
    .from('audit_trail')
    .select('typ, created_at')
    .like('typ', 'stripe.%')
    .gte('created_at', since);

  let conversions30d = 0;
  let churn30d = 0;
  let trial_started30d = 0;
  for (const r of (recentChanges || [])) {
    if (r.typ === 'stripe.pilot.founding_paid' || r.typ === 'stripe.subscription.activated') conversions30d++;
    if (r.typ === 'stripe.subscription.cancelled') churn30d++;
    if (r.typ === 'stripe.pilot.trial_started' || r.typ === 'stripe.subscription.trial_started') trial_started30d++;
  }

  return jsonResponse(event, 200, {
    ok: true,
    fetched_at: new Date().toISOString(),
    workspaces: counts,
    mrr_eur: mrrEur,
    gesamtzahlungen_lifetime_eur: lifetimeEur,
    last_30_days: {
      trial_started: trial_started30d,
      conversions:   conversions30d,
      churn:         churn30d,
      conversion_rate: trial_started30d > 0 ? Math.round((conversions30d / trial_started30d) * 100) : 0,
      churn_rate:    counts.aktiv > 0 ? Math.round((churn30d / (counts.aktiv + churn30d)) * 100) : 0
    },
    founding_coupon: foundingCoupon
  });
}, { functionName: 'admin-stripe-kpis', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-stripe-kpis' });
