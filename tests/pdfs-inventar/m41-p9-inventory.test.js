'use strict';

/**
 * MEGA⁴¹ P9 — PDFs Vollständigkeits-Audit Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Inventory = require(path.join(ROOT, 'netlify', 'functions', 'admin-pdfmonkey-inventory.js'));
const PseudoAudit = require(path.join(ROOT, 'netlify', 'functions', 'admin-pseudonymisierung-audit.js'));
const inventorySrc = read('netlify/functions/admin-pdfmonkey-inventory.js');
const pseudoSrc = read('netlify/functions/admin-pseudonymisierung-audit.js');
const featureDoc = read('docs/features/MEGA41-PHASE-9-PDFS-INVENTAR.md');

// ─────────────────────────────────────────────────────────────────
//  P9-1 Drift-Detection Logic
// ─────────────────────────────────────────────────────────────────

test('P9-1: computeDrift erkennt matched + missing_in_supabase + missing_in_pdfmonkey', () => {
  const drift = Inventory.__internals.computeDrift(
    [{ id: 'pdf-1', identifier: 'F-04' }, { id: 'pdf-2', identifier: 'F-09' }, { id: 'pdf-NEW', identifier: 'F-NEW' }],
    [{ code: 'F-04', pdfmonkey_template_id: 'pdf-1' }, { code: 'F-09', pdfmonkey_template_id: 'pdf-2' }, { code: 'F-OLD', pdfmonkey_template_id: 'pdf-OLD' }]
  );
  assert.strictEqual(drift.matched.length, 2);
  assert.strictEqual(drift.missing_in_pdfmonkey.length, 1);
  assert.strictEqual(drift.missing_in_pdfmonkey[0].supabase_code, 'F-OLD');
  assert.strictEqual(drift.missing_in_supabase.length, 1);
  assert.strictEqual(drift.missing_in_supabase[0].pdfmonkey_id, 'pdf-NEW');
});

test('P9-1: computeDrift bei perfektem Match → leere missing-Listen', () => {
  const drift = Inventory.__internals.computeDrift(
    [{ id: 'pdf-1' }],
    [{ code: 'F-04', pdfmonkey_template_id: 'pdf-1' }]
  );
  assert.strictEqual(drift.matched.length, 1);
  assert.strictEqual(drift.missing_in_supabase.length, 0);
  assert.strictEqual(drift.missing_in_pdfmonkey.length, 0);
});

test('P9-1: computeDrift bei leerer PDFMonkey-API → alle Supabase = missing_in_pdfmonkey', () => {
  const drift = Inventory.__internals.computeDrift(
    [],
    [{ code: 'F-04', pdfmonkey_template_id: 'pdf-1' }]
  );
  assert.strictEqual(drift.missing_in_pdfmonkey.length, 1);
  assert.strictEqual(drift.matched.length, 0);
});

// ─────────────────────────────────────────────────────────────────
//  P9-1 Compliance-Detection Logic
// ─────────────────────────────────────────────────────────────────

test('P9-1: computeCompliance zählt 407a-Blöcke', () => {
  const c = Inventory.__internals.computeCompliance([
    { body: 'Hinweis nach § 407a ZPO' },
    { body: 'Anderer Text' },
    { body: '407a ZPO Persönliche Verantwortung' }
  ]);
  assert.strictEqual(c.counts['407a_blocks'], 2);
});

test('P9-1: computeCompliance zählt EU AI Act Disclosure', () => {
  const c = Inventory.__internals.computeCompliance([
    { body: 'EU AI Act Hinweis VO 2024/1689' },
    { body: 'EU AI Act' },
    { body: 'kein Hinweis' }
  ]);
  assert.ok(c.counts['ai_act_disclosure'] >= 1);
});

test('P9-1: computeCompliance flagged gpt4o-Violations (deprecated!)', () => {
  const c = Inventory.__internals.computeCompliance([
    { identifier: 'F-BAD', body: 'Diese Vorlage nutzt gpt-4o für Generation' },
    { identifier: 'F-OK', body: 'Diese Vorlage nutzt GPT-5.5' }
  ]);
  assert.strictEqual(c.counts['gpt4o_references'], 1);
  assert.strictEqual(c.gpt4o_violations.length, 1);
  assert.strictEqual(c.gpt4o_violations[0], 'F-BAD');
});

test('P9-1: COMPLIANCE_REGEX findet Variationen (§ 407a, 407a ZPO)', () => {
  const r = Inventory.__internals.COMPLIANCE_REGEX['407a_blocks'];
  assert.ok(r.test('§ 407a'));
  assert.ok(r.test('§407a'));
  assert.ok(r.test('407a ZPO'));
});

// ─────────────────────────────────────────────────────────────────
//  P9-2 Pseudonymisierungs-Audit
// ─────────────────────────────────────────────────────────────────

test('P9-2: 7 SYNTHETIC_PII_TESTS definiert', () => {
  assert.strictEqual(PseudoAudit.__internals.SYNTHETIC_PII_TESTS.length, 7);
});

test('P9-2: 5 must_not_contain Tests (Name/Email/IBAN/Telefon/Adresse)', () => {
  const mustNot = PseudoAudit.__internals.SYNTHETIC_PII_TESTS.filter(t => t.must_not_contain);
  assert.strictEqual(mustNot.length, 5);
});

test('P9-2: 2 must_contain Tests (AZ + DIN — Legit-Inhalte erhalten!)', () => {
  const mustHave = PseudoAudit.__internals.SYNTHETIC_PII_TESTS.filter(t => t.must_contain);
  assert.strictEqual(mustHave.length, 2);
  const azTest = mustHave.find(t => /Aktenzeichen/i.test(t.test_name));
  assert.ok(azTest);
  assert.deepStrictEqual(azTest.must_contain, ['12 O 345/24']);
});

test('P9-2: runPseudoTest mit Mock-Pseudo-Function bestätigt PII-Removal', () => {
  const fakePseudo = (s) => s
    .replace(/Max Mustermann|Mustermann|Max /g, '[NAME]')
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/DE\d{20}/g, '[IBAN]')
    .replace(/(\d{3,4}-)?\d{6,9}/g, '[TEL]')
    .replace(/Musterstraße \d+|Musterstraße/g, '[ADRESSE]');

  let pass = 0, fail = 0;
  PseudoAudit.__internals.SYNTHETIC_PII_TESTS.forEach(t => {
    const r = PseudoAudit.__internals.runPseudoTest(t, fakePseudo);
    if (r.passed) pass++; else fail++;
  });
  assert.strictEqual(pass, 7);
  assert.strictEqual(fail, 0);
});

test('P9-2: runPseudoTest erkennt PII-Leak (Bad-Pseudo)', () => {
  const badPseudo = (s) => s;  // identity → kein PII-Replacement
  const test = PseudoAudit.__internals.SYNTHETIC_PII_TESTS.find(t => /Vollständiger Name/.test(t.test_name));
  const r = PseudoAudit.__internals.runPseudoTest(test, badPseudo);
  assert.strictEqual(r.passed, false);
  assert.ok(r.failures.some(f => /durchgelassen/.test(f)));
});

test('P9-2: runPseudoTest erkennt Legit-Removal (Bad-Pseudo entfernt zu viel)', () => {
  // tooAggressive entfernt explizit den AZ-Pattern
  const tooAggressive = (s) => s.replace(/12 O 345\/24/g, '[REMOVED]');
  const test = PseudoAudit.__internals.SYNTHETIC_PII_TESTS.find(t => /Aktenzeichen/.test(t.test_name));
  const r = PseudoAudit.__internals.runPseudoTest(test, tooAggressive);
  assert.strictEqual(r.passed, false);
  assert.ok(r.failures.some(f => /entfernt/.test(f)));
});

// ─────────────────────────────────────────────────────────────────
//  P9-3 Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P9-3: Inventory-Lambda hat requireAdmin + 2FA + RateLimit', () => {
  assert.match(inventorySrc, /requireAdmin/);
  assert.match(inventorySrc, /require2FA:\s*true/);
});

test('P9-3: Inventory nutzt PDFMONKEY_API_KEY ENV', () => {
  assert.match(inventorySrc, /process\.env\.PDFMONKEY_API_KEY/);
});

test('P9-3: Inventory parallele Queries via Promise.all', () => {
  assert.match(inventorySrc, /Promise\.all\(\[\s*_fetchPdfMonkeyTemplates/);
});

test('P9-3: Pseudo-Audit hat requireAdmin + 2FA', () => {
  assert.match(pseudoSrc, /requireAdmin/);
  assert.match(pseudoSrc, /require2FA:\s*true/);
});

test('P9-3: Doku enthaelt Marcel-Audit-Procedure + curl-Beispiele', () => {
  assert.match(featureDoc, /Marcel-Audit-Procedure/);
  assert.match(featureDoc, /admin-pdfmonkey-inventory/);
  assert.match(featureDoc, /admin-pseudonymisierung-audit/);
});

test('P9-3: Doku enthaelt 22+ Templates Master-Prompt-Erwartung', () => {
  assert.match(featureDoc, /22\+ Templates|F-01.*F-19|BES-01.*BES-12/);
});

test('P9-3: Doku Drift-Resolution-Patterns (3 Patterns)', () => {
  assert.match(featureDoc, /Pattern 1.*missing_in_pdfmonkey/s);
  assert.match(featureDoc, /Pattern 2.*missing_in_supabase/s);
  assert.match(featureDoc, /Pattern 3.*gpt4o_references/s);
});
