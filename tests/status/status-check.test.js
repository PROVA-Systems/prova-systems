'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { __SERVICES, __probe } = require('../../netlify/functions/status-check');

test('Status: 6 Services definiert', () => {
  assert.strictEqual(__SERVICES.length, 6);
  assert.deepStrictEqual(
    __SERVICES.sort(),
    ['frontend', 'openai', 'pdfmonkey', 'resend', 'stripe', 'supabase']
  );
});

test('Status: probe() liefert Objekt mit service+status+latency_ms', async () => {
  // Mock fetch so we don't hit real APIs
  const origFetch = global.fetch;
  global.fetch = async () => ({ status: 200, ok: true });
  try {
    const r = await __probe('frontend');
    assert.strictEqual(r.service, 'frontend');
    assert.strictEqual(r.status, 'up');
    assert.ok(typeof r.latency_ms === 'number');
    assert.match(r.detail, /HTTP 200/);
  } finally {
    global.fetch = origFetch;
  }
});

test('Status: probe() bei 500 → status="down"', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ status: 500, ok: false });
  try {
    const r = await __probe('stripe');
    assert.strictEqual(r.status, 'down');
  } finally {
    global.fetch = origFetch;
  }
});

test('Status: probe() bei Throw → status="down" + detail=error.message', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  try {
    const r = await __probe('openai');
    assert.strictEqual(r.status, 'down');
    assert.match(r.detail, /ECONNREFUSED/);
  } finally {
    global.fetch = origFetch;
  }
});

test('Status: probe() unknown service', async () => {
  const r = await __probe('notreal');
  assert.strictEqual(r.status, 'unknown');
});

test('Status: probe() bei 200-499 = up', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ status: 401, ok: false });
  try {
    // 401 = up (means service is reachable, just auth fail)
    const r = await __probe('resend');
    assert.strictEqual(r.status, 'up');
  } finally {
    global.fetch = origFetch;
  }
});
