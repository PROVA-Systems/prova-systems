'use strict';

/**
 * MEGA⁴¹ P2 — Audit-Trail KI-vs-SV-Trennung Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Helper = require(path.join(ROOT, 'netlify', 'functions', 'lib', 'audit-source-helper.js'));
const Tracker = require(path.join(ROOT, 'lib', 'audit-source-tracker.js'));
const LogLambda = require(path.join(ROOT, 'netlify', 'functions', 'audit-source-log.js'));
const QuoteLambda = require(path.join(ROOT, 'netlify', 'functions', 'auftrag-eigenleistung-quote.js'));

const helperSrc = read('netlify/functions/lib/audit-source-helper.js');
const trackerSrc = read('lib/audit-source-tracker.js');
const logSrc = read('netlify/functions/audit-source-log.js');
const quoteSrc = read('netlify/functions/auftrag-eigenleistung-quote.js');
const migSrc = read('supabase-migrations/37_audit_trail_ki_source.sql');
const viewerHtml = read('audit-trail.html');
const researchSrc = read('docs/sprint-research/MEGA41-P2-AUDIT-TRAIL-KI-RECHERCHE.md');

// ─────────────────────────────────────────────────────────────────
//  P2-1 Recherche
// ─────────────────────────────────────────────────────────────────

test('P2-1: Recherche enthaelt 4 Quellen (3+ Pflicht)', () => {
  ['EU AI Act', '§\\s*407a|407a ZPO', 'BSI TR-03125|TR-ESOR', 'OECD'].forEach(name => {
    assert.match(researchSrc, new RegExp(name, 'i'));
  });
});

test('P2-1: Recherche dokumentiert BGH-Doktrin + Hash-Chain', () => {
  assert.match(researchSrc, /BGH/);
  assert.match(researchSrc, /Hash-Chain/i);
  assert.match(researchSrc, /prev_hash/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-2 Migration 37
// ─────────────────────────────────────────────────────────────────

test('P2-2: Migration 37 — ENUM audit_source mit 5 Werten', () => {
  assert.match(migSrc, /CREATE TYPE audit_source AS ENUM/);
  ['ki', 'sv_eigen', 'sv_uebernommen', 'system', 'admin_impersonate'].forEach(v => {
    assert.match(migSrc, new RegExp("'" + v + "'"));
  });
});

test('P2-2: Migration 37 — 5 neue Spalten', () => {
  ['source audit_source', 'ki_model TEXT', 'ki_confidence NUMERIC', 'eu_ai_act_disclosed BOOLEAN', 'original_ki_ref UUID', 'prev_hash TEXT']
    .forEach(col => assert.match(migSrc, new RegExp(col)));
});

test('P2-2: Migration 37 — ki_confidence CHECK 0-1', () => {
  assert.match(migSrc, /ki_confidence >= 0 AND ki_confidence <= 1/);
});

test('P2-2: Migration 37 — 4 neue Indizes (source, workspace_source, eu_ai_act partial, original_ki_ref partial)', () => {
  ['idx_audit_source', 'idx_audit_workspace_source', 'idx_audit_eu_ai_act', 'idx_audit_original_ki_ref']
    .forEach(idx => assert.match(migSrc, new RegExp(idx)));
});

test('P2-2: Migration 37 — View v_auftrag_eigenleistung_quote mit eigenleistung_prozent', () => {
  assert.match(migSrc, /CREATE OR REPLACE VIEW public\.v_auftrag_eigenleistung_quote/);
  assert.match(migSrc, /eigenleistung_prozent/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-3 audit-source-helper (Server)
// ─────────────────────────────────────────────────────────────────

test('P2-3: Helper exports computeIntegrityHash + 3 log-Funktionen', () => {
  ['computeIntegrityHash', 'logKiCall', 'logSvEigen', 'logSvUebernommen']
    .forEach(fn => assert.strictEqual(typeof Helper[fn], 'function', fn));
});

test('P2-3: computeIntegrityHash liefert SHA256 (64 Hex)', () => {
  const h = Helper.computeIntegrityHash('action', 'entity-1', { foo: 'bar' }, '2026-05-08T15:00:00Z', null);
  assert.strictEqual(h.length, 64);
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('P2-3: computeIntegrityHash deterministisch (gleicher Input → gleicher Hash)', () => {
  const h1 = Helper.computeIntegrityHash('a', 'e1', { x: 1 }, 'ts1', 'prev1');
  const h2 = Helper.computeIntegrityHash('a', 'e1', { x: 1 }, 'ts1', 'prev1');
  assert.strictEqual(h1, h2);
});

test('P2-3: computeIntegrityHash verschiedene Inputs → verschiedene Hashes', () => {
  const h1 = Helper.computeIntegrityHash('a', 'e1', { x: 1 }, 'ts1', null);
  const h2 = Helper.computeIntegrityHash('a', 'e1', { x: 2 }, 'ts1', null);
  assert.notStrictEqual(h1, h2);
});

test('P2-3: Helper-Source: KEIN gpt-4o im Code-Path', () => {
  const codeOnly = helperSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /['"]gpt-4o['"]/);
});

test('P2-3: Helper logKiCall setzt eu_ai_act_disclosed: true', () => {
  assert.match(helperSrc, /eu_ai_act_disclosed:\s*true/);
});

test('P2-3: Helper logSvUebernommen pflicht originalKiRef', () => {
  assert.match(helperSrc, /originalKiRef.*pflicht/i);
});

// ─────────────────────────────────────────────────────────────────
//  P2-3b audit-source-tracker (Frontend)
// ─────────────────────────────────────────────────────────────────

test('P2-3b: Tracker exports wrapKiContent + isAiGenerated + markSvUebernommen', () => {
  ['wrapKiContent', 'isAiGenerated', 'markSvUebernommen', 'getAiContentSummary']
    .forEach(fn => assert.strictEqual(typeof Tracker[fn], 'function', fn));
});

test('P2-3b: wrapKiContent setzt data-ai-generated="true" + data-ai-model + data-ai-call-ref', () => {
  const html = Tracker.wrapKiContent('Hello', 'uuid-1', 'gpt-5.5');
  assert.match(html, /data-ai-generated="true"/);
  assert.match(html, /data-ai-model="gpt-5.5"/);
  assert.match(html, /data-ai-call-ref="uuid-1"/);
});

test('P2-3b: wrapKiContent escaped XSS', () => {
  const html = Tracker.wrapKiContent('<script>alert(1)</script>', 'u', 'm');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('P2-3b: AI_DATA_ATTR-Konstanten exposed', () => {
  assert.strictEqual(Tracker.AI_DATA_ATTR, 'data-ai-generated');
  assert.strictEqual(Tracker.AI_MODEL_ATTR, 'data-ai-model');
  assert.strictEqual(Tracker.AI_CALL_REF_ATTR, 'data-ai-call-ref');
});

// ─────────────────────────────────────────────────────────────────
//  P2-4 audit-source-log Lambda
// ─────────────────────────────────────────────────────────────────

test('P2-4: Log-Lambda exports VALID_SOURCES (4)', () => {
  assert.deepStrictEqual(LogLambda.__VALID_SOURCES, ['ki', 'sv_eigen', 'sv_uebernommen', 'system']);
});

test('P2-4: Log-Lambda hat requireAuth + RateLimit 120/60', () => {
  assert.match(logSrc, /requireAuth/);
  assert.match(logSrc, /RateLimit\.check\([^,]+,\s*120,\s*60/);
});

test('P2-4: Log-Lambda fordert original_ki_ref bei sv_uebernommen', () => {
  assert.match(logSrc, /original_ki_ref pflicht bei sv_uebernommen/);
});

test('P2-4: Log-Lambda Auto-Capture ip_address + user_agent', () => {
  assert.match(logSrc, /x-forwarded-for/);
  assert.match(logSrc, /user-agent/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-4b auftrag-eigenleistung-quote Lambda
// ─────────────────────────────────────────────────────────────────

test('P2-4b: Quote-Lambda DEFAULT_THRESHOLD = 50', () => {
  assert.strictEqual(QuoteLambda.__DEFAULT_THRESHOLD_PROZENT, 50);
});

test('P2-4b: Quote-Lambda nutzt v_auftrag_eigenleistung_quote View', () => {
  assert.match(quoteSrc, /v_auftrag_eigenleistung_quote/);
});

test('P2-4b: Quote-Lambda returns complies_407a Boolean', () => {
  assert.match(quoteSrc, /complies_407a/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-5 audit-trail.html Viewer
// ─────────────────────────────────────────────────────────────────

test('P2-5: Viewer hat 6 Filter-Tabs', () => {
  ['ki', 'sv_eigen', 'sv_uebernommen', 'system', 'admin_impersonate'].forEach(s => {
    assert.match(viewerHtml, new RegExp('data-source="' + s + '"'));
  });
});

test('P2-5: Viewer hat 5 Stats-Cards', () => {
  ['at-stat-total', 'at-stat-ki', 'at-stat-sv', 'at-stat-svu', 'at-stat-quote']
    .forEach(id => assert.match(viewerHtml, new RegExp('id="' + id + '"')));
});

test('P2-5: Viewer ruft admin-audit-trail Lambda', () => {
  assert.match(viewerHtml, /\/\.netlify\/functions\/admin-audit-trail/);
});

test('P2-5: Viewer hat PDF-Export via window.print()', () => {
  assert.match(viewerHtml, /window\.open/);
  assert.match(viewerHtml, /\.print\(\)/);
});

test('P2-5: Viewer Color-Coding pro Source (CSS classes)', () => {
  ['at-row-source--ki', 'at-row-source--sv_eigen', 'at-row-source--sv_uebernommen', 'at-row-source--system']
    .forEach(c => assert.match(viewerHtml, new RegExp('\\.' + c)));
});

test('P2-5: UMD-Pattern in beiden Libs (window + module.exports)', () => {
  assert.match(helperSrc, /module\.exports/);
  assert.match(trackerSrc, /window\.ProvaAuditSourceTracker/);
  assert.match(trackerSrc, /module\.exports/);
});

test('P2-5: Compliance: KEIN gpt-4o im Code-Path aller P2-Files', () => {
  [helperSrc, trackerSrc, logSrc, quoteSrc].forEach(src => {
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(codeOnly, /['"]gpt-4o['"]/);
  });
});
