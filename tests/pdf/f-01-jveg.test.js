/**
 * PROVA — F-01-JVEG-RECHNUNG Template Tests
 * MEGA¹⁸ W72 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-01-JVEG-RECHNUNG.template.html'), 'utf8');

describe('F-01-JVEG-RECHNUNG — Header & Liquid', () => {
  test('DOCTYPE + lang=de + UTF-8', () => {
    assert.match(TPL, /<!DOCTYPE html>/);
    assert.match(TPL, /lang="de"/);
    assert.match(TPL, /charset="UTF-8"/);
  });

  test('Title nutzt rechnung_nr', () => {
    assert.match(TPL, /<title>JVEG-Rechnung \{\{ rechnung_nr \}\}<\/title>/);
  });

  test('Inter + JetBrains Mono Fonts geladen', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-System v1.0 Farben strikt', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });
});

describe('F-01 — @page-Setup', () => {
  test('A4 + 20mm Margins', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 20mm 20mm 22mm 20mm/);
  });

  test('Header ab Seite 2 (first hat empty content)', () => {
    assert.match(TPL, /@page :first \{[^}]*@top-left \{ content: ""/);
  });

  test('Footer mit Seitenzahl auf jeder Seite', () => {
    assert.match(TPL, /@bottom-right \{ content: "Seite " counter\(page\) " \/ " counter\(pages\)/);
  });
});

describe('F-01 — JVEG-Liquid-Variablen', () => {
  test('Pflicht-Vars gerendert', () => {
    [
      'rechnung_nr', 'rechnung_datum', 'sv_name', 'sv_adresse', 'auftraggeber_name',
      'gericht_name', 'gericht_az', 'az', 'beweisbeschluss_datum',
      'sv_iban', 'sv_bic', 'sv_bank',
      'summe_honorar', 'summe_fahrt', 'summe_auslagen', 'summe_netto', 'summe_brutto',
      'ust_satz', 'ust_betrag'
    ].forEach(v => {
      assert.match(TPL, new RegExp('\\{\\{ ' + v + '(\\s|\\}|\\|)'), 'missing var: ' + v);
    });
  });

  test('JVEG §§-Bezuege im Markup', () => {
    assert.match(TPL, /§ 9 JVEG/);
    assert.match(TPL, /§ 8 JVEG/);
    assert.match(TPL, /§ 13 JVEG/);
  });

  test('Stunden-Loop iteriert ueber stunden_aufstellung', () => {
    assert.match(TPL, /\{% for s in stunden_aufstellung %\}/);
    assert.match(TPL, /\{\{ s\.taetigkeit \}\}/);
    assert.match(TPL, /\{\{ s\.dauer_h \}\}/);
  });

  test('Fahrtkosten-Loop optional via if', () => {
    assert.match(TPL, /\{% if fahrtkosten and fahrtkosten\.size > 0 %\}/);
    assert.match(TPL, /\{% for f in fahrtkosten %\}/);
  });

  test('Auslagen-Loop optional via if', () => {
    assert.match(TPL, /\{% if auslagen and auslagen\.size > 0 %\}/);
    assert.match(TPL, /\{% for a in auslagen %\}/);
  });

  test('UST-Befreit-Branch ($ 4 Nr. 21a UStG)', () => {
    assert.match(TPL, /\{% if ust_befreit %\}/);
    assert.match(TPL, /§ 4 Nr\. 21a UStG/);
  });

  test('Zahlungsziel mit Default 30 Tage', () => {
    assert.match(TPL, /zahlungsziel_tage \| default: ['"]30['"]/);
  });
});

describe('F-01 — KEINE EU AI Act Box (Rechnung)', () => {
  test('Keine .ai-box CSS-Klasse aktiv', () => {
    assert.doesNotMatch(TPL, /class="ai-box"/);
    assert.doesNotMatch(TPL, /\.ai-box \{/);
  });
});
