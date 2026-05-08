'use strict';

/**
 * MEGA³⁷ C — Vault-Migration Tests (C1-C7)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Cache = require(path.join(ROOT, 'lib', 'service-endpoints-cache.js'));
const Helper = require(path.join(ROOT, 'netlify', 'functions', 'lib', 'get-make-webhook-url.js'));

const lambdaSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'list-service-endpoints.js'), 'utf8');
const m25Sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '25_service_endpoints.sql'), 'utf8');
const m26Sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '26_vault_helpers.sql'), 'utf8');
const cleanupDoc = fs.readFileSync(path.join(ROOT, 'docs', 'ops', 'MEGA37-MARCEL-VAULT-MIGRATION.md'), 'utf8');

// ── C1 service_endpoints ────────────────────────────────
test('C1: Migration 25 erstellt service_endpoints mit RLS + 10 SEED-Hooks', () => {
  assert.match(m25Sql, /CREATE TABLE IF NOT EXISTS public\.service_endpoints/);
  assert.match(m25Sql, /ENABLE ROW LEVEL SECURITY/);
  // Mindestens 10 distinct make:-Keys in INSERTs (Comments dürfen mehr enthalten)
  const distinctKeys = new Set(m25Sql.match(/'make:[a-z0-9-]+'/g) || []);
  assert.ok(distinctKeys.size >= 10, 'erwartet ≥10 distinct keys, bekommen ' + distinctKeys.size);
});

test('C1: Migration 25 SEED-Hooks haben active=FALSE (Marcel-Pflicht-Update)', () => {
  // Alle 10 Inserts enden auf , FALSE)
  const falseCount = (m25Sql.match(/, FALSE\)/g) || []).length;
  assert.strictEqual(falseCount, 10);
});

test('C1: Migration 25 hat 2 RLS-Policies (read + write)', () => {
  assert.match(m25Sql, /service_endpoints_read_authenticated/);
  assert.match(m25Sql, /service_endpoints_write_service_role/);
  assert.match(m25Sql, /auth\.role\(\) = 'service_role'/);
});

// ── C2 vault_helpers ────────────────────────────────────
test('C2: Migration 26 definiert get_vault_secret + has_vault_secret', () => {
  assert.match(m26Sql, /CREATE OR REPLACE FUNCTION public\.get_vault_secret/);
  assert.match(m26Sql, /CREATE OR REPLACE FUNCTION public\.has_vault_secret/);
});

test('C2: get_vault_secret ist SECURITY DEFINER + service_role-only', () => {
  assert.match(m26Sql, /SECURITY DEFINER/);
  assert.match(m26Sql, /auth\.role\(\) != 'service_role'/);
  assert.match(m26Sql, /Permission denied/);
});

test('C2: has_vault_secret ist authenticated-readable (Existenz-Check)', () => {
  assert.match(m26Sql, /GRANT EXECUTE ON FUNCTION public\.has_vault_secret\(TEXT\) TO authenticated/);
});

// ── C4 service-endpoints-cache ──────────────────────────
test('C4: ProvaServiceEndpoints exposed byKey/byType/invalidate', () => {
  assert.strictEqual(typeof Cache.byKey, 'function');
  assert.strictEqual(typeof Cache.byType, 'function');
  assert.strictEqual(typeof Cache.invalidate, 'function');
});

test('C4: byKey filtert active=true und matcht service_key', async () => {
  Cache._setCacheForTests([
    { service_key: 'make:l3-lifecycle-trial', endpoint_url: 'https://hook/L3', service_type: 'make', active: true },
    { service_key: 'make:l8-lifecycle-renewal', endpoint_url: 'https://hook/L8', service_type: 'make', active: false }
  ]);
  const l3 = await Cache.byKey('make:l3-lifecycle-trial');
  assert.ok(l3);
  assert.strictEqual(l3.endpoint_url, 'https://hook/L3');
  // active=false → kein Match
  const l8 = await Cache.byKey('make:l8-lifecycle-renewal');
  assert.strictEqual(l8, null);
  Cache.invalidate();
});

test('C4: byType liefert nur active=true Endpoints des Typs', async () => {
  Cache._setCacheForTests([
    { service_key: 'make:a', service_type: 'make', endpoint_url: 'X', active: true },
    { service_key: 'make:b', service_type: 'make', endpoint_url: 'Y', active: false },
    { service_key: 'api:c',  service_type: 'api',  endpoint_url: 'Z', active: true }
  ]);
  const makes = await Cache.byType('make');
  assert.strictEqual(makes.length, 1);
  Cache.invalidate();
});

test('C4: TTL ist 5 Minuten', () => {
  assert.strictEqual(Cache._TTL_MS, 5 * 60 * 1000);
});

// ── C4 list-service-endpoints Lambda ────────────────────
test('C4 Lambda: list-service-endpoints requireAuth + GET-only + active-Filter', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /event\.httpMethod !== ['"]GET['"]/);
  assert.match(lambdaSrc, /\.eq\(['"]active['"],\s*true\)/);
});

// ── C5 get-make-webhook-url Helper ──────────────────────
test('C5: Helper exposed getMakeWebhookUrl + LEGACY_ENV_MAP', () => {
  assert.strictEqual(typeof Helper.getMakeWebhookUrl, 'function');
  assert.ok(typeof Helper.__LEGACY_ENV_MAP === 'object');
  assert.strictEqual(Object.keys(Helper.__LEGACY_ENV_MAP).length, 10);
});

test('C5: LEGACY_ENV_MAP enthält alle 10 Make-Service-Keys', () => {
  ['make:g1-gutachten','make:g3-pdf','make:k2-kommunikation',
   'make:l3-lifecycle-trial','make:l8-lifecycle-renewal',
   'make:l9-lifecycle-cancel','make:l10-lifecycle-final',
   'make:a5-admin','make:t3-termine','make:f1-finanzen'
  ].forEach(k => {
    assert.ok(k in Helper.__LEGACY_ENV_MAP, 'Key fehlt: ' + k);
  });
});

test('C5: getMakeWebhookUrl liefert null bei null/empty/unbekannt', async () => {
  assert.strictEqual(await Helper.getMakeWebhookUrl(null), null);
  assert.strictEqual(await Helper.getMakeWebhookUrl(''), null);
});

// ── C7 Marcel-Cleanup-Doku ──────────────────────────────
test('C7: Cleanup-Doku enthält alle 6 Marcel-Schritte', () => {
  ['Schritt 1', 'Schritt 2', 'Schritt 3', 'Schritt 4', 'Schritt 5', 'Schritt 6']
    .forEach(s => assert.ok(cleanupDoc.includes(s), s + ' fehlt'));
});

test('C7: Doku zeigt 7-10 ENVs als Soll-Zustand für Netlify', () => {
  assert.match(cleanupDoc, /7-10 ENVs/);
  assert.match(cleanupDoc, /BEHALTEN/);
});

test('C7: Doku referenziert vault.create_secret + supabase secrets set', () => {
  assert.match(cleanupDoc, /vault\.create_secret/);
  assert.match(cleanupDoc, /supabase secrets set/);
});

test('C7: Doku enthält Compounding-Lesson zur W6.2-Verwerfung', () => {
  assert.match(cleanupDoc, /M³⁶ W6\.2/);
  assert.match(cleanupDoc, /verworfen/);
});
