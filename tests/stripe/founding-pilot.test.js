/**
 * PROVA Founding-Pilot Tests
 *
 * Verifiziert Pilot-Programm-Logik:
 *  - Pilot-Signup mit pilot_program=true → 90T Trial + FOUNDING-99 Coupon
 *  - Pilot-Sold-Out → 410
 *  - Pilot nur fuer Solo (nicht Team, nicht Add-ons)
 *  - Webhook trial_will_end → audit_trail-Eintrag
 *  - Webhook invoice.payment_succeeded nach Trial → trial-to-paid-Transition
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// ── ENV setup ────────────────────────────────────────────────────────────────
process.env.STRIPE_SECRET_KEY            = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET        = 'whsec_dummy';
process.env.PROVA_SUPABASE_PROJECT_URL   = 'https://dummy.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY    = 'eyJdummy';
process.env.STRIPE_PRICE_SOLO            = 'price_solo_test';
process.env.STRIPE_PRICE_TEAM            = 'price_team_test';
process.env.STRIPE_FOUNDING_COUPON_ID    = 'FOUNDING-99';
process.env.URL                          = 'https://prova-systems.de';

// ── Mock-State ──────────────────────────────────────────────────────────────
const stripeMockState = {
  couponState: 'available',  // 'available' | 'sold_out' | 'invalid' | 'not_found'
  couponMaxRedemptions: 10,
  couponTimesRedeemed: 0,
  capturedSessionParams: null,
  capturedIdempotencyKey: null
};

const supabaseMockState = {
  workspaces: new Map(),
  stripeEvents: [],
  auditTrail: []
};

function resetMocks() {
  stripeMockState.couponState = 'available';
  stripeMockState.couponMaxRedemptions = 10;
  stripeMockState.couponTimesRedeemed = 0;
  stripeMockState.capturedSessionParams = null;
  stripeMockState.capturedIdempotencyKey = null;
  supabaseMockState.workspaces.clear();
  supabaseMockState.stripeEvents = [];
  supabaseMockState.auditTrail = [];

  supabaseMockState.workspaces.set('ws-pilot', {
    id: 'ws-pilot',
    abo_tier: 'solo',
    abo_status: 'trial',
    billing_email: 'pilot@example.de',
    stripe_customer_id: 'cus_pilot_test',
    gesamtzahlungen_lifetime_eur: 0
  });
}

function makeStripeMock() {
  return function StripeFactory(secret, opts) {
    return {
      apiVersion: opts && opts.apiVersion,
      coupons: {
        async retrieve(id) {
          if (stripeMockState.couponState === 'not_found') {
            const e = new Error('No such coupon');
            e.code = 'resource_missing';
            throw e;
          }
          if (stripeMockState.couponState === 'invalid') {
            return { id, valid: false, max_redemptions: 10, times_redeemed: 0 };
          }
          return {
            id,
            valid: true,
            duration: 'forever',
            amount_off: 5000,
            currency: 'eur',
            max_redemptions: stripeMockState.couponMaxRedemptions,
            times_redeemed: stripeMockState.couponTimesRedeemed
          };
        }
      },
      checkout: {
        sessions: {
          async create(params, opts) {
            stripeMockState.capturedSessionParams = params;
            stripeMockState.capturedIdempotencyKey = opts && opts.idempotencyKey;
            return {
              id: 'cs_test_' + Math.random().toString(36).slice(2, 10),
              url: 'https://checkout.stripe.com/test/' + Math.random().toString(36).slice(2, 8)
            };
          }
        }
      },
      webhooks: {
        constructEvent(body, sig, secret) {
          if (typeof body === 'string') return JSON.parse(body);
          return body;
        }
      },
      subscriptions: {
        async retrieve(id) {
          return {
            id,
            status: 'trialing',
            current_period_end: Math.floor(Date.now() / 1000) + 90 * 86400,
            trial_start: Math.floor(Date.now() / 1000),
            trial_end:   Math.floor(Date.now() / 1000) + 90 * 86400,
            metadata: { prova_pilot: 'true', prova_plan: 'solo' },
            items: { data: [{ price: { id: 'price_solo_test', recurring: { interval: 'month' } } }] }
          };
        }
      },
      customers: {
        async retrieve(id) { return { id, email: 'pilot@example.de' }; }
      }
    };
  };
}

function makeSupabaseClientMock() {
  function builder(table) {
    const state = { filters: {}, op: 'select', payload: null };

    function execute() {
      if (state.op === 'insert') {
        if (table === 'stripe_events') {
          const id = 'sev-' + (supabaseMockState.stripeEvents.length + 1);
          const inserted = { id, ...state.payload };
          supabaseMockState.stripeEvents.push(inserted);
          return { data: inserted, error: null };
        }
        if (table === 'audit_trail') {
          supabaseMockState.auditTrail.push(state.payload);
          return { data: state.payload, error: null };
        }
        return { data: state.payload, error: null };
      }
      if (state.op === 'update') {
        if (table === 'workspaces' && state.filters.id) {
          const ws = supabaseMockState.workspaces.get(state.filters.id);
          if (ws) Object.assign(ws, state.payload);
          return { data: ws || null, error: null };
        }
        if (table === 'stripe_events' && state.filters.id) {
          const ev = supabaseMockState.stripeEvents.find(r => r.id === state.filters.id);
          if (ev) Object.assign(ev, state.payload);
          return { data: ev || null, error: null };
        }
        return { data: null, error: null };
      }
      // select
      if (table === 'stripe_events' && state.filters.stripe_event_id) {
        return { data: supabaseMockState.stripeEvents.find(r => r.stripe_event_id === state.filters.stripe_event_id) || null, error: null };
      }
      if (table === 'workspaces') {
        if (state.filters.id) return { data: supabaseMockState.workspaces.get(state.filters.id) || null, error: null };
        if (state.filters.stripe_customer_id) {
          for (const w of supabaseMockState.workspaces.values()) {
            if (w.stripe_customer_id === state.filters.stripe_customer_id) return { data: w, error: null };
          }
          return { data: null, error: null };
        }
        if (state.filters.billing_email) {
          for (const w of supabaseMockState.workspaces.values()) {
            if (w.billing_email === state.filters.billing_email) return { data: w, error: null };
          }
          return { data: null, error: null };
        }
      }
      return { data: null, error: null };
    }

    const chain = {
      select: () => chain,
      eq: (k, v) => { state.filters[k] = v; return chain; },
      order: () => chain,
      limit: () => chain,
      insert: (row) => { state.op = 'insert'; state.payload = row; return chain; },
      update: (patch) => { state.op = 'update'; state.payload = patch; return chain; },
      maybeSingle: async () => execute(),
      single: async () => execute(),
      then: (resolve, reject) => Promise.resolve(execute()).then(resolve, reject)
    };
    return chain;
  }
  return { from: builder };
}

function installMocks() {
  resetMocks();
  delete require.cache[require.resolve('stripe')];
  delete require.cache[require.resolve('@supabase/supabase-js')];

  Module._cache[require.resolve('stripe')] = {
    id: require.resolve('stripe'),
    filename: require.resolve('stripe'),
    loaded: true,
    exports: makeStripeMock()
  };
  Module._cache[require.resolve('@supabase/supabase-js')] = {
    id: require.resolve('@supabase/supabase-js'),
    filename: require.resolve('@supabase/supabase-js'),
    loaded: true,
    exports: { createClient: () => makeSupabaseClientMock() }
  };

  // Reload Functions
  const checkoutPath = path.resolve(__dirname, '../../netlify/functions/stripe-checkout.js');
  const webhookPath  = path.resolve(__dirname, '../../netlify/functions/stripe-webhook.js');
  delete require.cache[checkoutPath];
  delete require.cache[webhookPath];

  // Mock requireAuth in jwt-middleware (simplified)
  const middlewarePath = path.resolve(__dirname, '../../netlify/functions/lib/jwt-middleware.js');
  delete require.cache[middlewarePath];
  Module._cache[middlewarePath] = {
    id: middlewarePath,
    filename: middlewarePath,
    loaded: true,
    exports: {
      requireAuth: (handler) => async (event, context) => {
        return handler(event, Object.assign({}, context, { userEmail: 'pilot@example.de' }));
      },
      jsonResponse: (event, statusCode, obj) => ({ statusCode, body: JSON.stringify(obj) })
    }
  };

  return {
    checkout: require(checkoutPath),
    webhook:  require(webhookPath)
  };
}

function postCheckoutEvent(body) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'https://app.prova-systems.de' },
    body: JSON.stringify(body)
  };
}

function postWebhookEvent(stripeEventBody) {
  return {
    httpMethod: 'POST',
    headers: { 'stripe-signature': 't=123,v1=fake' },
    body: JSON.stringify(stripeEventBody),
    isBase64Encoded: false
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('founding-pilot checkout', () => {
  test('Pilot-Signup setzt Trial=90T + Auto-Coupon', async () => {
    const { checkout } = installMocks();
    const res = await checkout.handler(postCheckoutEvent({ pilot_program: true }), {});
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.trial_period_days, 90);
    assert.equal(body.pilot_seats_remaining, 10);

    const params = stripeMockState.capturedSessionParams;
    assert.equal(params.subscription_data.trial_period_days, 90);
    assert.deepEqual(params.discounts, [{ coupon: 'FOUNDING-99' }]);
    assert.equal(params.metadata.prova_pilot, 'true');
    assert.equal(params.subscription_data.metadata.prova_pilot, 'true');
    assert.equal(params.payment_method_collection, 'always');
  });

  test('Pilot-Sold-Out → 410', async () => {
    const { checkout } = installMocks();
    stripeMockState.couponTimesRedeemed = 10; // alle 10 Plätze weg

    const res = await checkout.handler(postCheckoutEvent({ pilot_program: true }), {});
    assert.equal(res.statusCode, 410);
    const body = JSON.parse(res.body);
    assert.equal(body.errorCode, 'PILOT_SOLD_OUT');
    assert.equal(body.seats_remaining, 0);
    assert.match(body.error, /ausgebucht/i);
  });

  test('Pilot mit plan=team → 400 PILOT_REQUIRES_SOLO', async () => {
    const { checkout } = installMocks();
    const res = await checkout.handler(postCheckoutEvent({ pilot_program: true, plan: 'team' }), {});
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.errorCode, 'PILOT_REQUIRES_SOLO');
  });

  test('Pilot-Seats remaining wird korrekt berechnet', async () => {
    const { checkout } = installMocks();
    stripeMockState.couponTimesRedeemed = 7;
    const res = await checkout.handler(postCheckoutEvent({ pilot_program: true }), {});
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.pilot_seats_remaining, 3);
  });

  test('Solo-normal (kein pilot_program) → kein Trial, kein Auto-Coupon', async () => {
    const { checkout } = installMocks();
    const res = await checkout.handler(postCheckoutEvent({ plan: 'solo' }), {});
    assert.equal(res.statusCode, 200);

    const params = stripeMockState.capturedSessionParams;
    assert.equal(params.subscription_data.trial_period_days, undefined);
    assert.equal(params.discounts, undefined);
    assert.equal(params.allow_promotion_codes, true);
    assert.equal(params.metadata.prova_pilot, 'false');
  });

  test('Solo + manueller Founding-Coupon → ohne Trial', async () => {
    const { checkout } = installMocks();
    const res = await checkout.handler(postCheckoutEvent({ plan: 'solo', coupon: 'founding' }), {});
    assert.equal(res.statusCode, 200);

    const params = stripeMockState.capturedSessionParams;
    assert.deepEqual(params.discounts, [{ coupon: 'FOUNDING-99' }]);
    assert.equal(params.subscription_data.trial_period_days, undefined);
    assert.equal(params.metadata.prova_pilot, 'false');
  });
});

describe('founding-pilot webhook', () => {
  test('checkout.session.completed mit pilot=true → abo_status=trial', async () => {
    const { webhook } = installMocks();
    const res = await webhook.handler(postWebhookEvent({
      id: 'evt_pilot_1',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_pilot_1',
          customer: 'cus_pilot_test',
          customer_email: 'pilot@example.de',
          metadata: { prova_pilot: 'true', prova_plan: 'solo' }
        }
      }
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.action, 'pilot_trial_started');

    const ws = supabaseMockState.workspaces.get('ws-pilot');
    assert.equal(ws.abo_status, 'trial');
    assert.equal(ws.abo_tier, 'solo');
    assert.ok(ws.abo_trial_endet_am);

    const auditEntry = supabaseMockState.auditTrail.find(a => a.typ === 'stripe.pilot.trial_started');
    assert.ok(auditEntry, 'Pilot-trial_started audit-log erforderlich');
  });

  test('customer.subscription.trial_will_end → audit_trail-Eintrag', async () => {
    const { webhook } = installMocks();
    const res = await webhook.handler(postWebhookEvent({
      id: 'evt_will_end_1',
      type: 'customer.subscription.trial_will_end',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_pilot_1',
          customer: 'cus_pilot_test',
          trial_end: Math.floor(Date.now() / 1000) + 3 * 86400, // in 3 Tagen
          metadata: { prova_pilot: 'true', prova_email: 'pilot@example.de' }
        }
      }
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.action, 'pilot_trial_ending_soon');

    const auditEntry = supabaseMockState.auditTrail.find(a => a.typ === 'stripe.pilot.trial_ending_soon');
    assert.ok(auditEntry, 'Pilot-trial_ending_soon audit-log erforderlich');
  });

  test('invoice.payment_succeeded nach Trial → founding_paid', async () => {
    const { webhook } = installMocks();
    // Workspace im Trial-Status
    supabaseMockState.workspaces.get('ws-pilot').abo_status = 'trial';

    const res = await webhook.handler(postWebhookEvent({
      id: 'evt_inv_paid_1',
      type: 'invoice.payment_succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'in_pilot_1',
          customer: 'cus_pilot_test',
          customer_email: 'pilot@example.de',
          subscription: 'sub_pilot_1',
          amount_paid: 9900,  // 99 EUR
          currency: 'eur',
          billing_reason: 'subscription_cycle'
        }
      }
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.action, 'pilot_founding_paid');

    const ws = supabaseMockState.workspaces.get('ws-pilot');
    assert.equal(ws.abo_status, 'aktiv');
    assert.equal(ws.letzte_zahlung_betrag_eur, 99);
    assert.ok(ws.abo_aktiv_seit, 'abo_aktiv_seit muss bei trial-to-paid gesetzt werden');

    const auditEntry = supabaseMockState.auditTrail.find(a => a.typ === 'stripe.pilot.founding_paid');
    assert.ok(auditEntry, 'founding_paid audit-log erforderlich');
  });
});
