/**
 * PROVA Systems — Stripe Checkout v2 (Verbessert)
 * ═══════════════════════════════════════════════════════════════════════
 * VERBESSERUNG CAT-2C:
 *  ✅ Idempotency-Key bei allen Stripe-Calls
 *     → Verhindert Doppel-Abbuchung bei Doppelklick auf "Kaufen"
 *     → Standard-Praxis (Stripe empfiehlt das ausdrücklich)
 *  ✅ CORS-Fix: event-Scope in json()-Hilfsfunktion (CAT-Audit F-07)
 *  ✅ Idempotency-Key = SHA-256(email + priceId + timestamp-minute)
 *     → Gleiche Kaufaktion = gleicher Key → Stripe dedupliziert
 *     → Neuer Kaufversuch nach >1 Min = neuer Key
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const crypto = require('crypto');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { resolveSoloPriceId, resolveTeamPriceId } = require('./lib/prova-stripe-prices.js');
const { requireAuth } = require('./lib/jwt-middleware');

// ── CORS-FIX: event wird als Parameter übergeben (nicht aus Scope) ────
function json(event, statusCode, obj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(event),  // event jetzt korrekt als Parameter
    },
    body: JSON.stringify(obj),
  };
}

/**
 * Idempotency-Key generieren
 * Format: SHA-256(email:priceId:minute-bucket)
 * "minute-bucket": aktuell Minute (auf 5-Minuten gerundet)
 * → Gleicher Kauf innerhalb 5 Min = gleicher Key → Stripe dedupliziert
 * → Nach 5 Min: neuer Key (neue Kaufabsicht)
 */
function generateIdempotencyKey(email, priceId) {
  const minuteBucket = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-Minuten-Fenster
  const raw = `${email}:${priceId}:${minuteBucket}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(event, 500, { error: 'STRIPE_SECRET_KEY nicht konfiguriert', errorCode: 'API_KEY_MISSING' });

  // P4B.7b: HMAC-Token-Email aus context.userEmail
  const user = { email: context.userEmail };
  const userEmail = user.email.toLowerCase();

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json(event, 400, { error: 'Ungültiger JSON-Body', errorCode: 'INVALID_JSON' }); }

  const { plan = 'solo', successUrl, cancelUrl } = body;

  // Preis-ID auflösen
  let priceId;
  try {
    priceId = plan === 'team' ? resolveTeamPriceId() : resolveSoloPriceId();
  } catch (e) {
    return json(event, 500, { error: 'Stripe Preis nicht konfiguriert', errorCode: 'API_KEY_MISSING' });
  }

  if (!priceId) {
    return json(event, 500, { error: 'Stripe Preis-ID fehlt', errorCode: 'API_KEY_MISSING' });
  }

  // ── IDEMPOTENCY KEY ───────────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey(userEmail, priceId);

  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card', 'sepa_debit'],
        mode: 'subscription',
        customer_email: userEmail,
        line_items: [{
          price:    priceId,
          quantity: 1,
        }],
        success_url: successUrl || `${process.env.URL || 'https://prova-systems.de'}/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  cancelUrl  || `${process.env.URL || 'https://prova-systems.de'}/app.html?checkout=cancelled`,
        subscription_data: {
          metadata: {
            prova_plan:  plan,
            prova_email: userEmail,
          },
        },
        metadata: {
          prova_plan:  plan,
          prova_email: userEmail,
        },
        // Steuern automatisch berechnen (sofern in Stripe konfiguriert)
        automatic_tax: { enabled: !!process.env.STRIPE_AUTO_TAX },
        allow_promotion_codes: true,
      },
      {
        // ══════════════════════════════════════════════════════
        // IDEMPOTENCY KEY — verhindert Doppel-Abbuchung
        // Stripe dedupliziert Requests mit gleichem Key innerhalb 24h
        // ══════════════════════════════════════════════════════
        idempotencyKey: 'checkout_' + idempotencyKey,
      }
    );

    console.log(`[stripe-checkout] Session erstellt für ${userEmail}, Plan: ${plan}, Key: ${idempotencyKey.slice(0, 8)}…`);

    return json(event, 200, {
      sessionId:   session.id,
      sessionUrl:  session.url,
      ok: true,
    });

  } catch (err) {
    console.error('[stripe-checkout] Fehler:', err.type, err.message);

    // Stripe-Fehlertypen spezifisch behandeln
    const stripeErrorMap = {
      'StripeCardError':              { status: 402, code: 'CARD_ERROR' },
      'StripeRateLimitError':         { status: 429, code: 'RATE_LIMIT' },
      'StripeInvalidRequestError':    { status: 400, code: 'INVALID_REQUEST' },
      'StripeAPIError':               { status: 502, code: 'STRIPE_SERVER_ERROR' },
      'StripeConnectionError':        { status: 502, code: 'NETWORK' },
      'StripeAuthenticationError':    { status: 500, code: 'API_KEY_MISSING' },
      'StripeIdempotencyError':       { status: 409, code: 'DUPLICATE_REQUEST' },
    };

    const mapped = stripeErrorMap[err.type] || { status: 500, code: 'UNKNOWN' };

    return json(event, mapped.status, {
      error:      err.message || 'Stripe-Fehler',
      errorCode:  mapped.code,
      retryable:  [429, 502].includes(mapped.status),
    });
  }
});