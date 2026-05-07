'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Env = require('../../netlify/functions/admin-env-status');
const Agg = require('../../netlify/functions/admin-ki-aggregations');
const Stats = require('../../netlify/functions/get-referral-stats');
const Mode = require('../../netlify/functions/auftrag-mode-override');

const HISTORY_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'get-referral-history.js'), 'utf8');

// === W2.1 admin-env-status ===
test('W2.1: ENV_KEYS_SAFE enthält 12 wichtige ENVs', () => {
  assert.ok(Env.__ENV_KEYS_SAFE.includes('SUPABASE_URL'));
  assert.ok(Env.__ENV_KEYS_SAFE.includes('STRIPE_SECRET_KEY'));
  assert.ok(Env.__ENV_KEYS_SAFE.includes('OPENAI_API_KEY'));
  assert.ok(Env.__ENV_KEYS_SAFE.length >= 10);
});

test('W2.1: envStatus liefert pro Key { set, length, preview }', () => {
  process.env.TEST_SAFE_KEY_X = 'abcdefghij';
  Env.__ENV_KEYS_SAFE.push('TEST_SAFE_KEY_X');
  const out = Env.__envStatus();
  assert.strictEqual(out.TEST_SAFE_KEY_X.set, true);
  assert.strictEqual(out.TEST_SAFE_KEY_X.length, 10);
  assert.match(out.TEST_SAFE_KEY_X.preview, /…$/);
  Env.__ENV_KEYS_SAFE.pop();
  delete process.env.TEST_SAFE_KEY_X;
});

test('W2.1: envStatus liefert {set:false} bei missing ENV', () => {
  Env.__ENV_KEYS_SAFE.push('NEVER_SET_KEY_XYZ');
  const out = Env.__envStatus();
  assert.strictEqual(out.NEVER_SET_KEY_XYZ.set, false);
  Env.__ENV_KEYS_SAFE.pop();
});

// === W2.2 admin-ki-aggregations ===
test('W2.2: ALLOWED_RANGES + ALLOWED_GROUPS', () => {
  assert.deepStrictEqual(Object.keys(Agg.__ALLOWED_RANGES), ['7d', '30d', '90d']);
  assert.deepStrictEqual(Agg.__ALLOWED_GROUPS, ['user', 'model', 'day']);
});

test('W2.2: aggregateRows by user', () => {
  const rows = [
    { user_id: 'u1', token_input: 100, token_output: 50, kosten_eur: 0.01 },
    { user_id: 'u1', token_input: 200, token_output: 100, kosten_eur: 0.02 },
    { user_id: 'u2', token_input: 50, token_output: 25, kosten_eur: 0.005 }
  ];
  const out = Agg.__aggregateRows(rows, 'user');
  assert.strictEqual(out.length, 2);
  const u1 = out.find(r => r.key === 'u1');
  assert.strictEqual(u1.count, 2);
  assert.strictEqual(u1.token_input, 300);
  assert.strictEqual(u1.kosten_eur, 0.03);
});

test('W2.2: aggregateRows sorted by kosten DESC', () => {
  const rows = [
    { user_id: 'u1', kosten_eur: 1 },
    { user_id: 'u2', kosten_eur: 5 },
    { user_id: 'u3', kosten_eur: 2 }
  ];
  const out = Agg.__aggregateRows(rows, 'user');
  assert.strictEqual(out[0].key, 'u2');
  assert.strictEqual(out[2].key, 'u1');
});

test('W2.2: aggregateRows by day (created_at slice)', () => {
  const rows = [
    { created_at: '2026-05-07T10:00:00Z', kosten_eur: 1 },
    { created_at: '2026-05-07T15:00:00Z', kosten_eur: 2 },
    { created_at: '2026-05-08T10:00:00Z', kosten_eur: 3 }
  ];
  const out = Agg.__aggregateRows(rows, 'day');
  assert.strictEqual(out.length, 2);
  const d7 = out.find(r => r.key === '2026-05-07');
  assert.strictEqual(d7.count, 2);
});

// === W2.3 get-referral-history ===
test('W2.3: Lambda referenziert referrals-Tabelle + referrer_user_id', () => {
  assert.match(HISTORY_SRC, /from\(['"]referrals['"]\)/);
  assert.match(HISTORY_SRC, /\.eq\(['"]referrer_user_id['"]/);
});

// === W2.4 get-referral-stats ===
test('W2.4: computeStats berechnet conversion_rate_pct', () => {
  const rows = [
    { status: 'pending' },
    { status: 'converted', mrr_eur: 179, reward_amount_eur: 50 },
    { status: 'rewarded', mrr_eur: 379, reward_amount_eur: 50 }
  ];
  const s = Stats.__computeStats(rows);
  assert.strictEqual(s.total_invited, 3);
  assert.strictEqual(s.total_converted, 2);
  assert.strictEqual(s.total_rewards_eur, 100);
  assert.strictEqual(s.mrr_attributed_eur, 558);
  assert.ok(s.conversion_rate_pct >= 66 && s.conversion_rate_pct <= 67);
});

test('W2.4: computeStats Empty-State', () => {
  const s = Stats.__computeStats([]);
  assert.strictEqual(s.total_invited, 0);
  assert.strictEqual(s.conversion_rate_pct, 0);
});

// === W2.5 auftrag-mode-override ===
test('W2.5: VALID_MODES = [A, B, C]', () => {
  assert.deepStrictEqual(Mode.__VALID_MODES, ['A', 'B', 'C']);
});

test('W2.5: alle 5 Lambdas haben requireAuth + RateLimit', () => {
  const files = ['admin-env-status.js','admin-ki-aggregations.js','get-referral-history.js','get-referral-stats.js','auftrag-mode-override.js'];
  files.forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', f), 'utf8');
    assert.match(src, /requireAuth/, f + ' fehlt requireAuth');
    assert.match(src, /RateLimit\.check/, f + ' fehlt RateLimit');
  });
});
