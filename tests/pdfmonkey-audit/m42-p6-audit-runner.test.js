/**
 * MEGA⁴² P6 — PDFMonkey-Audit-Runner Pure-fn Tests
 *
 * Testet computeDrift + checkCompliance ohne Live-API-Calls.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const runner = require(path.join(__dirname, '..', '..', 'scripts', 'pdfmonkey-audit-runner.js'));

// ─── computeDrift ─────────────────────────────────────────

test('P6: computeDrift erkennt matched-templates', () => {
  const pdf = [{ id: 't1', name: 'T1' }, { id: 't2', name: 'T2' }];
  const sb = [{ pdfmonkey_template_id: 't1', code: 'CODE_T1' }];
  const r = runner.computeDrift(pdf, sb);
  assert.equal(r.matched, 1);
});

test('P6: computeDrift findet missing_in_supabase', () => {
  const pdf = [{ id: 't1', name: 'T1' }, { id: 't2', name: 'T2' }];
  const sb = [{ pdfmonkey_template_id: 't1' }];
  const r = runner.computeDrift(pdf, sb);
  assert.equal(r.missing_in_supabase.length, 1);
  assert.equal(r.missing_in_supabase[0].id, 't2');
});

test('P6: computeDrift findet missing_in_pdfmonkey', () => {
  const pdf = [{ id: 't1' }];
  const sb = [{ pdfmonkey_template_id: 't1' }, { pdfmonkey_template_id: 't99', code: 'C99' }];
  const r = runner.computeDrift(pdf, sb);
  assert.equal(r.missing_in_pdfmonkey.length, 1);
  assert.equal(r.missing_in_pdfmonkey[0].id, 't99');
});

test('P6: computeDrift mit empty inputs', () => {
  const r = runner.computeDrift([], []);
  assert.equal(r.matched, 0);
  assert.equal(r.missing_in_supabase.length, 0);
  assert.equal(r.missing_in_pdfmonkey.length, 0);
});

test('P6: computeDrift ignoriert Supabase-Rows ohne pdfmonkey_template_id', () => {
  const pdf = [{ id: 't1' }];
  const sb = [{ code: 'XX' /* no pdfmonkey_template_id */ }];
  const r = runner.computeDrift(pdf, sb);
  assert.equal(r.matched, 0);
  assert.equal(r.missing_in_supabase.length, 1);
  assert.equal(r.missing_in_pdfmonkey.length, 0);
});

// ─── checkCompliance ──────────────────────────────────────

test('P6: checkCompliance zählt §407a-Blocks', () => {
  const r = runner.checkCompliance([
    { body: 'Hier steht §407a ZPO Hinweis' },
    { body: 'Kein Compliance-Block' }
  ]);
  assert.equal(r['407a_count'], 1);
});

test('P6: checkCompliance zählt EU-AI-Act-Disclosures', () => {
  const r = runner.checkCompliance([
    { body: 'EU AI Act Disclosure' },
    { body: 'VO 2024/1689 Hinweis' },
    { body: 'irrelevant' }
  ]);
  assert.equal(r['ai_act_count'], 2);
});

test('P6: checkCompliance erkennt gpt-4o als Code-Smell', () => {
  const r = runner.checkCompliance([
    { identifier: 'tmpl-1', body: 'Powered by gpt-4o' },
    { identifier: 'tmpl-2', body: 'No KI here' }
  ]);
  assert.equal(r['gpt4o_count'], 1);
  assert.deepStrictEqual(r['gpt4o_offenders'], ['tmpl-1']);
});

test('P6: checkCompliance kombiniert body + identifier + name', () => {
  const r = runner.checkCompliance([
    { identifier: 'gerichtsgutachten', body: '', name: 'mit §407a Block' }
  ]);
  assert.equal(r['407a_count'], 1);
});

test('P6: checkCompliance leere Liste', () => {
  const r = runner.checkCompliance([]);
  assert.equal(r['407a_count'], 0);
  assert.equal(r['ai_act_count'], 0);
  assert.equal(r['gpt4o_count'], 0);
});

// ─── exports check ────────────────────────────────────────

test('P6: pdfmonkey-audit-runner exports required functions', () => {
  assert.equal(typeof runner.fetchTemplates, 'function');
  assert.equal(typeof runner.fetchSupabaseTemplates, 'function');
  assert.equal(typeof runner.computeDrift, 'function');
  assert.equal(typeof runner.checkCompliance, 'function');
});

// ─── existence ────────────────────────────────────────────

test('P6: scripts/pdfmonkey-audit-runner.js existiert + executable shebang', () => {
  const fs = require('node:fs');
  const p = path.join(__dirname, '..', '..', 'scripts', 'pdfmonkey-audit-runner.js');
  const content = fs.readFileSync(p, 'utf8');
  assert.match(content, /^#!\/usr\/bin\/env node/);
});

test('P6: admin-pdfmonkey-inventory Lambda referenziert', () => {
  const fs = require('node:fs');
  const p = path.join(__dirname, '..', '..', 'netlify', 'functions', 'admin-pdfmonkey-inventory.js');
  assert.ok(fs.existsSync(p));
});

test('P6: Runbook für PDFMonkey-Audit existiert', () => {
  const fs = require('node:fs');
  const p = path.join(__dirname, '..', '..', 'docs', 'runbook', 'PDFMONKEY-AUDIT.md');
  assert.ok(fs.existsSync(p));
});
