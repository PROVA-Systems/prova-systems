/**
 * PROVA — F-23-SACHVERSTAENDIGENKOSTEN Template Tests
 * MEGA¹⁸ W72 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-23-SACHVERSTAENDIGENKOSTEN.template.html'), 'utf8');

describe('F-23-SACHVERSTAENDIGENKOSTEN — Struktur', () => {
  test('Inter + JetBrains Mono Fonts', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-System v1.0 (#1a3a6b primary, #3b82f6 accent)', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });

  test('A4 + 20mm Margins', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 20mm 20mm 22mm 20mm/);
  });
});

describe('F-23 — Liquid-Variablen', () => {
  test('Pflicht-Felder', () => {
    ['rechnung_nr', 'rechnung_datum', 'leistungs_zeitraum', 'sv_name', 'auftraggeber_name',
     'summe_taetigkeit', 'summe_fahrt', 'summe_auslagen', 'summe_netto', 'summe_brutto'
    ].forEach(v => assert.match(TPL, new RegExp('\\{\\{ ' + v + '(\\s|\\}|\\|)'), 'missing: ' + v));
  });

  test('Taetigkeiten-Loop mit kategorie', () => {
    assert.match(TPL, /\{% for t in taetigkeiten %\}/);
    assert.match(TPL, /\{\{ t\.beschreibung \}\}/);
    assert.match(TPL, /\{% if t\.kategorie %\}/);
  });

  test('Fahrten-Loop mit dauer_h + km', () => {
    assert.match(TPL, /\{% for f in fahrten %\}/);
    assert.match(TPL, /\{\{ f\.km \}\}/);
    assert.match(TPL, /\{\{ f\.dauer_h \}\}/);
  });

  test('Auslagen mit beleg_nr', () => {
    assert.match(TPL, /\{% for a in auslagen %\}/);
    assert.match(TPL, /\{\{ a\.beleg_nr \| default:/);
  });

  test('Anlagen-Verzeichnis Loop', () => {
    assert.match(TPL, /\{% for an in anlagen %\}/);
    assert.match(TPL, /Anlage \{\{ an\.nr \}\}/);
  });

  test('Bemerkungen optional', () => {
    assert.match(TPL, /\{% if bemerkungen %\}/);
  });
});

describe('F-23 — KEINE EU AI Act Box (Rechnung)', () => {
  test('Keine .ai-box CSS-Klasse aktiv', () => {
    assert.doesNotMatch(TPL, /class="ai-box"/);
    assert.doesNotMatch(TPL, /\.ai-box \{/);
  });
});

describe('F-23 — Layout-Komplexitaet', () => {
  test('Anlagen-Verzeichnis-Block existiert', () => {
    assert.match(TPL, /\.anlagen-liste/);
    assert.match(TPL, /\.anlagen-eintrag/);
  });

  test('Summen-Block mit linearer Gradient', () => {
    assert.match(TPL, /linear-gradient.*var\(--primary\)/);
  });

  test('Subtotal-Rows in Tabellen', () => {
    assert.match(TPL, /tr\.subtotal/);
  });
});
