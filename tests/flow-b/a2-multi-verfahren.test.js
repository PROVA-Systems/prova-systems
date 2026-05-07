'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const V = require('../../lib/wertgutachten-verfahren');
const sourcesPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-32-A2-WERTGUTACHTEN-SOURCES.md');

test('A2: Sachwertverfahren §§35-39 Berechnung', () => {
  const r = V.berechneSachwert({
    bodenrichtwert_eur_qm: 500, grundstuecksflaeche_qm: 600, boden_marktanpassung: 1.0,
    nhk_eur_qm: 1800, bgf_qm: 200, alterswertminderung_pct: 30, gebaeude_marktanpassung: 1.0,
    marktanpassung_gesamt: 1.0
  });
  assert.strictEqual(r.bodenwert, 300000); // 500 * 600
  assert.strictEqual(r.gebaeudewert, 252000); // 1800 * 200 * 0.7
  assert.strictEqual(r.verkehrswert, 552000);
  assert.match(r.rechtsgrundlage, /ImmoWertV §§35-39/);
});

test('A2: Vergleichswertverfahren §§22-28 Mittelwert', () => {
  const r = V.berechneVergleich({
    vergleichspreise: [
      { preis_eur: 400000 }, { preis_eur: 420000 }, { preis_eur: 380000 }
    ]
  });
  assert.strictEqual(r.anzahl_vergleiche, 3);
  assert.strictEqual(r.durchschnitt, 400000);
  assert.strictEqual(r.verkehrswert, 400000);
});

test('A2: Vergleichswert mit Anpassung -5%', () => {
  const r = V.berechneVergleich({
    vergleichspreise: [{ preis_eur: 500000 }, { preis_eur: 500000 }],
    anpassungen_pct: -5
  });
  assert.strictEqual(r.verkehrswert, 475000);
});

test('A2: Ertragswertverfahren §§29-34 Reinertrag-Multiplier', () => {
  const r = V.berechneErtrag({
    jahres_rohertrag_eur: 24000,
    bewirtschaftungskosten_eur: 4000,
    liegenschaftszins_pct: 4.5,
    restnutzungsdauer_jahre: 60,
    bodenwert_eur: 100000
  });
  assert.strictEqual(r.reinertrag, 20000);
  assert.ok(r.vervielfaeltiger > 20 && r.vervielfaeltiger < 22);
  assert.ok(r.verkehrswert > 100000);
});

test('A2: empfehleVerfahren EFH → sachwert', () => {
  assert.strictEqual(V.empfehleVerfahren('efh'), 'sachwert');
  assert.strictEqual(V.empfehleVerfahren('EFH'), 'sachwert');
});

test('A2: empfehleVerfahren ETW → vergleich', () => {
  assert.strictEqual(V.empfehleVerfahren('etw'), 'vergleich');
  assert.strictEqual(V.empfehleVerfahren('wohnung'), 'vergleich');
});

test('A2: empfehleVerfahren MFH → ertrag', () => {
  assert.strictEqual(V.empfehleVerfahren('mfh'), 'ertrag');
  assert.strictEqual(V.empfehleVerfahren('renditeobjekt'), 'ertrag');
});

test('A2: empfehleVerfahren Sonderbau → kombiniert', () => {
  assert.strictEqual(V.empfehleVerfahren('hotel'), 'kombiniert');
});

test('A2: Recherche-Sources ≥10 URLs', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  const urlCount = (src.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10);
});

test('A2: Sources erwähnen ImmoWertV + BORIS + NHK', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  assert.match(src, /ImmoWertV/);
  assert.match(src, /BORIS/);
  assert.match(src, /NHK/);
});
