/**
 * PROVA — admin-billing-sync.js (MEGA²⁸ V3.2-W8-I7)
 *
 * Billing-Sync für Admin-Cockpit Section 12.
 * Aggregiert Stripe-Subscription-Status + Invoice-History.
 *
 * Datenquelle:
 *  - Stripe API (Subscriptions, Invoices, Customers) — Live
 *  - Supabase users + workspaces als Mapping
 *
 * Defensive: bei Stripe-API-Fehler → 502 mit klarer Error-Message statt Crash.
 *
 * Auth: requireAdmin (super_admin only)
 * GET /.netlify/functions/admin-billing-sync
 *   → 200 { active_count, past_due_count, canceled_count, mrr_eur,
 *           recent_invoices: [...], source }
 */
'use strict';

const Stripe = require('stripe');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const STRIPE_API_VERSION = '2024-12-18.acacia';

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const stripeKey = process.env.PROVA_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return jsonResponse(event, 503, { error: 'Stripe-Key nicht konfiguriert' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

  try {
    // 1. Subscriptions-Übersicht (Status-Aggregation)
    const subsByStatus = { active: 0, past_due: 0, canceled: 0, trialing: 0, unpaid: 0, incomplete: 0 };
    let mrrCents = 0;
    let hasMore = true;
    let startingAfter = null;
    let safetyCounter = 0;

    while (hasMore && safetyCounter < 5) {
      // Max 5 pages = 500 subs (vermutlich genug für Pre-Pilot)
      const params = { limit: 100, status: 'all' };
      if (startingAfter) params.starting_after = startingAfter;
      const subs = await stripe.subscriptions.list(params);

      for (const s of subs.data) {
        if (subsByStatus[s.status] != null) subsByStatus[s.status]++;
        if (s.status === 'active' || s.status === 'trialing') {
          // MRR-Berechnung: Sum der recurring monthly amounts
          for (const item of (s.items && s.items.data) || []) {
            const price = item.price;
            if (!price || !price.unit_amount) continue;
            const interval = price.recurring && price.recurring.interval;
            const intervalCount = (price.recurring && price.recurring.interval_count) || 1;
            const amount = price.unit_amount * (item.quantity || 1);
            if (interval === 'month') mrrCents += amount / intervalCount;
            else if (interval === 'year') mrrCents += amount / (12 * intervalCount);
          }
        }
      }

      hasMore = subs.has_more;
      startingAfter = subs.data.length > 0 ? subs.data[subs.data.length - 1].id : null;
      safetyCounter++;
    }

    // 2. Recent Invoices (last 5)
    const invoices = await stripe.invoices.list({ limit: 5 });
    const recent = (invoices.data || []).map(inv => ({
      id: inv.id,
      status: inv.status,
      amount_paid_eur: (inv.amount_paid || 0) / 100,
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      customer_email: inv.customer_email ? inv.customer_email.replace(/(.{2}).*@/, '$1***@') : null // pseudonymized
    }));

    return jsonResponse(event, 200, {
      active_count: subsByStatus.active,
      trialing_count: subsByStatus.trialing,
      past_due_count: subsByStatus.past_due,
      canceled_count: subsByStatus.canceled,
      unpaid_count: subsByStatus.unpaid,
      incomplete_count: subsByStatus.incomplete,
      mrr_eur: Math.round(mrrCents) / 100,
      mrr_cents: Math.round(mrrCents),
      recent_invoices: recent,
      source: 'stripe-api',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse(event, 502, {
      error: 'Stripe-API-Fehler',
      detail: err && err.message,
      source: 'stripe-api-error'
    });
  }
}), { functionName: 'admin-billing-sync' });
