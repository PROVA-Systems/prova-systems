/**
 * Stripe Checkout — Solo / Team (STRIPE_SECRET_KEY; STRIPE_PRICE_SOLO/TEAM optional, Defaults in lib/prova-stripe-prices.js)
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { resolveSoloPriceId, resolveTeamPriceId } = require('./lib/prova-stripe-prices.js');

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return json(500, { error: 'STRIPE_SECRET_KEY nicht gesetzt' });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) {
    return json(401, { error: 'Anmeldung erforderlich' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Ungültiger JSON-Body' });
  }

  const plan = String(body.plan || body.paket || '').toLowerCase();
  const priceSolo = resolveSoloPriceId();
  const priceTeam = resolveTeamPriceId();
  const priceId = plan === 'team' ? priceTeam : priceSolo;

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
  const base = siteUrl ? siteUrl.replace(/\/$/, '') : '';

  const provaPlan = plan === 'team' ? 'Team' : 'Solo';
  const emailNorm = String(user.email).trim().toLowerCase();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: emailNorm,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: base + '/einstellungen.html?checkout=success',
      cancel_url: base + '/account-gesperrt.html?checkout=cancel',
      metadata: {
        prova_plan: provaPlan,
        prova_email: emailNorm
      },
      subscription_data: {
        metadata: {
          prova_plan: provaPlan,
          prova_email: emailNorm
        }
      }
    });

    return json(200, { id: session.id, url: session.url });
  } catch (e) {
    console.error('create-checkout-session', e);
    return json(500, { error: e.message || String(e) });
  }
};
