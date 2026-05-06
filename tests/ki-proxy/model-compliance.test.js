/**
 * PROVA — ki-proxy.js Model-Compliance Tests (MEGA²⁸ W1-I1)
 * Verifiziert CLAUDE.md Regel 14: Konjunktiv-II nur GPT-4o.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ki-proxy.js'), 'utf8');

describe('ki-proxy Model-Compliance — Regel 14', () => {
  test('handleQualitaetspruefung nutzt gpt-4o (NICHT mini)', () => {
    // Pattern: handleQualitaetspruefung-Function → callOpenAI mit model: 'gpt-4o'
    const m = SRC.match(/async function handleQualitaetspruefung[\s\S]{0,1500}/);
    assert.ok(m, 'handleQualitaetspruefung function not found');
    assert.match(m[0], /model:\s*['"]gpt-4o['"]/);
    assert.doesNotMatch(m[0], /model:\s*['"]gpt-4o-mini['"]/);
  });

  test('fachurteil_entwurf default ist gpt-4o (NICHT mini)', () => {
    // Suche Default-Argument zu chooseModel(body, 'fachurteil_entwurf', X)
    const matches = SRC.match(/chooseModel\(body,\s*['"]fachurteil_entwurf['"],\s*['"]([^'"]+)['"]\)/);
    assert.ok(matches, 'fachurteil_entwurf chooseModel call not found');
    assert.equal(matches[1], 'gpt-4o', 'Default for fachurteil_entwurf must be gpt-4o (Regel 14)');
  });

  test('assist_inline ist gpt-4o', () => {
    // Pattern: chooseModel(body, 'assist_inline', 'gpt-4o') ODER explicit model: 'gpt-4o' für assist_inline-Bereich
    const m = SRC.match(/chooseModel\(body,\s*['"]assist_inline['"],\s*['"]([^'"]+)['"]\)/);
    assert.ok(m, 'assist_inline chooseModel call not found');
    assert.equal(m[1], 'gpt-4o');
  });

  test('Audit-Block-Kommentar vorhanden (Regel 14 Reference)', () => {
    assert.match(SRC, /Regel 14/);
    assert.match(SRC, /Modell-Compliance-Audit/);
  });

  test('MEGA²⁸ W1-I1 Marker in Code-Comments', () => {
    assert.match(SRC, /MEGA.{1,2}.{1,2} W1-I1/);
  });
});

describe('ki-proxy chooseModel-Logic', () => {
  test('chooseModel-Function existiert', () => {
    assert.match(SRC, /function chooseModel\(/);
  });

  test('praezise → gpt-4o für heavy aufgaben', () => {
    const m = SRC.match(/function chooseModel[\s\S]{0,500}/);
    assert.match(m[0], /heavy/);
    assert.match(m[0], /['"]gpt-4o['"]/);
  });
});
