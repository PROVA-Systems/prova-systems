'use strict';

/**
 * MEGA³⁷ A1 — admin-dashboard-logic.js Airtable→Supabase Migration Tests
 *
 * Verifiziert:
 *  - 0 airtable-Lambda-Calls in admin-dashboard-logic.js
 *  - at()-Dispatcher mappt Bridge-Keys auf Supabase-Lambdas
 *  - checkSupabaseHealth (statt checkAirtableHealth) als Loader
 *  - Pricing-Comments synchron 179€/379€ (CLAUDE.md Regel 21)
 *  - admin-support-update Lambda existiert + auth-protected
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const logicSrc = fs.readFileSync(path.join(ROOT, 'admin-dashboard-logic.js'), 'utf8');
const supportUpdateSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'admin-support-update.js'), 'utf8');
const SupportUpdate = require(path.join(ROOT, 'netlify', 'functions', 'admin-support-update.js'));

test('A1: 0 airtable-Lambda-Calls in admin-dashboard-logic.js', () => {
  // Lebende Aufrufe — Comments dürfen erwähnen
  const liveCalls = (logicSrc.match(/provaFetch\([^)]*\/\.netlify\/functions\/airtable['"]/g) || []).length;
  assert.strictEqual(liveCalls, 0, 'erwartet: keine Live-Airtable-Aufrufe');
});

test('A1: at()-Dispatcher mappt Bridge-Keys auf Supabase-Lambdas', () => {
  // Lookup-Map mit Bridge-Keys
  ['kunden', 'support', 'pipeline', 'finanzen_mrr', 'audit_log', 'ki_statistik']
    .forEach(key => {
      assert.match(logicSrc, new RegExp("['\"]" + key + "['\"]\\s*:\\s*['\"]admin-"));
    });
});

test('A1: at() ruft /.netlify/functions/{lambda} mit GET (kein Airtable-POST)', () => {
  // Pattern: const url = '/.netlify/functions/' + lambda + ...
  assert.match(logicSrc, /const url = ['"]\/\.netlify\/functions\/['"] \+ lambda/);
  assert.match(logicSrc, /method:\s*['"]GET['"]/);
});

test('A1: at() Adapter konvertiert Supabase-Response zu Airtable-Format', () => {
  // {records: [{id, fields, _source: 'supabase'}]}
  assert.match(logicSrc, /records:\s*items\.map/);
  assert.match(logicSrc, /_source:\s*['"]supabase['"]/);
});

test('A1: checkSupabaseHealth ist definiert + als Alias für Backward-Compat', () => {
  assert.match(logicSrc, /async function checkSupabaseHealth\(/);
  assert.match(logicSrc, /var checkAirtableHealth = checkSupabaseHealth/);
});

test('A1: loadAll ruft checkSupabaseHealth (nicht checkAirtableHealth)', () => {
  assert.match(logicSrc, /loadAll[\s\S]*?checkSupabaseHealth\(\)/);
});

test('A1: window-Marker __PROVA_ADMIN_DATA_SOURCE = "supabase"', () => {
  assert.match(logicSrc, /window\.__PROVA_ADMIN_DATA_SOURCE\s*=\s*['"]supabase['"]/);
});

test('A3: Pricing-Comments fixed — kein 149€/279€ mehr in Code', () => {
  // mrrs-Object: Solo:179, Team:379
  assert.match(logicSrc, /mrrs\s*=\s*\{Solo:179,Team:379\}/);
  // MRR-Mix-Display: 179, 379
  assert.match(logicSrc, /counts\.Solo\*179/);
  assert.match(logicSrc, /counts\.Team\*379/);
});

test('admin-support-update: Lambda hat requireAuth + valid statuses', () => {
  assert.match(supportUpdateSrc, /requireAuth/);
  ['Offen', 'In Bearbeitung', 'Gelöst', 'Geschlossen'].forEach(s => {
    assert.ok(SupportUpdate.__VALID_STATUSES.includes(s), 'Status fehlt: ' + s);
  });
});

test('admin-support-update: lehnt Methoden außer POST/OPTIONS ab', () => {
  assert.match(supportUpdateSrc, /event\.httpMethod !== ['"]POST['"]/);
  assert.match(supportUpdateSrc, /405/);
});

test('admin-support-update: 400 bei fehlender ticket_id oder ungültigem Status', () => {
  assert.match(supportUpdateSrc, /ticket_id pflicht/);
  assert.match(supportUpdateSrc, /status ungültig/);
});

test('admin-support-update: schreibt updated_at-Timestamp', () => {
  assert.match(supportUpdateSrc, /updated_at:\s*new Date\(\)\.toISOString\(\)/);
});
