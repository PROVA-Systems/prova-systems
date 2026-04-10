/**
 * Stripe Webhooks — checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
 * ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, AIRTABLE_PAT
 * Paket in Airtable: Solo | Team (anhand Stripe-Price-ID, optional ENV-Override)
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { AIRTABLE_API, BASE_ID, TABLE_SV } = require('./lib/prova-subscription');
const { resolveSoloPriceId, resolveTeamPriceId } = require('./lib/prova-stripe-prices');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function patchSvByEmail(email, fields, pat) {
  const em = String(email || '')
    .trim()
    .toLowerCase();
  if (!em || !pat) return { ok: false, reason: 'bad_args' };
  const filter = encodeURIComponent('{Email}="' + em.replace(/"/g, '\\"') + '"');
  const getUrl = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV + '?filterByFormula=' + filter + '&maxRecords=1';
  const getRes = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + pat } });
  const getData = await getRes.json();
  if (!getData.records || !getData.records.length) {
    console.warn('stripe-webhook: kein SV für', em);
    return { ok: false, reason: 'not_found' };
  }
  const id = getData.records[0].id;
  const patchRes = await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV + '/' + id, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!patchRes.ok) {
    const t = await patchRes.text();
    console.error('stripe-webhook patch', t);
    return { ok: false, reason: t };
  }
  return { ok: true };
}

function firstSubscriptionPriceId(sub) {
  const items = sub && sub.items && sub.items.data;
  if (!items || !items.length) return null;
  const row = items[0];
  if (row.price) return typeof row.price === 'string' ? row.price : row.price.id;
  if (row.plan && row.plan.id) return row.plan.id;
  return null;
}

/** Paket für Airtable: nur Solo | Team */
function paketFromSubscription(sub) {
  const priceId = firstSubscriptionPriceId(sub);
  const teamId = resolveTeamPriceId();
  const soloId = resolveSoloPriceId();
  if (priceId === teamId) return 'Team';
  if (priceId === soloId) return 'Solo';
  const meta = (sub && sub.metadata) || {};
  const p = String(meta.prova_plan || '').toLowerCase();
  if (p === 'team') return 'Team';
  return 'Solo';
}

function paketFromCheckoutMeta(meta) {
  const p = String((meta && meta.prova_plan) || '').toLowerCase();
  if (p === 'team') return 'Team';
  return 'Solo';
}

async function handleSubscriptionActive(email, sub, pat) {
  const periodEnd =
    sub && sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : '';
  const fields = {
    Status: 'Aktiv',
    subscription_status: 'active',
    Trial_End: todayStr(),
    Paket: paketFromSubscription(sub)
  };
  if (periodEnd) fields.current_period_end = periodEnd;
  return patchSvByEmail(email, fields, pat);
}

exports.handler = async function (event) {
  const pat = process.env.AIRTABLE_PAT;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || !whSecret || !pat) {
    console.error('stripe-webhook: fehlende ENV');
    return { statusCode: 500, body: 'Konfiguration unvollständig' };
  }

  let body = event.body;
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    console.error('stripe-webhook sig', err.message);
    return { statusCode: 400, body: 'Webhook signature failed' };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const sess = stripeEvent.data.object;
        const email = (sess.customer_email || sess.customer_details?.email || '').trim().toLowerCase();
        let subId = sess.subscription;
        const sessMeta = sess.metadata || {};
        if (email && subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ['items.data.price']
          });
          await handleSubscriptionActive(email, sub, pat);
        } else if (email) {
          await patchSvByEmail(
            email,
            {
              Status: 'Aktiv',
              subscription_status: 'active',
              Trial_End: todayStr(),
              Paket: paketFromCheckoutMeta(sessMeta)
            },
            pat
          );
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = stripeEvent.data.object;
        let email = (inv.customer_email || '').trim().toLowerCase();
        const subId = inv.subscription;
        if (!email && inv.customer) {
          try {
            const cust = await stripe.customers.retrieve(inv.customer);
            email = (cust.email || '').trim().toLowerCase();
          } catch (e) {}
        }
        if (email && subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ['items.data.price']
          });
          await handleSubscriptionActive(email, sub, pat);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        let email = (sub.metadata && sub.metadata.prova_email) || '';
        if (!email && sub.customer) {
          try {
            const cust = await stripe.customers.retrieve(sub.customer);
            email = (cust.email || '').trim().toLowerCase();
          } catch (e) {}
        }
        if (email) {
          await patchSvByEmail(
            email,
            { Status: 'Gekündigt', subscription_status: 'canceled' },
            pat
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('stripe-webhook handler', e);
    return { statusCode: 500, body: 'Handler error' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
