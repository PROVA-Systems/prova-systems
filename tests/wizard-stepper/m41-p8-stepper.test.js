'use strict';

/**
 * MEGA⁴¹ P8 — Wizard-Stepper Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Stepper = require(path.join(ROOT, 'lib', 'wizard-stepper.js'));
const stepperSrc = read('lib/wizard-stepper.js');
const stepperCss = read('lib/wizard-stepper.css');
const researchSrc = read('docs/sprint-research/MEGA41-P8-STEPPER-UX-RECHERCHE.md');

// ─────────────────────────────────────────────────────────────────
//  P8-1 Recherche-Doku
// ─────────────────────────────────────────────────────────────────

test('P8-1: Recherche-Doku enthaelt 5 SaaS-Quellen', () => {
  ['Linear', 'Notion', 'Stripe', 'Asana', 'Vercel']
    .forEach(name => assert.match(researchSrc, new RegExp(name, 'i')));
});

test('P8-1: Recherche-Doku hat 10 Decision-Final-Punkte', () => {
  // Match nummerierte Liste 1.-10. in Decision-Final-Sektion
  const decisionSection = researchSrc.split('Decision-Final')[1] || '';
  const numberedItems = decisionSection.match(/^\d+\. \*\*/gm) || [];
  assert.ok(numberedItems.length >= 10, 'expected 10+ Decision-Punkte, got ' + numberedItems.length);
});

// ─────────────────────────────────────────────────────────────────
//  P8-2 Public API
// ─────────────────────────────────────────────────────────────────

test('P8-2: Stepper exports mount + validateStep + Konstanten', () => {
  ['mount', 'validateStep'].forEach(fn => assert.strictEqual(typeof Stepper[fn], 'function'));
  assert.strictEqual(Stepper.DRAFT_PREFIX, 'wizard_draft_');
  assert.strictEqual(Stepper.AUTO_SAVE_DEBOUNCE_MS, 1500);
});

// ─────────────────────────────────────────────────────────────────
//  P8-2 validateStep Logic
// ─────────────────────────────────────────────────────────────────

test('P8-2: validateStep ohne validateFn → valid:true', () => {
  const r = Stepper.validateStep([{ key: 'a', label: 'A' }], 0, {});
  assert.strictEqual(r.valid, true);
  assert.deepStrictEqual(r.errors, []);
});

test('P8-2: validateStep mit validateFn=true → valid:true', () => {
  const r = Stepper.validateStep([{ key: 'a', label: 'A', validateFn: () => true }], 0, {});
  assert.strictEqual(r.valid, true);
});

test('P8-2: validateStep mit validateFn=false → valid:false', () => {
  const r = Stepper.validateStep([{ key: 'a', label: 'A', validateFn: () => false }], 0, {});
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.length > 0);
});

test('P8-2: validateStep mit validateFn returns errors-Array', () => {
  const r = Stepper.validateStep([{
    key: 'a', label: 'A',
    validateFn: () => ({ valid: false, errors: [{ field: 'name', msg: 'pflicht' }] })
  }], 0, {});
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.errors[0].field, 'name');
  assert.strictEqual(r.errors[0].msg, 'pflicht');
});

test('P8-2: validateStep mit validateFn-throw → kontrolliertes Error-Object', () => {
  const r = Stepper.validateStep([{
    key: 'a', label: 'A', validateFn: () => { throw new Error('Test-Crash'); }
  }], 0, {});
  assert.strictEqual(r.valid, false);
  assert.match(r.errors[0].msg, /Test-Crash/);
});

test('P8-2: validateStep invalid idx → valid:false', () => {
  const r = Stepper.validateStep([{ key: 'a' }], 5, {});
  assert.strictEqual(r.valid, false);
});

// ─────────────────────────────────────────────────────────────────
//  P8-3 Draft-Persistence (localStorage)
// ─────────────────────────────────────────────────────────────────

