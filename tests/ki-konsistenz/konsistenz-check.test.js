/**
 * PROVA — ki-konsistenz-check Tests (MEGA²⁸ W1-I2)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'netlify', 'functions', 'ki-konsistenz-check.js');

function loadWithStubs() {
  delete require.cache[require.resolve(TARGET)];
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
  stubMod('lib/jwt-middleware.js', { requireAuth: (fn) => fn });
  stubMod('lib/cors-helper.js', { getCorsHeaders: () => ({}) });
  return require(TARGET);
}

describe('ki-konsistenz-check — detectStaticConflicts', () => {
  test('Trockenheit-vs-Feuchtigkeit erkannt', () => {
    const mod = loadWithStubs();
    const r = mod._test.detectStaticConflicts(
      'Der Estrich war trocken bei Begehung.',
      'Aus dem feuchten Zustand des Estrichs würde sich…'
    );
    assert.equal(r.length, 1);
    assert.match(r[0].label, /Trockenheit/);
    assert.equal(r[0].severity, 'high');
  });

  test('Unversehrt-vs-Beschädigt erkannt', () => {
    const mod = loadWithStubs();
    const r = mod._test.detectStaticConflicts(
      'Das Bauteil ist unversehrt.',
      'Da das Bauteil beschädigt wäre…'
    );
    assert.equal(r.length, 1);
    assert.match(r[0].label, /Unversehrt/);
  });

  test('keine Widersprüche → leeres Array', () => {
    const mod = loadWithStubs();
    const r = mod._test.detectStaticConflicts(
      'Der Estrich war feucht.',
      'Aus dem feuchten Zustand ließe sich Sanierungsbedarf ableiten.'
    );
    assert.equal(r.length, 0);
  });

  test('Mehrfach-Widersprüche stack', () => {
    const mod = loadWithStubs();
    const r = mod._test.detectStaticConflicts(
      'Der Estrich war trocken und unversehrt.',
      'Aus dem feuchten und beschädigten Zustand würde sich…'
    );
    assert.ok(r.length >= 2);
  });

  test('null/empty inputs returnen []', () => {
    const mod = loadWithStubs();
    assert.deepEqual(mod._test.detectStaticConflicts(null, 'x'), []);
    assert.deepEqual(mod._test.detectStaticConflicts('x', null), []);
  });
});

describe('ki-konsistenz-check — calculateConfidence', () => {
  test('keine Konflikte → 0.95', () => {
    const mod = loadWithStubs();
    assert.equal(mod._test.calculateConfidence([]), 0.95);
  });

  test('1 high → 0.75', () => {
    const mod = loadWithStubs();
    assert.equal(mod._test.calculateConfidence([{ severity: 'high' }]), 0.75);
  });

  test('viele high → ≥0', () => {
    const mod = loadWithStubs();
    const r = mod._test.calculateConfidence([
      { severity: 'high' }, { severity: 'high' }, { severity: 'high' },
      { severity: 'high' }, { severity: 'high' }
    ]);
    assert.ok(r >= 0 && r <= 1);
  });
});

describe('ki-konsistenz-check — Source-Audit Regel 14', () => {
  const fs = require('node:fs');
  const SRC = fs.readFileSync(TARGET, 'utf8');

  test('GPT-4o im AI-Pfad (NICHT mini)', () => {
    assert.match(SRC, /model:\s*['"]gpt-4o['"]/);
    assert.doesNotMatch(SRC, /model:\s*['"]gpt-4o-mini['"]/);
  });

  test('Pseudonymisierung-Pflicht-Marker', () => {
    assert.match(SRC, /pseudo|Pseudonymisierung/i);
  });

  test('Regel 14 Reference', () => {
    assert.match(SRC, /Regel 14/);
  });

  test('JWT-Auth via requireAuth', () => {
    assert.match(SRC, /requireAuth/);
  });
});
