/**
 * PROVA Stripe-Webhook Unit-Tests
 *
 * Testet die handler-Logik OHNE echten Stripe-Call und OHNE echten Supabase-Insert.
 * Strategy: Module-Cache-Manipulation für stripe + supabase-Imports → Mocks injecten.
 *
 * USAGE:
 *   node --test tests/stripe/stripe-webhook.test.js
 */
'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// ── ENV setup (vor require!) ────────────────────────────────────────────────
process.env.STRIPE_SECRET_KEY            = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET        = 'whsec_dummy';
process.env.PROVA_SUPABASE_PROJECT_URL   = 'https://dummy.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY    = 'eyJdummy';
process.env.STRIPE_PRICE_SOLO            = 'price_1TSjMZRXumrtL2n5fgToRwyr';
process.env.STRIPE_PRICE_TEAM            = 'price_1TSjNXRXumrtL2n56c6emN2k';

// ── Mocks ───────────────────────────────────────────────────────────────────
const supabaseMockState = {
  stripeEvents: [],         // Events die per insert kamen
  workspaces:   new Map(),  // id → row
  auditTrail:   [],
  users:        new Map(),  // email → { id }
  memberships:  new Map(),  // user_id → workspace_id
  shouldFailDuplicate: false
};

function resetMocks() {
  supabaseMockState.stripeEvents = [];
  supabaseMockState.workspaces.clear();
  supabaseMockState.auditTrail = [];
  supabaseMockState.users.clear();
  supabaseMockState.memberships.clear();
  supabaseMockState.shouldFailDuplicate = false;

  // Default-Test-Daten
  supabaseMockState.workspaces.set('ws-aktiv', {
    id: 'ws-aktiv',
    abo_tier: 'solo',
    abo_status: 'trial',
    billing_email: 'kunde@example.de',
    stripe_customer_id: 'cus_test_aktiv',
    gesamtzahlungen_lifetime_eur: 0
  });
  supabaseMockState.users.set('kunde@example.de', { id: 'user-kunde' });
  supabaseMockState.memberships.set('user-kunde', 'ws-aktiv');
}

