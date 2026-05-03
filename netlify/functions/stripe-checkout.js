/**
 * PROVA Systems — Stripe Checkout v4
 *
 * Sprint Stripe-Migration 03.05.2026:
 *  - Account-Migration auf neuen Stripe-Account
 *  - Add-on-Pakete (5/10/20 Gutachten, mode='payment')
 *  - Founding-Coupon-Support (50€ off Solo lifetime)
 *  - Idempotency-Keys (verhindert Doppel-Abbuchung bei Doppelklick)
 *
 * Sprint Catch-Up C1 (03.05.2026 morgen):
 *  - Founding-Pilot-Programm: pilot_program=true
 *  - 90 Tage Trial + Auto-Apply FOUNDING-99 Coupon (Trial → 99€/Mo lifetime)
 *  - Pre-Check: Coupon-Plaetze frei? (max_redemptions Sperre)
 *  - metadata.prova_pilot='true' fuer Webhook-Tracking
 *
 * POST /.netlify/functions/stripe-checkout
 *   body: {
 *     plan: 'solo' | 'team' | 'addon-5' | 'addon-10' | 'addon-20',
 *     coupon?: 'founding',          // optional, nur bei plan=solo (manuelle Coupon-Wahl)
 *     pilot_program?: true,         // NEU C1: 90T Trial + Auto-FOUNDING-99
 *     successUrl?: string,
 *     cancelUrl?: string
 *   }
 *   → 200 { sessionId, sessionUrl, pilot_seats_remaining? }
 *   → 410 wenn Pilot-Programm ausgebucht (10/10 redemptions)
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
const PILOT_TRIAL_DAYS = 90;

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

/**
 * Pilot-Coupon-Verfuegbarkeit pruefen.
 * Returnt { available, remaining, total, coupon } oder { available: false, reason }.
 */
async function checkPilotCouponAvailability(stripe, couponId) {
  try {
    const coupon = await stripe.coupons.retrieve(couponId);
    if (!coupon.valid) {
      return { available: false, reason: 'coupon_invalid', remaining: 0 };
    }
    if (coupon.max_redemptions !== null && coupon.max_redemptions !== undefined) {
      const remaining = coupon.max_redemptions - (coupon.times_redeemed || 0);
      if (remaining <= 0) {
        return { available: false, reason: 'sold_out', remaining: 0, total: coupon.max_redemptions };
      }
      return { available: true, remaining, total: coupon.max_redemptions, coupon };
    }
    // unbegrenzt
    return { available: true, remaining: null, total: null, coupon };
  } catch (e) {
    if (e.code === 'resource_missing') {
      return { available: false, reason: 'coupon_not_found', remaining: 0 };
    }
    throw e;
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

  const isPilot = body.pilot_program === true;

  // Pilot-Programm-Validation: nur Solo-Subscription
  if (isPilot) {
    if (body.plan && String(body.plan).toLowerCase() !== 'solo') {
      return json(event, 400, {
        error: 'Founding-Pilot ist nur fuer Solo-Plan verfuegbar',
        errorCode: 'PILOT_REQUIRES_SOLO'
      });
    }
    if (planConfig.mode !== 'subscription') {
      return json(event, 400, {
        error: 'Founding-Pilot benoetigt Subscription-Modus',
        errorCode: 'PILOT_REQUIRES_SUBSCRIPTION'
      });
    }
  }

  // Founding-Coupon-Resolution
  let discounts;
  let couponId;
  let pilotSeatsRemaining = null;
  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });

  if (isPilot || (body.coupon === 'founding' && body.plan === 'solo')) {
    couponId = resolveFoundingCouponId();
    if (!couponId) {
      return json(event, 500, {
        error: 'Founding-Coupon nicht konfiguriert',
        errorCode: 'COUPON_NOT_CONFIGURED'
      });
    }

    // C1: Pilot-Seats-Pre-Check (Coupon-Status)
    const availability = await checkPilotCouponAvailability(stripe, couponId);
    if (!availability.available) {
      const status = availability.reason === 'sold_out' ? 410 : 500;
      return json(event, status, {
        error: availability.reason === 'sold_out'
          ? 'Founding-Member-Plaetze ausgebucht (' + availability.total + '/' + availability.total + ' eingeloest)'
          : 'Founding-Coupon nicht verfuegbar: ' + availability.reason,
        errorCode: availability.reason === 'sold_out' ? 'PILOT_SOLD_OUT' : 'COUPON_INVALID',
        seats_remaining: 0
      });
    }
    pilotSeatsRemaining = availability.remaining;
    discounts = [{ coupon: couponId }];
  }

  const idempotencyKey = generateIdempotencyKey(userEmail, planConfig.priceId, (body.plan || 'solo') + (isPilot ? ':pilot' : ''));

  try {
    const sessionParams = {
      payment_method_types: ['card', 'sepa_debit'],
      mode:                 planConfig.mode,
      customer_email:       userEmail,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: body.successUrl
        || ((process.env.URL || 'https://prova-systems.de') + '/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: body.cancelUrl
        || ((process.env.URL || 'https://prova-systems.de') + (isPilot ? '/pilot.html?checkout=cancelled' : '/einstellungen.html?checkout=cancelled')),
      metadata: {
        prova_plan:   body.plan || 'solo',
        prova_email:  userEmail,
        prova_addon:  planConfig.isAddon ? '1' : '0',
        prova_pilot:  isPilot ? 'true' : 'false'
      },
      automatic_tax: { enabled: !!process.env.STRIPE_AUTO_TAX }
    };

    // Subscription-spezifische Parameter
    if (planConfig.mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          prova_plan:  body.plan || 'solo',
          prova_email: userEmail,
          prova_pilot: isPilot ? 'true' : 'false'
        }
      };

      if (isPilot) {
        // C1: 90 Tage Trial + Auto-FOUNDING-99 Coupon
        sessionParams.subscription_data.trial_period_days = PILOT_TRIAL_DAYS;
        sessionParams.subscription_data.metadata.pilot_trial_days = String(PILOT_TRIAL_DAYS);
        sessionParams.discounts = discounts;
        // payment_method_collection: 'always' = Karte sofort verifizieren auch bei Trial
        sessionParams.payment_method_collection = 'always';
      } else if (discounts) {
        sessionParams.discounts = discounts;
      } else {
        sessionParams.allow_promotion_codes = true;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: 'checkout_' + idempotencyKey
    });

    console.log('[stripe-checkout] session created plan=' + (body.plan || 'solo')
      + ' mode=' + planConfig.mode
      + (isPilot ? ' pilot=true trial=' + PILOT_TRIAL_DAYS + 'd seats_left=' + pilotSeatsRemaining : ''));

    const response = {
      sessionId:  session.id,
      sessionUrl: session.url,
      ok: true
    };
    if (isPilot) {
      response.pilot_seats_remaining = pilotSeatsRemaining;
      response.trial_period_days = PILOT_TRIAL_DAYS;
    }
    return json(event, 200, response);

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

// Exports für Tests
module.exports.checkPilotCouponAvailability = checkPilotCouponAvailability;
module.exports.PILOT_TRIAL_DAYS = PILOT_TRIAL_DAYS;
