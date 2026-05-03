/**
 * PROVA — Pilot-Seats Status (Public Read-Only)
 * MEGA-SKALIERUNG M4 (03.05.2026, Founding-Counter)
 *
 * Liefert die verfuegbaren Founding-Member-Plaetze fuer pilot.html.
 * Public-Endpoint (kein Auth) — Coupon-Status ist nicht-sensitiv und
 * wird auf der Pilot-Page sowieso angezeigt.
 *
 * Cache: kurze HTTP-Cache-Header damit pilot.html nicht jedes Reload
 * Stripe belastet (5 Min ist OK fuer 10-Slot-Counter).
 *
 * GET /.netlify/functions/pilot-seats
 *   → 200 { available, remaining, total, coupon_id }
 *   → 503 wenn Coupon nicht konfiguriert
 */
'use strict';

const Stripe = require('stripe');
const { getCorsHeaders } = require('./lib/cors-helper');
const { resolveFoundingCouponId } = require('./lib/prova-stripe-prices');
const { checkPilotCouponAvailability } = require('./stripe-checkout');
const RateLimitIp = require('./lib/rate-limit-ip');
const { withSentry } = require('./lib/sentry-wrap');

const STRIPE_API_VERSION = '2024-12-18.acacia';

exports.handler = withSentry(async function (event) {
  const headers = Object.assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
    },
    getCorsHeaders(event)
  );

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Soft Rate-Limit (Public-Endpoint, Spam-Schutz). 60/min/IP grosszuegig.
  const rl = RateLimitIp.check(event, 60, 60, { functionName: 'pilot-seats' });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: Object.assign({}, headers, { 'Retry-After': String(rl.retryAfter) }),
      body: JSON.stringify({ error: 'Rate limit', retryAfter: rl.retryAfter })
    };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const couponId = resolveFoundingCouponId();
  if (!key || !couponId) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Pilot-Programm nicht konfiguriert' })
    };
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  const status = await checkPilotCouponAvailability(stripe, couponId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      available: status.available === true,
      remaining: typeof status.remaining === 'number' ? status.remaining : null,
      total:     typeof status.total === 'number' ? status.total : null,
      reason:    status.reason || null
    })
  };
}, { functionName: 'pilot-seats' });
