'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const funnelSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'admin-conversion-funnel.js'), 'utf8');
const mrrSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'admin-mrr-live.js'), 'utf8');

test('Funnel: 4 Stages (Signup → Demo → Real → Paid)', () => {
  assert.match(funnelSrc, /Signup/);
  assert.match(funnelSrc, /Demo-Fall erstellt/);
  assert.match(funnelSrc, /Echter Auftrag/);
  assert.match(funnelSrc, /Trial → Paid/);
});

test('Funnel: Stage 2 nutzt is_demo=true', () => {
  assert.match(funnelSrc, /eq\(['"]is_demo['"]\s*,\s*true\)/);
});

test('Funnel: Stage 3 nutzt is_demo=false', () => {
  assert.match(funnelSrc, /eq\(['"]is_demo['"]\s*,\s*false\)/);
});

test('Funnel: Stage 4 nutzt abo_status=aktiv', () => {
  assert.match(funnelSrc, /abo_status['"]\s*,\s*['"]aktiv['"]/);
});

test('Funnel: Drop-off-Rate berechnet pro Stage', () => {
  assert.match(funnelSrc, /dropoff_rate/);
  assert.match(funnelSrc, /Math\.round/);
});

test('Funnel: requireAdmin Guard', () => {
  assert.match(funnelSrc, /requireAdmin/);
});

test('MRR: Stripe-API mit ENV-Fallback PROVA_STRIPE_SECRET_KEY → STRIPE_SECRET_KEY', () => {
  assert.match(mrrSrc, /PROVA_STRIPE_SECRET_KEY\s*\|\|\s*process\.env\.STRIPE_SECRET_KEY/);
});

test('MRR: Founding-Member-Detection via FOUNDING-99 Coupon', () => {
  assert.match(mrrSrc, /FOUNDING-99/);
  assert.match(mrrSrc, /9900/);
});

test('MRR: Annual subscriptions geteilt durch 12', () => {
  assert.match(mrrSrc, /interval === ['"]year['"]/);
  assert.match(mrrSrc, /\/\s*12/);
});

test('MRR: Breakdown solo/team/founding', () => {
  assert.match(mrrSrc, /solo:\s*0/);
  assert.match(mrrSrc, /team:\s*0/);
  assert.match(mrrSrc, /founding:\s*0/);
});