function makeSupabaseClientMock() {
  function builder(table) {
    const state = { filters: {}, op: 'select', payload: null };

    function executeRead() {
      if (table === 'stripe_events') {
        const found = supabaseMockState.stripeEvents.find(r => r.stripe_event_id === state.filters.stripe_event_id);
        return { data: found || null, error: null };
      }
      if (table === 'workspaces') {
        if (state.filters.id) {
          const w = supabaseMockState.workspaces.get(state.filters.id);
          return { data: w || null, error: null };
        }
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
      if (table === 'users') {
        const u = supabaseMockState.users.get(state.filters.email);
        return { data: u || null, error: null };
      }
      if (table === 'workspace_memberships') {
        const wsId = supabaseMockState.memberships.get(state.filters.user_id);
        return { data: wsId ? { workspace_id: wsId } : null, error: null };
      }
      return { data: null, error: null };
    }

    function executeInsert() {
      const row = state.payload;
      if (table === 'stripe_events') {
        if (supabaseMockState.shouldFailDuplicate) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        const id = 'sev-' + (supabaseMockState.stripeEvents.length + 1);
        const inserted = { id, ...row };
        supabaseMockState.stripeEvents.push(inserted);
        return { data: inserted, error: null };
      }
      if (table === 'audit_trail') {
        supabaseMockState.auditTrail.push(row);
        return { data: row, error: null };
      }
      return { data: row, error: null };
    }

    function executeUpdate() {
      const patch = state.payload;
      if (table === 'workspaces' && state.filters.id) {
        const ws = supabaseMockState.workspaces.get(state.filters.id);
        if (ws) Object.assign(ws, patch);
        return { data: ws || null, error: null };
      }
      if (table === 'stripe_events' && state.filters.id) {
        const ev = supabaseMockState.stripeEvents.find(r => r.id === state.filters.id);
        if (ev) Object.assign(ev, patch);
        return { data: ev || null, error: null };
      }
      return { data: null, error: null };
    }

    function execute() {
      if (state.op === 'insert') return executeInsert();
      if (state.op === 'update') return executeUpdate();
      return executeRead();
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

// ── Stripe-Client-Mock ──────────────────────────────────────────────────────
const stripeMockState = {
  shouldThrowSignatureFail: false,
  capturedConstructEvent:   null,
  webhookSecretReceived:    null
};

function makeStripeMock() {
  return function StripeFactory(secret, opts) {
    return {
      apiVersion: opts && opts.apiVersion,
      webhooks: {
        constructEvent(body, sig, whSecret) {
          stripeMockState.webhookSecretReceived = whSecret;
          if (stripeMockState.shouldThrowSignatureFail) {
            const e = new Error('No signatures found matching the expected signature');
            throw e;
          }
          // body kann String oder Object sein — gibt's parsed zurück
          if (typeof body === 'string') return JSON.parse(body);
          return body;
        }
      },
      subscriptions: {
        async retrieve(id) {
          return {
            id,
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
            items: {
              data: [{
                price: {
                  id: 'price_1TSjMZRXumrtL2n5fgToRwyr',
                  recurring: { interval: 'month' }
                }
              }]
            }
          };
        }
      },
      customers: {
        async retrieve(id) {
          return { id, email: 'kunde@example.de' };
        }
      }
    };
  };
}

// ── Module-Cache-Manipulation: stripe + @supabase/supabase-js mocken ────────
function installMocks() {
  resetMocks();
  // Cache der echten Module löschen
  delete require.cache[require.resolve('stripe')];
  delete require.cache[require.resolve('@supabase/supabase-js')];

  // Mock-Module einsetzen
  const stripeMock = makeStripeMock();
  const supabaseClientMock = makeSupabaseClientMock();

  Module._cache[require.resolve('stripe')] = {
    id: require.resolve('stripe'),
    filename: require.resolve('stripe'),
    loaded: true,
    exports: stripeMock
  };

  Module._cache[require.resolve('@supabase/supabase-js')] = {
    id: require.resolve('@supabase/supabase-js'),
    filename: require.resolve('@supabase/supabase-js'),
    loaded: true,
    exports: { createClient: () => supabaseClientMock }
  };

  // Webhook-Modul neu laden
  const webhookPath = path.resolve(__dirname, '../../netlify/functions/stripe-webhook.js');
  delete require.cache[webhookPath];
  return require(webhookPath);
}

// ── Test-Helpers ────────────────────────────────────────────────────────────
function buildEvent(stripeEventBody) {
  return {
    httpMethod: 'POST',
    headers: { 'stripe-signature': 't=123,v1=fake' },
    body: JSON.stringify(stripeEventBody),
    isBase64Encoded: false
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('stripe-webhook signature-validation', () => {
  test('rejects request mit ungueltiger Stripe-Signatur', async () => {
    const handler = installMocks().handler;
    stripeMockState.shouldThrowSignatureFail = true;
    const res = await handler(buildEvent({ id: 'evt_1', type: 'checkout.session.completed', data: { object: {} } }));
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /signature failed/i);
    stripeMockState.shouldThrowSignatureFail = false;
  });

  test('akzeptiert valide Signatur + processed Event', async () => {
    const handler = installMocks().handler;
    const res = await handler(buildEvent({
      id: 'evt_unique_1',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      api_version: '2024-12-18.acacia',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_test_1',
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de',
          metadata: { prova_plan: 'solo' }
        }
      }
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.received, true);
    assert.equal(body.action, 'subscription_activated');
  });
});

describe('stripe-webhook idempotency', () => {
  test('Duplicate-Event wird nicht zweimal verarbeitet', async () => {
    const handler = installMocks().handler;
    const evt = buildEvent({
      id: 'evt_dup_1',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_dup',
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de'
        }
      }
    });

    const res1 = await handler(evt);
    assert.equal(res1.statusCode, 200);

    // Zweiter Aufruf mit gleichem id sollte als Duplikat erkannt werden
    const res2 = await handler(evt);
    assert.equal(res2.statusCode, 200);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.duplicate, true);
  });
});

describe('stripe-webhook event-types', () => {
  test('checkout.session.completed activates workspace', async () => {
    const handler = installMocks().handler;
    await handler(buildEvent({
      id: 'evt_co_1',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_x',
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de'
        }
      }
    }));
    const ws = supabaseMockState.workspaces.get('ws-aktiv');
    assert.equal(ws.abo_status, 'aktiv');
    assert.equal(ws.stripe_subscription_id, 'sub_x');
    assert.equal(supabaseMockState.auditTrail.length, 1);
    assert.equal(supabaseMockState.auditTrail[0].typ, 'stripe.subscription.activated');
  });

  test('invoice.payment_succeeded updates workspace lifetime', async () => {
    const handler = installMocks().handler;
    // Workspace erstmal aktiv setzen
    supabaseMockState.workspaces.get('ws-aktiv').abo_status = 'aktiv';

    await handler(buildEvent({
      id: 'evt_inv_1',
      type: 'invoice.payment_succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de',
          amount_paid: 14900,
          currency: 'eur'
        }
      }
    }));
    const ws = supabaseMockState.workspaces.get('ws-aktiv');
    assert.equal(ws.letzte_zahlung_betrag_eur, 149);
    assert.equal(ws.gesamtzahlungen_lifetime_eur, 149);
  });

  test('customer.subscription.deleted setzt abo_status=gekuendigt', async () => {
    const handler = installMocks().handler;
    await handler(buildEvent({
      id: 'evt_del_1',
      type: 'customer.subscription.deleted',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_x',
          customer: 'cus_test_aktiv',
          metadata: { prova_email: 'kunde@example.de' }
        }
      }
    }));
    const ws = supabaseMockState.workspaces.get('ws-aktiv');
    assert.equal(ws.abo_status, 'gekuendigt');
    assert.ok(ws.abo_gekuendigt_am);
  });

  test('invoice.payment_failed setzt abo_status=ueberfaellig', async () => {
    const handler = installMocks().handler;
    await handler(buildEvent({
      id: 'evt_fail_1',
      type: 'invoice.payment_failed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de',
          attempt_count: 1
        }
      }
    }));
    const ws = supabaseMockState.workspaces.get('ws-aktiv');
    assert.equal(ws.abo_status, 'ueberfaellig');
  });

  test('unbekannter event_type wird ignoriert', async () => {
    const handler = installMocks().handler;
    const res = await handler(buildEvent({
      id: 'evt_unknown_1',
      type: 'some.weird.event',
      created: Math.floor(Date.now() / 1000),
      data: { object: {} }
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ignored, 'some.weird.event');
  });
});

