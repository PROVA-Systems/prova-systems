'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { __SERVICES, __probe } = require('../../netlify/functions/status-check');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'status-check.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'status.html'), 'utf8');

test('Status: 6 Services mit kategorie ENUM-Mapping', () => {
  assert.strictEqual(__SERVICES.length, 6);
  __SERVICES.forEach(s => {
    assert.ok(s.kategorie);
    assert.ok(s.component);
  });
});

test('Status: kategorie-Werte aus health_check_kategorie ENUM (W12-I0)', () => {
  const valid = ['database', 'storage', 'edge_function', 'pdfmonkey', 'openai', 'stripe', 'make', 'email_smtp', 'frontend', 'sonstiges'];
  __SERVICES.forEach(s => {
    assert.ok(valid.indexOf(s.kategorie) >= 0, `kategorie ${s.kategorie} muss aus ENUM sein`);
  });
});

test('Status: probe() liefert Schema-konformes Objekt (kategorie + component + status + response_time_ms)', async () => {
  const orig = global.fetch;
  global.fetch = async () => ({ status: 200, ok: true });
  try {
    const r = await __probe({ kategorie: 'frontend', component: 'netlify-frontend' });
    assert.strictEqual(r.kategorie, 'frontend');
    assert.strictEqual(r.component, 'netlify-frontend');
    assert.strictEqual(r.status, 'up');
    assert.ok(typeof r.response_time_ms === 'number');
  } finally { global.fetch = orig; }
});

test('Status: probe() bei Throw → details.error gefüllt', async () => {
  const orig = global.fetch;
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  try {
    const r = await __probe({ kategorie: 'openai', component: 'openai-api' });
    assert.strictEqual(r.status, 'down');
    assert.match(r.error_message, /ECONNREFUSED/);
    assert.ok(r.details && r.details.error);
  } finally { global.fetch = orig; }
});

test('Status: Insert in system_health (NICHT service_health)', () => {
  assert.match(src, /from\(['"]system_health['"]/);
  assert.ok(!/from\(['"]service_health['"]/.test(src));
});

test('Status: Cron-Secret-ENV-Fallback PROVA_STATUS_CRON_SECRET → STATUS_CRON_SECRET', () => {
  assert.match(src, /PROVA_STATUS_CRON_SECRET\s*\|\|\s*process\.env\.STATUS_CRON_SECRET/);
});

test('Status: GET-Response nutzt component (NICHT service)', () => {
  assert.match(src, /eq\(['"]component['"]/);
  assert.match(src, /eq\(['"]kategorie['"]/);
});

test('Status: GET-Response nutzt sampled_at (NICHT checked_at)', () => {
  // Lambda-Body
  const codeOnly = src.replace(/Schema \(W12-I0\)[\s\S]*?\*\//, '');
  assert.match(codeOnly, /sampled_at/);
});

test('Status: alte service_health-Migration GELÖSCHT', () => {
  const dir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
  const files = fs.readdirSync(dir);
  assert.ok(!files.includes('2026_05_10_w10b_service_health.sql'));
});

test('Frontend status.html: Map auf component (NICHT service)', () => {
  assert.match(html, /'supabase-postgres':/);
  assert.match(html, /'stripe-api':/);
  assert.match(html, /'resend-api':/);
  assert.match(html, /s\.component/);
});

test('Frontend status.html: response_time_ms (NICHT latency_ms)', () => {
  assert.match(html, /response_time_ms/);
});
