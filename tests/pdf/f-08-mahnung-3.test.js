/**
 * PROVA — F-08-MAHNUNG-3-LETZTMALIG Template Tests
 * MEGA¹⁹ W76 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-08-MAHNUNG-3-LETZTMALIG.template.html'), 'utf8');

describe('F-08-MAHNUNG-3 — Charakter (formell, letzte Frist)', () => {
  test('Bezeichnung "Letztmalige Mahnung"', () => {
    assert.match(TPL, /Letztmalige Mahnung/);
    assert.match(TPL, /Stufe 3/);
  });

  test('Warn-Banner "letzte Aufforderung"', () => {
    assert.match(TPL, /letzte Aufforderung/i);
  });

  test('Letztmalig-Hinweis im Text', () => {
    assert.match(TPL, /letztmalig/i);
  });
});

describe('F-08-MAHNUNG-3 — § 288 BGB Verzugszinsen', () => {
  test('§ 288 BGB Bezug', () => {
    assert.match(TPL, /§\s*288/);
    assert.match(TPL, /BGB/);
  });

  test('Default 9% ueber Basiszinssatz', () => {
    assert.match(TPL, /9\s*%\s*ueber dem jeweiligen Basiszinssatz/);
  });

  test('verzug_seit_datum gerendert', () => {
    assert.match(TPL, /\{\{ verzug_seit_datum \}\}/);
  });

  test('summe_verzugszinsen Loop', () => {
    assert.match(TPL, /\{% if summe_verzugszinsen %\}/);
    assert.match(TPL, /\{\{ summe_verzugszinsen \}\}/);
  });
});

describe('F-08-MAHNUNG-3 — Inkasso/Anwalt-Drohung', () => {
  test('Gerichtliches Mahnverfahren-Hinweis', () => {
    assert.match(TPL, /gerichtliches Mahnverfahren/i);
  });

  test('Inkassobuero-Hinweis', () => {
    assert.match(TPL, /Inkassobuero/);
  });

  test('Anwaltskosten-Hinweis', () => {
    assert.match(TPL, /Anwalt/);
  });
});

describe('F-08-MAHNUNG-3 — Liquid-Variablen', () => {
  test('Pflicht-Vars', () => {
    ['mahnung_nr', 'mahnung_datum', 'rechnung_nr',
     'summe_hauptforderung', 'summe_gesamt',
     'sv_name', 'sv_iban', 'auftraggeber_name', 'verzug_seit_datum'
    ].forEach(v => assert.match(TPL, new RegExp('\\{\\{ ' + v + '(\\s|\\}|\\|)'), 'missing: ' + v));
  });

  test('Default 7 Tage Frist (verkürzt)', () => {
    assert.match(TPL, /frist_tage \| default: ['"]7['"]/);
  });

  test('vorgaengige_mahnungen Loop optional', () => {
    assert.match(TPL, /\{% if vorgaengige_mahnungen and vorgaengige_mahnungen\.size > 0 %\}/);
    assert.match(TPL, /\{% for m in vorgaengige_mahnungen %\}/);
  });

  test('Mahngebuehren-Branch optional', () => {
    assert.match(TPL, /\{% if summe_mahngebuehren %\}/);
  });
});

describe('F-08-MAHNUNG-3 — Design-System v1.0', () => {
  test('Inter + JetBrains Mono', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-Tokens', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
    assert.match(TPL, /--danger:\s*#b91c1c/);
  });

  test('A4 + 22mm Margins', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 22mm 22mm 22mm 22mm/);
  });

  test('Header ab Seite 2 mit roter Mahnung-Nr', () => {
    assert.match(TPL, /color:\s*#b91c1c/);
  });

  test('DSGVO-Hinweis-Footer', () => {
    assert.match(TPL, /DSGVO-Hinweis/);
  });
});

describe('F-08-MAHNUNG-3 — Visuelle Schwere (vs Stufe 1)', () => {
  test('Roter 3px Header-Border (vs 2px in Stufe 1)', () => {
    assert.match(TPL, /border-bottom:\s*3px solid var\(--danger\)/);
  });

  test('Frist-Warnung mit roten Border + Box', () => {
    assert.match(TPL, /\.frist-warnung/);
    assert.match(TPL, /border:\s*2px solid var\(--danger\)/);
  });
});

describe('F-08-MAHNUNG-3 — KEINE EU AI Act Box (administrativ)', () => {
  test('Keine .ai-box CSS-Klasse', () => {
    assert.doesNotMatch(TPL, /class="ai-box"/);
    assert.doesNotMatch(TPL, /\.ai-box \{/);
  });
});
