'use strict';

const test = require('node:test');
const assert = require('node:assert');
const QM = require('../../lib/quality-markers');

test('Norm-Marker: DIN-Verweis erkannt', () => {
  const r = QM.checkMarkers('Nach DIN 18195 ist die Abdichtung mangelhaft.');
  assert.strictEqual(r.norm, true);
});

test('Norm-Marker: VOB erkannt', () => {
  const r = QM.checkMarkers('Gemäß VOB/B § 4 Abs. 7 sind Mängel zu rügen.');
  assert.strictEqual(r.norm, true);
});

test('Norm-Marker: HOAI erkannt', () => {
  const r = QM.checkMarkers('Honorar nach HOAI-Tabelle berechnet.');
  assert.strictEqual(r.norm, true);
});

test('Konjunktiv-II: würde/wäre/hätte erkannt', () => {
  ['Es würde sich um Wassereintritt handeln.',
   'Die Ursache wäre demnach die Steigleitung.',
   'Der SV hätte dies prüfen müssen.'].forEach(t => {
    const r = QM.checkMarkers(t);
    assert.strictEqual(r.konjunktiv, true, 'Konjunktiv-II in: ' + t);
  });
});

test('Konjunktiv-II: dürfte/könnte/müsste erkannt', () => {
  ['Es dürfte naheliegen, dass...', 'könnte als Ursache gelten', 'müsste eigentlich erkennbar sein']
    .forEach(t => assert.strictEqual(QM.checkMarkers(t).konjunktiv, true));
});

test('Konjunktiv-II: Indikativ NICHT erkannt', () => {
  const r = QM.checkMarkers('Es ist eindeutig die Ursache. Definitiv nachgewiesen.');
  assert.strictEqual(r.konjunktiv, false);
});

test('§-Verweis: § 6 ZPO erkannt', () => {
  const r = QM.checkMarkers('§ 6 ZPO regelt das Fachurteil.');
  assert.strictEqual(r.paragraph, true);
});

test('Score: 3/3 Marker → ok=true', () => {
  const text = 'Gemäß DIN 18195 dürfte die Ursache nach § 633 BGB darin liegen.';
  const r = QM.checkMarkers(text);
  assert.strictEqual(r.count, 3);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.missing, []);
});

test('Score: 2/3 Marker → ok=true (min-Schwelle)', () => {
  const text = 'Nach DIN 18195 könnte die Ursache hierin liegen.'; // norm + konjunktiv, kein §
  const r = QM.checkMarkers(text);
  assert.strictEqual(r.count, 2);
  assert.strictEqual(r.ok, true);
});

test('Score: 1/3 Marker → ok=false + missing 2', () => {
  const text = 'Es ist eindeutig nach DIN 18195.'; // nur norm
  const r = QM.checkMarkers(text);
  assert.strictEqual(r.count, 1);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.missing.length, 2);
});

test('Score: 0/3 Marker → ok=false + missing 3', () => {
  const text = 'Es ist eindeutig die Ursache. Klar erkennbar.';
  const r = QM.checkMarkers(text);
  assert.strictEqual(r.count, 0);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.missing.length, 3);
});

test('Score: leerer Text → 0/3', () => {
  assert.strictEqual(QM.checkMarkers('').count, 0);
  assert.strictEqual(QM.checkMarkers(null).count, 0);
});

test('Norm: ImmoWertV (für Wertgutachten-Flow)', () => {
  const r = QM.checkMarkers('Verkehrswert nach ImmoWertV § 9 Abs. 2.');
  assert.strictEqual(r.norm, true);
  assert.strictEqual(r.paragraph, true);
});

test('PATTERNS exposed für Tests + UI-Highlighting', () => {
  assert.ok(QM.PATTERNS.PATTERN_NORM instanceof RegExp);
  assert.ok(QM.PATTERNS.PATTERN_KONJUNKTIV instanceof RegExp);
  assert.ok(QM.PATTERNS.PATTERN_PARAGRAPH instanceof RegExp);
});
