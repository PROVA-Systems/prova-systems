'use strict';

/**
 * MEGA³⁹ P2 — Globale Suche 360° Tests
 *
 * Verifiziert dass das global-search Lambda durchsucht:
 *   1. Aufträge (existed)
 *   2. Kontakte (existed)
 *   3. Korrespondenz-Briefe (existed, static K-XX)
 *   4. Termine (NEU)
 *   5. Einträge inkl. Skizzen (NEU)
 *   6. Textbausteine (NEU)
 *   7. dokument_templates (NEU)
 *   8. Normen-Seed (NEU, 50+ DIN/WTA/VOB/JVEG/ZPO)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Lambda = require(path.join(ROOT, 'netlify', 'functions', 'global-search.js'));
const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'global-search.js'), 'utf8');

test('P2: Lambda exposed __matchNormen + __NORMEN_SEED + __matchActions', () => {
  assert.strictEqual(typeof Lambda.__matchNormen, 'function');
  assert.ok(Array.isArray(Lambda.__NORMEN_SEED));
  assert.ok(Lambda.__NORMEN_SEED.length >= 40, 'mindestens 40 Normen, hat ' + Lambda.__NORMEN_SEED.length);
  assert.strictEqual(typeof Lambda.__matchActions, 'function');
});

test('P2: Marcel-Beispiel "DIN 985" findet die Norm', () => {
  const matches = Lambda.__matchNormen('din 985', 10);
  assert.ok(matches.length >= 1);
  assert.ok(matches.some(m => m.id === 'DIN 985'));
});

test('P2: Live-Filter-Drilldown "DIN" → "DIN 9" → "DIN 98"', () => {
  const dinAll = Lambda.__matchNormen('din', 100);
  assert.ok(dinAll.length >= 10, 'DIN-Treffer >= 10');

  const din9 = Lambda.__matchNormen('din 9', 100);
  // Filter immer enger
  assert.ok(din9.length < dinAll.length || din9.length === dinAll.length);

  const din98 = Lambda.__matchNormen('din 98', 100);
  // 985, 988
  assert.ok(din98.length >= 2);
  assert.ok(din98.some(m => m.id === 'DIN 985'));
  assert.ok(din98.some(m => m.id === 'DIN 988'));

  const din985 = Lambda.__matchNormen('din 985', 100);
  assert.strictEqual(din985.length, 1);
});

test('P2: Cross-Type-Search "Schimmel" findet Normen + WTA', () => {
  const schimmel = Lambda.__matchNormen('schimmel', 100);
  // DIN ISO 16000-17, DIN 68800-3, WTA 6-2
  assert.ok(schimmel.length >= 2);
  assert.ok(schimmel.some(m => m.id === 'WTA 6-2'));
});

test('P2: Bereiche abgedeckt — Wertgutachten, Brandschutz, Honorar, Datenschutz, KI-Recht', () => {
  const allBereiche = new Set(Lambda.__NORMEN_SEED.map(n => n.bereich));
  ['Wertgutachten', 'Brandschutz', 'Honorar', 'Prozessrecht',
   'Datenschutz', 'KI-Recht', 'Bauphysik', 'Schimmel']
    .forEach(b => assert.ok(allBereiche.has(b), 'Bereich fehlt: ' + b));
});

test('P2: Lambda-Source enthält neue Such-Bereiche (4 NEU + 4 existing)', () => {
  // Existing: auftraege, kontakte, dokumente (Korrespondenz)
  assert.match(src, /\.from\(['"]auftraege['"]\)/);
  assert.match(src, /\.from\(['"]kontakte['"]\)/);
  // NEU M³⁹ P2:
  assert.match(src, /\.from\(['"]termine['"]\)/);
  assert.match(src, /\.from\(['"]eintraege['"]\)/);
  assert.match(src, /\.from\(['"]textbausteine['"]\)/);
  assert.match(src, /\.from\(['"]dokument_templates['"]\)/);
});

test('P2: Result-Types — type=akte, kontakt, dokument, termin, eintrag, textbaustein, template, norm', () => {
  ['type: \'akte\'', 'type: \'kontakt\'', 'type: \'dokument\'',
   'type: \'termin\'', 'type: \'eintrag\'', 'type: \'textbaustein\'',
   'type: \'template\'', 'type: \'norm\'']
    .forEach(t => assert.ok(src.includes(t), 'Type fehlt: ' + t));
});

test('P2: Eintrag-Suche enthält Skizze-Hinweis (skizze_nr)', () => {
  // Subtitle für Skizzen: "Skizze 1, 2, 3..."
  assert.match(src, /skizze_nr/);
  assert.match(src, /'Skizze ' \+ e\.skizze_nr/);
});

test('P2: dokument_templates Filter aktiv=true', () => {
  assert.match(src, /\.eq\(['"]aktiv['"],\s*true\)/);
});

test('P2: typeFilter "all" durchsucht alle 8 Bereiche', () => {
  // Alle 8 Bereiche haben "typeFilter === 'all' ||" Checks
  const matches = (src.match(/typeFilter === 'all'/g) || []).length;
  assert.ok(matches >= 8, 'mindestens 8 Bereiche, hat ' + matches);
});

test('P2: Score-Sortierung absteigend', () => {
  assert.match(src, /allResults\.sort\(\(a, b\) => \(b\.score \|\| 0\) - \(a\.score \|\| 0\)\)/);
});

test('P2: Marcel-Beispiel-Workflow "DIN 985" Score-Boost (95 statt 55)', () => {
  // Im Lambda: id-Match Score=95, Titel-Match Score=55
  assert.match(src, /n\.id\.toLowerCase\(\)\.includes\(queryLower\) \? 95 : 55/);
});

test('P2: Quick-Actions A3 Bestand bleibt funktional', () => {
  assert.ok(Array.isArray(Lambda.__QUICK_ACTIONS));
  assert.ok(Lambda.__QUICK_ACTIONS.length >= 6);
});
