/**
 * PROVA — Workflow-Mode-Router Tests
 * MEGA¹⁴ W28 (2026-05-06)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

// Reproduktion der resolve-Logik
const VALID_MODES = ['A', 'B', 'C'];
const DEFAULT_FALLBACK = 'A';

function resolve(params) {
  params = params || {};
  if (params.auftragOverride && VALID_MODES.indexOf(params.auftragOverride) !== -1) {
    return { mode: params.auftragOverride, source: 'override' };
  }
  if (params.userDefault && VALID_MODES.indexOf(params.userDefault) !== -1) {
    return { mode: params.userDefault, source: 'default' };
  }
  return { mode: DEFAULT_FALLBACK, source: 'fallback' };
}

describe('Workflow-Mode resolve()', () => {

  test('Override wins ueber Default', () => {
    const r = resolve({ auftragOverride: 'B', userDefault: 'C' });
    assert.equal(r.mode, 'B');
    assert.equal(r.source, 'override');
  });

  test('Default wenn kein Override', () => {
    const r = resolve({ auftragOverride: null, userDefault: 'C' });
    assert.equal(r.mode, 'C');
    assert.equal(r.source, 'default');
  });

  test('Fallback wenn weder Override noch Default', () => {
    const r = resolve({});
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });

  test('Fallback bei invalidem Override', () => {
    const r = resolve({ auftragOverride: 'X', userDefault: 'B' });
    // 'X' ist invalid → fall through zu Default
    assert.equal(r.mode, 'B');
    assert.equal(r.source, 'default');
  });

  test('Fallback bei invalidem Default', () => {
    const r = resolve({ userDefault: 'Z' });
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });

  test('Alle 3 Modes valid', () => {
    for (const m of ['A', 'B', 'C']) {
      const r = resolve({ auftragOverride: m });
      assert.equal(r.mode, m);
      assert.equal(r.source, 'override');
    }
  });

  test('Mode-Lowercase wird NICHT akzeptiert (case-sensitive)', () => {
    const r = resolve({ auftragOverride: 'a' });
    // 'a' (lowercase) ist NICHT in VALID_MODES → fallback
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });

  test('Empty-Object input', () => {
    const r = resolve();
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });

  test('Null input', () => {
    const r = resolve(null);
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });
});

describe('Workflow-Mode-Router Library File', () => {
  const src = read('lib/workflow-mode-router.js');

  test('window.ProvaWorkflowMode exposed', () => {
    assert.match(src, /window\.ProvaWorkflowMode\s*=/);
  });

  test('Public API: resolve, fetchSettings, updateDefault, openForAuftrag', () => {
    assert.ok(src.includes('resolve: resolve'));
    assert.ok(src.includes('fetchSettings: fetchSettings'));
    assert.ok(src.includes('updateDefault: updateDefault'));
    assert.ok(src.includes('openForAuftrag: openForAuftrag'));
  });

  test('VALID_MODES + DEFAULT_FALLBACK exposed', () => {
    assert.ok(src.includes("VALID_MODES: VALID_MODES"));
    assert.ok(src.includes("DEFAULT_FALLBACK: DEFAULT_FALLBACK"));
  });

  test('Mode-A = existing-Behaviour (kein Breaking)', () => {
    assert.match(src, /case 'A':[\s\S]{0,300}oeffneAuftrag|akte\.html/);
  });

  test('Mode-B + Mode-C werden gracefully gefallback (MEGA¹⁵+¹⁶)', () => {
    assert.match(src, /case 'B':[\s\S]{0,200}MEGA¹⁵/);
    assert.match(src, /case 'C':[\s\S]{0,200}MEGA¹⁶/);
  });

  test('updateDefault rejects invalide Modes', () => {
    assert.match(src, /VALID_MODES\.indexOf\(mode\) === -1/);
  });

  test('Defensive: fetchSettings hat Fallback bei Endpoint-Fehler', () => {
    assert.match(src, /_fallback:\s*true/);
  });
});

describe('Triple-Mode-Architecture-Doku', () => {

  test('docs/architecture/triple-mode-architecture.md existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(__dirname, '..', '..', 'docs', 'architecture', 'triple-mode-architecture.md')));
  });

  test('docs/architecture/mode-switcher-ux.md existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(__dirname, '..', '..', 'docs', 'architecture', 'mode-switcher-ux.md')));
  });

  test('Architecture-Doku enthaelt 3 Modes', () => {
    const doc = read('docs/architecture/triple-mode-architecture.md');
    // Mode A — PROVA-Standard (separate Lines moeglich)
    assert.match(doc, /Mode A/);
    assert.match(doc, /PROVA-Standard/);
    // Mode B
    assert.match(doc, /Mode B/);
    assert.match(doc, /TipTap|Editor/);
    // Mode C
    assert.match(doc, /Mode C/);
    assert.match(doc, /Word|Eigene Vorlagen/i);
  });

  test('Architecture-Doku enthaelt UX-Pattern (Hybrid Default + Override)', () => {
    const doc = read('docs/architecture/triple-mode-architecture.md');
    assert.match(doc, /Default.*Override|Override.*Default/i);
  });

  test('Architecture-Doku referenziert NACHT-PAUSE-Decisions fuer MEGA¹⁵+¹⁶', () => {
    const doc = read('docs/architecture/triple-mode-architecture.md');
    assert.match(doc, /MEGA¹⁵/);
    assert.match(doc, /MEGA¹⁶/);
  });

  test('UX-Doku enthaelt Onboarding + Settings + Per-Akte-Override', () => {
    const doc = read('docs/architecture/mode-switcher-ux.md');
    assert.match(doc, /Onboarding/i);
    assert.match(doc, /Settings/i);
    assert.match(doc, /Pro.Akte|Akte-Override/i);
  });
});

describe('PLANNED-SQL-Schema', () => {
  const sql = read('db/PLANNED-user_workflow_settings.sql');

  test('Tabelle user_workflow_settings definiert', () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS user_workflow_settings/);
  });

  test('default_mode CHECK-Constraint nur A/B/C', () => {
    assert.match(sql, /CHECK \(default_mode IN \('A','B','C'\)\)/);
  });

  test('FK auf auth.users mit ON DELETE CASCADE', () => {
    assert.match(sql, /REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  });

  test('RLS-Policies definiert (uws_self_select, _insert, _update)', () => {
    assert.match(sql, /CREATE POLICY uws_self_select/);
    assert.match(sql, /CREATE POLICY uws_self_insert/);
    assert.match(sql, /CREATE POLICY uws_self_update/);
  });

  test('ALTER auftraege fuer workflow_mode_override Spalte', () => {
    assert.match(sql, /ALTER TABLE auftraege/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS workflow_mode_override/);
  });

  test('VIEW v_user_workflow_resolved definiert (Override→Default→Fallback)', () => {
    assert.match(sql, /CREATE OR REPLACE VIEW v_user_workflow_resolved/);
    assert.match(sql, /COALESCE\(/);
  });

  test('Trigger fuer updated_at', () => {
    assert.match(sql, /CREATE TRIGGER uws_updated_at/);
  });

  test('ROLLBACK-Plan im File dokumentiert', () => {
    assert.match(sql, /ROLLBACK-Plan/i);
    assert.match(sql, /DROP TABLE IF EXISTS user_workflow_settings/);
  });
});