describe('stripe-webhook addon-payment', () => {
  test('Add-on-Kauf wird in audit_trail geloggt (one-time payment)', async () => {
    const handler = installMocks().handler;
    await handler(buildEvent({
      id: 'evt_addon_1',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_addon_1',
          mode: 'payment',
          customer: 'cus_test_aktiv',
          customer_email: 'kunde@example.de',
          amount_total: 4500,
          currency: 'eur',
          metadata: { prova_plan: 'addon-10', prova_addon: '1' }
        }
      }
    }));
    const addonLog = supabaseMockState.auditTrail.find(a => a.typ === 'stripe.addon.purchased');
    assert.ok(addonLog, 'addon-purchased Log muss existieren');
  });
});

describe('stripe-webhook ENV-validation', () => {
  test('fehlende STRIPE_SECRET_KEY → 500', async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const handler = installMocks().handler;
    const res = await handler(buildEvent({ id: 'x', type: 'y', data: { object: {} } }));
    assert.equal(res.statusCode, 500);
    process.env.STRIPE_SECRET_KEY = orig;
  });

  test('fehlende SUPABASE_SERVICE_ROLE_KEY → 500', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const handler = installMocks().handler;
    const res = await handler(buildEvent({ id: 'x', type: 'y', data: { object: {} } }));
    assert.equal(res.statusCode, 500);
    process.env.SUPABASE_SERVICE_ROLE_KEY = orig;
  });
});

describe('stripe-webhook method-validation', () => {
  test('GET → 405', async () => {
    const handler = installMocks().handler;
    const res = await handler({ httpMethod: 'GET', headers: {}, body: '' });
    assert.equal(res.statusCode, 405);
  });
});
