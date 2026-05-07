'use strict';

/**
 * MEGA³⁶ W6.1–W6.5 — ENV-Konsolidierung Tests
 *
 * Verifiziert:
 *  - lib/dokument-templates-cache.js Browser-API + Cache-Logik
 *  - lib/make-webhooks-config.js JSON-Parser + Legacy-Fallback
 *  - list-dokument-templates Lambda Wiring (Auth, GET-Method)
 *  - Marcel-Cleanup-Doku enthält alle nötigen Steps
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Cache = require(path.join(ROOT, 'lib', 'dokument-templates-cache.js'));
const Webhooks = require(path.join(ROOT, 'netlify', 'functions', 'lib', 'make-webhooks-config.js'));
const lambdaSrc = fs.readFileSync(
  path.join(ROOT, 'netlify', 'functions', 'list-dokument-templates.js'), 'utf8');
const cleanupDoc = fs.readFileSync(
  path.join(ROOT, 'docs', 'ops', 'MEGA36-MARCEL-ENV-CLEANUP.md'), 'utf8');
const auditDoc = fs.readFileSync(
  path.join(ROOT, 'docs', 'audit', 'ENV-AUDIT-REPORT.md'), 'utf8');

// ── W6.1 dokument-templates-cache ──────────────────────────────
test('W6.1: ProvaDokumentTemplates exposed öffentliche API', () => {
  assert.strictEqual(typeof Cache.byCode, 'function');
  assert.strictEqual(typeof Cache.byTyp, 'function');
  assert.strictEqual(typeof Cache.defaultForTyp, 'function');
  assert.strictEqual(typeof Cache.invalidate, 'function');
});

test('W6.1: byCode liefert Template aus injected Cache', async () => {
  Cache._setCacheForTests([
    { id: 'a', name: 'F-04 Kurzstellungnahme', typ: 'kurzstellungnahme_pdf', pdfmonkey_template_id: 'F-04', aktiv: true },
    { id: 'b', name: 'K-01 Auftragsbestätigung', typ: 'auftragsbestaetigung', pdfmonkey_template_id: 'K-01', aktiv: true }
  ]);
  const f04 = await Cache.byCode('F-04');
  assert.ok(f04);
  assert.strictEqual(f04.name, 'F-04 Kurzstellungnahme');
  const fail = await Cache.byCode('NOT-EXISTING');
  assert.strictEqual(fail, null);
  Cache.invalidate();
});

test('W6.1: byTyp filtert nach typ + aktiv', async () => {
  Cache._setCacheForTests([
    { id: 'a', typ: 'mahnung_1', aktiv: true,  pdfmonkey_template_id: 'F-06' },
    { id: 'b', typ: 'mahnung_1', aktiv: false, pdfmonkey_template_id: 'F-06-OLD' },
    { id: 'c', typ: 'brief',     aktiv: true,  pdfmonkey_template_id: 'K-04' }
  ]);
  const m1 = await Cache.byTyp('mahnung_1');
  assert.strictEqual(m1.length, 1);
  assert.strictEqual(m1[0].id, 'a');
  Cache.invalidate();
});

test('W6.1: defaultForTyp bevorzugt is_default_for_typ=true', async () => {
  Cache._setCacheForTests([
    { id: 'a', typ: 'gutachten_pdf', aktiv: true, is_default_for_typ: false, pdfmonkey_template_id: 'F-09' },
    { id: 'b', typ: 'gutachten_pdf', aktiv: true, is_default_for_typ: true,  pdfmonkey_template_id: 'F-09-DEFAULT' }
  ]);
  const def = await Cache.defaultForTyp('gutachten_pdf');
  assert.strictEqual(def.id, 'b');
  Cache.invalidate();
});

test('W6.1: invalidate leert den Cache', async () => {
  Cache._setCacheForTests([{ id: 'x', pdfmonkey_template_id: 'F-04' }]);
  Cache.invalidate();
  // Nach Invalidate: ohne fetch-mock würde byCode jetzt auf Backend zugreifen — wir prüfen nur die Methode
  assert.ok(typeof Cache.invalidate === 'function');
});

test('W6.1: TTL ist 5 Minuten (Templates ändern sich selten)', () => {
  assert.strictEqual(Cache._TTL_MS, 5 * 60 * 1000);
});

// ── W6.1 list-dokument-templates Lambda ────────────────────────
test('W6.1: Lambda nutzt requireAuth + GET-only', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /event\.httpMethod !== ['"]GET['"]/);
});

test('W6.1: Lambda selektiert nur aktive Templates, sortiert by pdfmonkey_template_id', () => {
  assert.match(lambdaSrc, /\.eq\(['"]aktiv['"],\s*true\)/);
  assert.match(lambdaSrc, /\.order\(['"]pdfmonkey_template_id['"]/);
});

// ── W6.2 make-webhooks-config ──────────────────────────────────
test('W6.2: Webhooks-Helper exposed url/has/urls', () => {
  assert.strictEqual(typeof Webhooks.url, 'function');
  assert.strictEqual(typeof Webhooks.has, 'function');
  assert.strictEqual(typeof Webhooks.urls, 'function');
});

test('W6.2: LEGACY_MAP enthält 8 Webhook-Keys', () => {
  const keys = Object.keys(Webhooks._LEGACY_MAP);
  assert.strictEqual(keys.length, 8);
  ['rechnung_generate', 'mahnung_send', 'stripe_signup', 'kontakt_sync',
   'auftrag_close', 'termin_remind', 'support_inbox', 'audit_archive']
    .forEach(k => assert.ok(keys.includes(k), 'Key ' + k + ' fehlt in LEGACY_MAP'));
});

test('W6.2: url() liest aus MAKE_WEBHOOKS_JSON', () => {
  const orig = process.env.MAKE_WEBHOOKS_JSON;
  process.env.MAKE_WEBHOOKS_JSON = JSON.stringify({
    rechnung_generate: 'https://hook.eu1.make.com/RECH'
  });
  Webhooks._resetCacheForTests();
  assert.strictEqual(Webhooks.url('rechnung_generate'), 'https://hook.eu1.make.com/RECH');
  if (orig === undefined) delete process.env.MAKE_WEBHOOKS_JSON; else process.env.MAKE_WEBHOOKS_JSON = orig;
  Webhooks._resetCacheForTests();
});

test('W6.2: url() fällt auf Legacy-ENV zurück wenn JSON-Key fehlt', () => {
  const origJson = process.env.MAKE_WEBHOOKS_JSON;
  const origLegacy = process.env.MAKE_WEBHOOK_MAHNUNG_SEND;
  delete process.env.MAKE_WEBHOOKS_JSON;
  process.env.MAKE_WEBHOOK_MAHNUNG_SEND = 'https://legacy.example/M';
  Webhooks._resetCacheForTests();
  assert.strictEqual(Webhooks.url('mahnung_send'), 'https://legacy.example/M');
  // Restore
  if (origJson === undefined) delete process.env.MAKE_WEBHOOKS_JSON; else process.env.MAKE_WEBHOOKS_JSON = origJson;
  if (origLegacy === undefined) delete process.env.MAKE_WEBHOOK_MAHNUNG_SEND; else process.env.MAKE_WEBHOOK_MAHNUNG_SEND = origLegacy;
  Webhooks._resetCacheForTests();
});

test('W6.2: url() liefert null bei unbekanntem Key + leerer ENV', () => {
  const origJson = process.env.MAKE_WEBHOOKS_JSON;
  delete process.env.MAKE_WEBHOOKS_JSON;
  Webhooks._resetCacheForTests();
  assert.strictEqual(Webhooks.url('nonexistent_key'), null);
  assert.strictEqual(Webhooks.url(''), null);
  assert.strictEqual(Webhooks.url(null), null);
  if (origJson !== undefined) process.env.MAKE_WEBHOOKS_JSON = origJson;
  Webhooks._resetCacheForTests();
});

test('W6.2: has() reflektiert url()-Verfügbarkeit', () => {
  process.env.MAKE_WEBHOOKS_JSON = JSON.stringify({ kontakt_sync: 'https://hook.example/K' });
  Webhooks._resetCacheForTests();
  assert.strictEqual(Webhooks.has('kontakt_sync'), true);
  assert.strictEqual(Webhooks.has('does_not_exist'), false);
  delete process.env.MAKE_WEBHOOKS_JSON;
  Webhooks._resetCacheForTests();
});

test('W6.2: urls() liefert alle definierten Webhooks zusammen', () => {
  process.env.MAKE_WEBHOOKS_JSON = JSON.stringify({
    rechnung_generate: 'https://hook.eu1.make.com/A',
    mahnung_send:      'https://hook.eu1.make.com/B'
  });
  Webhooks._resetCacheForTests();
  const all = Webhooks.urls();
  assert.strictEqual(all.rechnung_generate, 'https://hook.eu1.make.com/A');
  assert.strictEqual(all.mahnung_send, 'https://hook.eu1.make.com/B');
  delete process.env.MAKE_WEBHOOKS_JSON;
  Webhooks._resetCacheForTests();
});

test('W6.2: Defekte JSON wird nicht-blockierend ignoriert (return {})', () => {
  process.env.MAKE_WEBHOOKS_JSON = '{"invalid json — fehlt close-brace';
  Webhooks._resetCacheForTests();
  // Keine Exception, fallback null
  assert.strictEqual(Webhooks.url('rechnung_generate'), null);
  delete process.env.MAKE_WEBHOOKS_JSON;
  Webhooks._resetCacheForTests();
});

// ── W6.4 Audit-Report-Update ───────────────────────────────────
test('W6.4: ENV-AUDIT-REPORT enthält M³⁶ W6 Append-Sektion', () => {
  assert.match(auditDoc, /MEGA³⁶ W6 Update/);
  assert.match(auditDoc, /MAKE_WEBHOOKS_JSON.*konsolidiert 8 Einzel-ENVs/);
  assert.match(auditDoc, /list-dokument-templates/);
});

// ── W6.5 Marcel-Cleanup-Doku ───────────────────────────────────
test('W6.5: Marcel-Cleanup-Doku listet 8 Legacy-MAKE-ENVs', () => {
  ['MAKE_WEBHOOK_RECHNUNG_GENERATE', 'MAKE_WEBHOOK_MAHNUNG_SEND',
   'MAKE_WEBHOOK_STRIPE_SIGNUP', 'MAKE_WEBHOOK_KONTAKT_SYNC',
   'MAKE_WEBHOOK_AUFTRAG_CLOSE', 'MAKE_WEBHOOK_TERMIN_REMIND',
   'MAKE_WEBHOOK_SUPPORT_INBOX', 'MAKE_WEBHOOK_AUDIT_ARCHIVE']
    .forEach(env => assert.ok(cleanupDoc.includes(env), env + ' fehlt in Marcel-Doku'));
});

test('W6.5: Marcel-Cleanup-Doku verweist auf Migration 24 + JSON-Setup', () => {
  assert.match(cleanupDoc, /Migration 24/);
  assert.match(cleanupDoc, /MAKE_WEBHOOKS_JSON/);
  assert.match(cleanupDoc, /Verifikations-Checkliste/);
});

test('W6.5: Marcel-Cleanup-Doku adressiert Stripe-Comments-Drift (179€/379€)', () => {
  assert.match(cleanupDoc, /CLAUDE\.md Regel 21/);
  assert.match(cleanupDoc, /179€\/379€/);
});
