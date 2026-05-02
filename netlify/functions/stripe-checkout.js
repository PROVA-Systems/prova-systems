/**
 * PROVA Systems — Stripe Checkout v3
 *
 * Sprint Stripe-Migration 03.05.2026:
 *  - Account-Migration auf neuen Stripe-Account
 *  - Add-on-Pakete (5/10/20 Gutachten, mode='payment')
 *  - Founding-Coupon-Support (50€ off Solo lifetime)
 *  - Idempotency-Keys (verhindert Doppel-Abbuchung bei Doppelklick)
 *
 * POST /.netlify/functions/stripe-checkout
 *   body: {
 *     plan: 'solo' | 'team' | 'addon-5' | 'addon-10' | 'addon-20',
 *     coupon?: 'founding',  // optional, nur bei plan=solo
 *     successUrl?: string,
 *     cancelUrl?: string
 *   }
 *   → 200 { sessionId, sessionUrl }
 *
 * ENV: STRIPE_SECRET_KEY (Pflicht), STRIPE_AUTO_TAX (optional Bool),
 *      STRIPE_FOUNDING_COUPON_ID (für Founding-Coupon)
 */

'use strict';

const Stripe = require('stripe');
const crypto = require('crypto');
const { getCorsHeaders } = require('./lib/cors-helper');
const {
  resolveSoloPriceId,
  resolveTeamPriceId,
  resolveAddonPriceId,
  resolveFoundingCouponId
} = require('./lib/prova-stripe-prices');
const { requireAuth } = require('./lib/jwt-middleware');

const STRIPE_API_VERSION = '2024-12-18.acacia';

function json(event, statusCode, obj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(event)
    },
    body: JSON.stringify(obj)
  };
}

function generateIdempotencyKey(email, priceId, plan) {
  const minuteBucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const raw = email + ':' + priceId + ':' + plan + ':' + minuteBucket;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

function resolvePlanConfig(plan) {
  // Returnt { priceId, mode, isAddon } oder null bei unbekanntem Plan
  switch (String(plan).toLowerCase()) {
    case 'solo':     return { priceId: resolveSoloPriceId(), mode: 'subscription', isAddon: false };
    case 'team':     return { priceId: resolveTeamPriceId(), mode: 'subscription', isAddon: false };
    case 'addon-5':  return { priceId: resolveAddonPriceId(5),  mode: 'payment', isAddon: true };
    case 'addon-10': return { priceId: resolveAddonPriceId(10), mode: 'payment', isAddon: true };
    case 'addon-20': return { priceId: resolveAddonPriceId(20), mode: 'payment', isAddon: true };
    default: return null;
  }
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(event, 500, { error: 'STRIPE_SECRET_KEY nicht konfiguriert', errorCode: 'API_KEY_MISSING' });

  const userEmail = context.userEmail.toLowerCase();

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(event, 400, { error: 'Ungültiger JSON-Body', errorCode: 'INVALID_JSON' }); }

  const planConfig = resolvePlanConfig(body.plan || 'solo');
  if (!planConfig) {
    return json(event, 400, { error: 'Unbekannter plan: ' + body.plan, errorCode: 'INVALID_PLAN' });
  }
  if (!planConfig.priceId) {
    return json(event, 500, { error: 'Stripe Preis-ID fehlt für plan ' + body.plan, errorCode: 'PRICE_NOT_CONFIGURED' });
  }

  // Founding-Coupon nur bei Solo-Subscription
  let discounts;
  if (body.coupon === 'founding' && body.plan === 'solo') {
    const couponId = resolveFoundingCouponId();
    if (!couponId) {
      return json(event, 500, { error: 'Founding-Coupon nicht konfiguriert', errorCode: 'COUPON_NOT_CONFIGURED' });
    }
    discounts = [{ coupon: couponId }];
  }

  const idempotencyKey = generateIdempotencyKey(userEmail, planConfig.priceId, body.plan || 'solo');

  try {
    const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });

    const sessionParams = {
      payment_method_types: ['card', 'sepa_debit'],
      mode:                 planConfig.mode,
      customer_email:       userEmail,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: body.successUrl
        || ((process.env.URL || 'https://prova-systems.de') + '/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: body.cancelUrl
        || ((process.env.URL || 'https://prova-systems.de') + '/einstellungen.html?checkout=cancelled'),
      metadata: {
        prova_plan:  body.plan || 'solo',
        prova_email: userEmail,
        prova_addon: planConfig.isAddon ? '1' : '0'
      },
      automatic_tax: { enabled: !!process.env.STRIPE_AUTO_TAX }
    };

    // Subscription-spezifische Parameter
    if (planConfig.mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: { prova_plan: body.plan || 'solo', prova_email: userEmail }
      };
      if (discounts) {
        sessionParams.discounts = discounts;
      } else {
        sessionParams.allow_promotion_codes = true;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: 'checkout_' + idempotencyKey
    });

    console.log('[stripe-checkout] session created plan=' + (body.plan || 'solo') + ' mode=' + planConfig.mode);

    return json(event, 200, {
      sessionId:  session.id,
      sessionUrl: session.url,
      ok: true
    });

  } catch (err) {
    console.error('[stripe-checkout] error:', err.type, err.message);

    const stripeErrorMap = {
      'StripeCardError':              { status: 402, code: 'CARD_ERROR' },
      'StripeRateLimitError':         { status: 429, code: 'RATE_LIMIT' },
      'StripeInvalidRequestError':    { status: 400, code: 'INVALID_REQUEST' },
      'StripeAPIError':               { status: 502, code: 'STRIPE_SERVER_ERROR' },
      'StripeConnectionError':        { status: 502, code: 'NETWORK' },
      'StripeAuthenticationError':    { status: 500, code: 'API_KEY_MISSING' },
      'StripeIdempotencyError':       { status: 409, code: 'DUPLICATE_REQUEST' }
    };
    const mapped = stripeErrorMap[err.type] || { status: 500, code: 'UNKNOWN' };
    return json(event, mapped.status, {
      error:     err.message || 'Stripe-Fehler',
      errorCode: mapped.code,
      retryable: [429, 502].includes(mapped.status)
    });
  }
});
