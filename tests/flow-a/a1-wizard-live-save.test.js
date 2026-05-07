'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Wizard = require('../../lib/wizard-live-save');
const Lambda = require('../../netlify/functions/auftraege-update');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'auftraege-update.js'), 'utf8');

test('A1: Beweissicherung skipt §5+§6', () => {
  assert.strictEqual(Wizard.isSkippedFor('beweis', 5), true);
  assert.strictEqual(Wizard.isSkippedFor('beweis', 6), true);
  assert.strictEqual(Wizard.isSkippedFor('beweis', 4), false);
});

test('A1: Gegengutachten skipt §1', () => {
  assert.strictEqual(Wizard.isSkippedFor('gegen', 1), true);
  assert.strictEqual(Wizard.isSkippedFor('gegen', 2), false);
});

test('A1: Ergänzungsgutachten skipt §1-§3', () => {
  [1, 2, 3].forEach(n => assert.strictEqual(Wizard.isSkippedFor('ergaenzung', n), true));
  assert.strictEqual(Wizard.isSkippedFor('ergaenzung', 4), false);
});

test('A1: Standard-Schadensgutachten skipt nichts', () => {
  for (let n = 1; n <= 6; n++) {
    assert.strictEqual(Wizard.isSkippedFor('schaden', n), false);
  }
});

test('A1: Beratung skipt §4-§6 (kein Gutachten, formloser Bericht)', () => {
  [4, 5, 6].forEach(n => assert.strictEqual(Wizard.isSkippedFor('beratung', n), true));
});

test('A1: getSkippedSteps liefert Array-Kopie', () => {
  const a = Wizard.getSkippedSteps('beweis');
  assert.deepStrictEqual(a, [5, 6]);
  // Modifikation darf SKIP_MAP nicht ändern
  a.push(99);
  assert.deepStrictEqual(Wizard.getSkippedSteps('beweis'), [5, 6]);
});

test('A1: Lambda ALLOWED_FIELDS-Whitelist (Schema-Schutz)', () => {
  ['titel', 'fragestellung', 'kurzbeantwortung', 'auftraggeber_typ', 'auftraggeber_kontakt_id', 'objekt', 'details']
    .forEach(f => assert.ok(Lambda.__ALLOWED_FIELDS.includes(f), 'Field ' + f + ' fehlt'));
});

test('A1: Lambda ist requireAuth-protected', () => {
  assert.match(lambdaSrc, /requireAuth/);
});

test('A1: SKIP_MAP enthält 10 auftrag_typ ENUM-Werte', () => {
  const expectedTypes = ['schaden', 'beweis', 'ergaenzung', 'gegen', 'kurzstellungnahme', 'wertgutachten', 'beratung', 'baubegleitung', 'schied', 'gericht'];
  expectedTypes.forEach(t => assert.ok(t in Wizard.SKIP_MAP, 'auftrag_typ ' + t + ' fehlt in SKIP_MAP'));
});

test('A1: saveStep ohne auftrag_id → no-auftrag-id', async () => {
  const r = await Wizard.saveStep(null, { titel: 'x' });
  assert.strictEqual(r.saved, false);
  assert.strictEqual(r.reason, 'no-auftrag-id');
});
