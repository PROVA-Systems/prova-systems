'use strict';

/**
 * MEGA⁴¹ P1 — Daten-Import Tests
 *
 * Coverage:
 *   - Format-Detector (4 Formate + Generic-Fallback)
 *   - CSV-Parser (RFC 4180-Quoted-Strings, Auto-Delimiter)
 *   - JSON-Parser (Array vs Object-mit-rows)
 *   - Aktenzeichen-Normalizer
 *   - import-validate Lambda Logic
 *   - import-execute Internals
 *   - Migration 36 Schema
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Detector = require(path.join(ROOT, 'lib', 'import-format-detector.js'));
const AzNorm = require(path.join(ROOT, 'lib', 'aktenzeichen-normalizer.js'));
const Validate = require(path.join(ROOT, 'netlify', 'functions', 'import-validate.js'));
const Execute = require(path.join(ROOT, 'netlify', 'functions', 'import-execute.js'));
const validateSrc = read('netlify/functions/import-validate.js');
const executeSrc = read('netlify/functions/import-execute.js');
const rollbackSrc = read('netlify/functions/import-rollback.js');
const migSrc = read('supabase-migrations/36_import_logs.sql');
const researchSrc = read('docs/sprint-research/MEGA41-P1-DATEN-IMPORT-RECHERCHE.md');

// ─────────────────────────────────────────────────────────────────
//  P1-1 Recherche-Doku
// ─────────────────────────────────────────────────────────────────

test('P1-1: Recherche-Doku enthaelt 5 Quellen (Master-Prompt 3-5 Quellen)', () => {
  ['Notion', 'Linear', 'Stripe', 'BVS', 'Postgres|Supabase'].forEach(name => {
    assert.match(researchSrc, new RegExp(name, 'i'));
  });
});

test('P1-1: Recherche-Doku dokumentiert 6 Risiken mit Mitigations', () => {
  assert.match(researchSrc, /Risiken/);
  assert.match(researchSrc, /Mitigation/);
  assert.match(researchSrc, /Aktenzeichen-Format/i);
  assert.match(researchSrc, /Email-Duplicate/i);
  assert.match(researchSrc, /Foreign-Key/i);
  assert.match(researchSrc, /Encoding/i);
});

// ─────────────────────────────────────────────────────────────────
//  P1-2 Migration 36 Schema
// ─────────────────────────────────────────────────────────────────

test('P1-2: Migration 36 — import_logs Tabelle mit rollback_token + 24h-TTL', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.import_logs/);
  assert.match(migSrc, /rollback_token TEXT/);
  assert.match(migSrc, /rollback_expires_at TIMESTAMPTZ/);
  assert.match(migSrc, /inserted_ids JSONB/);
});

test('P1-2: Migration 36 — RLS-Policy SELECT via workspace_memberships', () => {
  assert.match(migSrc, /workspace_id IN \(SELECT workspace_id FROM public\.workspace_memberships/);
});

test('P1-2: Migration 36 — INSERT/UPDATE/DELETE blockiert für Frontend (Service-Role only)', () => {
  assert.match(migSrc, /FOR INSERT WITH CHECK \(false\)/);
  assert.match(migSrc, /FOR UPDATE USING \(false\)/);
  assert.match(migSrc, /FOR DELETE USING \(false\)/);
});

test('P1-2: Migration 36 — 4 Indizes (workspace, user, rollback_token partial, status)', () => {
  ['idx_import_logs_workspace', 'idx_import_logs_user', 'idx_import_logs_rollback_token', 'idx_import_logs_status']
    .forEach(idx => assert.match(migSrc, new RegExp(idx)));
});

// ─────────────────────────────────────────────────────────────────
//  P1-3a Format-Detector
// ─────────────────────────────────────────────────────────────────

test('P1-3a: detectFormat erkennt gutachten_manager (4/6 Indikatoren)', () => {
  const r = Detector.detectFormat(['Mandant_Name', 'Mandant_Email', 'Auftrag_Az', 'Auftrag_Datum']);
  assert.strictEqual(r.format, 'gutachten_manager');
  assert.ok(r.confidence >= 0.5);
});

test('P1-3a: detectFormat erkennt gutachten_agent (4/6 Indikatoren)', () => {
  const r = Detector.detectFormat(['client_name', 'client_email', 'case_number', 'created_date']);
  assert.strictEqual(r.format, 'gutachten_agent');
});

test('P1-3a: detectFormat erkennt bauexpert (4/5 Indikatoren)', () => {
  const r = Detector.detectFormat(['Auftraggeber', 'Aktenzeichen', 'Erstellungsdatum', 'Gegenstand']);
  assert.strictEqual(r.format, 'bauexpert');
});

test('P1-3a: detectFormat fällt auf generic_csv bei <33% Match', () => {
  const r = Detector.detectFormat(['Foo', 'Bar', 'Baz']);
  assert.strictEqual(r.format, 'generic_csv');
});

test('P1-3a: detectFormat handhabt leeres Array', () => {
  const r = Detector.detectFormat([]);
  assert.strictEqual(r.format, 'generic_csv');
  assert.strictEqual(r.confidence, 0);
});

test('P1-3a: FIELD_MAPPINGS hat alle 4 Formate definiert', () => {
  ['gutachten_manager', 'gutachten_agent', 'bauexpert', 'generic_csv'].forEach(fmt => {
    assert.ok(Detector.FIELD_MAPPINGS[fmt], fmt);
  });
});

// ─────────────────────────────────────────────────────────────────
//  P1-3b CSV-Parser (RFC 4180)
// ─────────────────────────────────────────────────────────────────

test('P1-3b: parseCsv handhabt einfache Daten', () => {
  const r = Detector.parseCsv('Name,Email\nMüller,m@e.com\nSchmidt,s@e.com');
  assert.deepStrictEqual(r.headers, ['Name', 'Email']);
  assert.strictEqual(r.rows.length, 2);
  assert.strictEqual(r.rows[0].Name, 'Müller');
});

test('P1-3b: parseCsv handhabt Quoted Comma in Feld', () => {
  const r = Detector.parseCsv('Name,Email\n"Müller, Hans",m@e.com');
  assert.strictEqual(r.rows[0].Name, 'Müller, Hans');
});

test('P1-3b: parseCsv handhabt Escaped Quotes', () => {
  const r = Detector.parseCsv('Name,Note\n"Hans","Said ""hi"""');
  assert.strictEqual(r.rows[0].Note, 'Said "hi"');
});

test('P1-3b: parseCsv erkennt Semikolon-Delimiter', () => {
  const r = Detector.parseCsv('Name;Email\nMüller;m@e.com');
  assert.strictEqual(r.delimiter, ';');
  assert.strictEqual(r.rows[0].Email, 'm@e.com');
});

test('P1-3b: parseJson Array', () => {
  const r = Detector.parseJson('[{"name":"A"},{"name":"B"}]');
  assert.strictEqual(r.rows.length, 2);
  assert.strictEqual(r.rows[0].name, 'A');
});

test('P1-3b: parseJson Object mit rows-Key', () => {
  const r = Detector.parseJson('{"format":"X","rows":[{"a":1},{"a":2}]}');
  assert.strictEqual(r.rows.length, 2);
  assert.strictEqual(r.format_hint, 'X');
});

test('P1-3b: parseJson wirft bei invalid', () => {
  assert.throws(() => Detector.parseJson('not json'), /JSON-Parse-Fehler/);
});

// ─────────────────────────────────────────────────────────────────
//  P1-3c Aktenzeichen-Normalizer
// ─────────────────────────────────────────────────────────────────

test('P1-3c: normalize entfernt Whitespace + Bindestriche + lowercase', () => {
  assert.strictEqual(AzNorm.normalize('12 O 345/24'), '12o345/24');
  assert.strictEqual(AzNorm.normalize('12-O-345/24'), '12o345/24');
  assert.strictEqual(AzNorm.normalize('12O345/24'), '12o345/24');
});

test('P1-3c: isEquivalent matched Format-Varianten', () => {
  assert.strictEqual(AzNorm.isEquivalent('12 O 345/24', '12-O-345/24'), true);
  assert.strictEqual(AzNorm.isEquivalent('12 O 345/24', '13 O 345/24'), false);
});

test('P1-3c: normalize handhabt null/empty', () => {
  assert.strictEqual(AzNorm.normalize(''), '');
  assert.strictEqual(AzNorm.normalize(null), '');
});

test('P1-3c: examples-Array entspricht definierten Mappings', () => {
  AzNorm.examples.forEach(ex => {
    assert.strictEqual(AzNorm.normalize(ex.input), ex.expected, JSON.stringify(ex));
  });
});

// ─────────────────────────────────────────────────────────────────
//  P1-4a import-validate Internals
// ─────────────────────────────────────────────────────────────────

test('P1-4a: VALID_TARGETS = [kontakte, auftraege, rechnungen, mixed]', () => {
  assert.deepStrictEqual(Validate.__internals.VALID_TARGETS, ['kontakte', 'auftraege', 'rechnungen', 'mixed']);
});

test('P1-4a: MAX_ROWS_PER_IMPORT = 1000 (Performance-Limit)', () => {
  assert.strictEqual(Validate.__internals.MAX_ROWS_PER_IMPORT, 1000);
});

test('P1-4a: _emailValid erkennt Standard-Emails', () => {
  assert.strictEqual(Validate.__internals._emailValid('a@b.c'), true);
  assert.strictEqual(Validate.__internals._emailValid('test.user+filter@example.co.uk'), true);
  assert.strictEqual(Validate.__internals._emailValid('not-an-email'), false);
  assert.strictEqual(Validate.__internals._emailValid('a@b'), false);
});

test('P1-4a: _validateRow Kontakte: name pflicht', () => {
  const r = Validate.__internals._validateRow({ Name: '' }, 'kontakte', 1, { Name: 'name' });
  assert.ok(r.errors.some(e => e.col === 'name' && /pflicht/.test(e.msg)));
});

test('P1-4a: _validateRow Kontakte: email-Format-Check', () => {
  const r = Validate.__internals._validateRow({ Name: 'Müller', Email: 'bad' }, 'kontakte', 1, { Name: 'name', Email: 'email' });
  assert.ok(r.errors.some(e => e.col === 'email' && /Format/i.test(e.msg)));
});

test('P1-4a: _validateRow Auftraege: aktenzeichen pflicht', () => {
  const r = Validate.__internals._validateRow({ Az: '' }, 'auftraege', 1, { Az: 'aktenzeichen' });
  assert.ok(r.errors.some(e => e.col === 'aktenzeichen'));
});

test('P1-4a: _suggestMapping liefert Auto-Mapping aus FIELD_MAPPINGS', () => {
  const headers = ['Mandant_Name', 'Mandant_Email', 'Mandant_Adresse'];
  const m = Validate.__internals._suggestMapping(headers, 'gutachten_manager', 'kontakte');
  assert.strictEqual(m['Mandant_Name'], 'name');
  assert.strictEqual(m['Mandant_Email'], 'email');
  assert.strictEqual(m['Mandant_Adresse'], 'adresse');
});

// ─────────────────────────────────────────────────────────────────
//  P1-4b import-execute Internals
// ─────────────────────────────────────────────────────────────────

test('P1-4b: VALID_TARGETS + MAX_ROWS + ROLLBACK_TTL_HOURS = 24', () => {
  assert.deepStrictEqual(Execute.__internals.VALID_TARGETS, ['kontakte', 'auftraege', 'rechnungen', 'mixed']);
  assert.strictEqual(Execute.__internals.MAX_ROWS, 1000);
  assert.strictEqual(Execute.__internals.ROLLBACK_TTL_HOURS, 24);
});

test('P1-4b: _applyMapping setzt prova-keys + erhält _lookup-keys', () => {
  const r = Execute.__internals._applyMapping(
    { Mandant_Name: 'Müller', Mandant_Email: 'm@e.com' },
    { Mandant_Name: 'name', Mandant_Email: '_kontakt_email_lookup' }
  );
  assert.strictEqual(r.name, 'Müller');
  assert.strictEqual(r._kontakt_email_lookup, 'm@e.com');
});

test('P1-4b: _stripLookupFields entfernt _-prefixed keys', () => {
  const r = Execute.__internals._stripLookupFields({ name: 'A', _kontakt_email_lookup: 'x@y.z', email: 'b@c.d' });
  assert.strictEqual(r.name, 'A');
  assert.strictEqual(r.email, 'b@c.d');
  assert.strictEqual(r._kontakt_email_lookup, undefined);
});

test('P1-4b: _validateRequired korrekt für 3 Targets', () => {
  assert.strictEqual(Execute.__internals._validateRequired({ name: 'A' }, 'kontakte'), null);
  assert.strictEqual(Execute.__internals._validateRequired({}, 'kontakte'), 'name pflicht');
  assert.strictEqual(Execute.__internals._validateRequired({ aktenzeichen: 'AZ-1' }, 'auftraege'), null);
  assert.strictEqual(Execute.__internals._validateRequired({}, 'auftraege'), 'aktenzeichen pflicht');
  assert.strictEqual(Execute.__internals._validateRequired({}, 'rechnungen'), 'rechnungsnr pflicht');
});

// ─────────────────────────────────────────────────────────────────
//  P1-4c Compliance + Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P1-4c: validate Lambda hat requireAuth + RateLimit 30/60', () => {
  assert.match(validateSrc, /requireAuth/);
  assert.match(validateSrc, /RateLimit\.check\([^,]+,\s*30,\s*60/);
});

test('P1-4c: execute Lambda hat strict RateLimit 10/3600 (1h)', () => {
  assert.match(executeSrc, /RateLimit\.check\([^,]+,\s*10,\s*3600/);
});

test('P1-4c: execute Lambda Atomic-Pattern (422 bei Validation-Fehlern)', () => {
  assert.match(executeSrc, /atomic_rollback:\s*true/);
  assert.match(executeSrc, /Validation-Fehler — kein Import durchgeführt/);
});

test('P1-4c: execute Lambda Multi-Pass: Email-Lookup für Aufträge', () => {
  assert.match(executeSrc, /_kontakt_email_lookup/);
  assert.match(executeSrc, /emailToKontaktId/);
});

test('P1-4c: execute Lambda AZ-Normalisierung beim Auftrags-Insert', () => {
  assert.match(executeSrc, /AzNorm\.normalize\(insert\.aktenzeichen\)/);
  assert.match(executeSrc, /aktenzeichen_norm/);
});

test('P1-4c: rollback Lambda hat TTL-Check (24h)', () => {
  assert.match(rollbackSrc, /rollback_expires_at/);
  assert.match(rollbackSrc, /Rollback-Frist abgelaufen/);
});

test('P1-4c: rollback Lambda setzt rollback_token = NULL nach Rollback', () => {
  assert.match(rollbackSrc, /rollback_token: null/);
  assert.match(rollbackSrc, /status:\s*['"]rolled_back['"]/);
});

test('P1-4c: rollback Lambda Workspace-Check (403 bei fremdem Workspace)', () => {
  assert.match(rollbackSrc, /Workspace-Zugriff verweigert/);
});
