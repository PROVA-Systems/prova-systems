'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'wertgutachten.html'), 'utf8');
const logicSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'wertgutachten-logic.js'), 'utf8');
const Lib = require('../../lib/wertgutachten-verfahren');

test('A2: lib/wertgutachten-verfahren.js script-tag in wertgutachten.html', () => {
  assert.match(html, /\/lib\/wertgutachten-verfahren\.js/);
});

test('A2: 3 verfahren-btn-Cards (Sachwert/Vergleich/Ertrag)', () => {
  const matches = html.match(/data-verfahren-btn="(sachwert|vergleich|ertrag)"/g) || [];
  assert.strictEqual(matches.length, 3);
});

test('A2: verfahren-btn|verfahren-tab Klassen-Selektor (>=3 Treffer)', () => {
  const total = (html.match(/verfahren-btn|verfahren-tab/g) || []).length;
  assert.ok(total >= 3, 'Erwarte >=3 verfahren-btn/tab-Refs, gefunden: ' + total);
});

test('A2: Empfehlung-Button mit wgEmpfehleVerfahren onclick', () => {
  assert.match(html, /onclick="wgEmpfehleVerfahren\(\)"/);
  assert.match(html, /Verfahren-Empfehlung anzeigen/);
});

test('A2: wgEmpfehleVerfahren-Function in wertgutachten-logic.js', () => {
  assert.match(logicSrc, /window\.wgEmpfehleVerfahren = function/);
  assert.match(logicSrc, /ProvaWertVerfahren\.empfehleVerfahren/);
});

test('A2: ProvaWertVerfahren Cross-Check-Hook (wgLibCrossCheck)', () => {
  assert.match(logicSrc, /wgLibCrossCheck/);
  assert.match(logicSrc, /ProvaWertVerfahren\.berechneSachwert/);
});

test('A2: 3 conditional Verfahren-Forms (Sachwert/Vergleich/Ertrag)', () => {
  assert.match(html, /id="sachwert-form"/);
  assert.match(html, /id="vergleich-form"/);
  assert.match(html, /id="ertrag-form"/);
});

test('A2: Lib empfehleVerfahren EFH → sachwert', () => {
  assert.strictEqual(Lib.empfehleVerfahren('efh'), 'sachwert');
  assert.strictEqual(Lib.empfehleVerfahren('etw'), 'vergleich');
  assert.strictEqual(Lib.empfehleVerfahren('mfh'), 'ertrag');
});

test('A2: Empfehlung-Anzeige-Element + 4 Mode-Labels', () => {
  assert.match(html, /id="wg-empfehlung-text"/);
  ['Sachwertverfahren empfohlen', 'Vergleichswertverfahren empfohlen', 'Ertragswertverfahren empfohlen']
    .forEach(l => assert.match(logicSrc, new RegExp(l)));
});

test('A2: ProvaWertVerfahren-Refs in HTML+Logic ≥ 3', () => {
  const total = (html.match(/ProvaWertVerfahren|wertgutachten-verfahren\.js/g) || []).length
              + (logicSrc.match(/ProvaWertVerfahren/g) || []).length;
  assert.ok(total >= 3, 'Erwarte >=3 Lib-Refs, gefunden: ' + total);
});
