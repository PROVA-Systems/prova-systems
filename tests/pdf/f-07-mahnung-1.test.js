/**
 * PROVA — F-07-MAHNUNG-1 Template Tests
 * MEGA¹⁹ W75 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-07-MAHNUNG-1.template.html'), 'utf8');
// Body-only: schliesst Header-Kommentare aus (die enthalten "KEINE Verzugszinsen" etc.)
const BODY = TPL.split('<body>')[1] || TPL;

describe('F-07-MAHNUNG-1 — Charakter (höflich)', () => {
  test('Bezeichnung "Zahlungserinnerung" (nicht "Mahnung")', () => {
    assert.match(TPL, /Zahlungserinnerung/);
    assert.match(TPL, /Freundliche Zahlungserinnerung/);
  });

  test('Höflicher Anfangs-Text ("Aufmerksamkeit entgangen")', () => {
    assert.match(TPL, /Aufmerksamkeit entgangen/);
  });

  test('Mit-freundlichen-Gruessen-Schluss', () => {
    assert.match(TPL, /Mit freundlichen Gruessen/);
  });

  test('Stufe-1-Indikator', () => {
    assert.match(TPL, /Stufe 1/);
  });
});

describe('F-07-MAHNUNG-1 — KEINE Verzugszinsen / Inkasso (im sichtbaren Body)', () => {
  test('Kein Hinweis auf Verzugszinsen im Body', () => {
    assert.doesNotMatch(BODY, /Verzugszins/i);
    assert.doesNotMatch(BODY, /§\s*288\s*BGB/);
    assert.doesNotMatch(BODY, /Basiszinssatz/i);
  });

  test('Kein Inkasso-Hinweis im Body', () => {
    assert.doesNotMatch(BODY, /Inkasso/i);
    assert.doesNotMatch(BODY, /Anwalt/i);
  });

  test('Keine Drohgebärden im Body', () => {
    assert.doesNotMatch(BODY, /letzte Mahnung/i);
    assert.doesNotMatch(BODY, /rechtliche Schritte/i);
  });
});

describe('F-07-MAHNUNG-1 — Liquid-Variablen', () => {
  test('Pflicht-Vars', () => {
    ['mahnung_nr', 'mahnung_datum', 'rechnung_nr', 'rechnung_datum',
     'rechnung_betrag', 'summe_offen',
     'sv_name', 'sv_iban', 'sv_bic', 'sv_bank', 'auftraggeber_name'
    ].forEach(v => assert.match(TPL, new RegExp('\\{\\{ ' + v + '(\\s|\\}|\\|)'), 'missing: ' + v));
  });

  test('Anrede-Branch (Herr/Frau/Damen+Herren)', () => {
    assert.match(TPL, /\{% if auftraggeber_anrede == "Herr" %\}/);
    assert.match(TPL, /\{% elsif auftraggeber_anrede == "Frau" %\}/);
    assert.match(TPL, /Damen und Herren/);
  });

  test('Default 14 Tage Frist', () => {
    assert.match(TPL, /frist_tage \| default: ['"]14['"]/);
  });

  test('Persoenlicher Zusatz optional', () => {
    assert.match(TPL, /\{% if persoenlicher_zusatz %\}/);
  });
});

describe('F-07-MAHNUNG-1 — Design-System v1.0', () => {
  test('Inter + JetBrains Mono', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-System Farben', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });

  test('A4 + 22mm Margins', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 22mm 22mm 22mm 22mm/);
  });

  test('Header ab Seite 2', () => {
    assert.match(TPL, /@page :first \{[^}]*@top-left \{ content: ""/);
  });

  test('DSGVO-Hinweis-Footer', () => {
    assert.match(TPL, /DSGVO-Hinweis/);
    assert.match(TPL, /personenbezogene Daten/);
  });
});

describe('F-07-MAHNUNG-1 — KEINE EU AI Act Box (administrativ)', () => {
  test('Keine .ai-box CSS-Klasse', () => {
    assert.doesNotMatch(TPL, /class="ai-box"/);
    assert.doesNotMatch(TPL, /\.ai-box \{/);
  });
});
