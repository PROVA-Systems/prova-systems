/**
 * MEGA⁴² P2 — workflow-stepper-bridge.js Tests
 *
 * Validiert Bridge-API: bindToProvaWizard + _getProgressForStatePure (pure-fn).
 * Mount-Tests sind in DOM-Tests (m42-p2-bridge-dom.test.js) abgekapselt.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Setup window stub für Node-test (bridge expects window.ProvaWizardFlowConfigs)
const cfg = require(path.join(__dirname, '..', '..', 'lib', 'wizard-flow-configs.js'));
global.window = global.window || {};
global.window.ProvaWizardFlowConfigs = cfg;

const bridge = require(path.join(__dirname, '..', '..', 'lib', 'workflow-stepper-bridge.js'));

// ─── API ──────────────────────────────────────────────────

test('P2-Bridge: exports mount', () => {
  assert.equal(typeof bridge.mount, 'function');
});

test('P2-Bridge: exports bindToProvaWizard', () => {
  assert.equal(typeof bridge.bindToProvaWizard, 'function');
});

test('P2-Bridge: exports getProgressForState', () => {
  assert.equal(typeof bridge.getProgressForState, 'function');
});

test('P2-Bridge: exports _getProgressForStatePure', () => {
  assert.equal(typeof bridge._getProgressForStatePure, 'function');
});

// ─── bindToProvaWizard ────────────────────────────────────

test('P2-Bridge: bindToProvaWizard(A, 1) → currentIdx=0', () => {
  const r = bridge.bindToProvaWizard('A', 1);
  assert.ok(r);
  assert.equal(r.flow.key, 'A');
  assert.equal(r.currentIdx, 0);
  assert.equal(r.currentStep.key, 'auftragstyp');
});

test('P2-Bridge: bindToProvaWizard(A, 2) → currentIdx=1', () => {
  const r = bridge.bindToProvaWizard('A', 2);
  assert.equal(r.currentIdx, 1);
  assert.equal(r.currentStep.key, 'wo_was');
});

test('P2-Bridge: bindToProvaWizard(A, 4) → currentIdx=3 (rahmen)', () => {
  const r = bridge.bindToProvaWizard('A', 4);
  assert.equal(r.currentIdx, 3);
  assert.equal(r.currentStep.key, 'rahmen');
});

test('P2-Bridge: bindToProvaWizard(A, 99) → clamp to last step', () => {
  const f = cfg.getFlow('A');
  const r = bridge.bindToProvaWizard('A', 99);
  assert.equal(r.currentIdx, f.steps.length - 1);
});

test('P2-Bridge: bindToProvaWizard(A, 0) → clamp to first step', () => {
  const r = bridge.bindToProvaWizard('A', 0);
  assert.equal(r.currentIdx, 0);
});

test('P2-Bridge: bindToProvaWizard(unknown) → null', () => {
  const r = bridge.bindToProvaWizard('Z', 1);
  assert.equal(r, null);
});

test('P2-Bridge: bindToProvaWizard liefert progress_pct', () => {
  const r = bridge.bindToProvaWizard('A', 2);
  // 2/4 = 50%
  assert.equal(r.progress_pct, 50);
});

test('P2-Bridge: bindToProvaWizard für Flow C (3 Steps) Step 2 → 67%', () => {
  const r = bridge.bindToProvaWizard('C', 2);
  assert.equal(r.progress_pct, 67);
});

// ─── _getProgressForStatePure ─────────────────────────────

test('P2-Bridge: getProgressForState(A, {}) → 0% (kein step valid)', () => {
  const flow = cfg.getFlow('A');
  const r = bridge._getProgressForStatePure(flow, {});
  assert.equal(r.percentage, 0);
  assert.equal(r.currentIdx, 0);
  assert.deepStrictEqual(r.completedKeys, []);
});

test('P2-Bridge: getProgressForState(A, {auftrag_typ:"x"}) → 25%', () => {
  const flow = cfg.getFlow('A');
  const r = bridge._getProgressForStatePure(flow, { auftrag_typ: 'gerichtsgutachten' });
  assert.equal(r.percentage, 25);
  assert.deepStrictEqual(r.completedKeys, ['auftragstyp']);
});

test('P2-Bridge: getProgressForState(A, halbvoll) → 50%', () => {
  const flow = cfg.getFlow('A');
  const r = bridge._getProgressForStatePure(flow, {
    auftrag_typ: 'gerichtsgutachten',
    adresse: 'Hauptstr. 1',
    plz: '10115'
  });
  assert.equal(r.percentage, 50);
  assert.equal(r.completedKeys.length, 2);
});

test('P2-Bridge: getProgressForState(A, vollständig) → 100%', () => {
  const flow = cfg.getFlow('A');
  const r = bridge._getProgressForStatePure(flow, {
    auftrag_typ: 'gerichtsgutachten',
    adresse: 'Hauptstr. 1',
    plz: '10115',
    ort: 'Berlin',
    auftraggeber_name: 'Müller'
  });
  assert.equal(r.percentage, 100);
  assert.equal(r.completedKeys.length, 4);
});

test('P2-Bridge: getProgressForState(B, mit allen 4 Steps voll) → 100%', () => {
  const flow = cfg.getFlow('B');
  const r = bridge._getProgressForStatePure(flow, {
    auftrag_typ: 'wertgutachten',
    adresse: 'Bauplatz 5',
    plz: '20355',
    auftraggeber_name: 'Test',
    zweck: 'Verkauf',
    wertermittlungsmethode: 'sachwertverfahren',
    stichtag: '2026-05-08'
  });
  assert.equal(r.percentage, 100);
});

test('P2-Bridge: getProgressForState(C, mit thema+name) → 100%', () => {
  const flow = cfg.getFlow('C');
  const r = bridge._getProgressForStatePure(flow, {
    auftrag_typ: 'kaufberatung',
    thema: 'Kauf-Hilfe',
    auftraggeber_name: 'Schmidt'
  });
  assert.equal(r.percentage, 100);
});

test('P2-Bridge: getProgressForState(D, vollständig) → 100%', () => {
  const flow = cfg.getFlow('D');
  const r = bridge._getProgressForStatePure(flow, {
    auftrag_typ: 'baubegleitung',
    projektname: 'Bauprojekt X',
    adresse: 'Baustr 7',
    auftraggeber_name: 'Bauherr',
    rhythmus: 'monatlich'
  });
  assert.equal(r.percentage, 100);
});

test('P2-Bridge: getProgressForState() liefert immer totalSteps', () => {
  for (const k of cfg.listFlows()) {
    const flow = cfg.getFlow(k);
    const r = bridge._getProgressForStatePure(flow, {});
    assert.equal(r.totalSteps, flow.steps.length);
  }
});

test('P2-Bridge: getProgressForState(null) → null', () => {
  assert.equal(bridge._getProgressForStatePure(null, {}), null);
});

test('P2-Bridge: getProgressForState({steps:undefined}) → null', () => {
  assert.equal(bridge._getProgressForStatePure({}, {}), null);
});

// ─── Integration: getProgressForState mit window deps ────

test('P2-Bridge: getProgressForState mit window-deps → funktioniert', () => {
  const r = bridge.getProgressForState('A', { auftrag_typ: 'x' });
  assert.ok(r);
  assert.equal(r.percentage, 25);
});

test('P2-Bridge: getProgressForState(unknown flow) → null', () => {
  const r = bridge.getProgressForState('Z', {});
  assert.equal(r, null);
});
