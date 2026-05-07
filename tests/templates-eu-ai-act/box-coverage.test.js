'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function readSafe(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

const GUTACHTEN_DIR = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '04-gutachten');
const RECHNUNG_DIR = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '01-rechnungen');
const MAHN_DIR = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '03-mahnungen');

const GUTACHTEN = ['F-04-KURZSTELLUNGNAHME', 'F-09-KURZGUTACHTEN', 'F-10-BEWEISSICHERUNG',
  'F-11-BRANDSCHADEN', 'F-12-FEUCHTE-SCHIMMEL', 'F-13-ELEMENTARSCHADEN',
  'F-14-BAUMAENGEL', 'F-15-GERICHTSGUTACHTEN', 'F-16-ERGAENZUNG',
  'F-17-SCHIEDSGUTACHTEN', 'F-18-BAUABNAHME', 'F-19-WERTGUTACHTEN'];

test('B4: alle 12 Gutachten-Templates haben EU AI Act Disclosure', () => {
  let coverCount = 0;
  GUTACHTEN.forEach(name => {
    const fp = path.join(GUTACHTEN_DIR, name + '.liquid.template.html');
    const src = readSafe(fp);
    assert.ok(src, name + ' Template fehlt');
    if (/EU AI Act|Art\. 50/i.test(src)) coverCount++;
  });
  assert.strictEqual(coverCount, 12, '12/12 Gutachten-Templates erwartet');
});

test('B4: KEINE EU AI Act Box auf JVEG-Gerichtsrechnung', () => {
  const src = readSafe(path.join(RECHNUNG_DIR, 'F-01-JVEG-GERICHTSRECHNUNG.template.html'));
  assert.ok(src);
  // EU AI Act darf nicht im aktiven Template-Body stehen
  assert.ok(!/EU AI Act|Art\. 50/.test(src.replace(/<!--[\s\S]*?-->/g, '')), 'Body muss EU-AI-Act-frei sein');
});

test('B4: Pauschal-/Stunden-/Storno-Rechnungen haben "bewusst entfernt"-Comment (v1.1)', () => {
  ['F-02-PAUSCHALRECHNUNG', 'F-03-STUNDENRECHNUNG', 'F-05-GUTSCHRIFT-STORNO'].forEach(name => {
    const src = readSafe(path.join(RECHNUNG_DIR, name + '.template.html'));
    assert.ok(src);
    assert.match(src, /bewusst entfernt|keine gesetzliche Pflicht/i, name + ': v1.1 Comment fehlt');
  });
});

test('B4: KEINE Mahnung-Templates haben EU AI Act Box', () => {
  const mahnFiles = fs.readdirSync(MAHN_DIR).filter(f => f.endsWith('.html'));
  mahnFiles.forEach(name => {
    const src = readSafe(path.join(MAHN_DIR, name));
    if (!src) return;
    assert.ok(!/EU AI Act|Art\. 50/.test(src.replace(/<!--[\s\S]*?-->/g, '')),
      name + ': darf keine EU-AI-Act-Box im Body haben');
  });
});

test('B4: F-15-GERICHTSGUTACHTEN als kritischste Compliance-Variante hat 5+ Matches', () => {
  const src = readSafe(path.join(GUTACHTEN_DIR, 'F-15-GERICHTSGUTACHTEN.liquid.template.html'));
  const count = (src.match(/EU AI Act|Art\. 50/g) || []).length;
  assert.ok(count >= 4, `F-15 erwartet ≥4, gefunden ${count}`);
});

test('B4: alle Gutachten-Templates haben § 407a ZPO Hinweis (Doppelte Compliance)', () => {
  let count = 0;
  GUTACHTEN.forEach(name => {
    const src = readSafe(path.join(GUTACHTEN_DIR, name + '.liquid.template.html'));
    if (/§ ?407a|407a ZPO/.test(src || '')) count++;
  });
  assert.ok(count >= 10, `≥10/12 erwartet, gefunden ${count}`);
});
