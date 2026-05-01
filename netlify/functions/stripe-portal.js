// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Stripe Customer Portal Session
// Netlify Function: stripe-portal
//
// Erzeugt eine Customer-Portal-Session bei Stripe und gibt die URL zurück.
// Der eingeloggte SV kann damit Abo, Zahlungsmethode, Rechnungen verwalten.
//
// POST /.netlify/functions/stripe-portal
//   body: { email: "sv@example.de", return_url?: "https://..." }
//   → 200 { url: "https://billing.stripe.com/p/session/..." }
//
// Env: STRIPE_SECRET_KEY
// ══════════════════════════════════════════════════════════════════════════════

const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

const DEFAULT_RETURN = 'https://prova-systems.de/einstellungen.html#paket';

exports.handler = requireAuth(async (event, context) => {
  _currentEvent = event;
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'STRIPE_SECRET_KEY nicht konfiguriert' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiger JSON-Body' }) }; }

  const email      = (body.email || '').toString().trim().toLowerCase();
  const return_url = body.return_url || DEFAULT_RETURN;

  if (!email) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email ist Pflicht' }) };
  }

  try {
    const stripe = require('stripe')(secret);

    // Customer per E-Mail finden — konsistent mit stripe-checkout.js-Pattern
    const list = await stripe.customers.list({ email, limit: 1 });
    if (!list.data.length) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Kein Stripe-Kunde mit dieser E-Mail gefunden',
          hint:  'Der SV muss zuerst ein Abo oder Trial abgeschlossen haben.'
        })
      };
    }

    const customer = list.data[0];

    // Portal-Session erzeugen
    const session = await stripe.billingPortal.sessions.create({
      customer:   customer.id,
      return_url: return_url
    });

    console.log(`[StripePortal] Session erstellt für ${email} → ${session.id}`);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ url: session.url })
    };

  } catch (e) {
    console.error('[StripePortal] Fehler:', e.message);
    // Stripe-spezifische Fehler durchreichen, sonst generisch
    const msg = e.type === 'StripeInvalidRequestError'
      ? 'Stripe-Konfiguration fehlt — Customer Portal im Dashboard aktivieren'
      : e.message;
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: msg })
    };
  }
});

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    ...getCorsHeaders(_currentEvent)
  };
}