test('P8-3: _setDraft + _getDraft Roundtrip mit localStorage-Mock', () => {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; }
  };
  try {
    const draft = { currentIdx: 1, completed: [0], data: { name: 'Müller' }, savedAt: 12345 };
    assert.strictEqual(Stepper._setDraft('test-key', draft), true);
    const loaded = Stepper._getDraft('test-key');
    assert.deepStrictEqual(loaded, draft);
    Stepper._clearDraft('test-key');
    assert.strictEqual(Stepper._getDraft('test-key'), null);
  } finally {
    delete global.localStorage;
  }
});

test('P8-3: _setDraft + _getDraft graceful bei fehlender localStorage', () => {
  // Bereits ohne localStorage → null/false
  assert.strictEqual(Stepper._getDraft('any'), null);
  assert.strictEqual(Stepper._setDraft('any', {}), false);
});

test('P8-3: _setDraft mit null draftKey → false (no-op)', () => {
  const store = {};
  global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
  try {
    assert.strictEqual(Stepper._setDraft('', {}), false);
    assert.strictEqual(Stepper._setDraft(null, {}), false);
  } finally { delete global.localStorage; }
});

// ─────────────────────────────────────────────────────────────────
//  P8-4 Source-Inspection (Patterns aus Recherche)
// ─────────────────────────────────────────────────────────────────

test('P8-4: Lib hat aria-valuenow + role=progressbar (Accessibility)', () => {
  assert.match(stepperSrc, /role['"], ['"]progressbar/);
  assert.match(stepperSrc, /aria-valuenow/);
});

test('P8-4: Lib hat Buttons-Position-Fix (data-action="prev"/"next"/"submit")', () => {
  ['prev', 'next', 'submit', 'save-exit'].forEach(a => {
    assert.match(stepperSrc, new RegExp("data-action=['\"]" + a + "['\"]|action === ['\"]" + a + "['\"]"));
  });
});

test('P8-4: Lib hat Progress-% bei ≥3 Steps (Stripe-Pattern)', () => {
  assert.match(stepperSrc, /total\s*>=\s*3/);
  assert.match(stepperSrc, /progressPct/);
});

test('P8-4: Lib hat goToStep mit completed-Set-Check (Vercel-Pattern)', () => {
  assert.match(stepperSrc, /idx > state\.currentIdx && !state\.completedSet\.has\(idx\)/);
});

test('P8-4: Lib hat Auto-Save-Debounce 1500ms', () => {
  assert.match(stepperSrc, /AUTO_SAVE_DEBOUNCE_MS\s*=\s*1500/);
});

test('P8-4: Lib hat Keyboard Enter/Esc (Stripe-Pattern)', () => {
  assert.match(stepperSrc, /e\.key === ['"]Enter['"]/);
  assert.match(stepperSrc, /e\.key === ['"]Escape['"]/);
});

test('P8-4: UMD-Pattern (window + module.exports)', () => {
  assert.match(stepperSrc, /window\.ProvaWizardStepper/);
  assert.match(stepperSrc, /module\.exports\s*=\s*api/);
});

// ─────────────────────────────────────────────────────────────────
//  P8-5 CSS Patterns
// ─────────────────────────────────────────────────────────────────

test('P8-5: CSS hat 3 Step-States (done / active / locked)', () => {
  ['.pws-step--done', '.pws-step--active', '.pws-step--locked']
    .forEach(c => assert.match(stepperCss, new RegExp(c.replace(/[-]/g, '\\-'))));
});

test('P8-5: CSS hat Mobile-Compact ab 700px Breakpoint', () => {
  assert.match(stepperCss, /@media \(max-width:\s*700px\)/);
  assert.match(stepperCss, /\.pws-compact\s*\{[\s\S]*display:\s*block/);
});

test('P8-5: CSS hat prefers-reduced-motion', () => {
  assert.match(stepperCss, /prefers-reduced-motion/);
});

test('P8-5: CSS Footer-Grid 3-Spalten (Zurück | Save | Weiter)', () => {
  assert.match(stepperCss, /\.pws-footer[\s\S]*grid-template-columns:\s*1fr 1fr 1fr/);
});
