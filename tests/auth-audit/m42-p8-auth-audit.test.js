/**
 * MEGA⁴² P8 — Auth-Audit-Runner Tests
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const auditor = require(path.join(__dirname, '..', '..', 'scripts', 'auth-audit-runner.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS = path.join(ROOT, 'netlify', 'functions');

// ─── audit() function ─────────────────────────────────────

test('P8: audit() exports', () => {
  assert.equal(typeof auditor.audit, 'function');
  assert.ok(auditor.PUBLIC_LAMBDAS instanceof Set);
});

test('P8: audit erkennt Standard-Auth (requireAuth)', () => {
  const f = path.join(FUNCTIONS, 'document-save.js');
  const r = auditor.audit(f);
  assert.equal(r.auth_guard, true);
  assert.equal(r.auth_type, 'standard');
});

test('P8: audit erkennt admin-auth-guard', () => {
  const f = path.join(FUNCTIONS, 'admin-pdfmonkey-inventory.js');
  const r = auditor.audit(f);
  assert.equal(r.auth_guard, true);
});

test('P8: audit erkennt custom Internal-Secret', () => {
  const f = path.join(FUNCTIONS, 'admin-cache-clear.js');
  const r = auditor.audit(f);
  assert.equal(r.auth_guard, true);
  assert.equal(r.auth_type, 'custom-secret');
});

test('P8: audit erkennt cors+rate_limit+sentry+method_guard', () => {
  const f = path.join(FUNCTIONS, 'document-save.js');
  const r = auditor.audit(f);
  assert.equal(r.cors, true);
  assert.equal(r.rate_limit, true);
  assert.equal(r.sentry, true);
  assert.equal(r.method_guard, true);
});

// ─── Coverage-Threshold ───────────────────────────────────

test('P8: Auth-Coverage >= 90% aller Lambdas', () => {
  const files = fs.readdirSync(FUNCTIONS)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(FUNCTIONS, f));
  const results = files.map(auditor.audit);
  const guarded = results.filter(r => r.auth_guard).length;
  const pct = guarded / results.length;
  assert.ok(pct >= 0.90, `Coverage ${(pct * 100).toFixed(0)}% unter Threshold 90%`);
});

test('P8: 0 Unintentional-Public Lambdas', () => {
  const files = fs.readdirSync(FUNCTIONS)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(FUNCTIONS, f));
  const results = files.map(f => ({ ...auditor.audit(f), file: path.basename(f) }));
  const unintentional = results.filter(r => !r.auth_guard && !auditor.PUBLIC_LAMBDAS.has(r.file));
  assert.equal(unintentional.length, 0, 'Unintentional public: ' + unintentional.map(r => r.file).join(', '));
});

test('P8: Method-Guard auf 95%+ Lambdas', () => {
  const files = fs.readdirSync(FUNCTIONS)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(FUNCTIONS, f));
  const results = files.map(auditor.audit);
  const pct = results.filter(r => r.method_guard).length / results.length;
  assert.ok(pct >= 0.95, `Method-Guard ${(pct * 100).toFixed(0)}% unter 95%`);
});

test('P8: Sentry-Wrap auf 80%+ Lambdas', () => {
  const files = fs.readdirSync(FUNCTIONS)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(FUNCTIONS, f));
  const results = files.map(auditor.audit);
  const pct = results.filter(r => r.sentry).length / results.length;
  assert.ok(pct >= 0.80, `Sentry ${(pct * 100).toFixed(0)}% unter 80%`);
});

// ─── RLS-Migration 40 ─────────────────────────────────────

test('P8: Migration 40 (RLS-Security-Fix) existiert', () => {
  const f = path.join(ROOT, 'supabase-migrations', '40_m42_rls_security_fix.sql');
  assert.ok(fs.existsSync(f));
});

test('P8: Migration 40 enabled RLS für system_health_history', () => {
  const f = path.join(ROOT, 'supabase-migrations', '40_m42_rls_security_fix.sql');
  const sql = fs.readFileSync(f, 'utf8');
  assert.match(sql, /ALTER TABLE public\.system_health_history ENABLE ROW LEVEL SECURITY/);
});

test('P8: Migration 40 enabled RLS für push_alert_log', () => {
  const f = path.join(ROOT, 'supabase-migrations', '40_m42_rls_security_fix.sql');
  const sql = fs.readFileSync(f, 'utf8');
  assert.match(sql, /ALTER TABLE public\.push_alert_log ENABLE ROW LEVEL SECURITY/);
});

test('P8: Migration 40 hat 4 Policies (2 pro Tabelle)', () => {
  const f = path.join(ROOT, 'supabase-migrations', '40_m42_rls_security_fix.sql');
  const sql = fs.readFileSync(f, 'utf8');
  const policies = sql.match(/CREATE POLICY/g) || [];
  assert.equal(policies.length, 4);
});

test('P8: Migration 40 ist idempotent (DROP IF EXISTS pattern)', () => {
  const f = path.join(ROOT, 'supabase-migrations', '40_m42_rls_security_fix.sql');
  const sql = fs.readFileSync(f, 'utf8');
  assert.match(sql, /DROP POLICY IF EXISTS/);
});

// ─── PUBLIC_LAMBDAS Allowlist ──────────────────────────────

test('P8: PUBLIC_LAMBDAS enthält bewusste Public-Endpoints', () => {
  assert.ok(auditor.PUBLIC_LAMBDAS.has('public-status.js'));
  assert.ok(auditor.PUBLIC_LAMBDAS.has('admin-auth.js'));  // Login-Endpoint
  assert.ok(auditor.PUBLIC_LAMBDAS.has('stripe-webhook.js'));  // Stripe-Signature
});

test('P8: Allowlist hat <40 Einträge (sonst Anti-Pattern)', () => {
  assert.ok(auditor.PUBLIC_LAMBDAS.size < 40, 'Allowlist size: ' + auditor.PUBLIC_LAMBDAS.size);
});
