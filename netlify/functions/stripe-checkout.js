// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — stripe-checkout.js
// Merge v96+v111: Ninja-Fixes übernommen, PROVA-Preisstruktur beibehalten
// FIX #007: L3_WEBHOOK hardcoded URL → process.env.MAKE_WEBHOOK_L3
// FIX #008: CORS wildcard → process.env.URL (kein Wildcard mehr)
// ══════════════════════════════════════════════════════════════════════════════

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Ninja-Fix: keine hardcodierte URL mehr
const L3_WEBHOOK = process.env.MAKE_WEBHOOK_L3 || '';
const TRIAL_DAYS = 14;
const BASE_URL   = process.env.URL || 'https://prova-systems.de';

// PROVA Preisstruktur — Solo 149€ / Team 279€
// Echte Stripe Price-IDs (Stand April 2026)
const PRICE_MAP = {
  Solo:       { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6' }, // 149 €/Mo
  Team:       { abo: 'price_1TEHH68d1CNm0HvYLeG1Or7T' }, // 279 €/Mo
  // Backward-Kompatibilität
  Starter:    { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6' },
  Pro:        { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6' },
  Enterprise: { abo: 'price_1TEHH68d1CNm0HvYLeG1Or7T' },
};

// Ninja-Fix: corsHeaders als Funktion, kein Wildcard
function corsHeaders() {
  return {
    'Content-Type':                 'application/json',
    'Access-Control-Allow-Origin':  BASE_URL,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  // Ninja-Fix: OPTIONS-Preflight korrekt behandeln
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const { paket, email, ref_code } = JSON.parse(event.body || '{}');

    if (!paket || !PRICE_MAP[paket]) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiges Paket: ' + paket }) };
    }
    if (!email) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'E-Mail fehlt' }) };
    }

    // Paketnamen normalisieren (alte Bezeichnungen → Solo/Team)
    const paketNormalized = ({ Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' })[paket] || paket;
    const prices = PRICE_MAP[paket];

    // Stripe Customer suchen oder neu anlegen (verhindert Duplikate)
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { paket: paketNormalized, ref_code: ref_code || '' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      line_items: [{ price: prices.abo, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          paket:     paketNormalized,
          email,
          ref_code:  ref_code || '',
        },
      },
      metadata: {
        paket:    paketNormalized,
        email,
        ref_code: ref_code || '',
      },
      success_url: BASE_URL + '/onboarding.html?stripe=success&session_id={CHECKOUT_SESSION_ID}&paket=' + paketNormalized,
      cancel_url:  BASE_URL + '/onboarding.html?stripe=cancel',
      locale: 'de',
      allow_promotion_codes: true,
    });

    // L3 Webhook — Ninja-Fix: nur wenn URL vorhanden, fire-and-forget mit .catch()
    if (L3_WEBHOOK) {
      fetch(L3_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          paket:                  paketNormalized,
          stripe_customer_id:     customer.id,
          stripe_subscription_id: '', // wird nach Zahlung via stripe-webhook.js gesetzt
          session_id:             session.id,
          timestamp:              new Date().toISOString(),
        }),
      }).catch(err => console.warn('[L3_WEBHOOK] Fehler (nicht kritisch):', err.message));
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ url: session.url, session_id: session.id }),
    };

  } catch (err) {
    console.error('[stripe-checkout] Fehler:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
