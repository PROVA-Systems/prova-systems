// ══════════════════════════════════════════════════
// PROVA Systems — Stripe Checkout Function
// Solo/Team Paketmodell (Stand: März 2026)
// Netlify Env: STRIPE_SECRET_KEY
// ══════════════════════════════════════════════════

const PRICE_MAP = {
  // Neue Pakete: Solo / Team
  Solo:       { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6', onboarding: 24900  }, // 149€/Mo, Onboarding 249€
  Team:       { abo: 'price_1TEHH68d1CNm0HvYLeG1Or7T', onboarding: 59900  }, // 349€/Mo, Onboarding 599€
  // Backward-Kompatibilität (alte Paketnamen → neue Preise)
  Starter:    { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6', onboarding: 24900  },
  Pro:        { abo: 'price_1TEHG68d1CNm0HvYFNx99Tq6', onboarding: 24900  },
  Enterprise: { abo: 'price_1TEHH68d1CNm0HvYLeG1Or7T', onboarding: 59900  },
};

// WICHTIG: Neue Stripe Price-Objekte in Stripe Dashboard anlegen:
// Solo: 149 €/Monat (recurring) → price_id hier eintragen
// Team: 349 €/Monat (recurring) → price_id hier eintragen
// Bis dahin: vorhandene Starter/Enterprise Price-IDs als Platzhalter

const TRIAL_DAYS = 14;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { paket, email, ref_code } = JSON.parse(event.body || '{}');

    if (!paket || !PRICE_MAP[paket]) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ungültiges Paket' }) };
    }
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-Mail fehlt' }) };
    }

    // Paketnamen normalisieren (alte → neue)
    const paketNormalized = ({ Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' })[paket] || paket;

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const prices = PRICE_MAP[paket];

    // Stripe Customer anlegen oder suchen
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { paket: paketNormalized, ref_code: ref_code || '' }
      });
    }

    // Line Items: Abo + Onboarding als einmalige Gebühr
    const line_items = [
      {
        price: prices.abo,
        quantity: 1,
      },
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `PROVA ${paketNormalized} — Persönliches Einführungsgespräch`,
            description: 'Einmalige Onboarding-Gebühr inkl. Einrichtung Ihres Büroprofils',
          },
          unit_amount: prices.onboarding,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      line_items,
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          paket: paketNormalized,
          email,
          ref_code: ref_code || '',
        },
      },
      metadata: {
        paket: paketNormalized,
        email,
        ref_code: ref_code || '',
      },
      success_url: `${process.env.URL || 'https://prova-systems.netlify.app'}/onboarding.html?stripe=success&session_id={CHECKOUT_SESSION_ID}&paket=${paketNormalized}`,
      cancel_url: `${process.env.URL || 'https://prova-systems.netlify.app'}/onboarding.html?stripe=cancel`,
      locale: 'de',
      customer_email: customer.email ? undefined : email,
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, session_id: session.id }),
    };

  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
