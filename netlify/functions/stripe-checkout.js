// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Stripe Checkout Function
// Unterstützt: Abo (Solo/Team) + Einmalkauf Add-ons (5er/10er Fälle-Paket)
//
// Env: STRIPE_SECRET_KEY
// ══════════════════════════════════════════════════════════════════════════════

// ── Abo-Preise (recurring) ──────────────────────────────────────────────────
const ABO_MAP = {
  Solo:       'price_1TEHG68d1CNm0HvYFNx99Tq6', // 149€/Mo
  Team:       'price_1TEHH68d1CNm0HvYLeG1Or7T', // 279€/Mo
  // Legacy-Mapping
  Starter:    'price_1TEHG68d1CNm0HvYFNx99Tq6',
  Pro:        'price_1TEHG68d1CNm0HvYFNx99Tq6',
  Enterprise: 'price_1TEHH68d1CNm0HvYLeG1Or7T',
};

// ── Add-on-Preise (one-time) ─────────────────────────────────────────────────
// MANUELL ANLEGEN in Stripe Dashboard → Produkte → Preis hinzufügen
// Typ: Einmalig (nicht wiederkehrend!)
// Dann Price-ID hier eintragen und als Netlify ENV setzen
const ADDON_MAP = {
  addon_5: {
    // price: process.env.STRIPE_ADDON_5_PRICE_ID, // nach Anlage aktivieren
    price:  'price_ADDON_5_PLACEHOLDER',  // ← ERSETZEN nach Stripe-Setup
    menge:  5,
    label:  '5 zusätzliche Fälle',
    betrag: 2900, // Cent
  },
  addon_10: {
    // price: process.env.STRIPE_ADDON_10_PRICE_ID, // nach Anlage aktivieren
    price:  'price_ADDON_10_PLACEHOLDER', // ← ERSETZEN nach Stripe-Setup
    menge:  10,
    label:  '10 zusätzliche Fälle',
    betrag: 4900, // Cent
  },
};

const L3_WEBHOOK = process.env.MAKE_WEBHOOK_L3 || '';
const TRIAL_DAYS = 14;
const BASE_URL   = process.env.URL || 'https://prova-systems.de';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    // Nur eingeloggte User dürfen Checkout-Sessions erstellen (Missbrauch verhindern)
    const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
      ? String(event.clientContext.user.email).toLowerCase()
      : '';
    if (!jwtEmail) {
      return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { typ = 'abo', email } = body;

    if (!email) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'E-Mail fehlt' }) };
    }
    if (String(email).toLowerCase() !== jwtEmail) {
      return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'FORBIDDEN' }) };
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // ── Stripe Customer anlegen oder wiederverwenden ──────────────────────────
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({ email, metadata: { quelle: 'prova-systems' } });

    // ── ROUTING: Portal vs. Abo vs. Add-on ──────────────────────────────────
    // Stripe Billing Portal — für Abo-Verwaltung, Zahlungsmittel, Rechnungen
    if (body.action === 'portal') {
      const session = await stripe.billingPortal.sessions.create({
        customer:   customer.id,
        return_url: body.returnUrl || BASE_URL + '/einstellungen.html',
      });
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ url: session.url }) };
    }

    if (typ === 'addon') {
      return await handleAddon(stripe, customer, body, email);
    } else {
      return await handleAbo(stripe, customer, body, email);
    }

  } catch (err) {
    console.error('[Checkout] Fehler:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ABO-CHECKOUT (Solo / Team — recurring)
// ══════════════════════════════════════════════════════════════════════════════
async function handleAbo(stripe, customer, body, email) {
  const { paket, ref_code = '' } = body;

  if (!paket || !ABO_MAP[paket]) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiges Paket: ' + paket }) };
  }

  const paketNorm = ({ Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' })[paket] || paket;
  const priceId   = ABO_MAP[paket];

  const session = await stripe.checkout.sessions.create({
    customer:              customer.id,
    payment_method_types:  ['card', 'sepa_debit'],
    mode:                  'subscription',
    line_items:            [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { paket: paketNorm, email, ref_code },
    },
    metadata:   { paket: paketNorm, email, ref_code, typ: 'abo' },
    success_url: `${BASE_URL}/onboarding.html?stripe=success&session_id={CHECKOUT_SESSION_ID}&paket=${paketNorm}`,
    cancel_url:  `${BASE_URL}/app-pro.html?stripe=cancel`,
    locale:      'de',
    allow_promotion_codes: true,
  });

  // L3: Airtable Status setzen + Bestätigungsmail
  fetch(L3_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, paket: paketNorm, stripe_customer_id: customer.id }),
  }).catch(e => console.warn('[L3]', e.message));

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({ url: session.url, session_id: session.id }),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD-ON CHECKOUT (5 oder 10 Fälle — Einmalkauf)
// ══════════════════════════════════════════════════════════════════════════════
async function handleAddon(stripe, customer, body, email) {
  const { addon_typ } = body; // 'addon_5' oder 'addon_10'

  const addon = ADDON_MAP[addon_typ];
  if (!addon) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: `Unbekanntes Add-on: ${addon_typ}` }),
    };
  }

  // Preisplatzhalter noch nicht ersetzt?
  if (addon.price.includes('PLACEHOLDER')) {
    return {
      statusCode: 503,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Add-on noch nicht aktiviert. Bitte Stripe Price-IDs hinterlegen.' }),
    };
  }

  const session = await stripe.checkout.sessions.create({
    customer:             customer.id,
    payment_method_types: ['card', 'sepa_debit'],
    mode:                 'payment',   // ← Einmalkauf, kein Abo!
    line_items: [{
      price:    addon.price,
      quantity: 1,
    }],
    metadata: {
      typ:       'addon',
      addon_typ: addon_typ,
      menge:     String(addon.menge),
      email,
    },
    success_url: `${BASE_URL}/app-pro.html?addon=success&menge=${addon.menge}`,
    cancel_url:  `${BASE_URL}/app-pro.html?addon=cancel`,
    locale: 'de',
  });

  console.log(`[Checkout] Add-on ${addon_typ} für ${email} → Session ${session.id}`);

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({ url: session.url, session_id: session.id }),
  };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
