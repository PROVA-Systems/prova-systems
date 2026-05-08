/**
 * MEGA⁴² P2 — wizard-flow-configs.js Tests
 *
 * Validiert dass die 4 Flow-Konfigurationen (A/B/C/D) korrekte Struktur
 * haben + Validation-Funktionen wie erwartet arbeiten.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const cfg = require(path.join(__dirname, '..', '..', 'lib', 'wizard-flow-configs.js'));

// ─── Public API ────────────────────────────────────────────

test('P2: ProvaWizardFlowConfigs exports getFlow', () => {
  assert.equal(typeof cfg.getFlow, 'function');
});

test('P2: ProvaWizardFlowConfigs exports listFlows', () => {
  assert.equal(typeof cfg.listFlows, 'function');
});

test('P2: ProvaWizardFlowConfigs exports describeFlow', () => {
  assert.equal(typeof cfg.describeFlow, 'function');
});

test('P2: ProvaWizardFlowConfigs exports getStepsForAuftragstyp', () => {
  assert.equal(typeof cfg.getStepsForAuftragstyp, 'function');
});

test('P2: ProvaWizardFlowConfigs exports getFieldCoverage', () => {
  assert.equal(typeof cfg.getFieldCoverage, 'function');
});

// ─── 4 Flows Existence ─────────────────────────────────────

test('P2: listFlows returns 4 flows', () => {
  const flows = cfg.listFlows();
  assert.deepStrictEqual(flows.sort(), ['A', 'B', 'C', 'D']);
});

test('P2: getFlow("A") returns Schaden-Flow', () => {
  const f = cfg.getFlow('A');
  assert.ok(f);
  assert.equal(f.key, 'A');
  assert.match(f.label, /Schaden/);
});

test('P2: getFlow("B") returns Wertgutachten-Flow', () => {
  const f = cfg.getFlow('B');
  assert.ok(f);
  assert.equal(f.key, 'B');
  assert.match(f.label, /Wert/);
});

test('P2: getFlow("C") returns Beratung-Flow', () => {
  const f = cfg.getFlow('C');
  assert.ok(f);
  assert.equal(f.key, 'C');
  assert.match(f.label, /Beratung/);
});

test('P2: getFlow("D") returns Baubegleitung-Flow', () => {
  const f = cfg.getFlow('D');
  assert.ok(f);
  assert.equal(f.key, 'D');
  assert.match(f.label, /Baubegleitung/);
});

test('P2: getFlow case-insensitive', () => {
  assert.equal(cfg.getFlow('a').key, 'A');
  assert.equal(cfg.getFlow('B').key, 'B');
});

test('P2: getFlow null/undefined returns null', () => {
  assert.equal(cfg.getFlow(null), null);
  assert.equal(cfg.getFlow(undefined), null);
  assert.equal(cfg.getFlow(''), null);
});

test('P2: getFlow unknown returns null', () => {
  assert.equal(cfg.getFlow('X'), null);
});

// ─── Step-Struktur ─────────────────────────────────────────

test('P2: Flow A hat 4 Steps (auftragstyp/wo_was/auftraggeber/rahmen)', () => {
  const f = cfg.getFlow('A');
  assert.equal(f.steps.length, 4);
  assert.deepStrictEqual(f.steps.map(s => s.key), ['auftragstyp', 'wo_was', 'auftraggeber', 'rahmen']);
});

test('P2: Flow B hat 4 Steps (auftragstyp/objekt/auftraggeber/methode)', () => {
  const f = cfg.getFlow('B');
  assert.equal(f.steps.length, 4);
  assert.deepStrictEqual(f.steps.map(s => s.key), ['auftragstyp', 'objekt', 'auftraggeber', 'methode']);
});

test('P2: Flow C hat 3 Steps (auftragstyp/thema/auftraggeber)', () => {
  const f = cfg.getFlow('C');
  assert.equal(f.steps.length, 3);
  assert.deepStrictEqual(f.steps.map(s => s.key), ['auftragstyp', 'thema', 'auftraggeber']);
});

test('P2: Flow D hat 4 Steps (auftragstyp/projekt/auftraggeber/rhythmus)', () => {
  const f = cfg.getFlow('D');
  assert.equal(f.steps.length, 4);
  assert.deepStrictEqual(f.steps.map(s => s.key), ['auftragstyp', 'projekt', 'auftraggeber', 'rhythmus']);
});

test('P2: Jeder Step hat key+label+fields+validate', () => {
  for (const flowKey of cfg.listFlows()) {
    const f = cfg.getFlow(flowKey);
    for (const step of f.steps) {
      assert.equal(typeof step.key, 'string', `Flow ${flowKey} step.key`);
      assert.equal(typeof step.label, 'string', `Flow ${flowKey} step.label`);
      assert.ok(Array.isArray(step.fields), `Flow ${flowKey} step.fields`);
      assert.equal(typeof step.validate, 'function', `Flow ${flowKey} step.validate`);
    }
  }
});

// ─── Validation-Verhalten ──────────────────────────────────

test('P2: Flow A Step 1 validate({}) → invalid (auftrag_typ fehlt)', () => {
  const f = cfg.getFlow('A');
  const r = f.steps[0].validate({});
  assert.equal(r.valid, false);
  assert.match(r.errors[0].msg, /Auftragstyp/);
});

test('P2: Flow A Step 1 validate({auftrag_typ:"x"}) → valid', () => {
  const f = cfg.getFlow('A');
  const r = f.steps[0].validate({ auftrag_typ: 'gerichtsgutachten' });
  assert.equal(r.valid, true);
});

test('P2: Flow A Step 2 validate ohne adresse → invalid', () => {
  const f = cfg.getFlow('A');
  const r = f.steps[1].validate({ plz: '10115' });
  assert.equal(r.valid, false);
});

test('P2: Flow A Step 2 validate ohne plz → invalid', () => {
  const f = cfg.getFlow('A');
  const r = f.steps[1].validate({ adresse: 'Hauptstr. 1' });
  assert.equal(r.valid, false);
});

test('P2: Flow A Step 2 validate vollständig → valid', () => {
  const f = cfg.getFlow('A');
  const r = f.steps[1].validate({ adresse: 'Hauptstr. 1', plz: '10115' });
  assert.equal(r.valid, true);
});

test('P2: Flow B Step 4 (Methode) ohne wertermittlungsmethode → invalid', () => {
  const f = cfg.getFlow('B');
  const r = f.steps[3].validate({});
  assert.equal(r.valid, false);
});

test('P2: Flow C Step 2 (Thema) ohne thema → invalid', () => {
  const f = cfg.getFlow('C');
  const r = f.steps[1].validate({ adresse: 'X' });
  assert.equal(r.valid, false);
});

test('P2: Flow D Step 4 (Rhythmus) ohne rhythmus → invalid', () => {
  const f = cfg.getFlow('D');
  const r = f.steps[3].validate({});
  assert.equal(r.valid, false);
});

// ─── skipPhases (Skip-Logic) ───────────────────────────────

test('P2: Flow A skipPhases("beweissicherung") → [5,6]', () => {
  const f = cfg.getFlow('A');
  assert.deepStrictEqual(f.skipPhases('beweissicherung'), [5, 6]);
});

test('P2: Flow A skipPhases("ergaenzungsgutachten") → [1,2,3]', () => {
  const f = cfg.getFlow('A');
  assert.deepStrictEqual(f.skipPhases('ergaenzungsgutachten'), [1, 2, 3]);
});

test('P2: Flow A skipPhases("gegengutachten") → [1]', () => {
  const f = cfg.getFlow('A');
  assert.deepStrictEqual(f.skipPhases('gegengutachten'), [1]);
});

test('P2: Flow A skipPhases("gerichtsgutachten") → []', () => {
  const f = cfg.getFlow('A');
  assert.deepStrictEqual(f.skipPhases('gerichtsgutachten'), []);
});

test('P2: Flow C skipPhases() → [1..6] (Beratung skip alle Paragraphen)', () => {
  const f = cfg.getFlow('C');
  assert.deepStrictEqual(f.skipPhases('kaufberatung'), [1, 2, 3, 4, 5, 6]);
});

// ─── auftragstyp-Lookup ────────────────────────────────────

test('P2: getStepsForAuftragstyp("gerichtsgutachten") → Flow A', () => {
  const r = cfg.getStepsForAuftragstyp('gerichtsgutachten');
  assert.equal(r.flow, 'A');
  assert.equal(r.steps.length, 4);
});

test('P2: getStepsForAuftragstyp("wertgutachten") → Flow B', () => {
  const r = cfg.getStepsForAuftragstyp('wertgutachten');
  assert.equal(r.flow, 'B');
});

test('P2: getStepsForAuftragstyp("kaufberatung") → Flow C', () => {
  const r = cfg.getStepsForAuftragstyp('kaufberatung');
  assert.equal(r.flow, 'C');
});

test('P2: getStepsForAuftragstyp("baubegleitung") → Flow D', () => {
  const r = cfg.getStepsForAuftragstyp('baubegleitung');
  assert.equal(r.flow, 'D');
});

test('P2: getStepsForAuftragstyp(unknown) → null', () => {
  assert.equal(cfg.getStepsForAuftragstyp('xxx-unknown'), null);
});

test('P2: getStepsForAuftragstyp("beweissicherung") liefert skipPhases [5,6]', () => {
  const r = cfg.getStepsForAuftragstyp('beweissicherung');
  assert.deepStrictEqual(r.skipPhases, [5, 6]);
});

// ─── describeFlow ──────────────────────────────────────────

test('P2: describeFlow für alle 4 Flows liefert nicht-leeren String', () => {
  for (const k of cfg.listFlows()) {
    const d = cfg.describeFlow(k);
    assert.equal(typeof d, 'string');
    assert.ok(d.length > 0, `Flow ${k} description nicht leer`);
  }
});

test('P2: describeFlow(unknown) → leerer String', () => {
  assert.equal(cfg.describeFlow('X'), '');
});

// ─── getFieldCoverage (Cross-Flow Konsistenz) ──────────────

test('P2: getFieldCoverage(A) liefert step+field-counts', () => {
  const cov = cfg.getFieldCoverage('A');
  assert.ok(cov);
  assert.equal(cov.total_steps, 4);
  assert.ok(Array.isArray(cov.required_fields));
});

test('P2: Alle 4 Flows haben mindestens auftrag_typ als required-field', () => {
  for (const k of cfg.listFlows()) {
    const cov = cfg.getFieldCoverage(k);
    assert.ok(cov.required_fields.includes('auftrag_typ'), `Flow ${k} hat auftrag_typ`);
  }
});

// ─── Auftragstypen-Coverage ────────────────────────────────

test('P2: Flow A hat 7 Auftragstypen', () => {
  const f = cfg.getFlow('A');
  assert.equal(f.auftragstypen.length, 7);
});

test('P2: Flow A inkludiert gerichtsgutachten + privatgutachten', () => {
  const f = cfg.getFlow('A');
  assert.ok(f.auftragstypen.includes('gerichtsgutachten'));
  assert.ok(f.auftragstypen.includes('privatgutachten'));
});

test('P2: Auftragstypen sind über Flows disjunkt', () => {
  const seen = new Set();
  for (const k of cfg.listFlows()) {
    const f = cfg.getFlow(k);
    for (const t of f.auftragstypen) {
      assert.ok(!seen.has(t), `Duplicate auftrag_typ "${t}" in Flow ${k}`);
      seen.add(t);
    }
  }
});
