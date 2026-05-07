'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HR = require('../../lib/honorar-rechner');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'honorar-rechner.html'), 'utf8');

test('D2: 3 Modi exposed (JVEG, BVS, Streitwert)', () => {
  assert.strictEqual(typeof HR.berechneJVEG, 'function');
  assert.strictEqual(typeof HR.berechneBVS, 'function');
  assert.strictEqual(typeof HR.berechneStreitwert, 'function');
  assert.strictEqual(typeof HR.vergleicheModi, 'function');
});

test('D2: JVEG_GRUPPEN M1/M2/M3 mit korrekten Stundensätzen', () => {
  assert.strictEqual(HR.JVEG_GRUPPEN.M1.satz, 75);
  assert.strictEqual(HR.JVEG_GRUPPEN.M2.satz, 100);
  assert.strictEqual(HR.JVEG_GRUPPEN.M3.satz, 125);
});

test('D2: JVEG-Berechnung 8h M2 Standard ohne Auslagen', () => {
  const r = HR.berechneJVEG({ stunden: 8, gruppe: 'M2' });
  assert.strictEqual(r.modus, 'JVEG');
  assert.strictEqual(r.gruppe, 'M2');
  assert.strictEqual(r.netto_eur, 800);
  assert.strictEqual(r.mwst_eur, 152);
  assert.strictEqual(r.brutto_eur, 952);
});

test('D2: JVEG mit Anfahrt 100km + 20 Seiten Schreibauslagen', () => {
  const r = HR.berechneJVEG({ stunden: 8, gruppe: 'M2', km: 100, seiten: 20 });
  // 800 + (100 × 0.42) + (20 × 1.50) = 800 + 42 + 30 = 872
  assert.strictEqual(r.netto_eur, 872);
  assert.strictEqual(r.breakdown.fahrtkosten_eur, 42);
  assert.strictEqual(r.breakdown.schreibauslagen_eur, 30);
});

test('D2: BVS Standard 150€/h × 6h + Schreibgebühr 5000 Anschläge', () => {
  const r = HR.berechneBVS({ stunden: 6, tarif: 'standard', anschlaege: 5000 });
  // 6×150 + 5×12 + 25 = 900+60+25 = 985
  assert.strictEqual(r.modus, 'BVS');
  assert.strictEqual(r.stundensatz_eur, 150);
  assert.strictEqual(r.netto_eur, 985);
});

test('D2: BVS Erschwert 180€/h für Statik', () => {
  const r = HR.berechneBVS({ stunden: 5, tarif: 'erschwert' });
  assert.strictEqual(r.stundensatz_eur, 180);
  // 5×180 + 0 + 0 + 25 = 925
  assert.strictEqual(r.netto_eur, 925);
});

test('D2: Streitwert 25.000€ → Stufe bis 25.000 → 1800€ Pauschal', () => {
  const r = HR.berechneStreitwert({ streitwert_eur: 25000 });
  assert.strictEqual(r.modus, 'Streitwert');
  assert.strictEqual(r.pauschal_eur, 1800);
  assert.strictEqual(r.netto_eur, 1800);
  assert.strictEqual(r.brutto_eur, 2142); // 1800 × 1.19
});

test('D2: Streitwert 600.000€ → höchste Stufe (10.000€)', () => {
  const r = HR.berechneStreitwert({ streitwert_eur: 600000 });
  assert.strictEqual(r.pauschal_eur, 10000);
  assert.strictEqual(r.stufe_bis_eur, null); // Infinity → null
});

test('D2: vergleicheModi liefert alle 3 Modi', () => {
  const v = HR.vergleicheModi({ stunden: 8, gruppe: 'M2', streitwert_eur: 25000 });
  assert.ok(v.jveg.netto_eur > 0);
  assert.ok(v.bvs.netto_eur > 0);
  assert.ok(v.streitwert.netto_eur > 0);
  assert.strictEqual(v.jveg.modus, 'JVEG');
  assert.strictEqual(v.bvs.modus, 'BVS');
  assert.strictEqual(v.streitwert.modus, 'Streitwert');
});

test('D2: HTML honorar-rechner.html mit 3 Modus-Buttons + Auth-Guard', () => {
  assert.match(html, /id="modus-jveg"/);
  assert.match(html, /id="modus-bvs"/);
  assert.match(html, /id="modus-streitwert"/);
  assert.match(html, /prova_auth_token/);
  assert.match(html, /\/lib\/honorar-rechner\.js/);
});
