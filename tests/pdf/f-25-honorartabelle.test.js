/**
 * PROVA — F-25-HONORARTABELLE Template Tests
 * MEGA¹⁸ W72 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-25-HONORARTABELLE.template.html'), 'utf8');

describe('F-25-HONORARTABELLE — Struktur', () => {
  test('Title nutzt sv_name', () => {
    assert.match(TPL, /<title>Honorartabelle \{\{ sv_name \}\}<\/title>/);
  });

  test('Inter + JetBrains Mono', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-System Farben', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });

  test('A4 + 18mm Margins (Honorartabelle ist enger)', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 18mm 18mm 20mm 18mm/);
  });
});

describe('F-25 — Liquid-Variablen', () => {
  test('Kopf-Vars: gueltig_ab + gueltig_bis', () => {
    assert.match(TPL, /\{\{ gueltig_ab \}\}/);
    assert.match(TPL, /\{% if gueltig_bis %\}/);
  });

  test('Auftragsarten-Loop mit allen Feldern', () => {
    assert.match(TPL, /\{% for a in auftragsarten %\}/);
    assert.match(TPL, /\{\{ a\.kategorie \}\}/);
    assert.match(TPL, /\{\{ a\.beschreibung \}\}/);
    assert.match(TPL, /\{% if a\.satz_h %\}/);
    assert.match(TPL, /\{% if a\.pauschal %\}/);
    assert.match(TPL, /\{% if a\.hinweis %\}/);
  });

  test('Fahrtkosten-Default 0,42 €', () => {
    assert.match(TPL, /fahrtkosten_satz_per_km \| default: ['"]0,42['"]/);
  });

  test('Nebenkosten-Loop', () => {
    assert.match(TPL, /\{% for n in nebenkosten %\}/);
    assert.match(TPL, /\{\{ n\.posten \}\}/);
    assert.match(TPL, /\{\{ n\.satz \}\}/);
  });

  test('Rechtsbasis mit JVEG-Default', () => {
    assert.match(TPL, /rechtsbasis \| default:.*JVEG/i);
  });

  test('Fussnoten-Loop optional', () => {
    assert.match(TPL, /\{% if fussnoten and fussnoten\.size > 0 %\}/);
    assert.match(TPL, /\{% for fn in fussnoten %\}/);
  });
});

describe('F-25 — Inhaltliche Pflicht-Hinweise', () => {
  test('JVEG-Hinweis im basis-box', () => {
    assert.match(TPL, /JVEG/);
  });

  test('Reisezeit-Hinweis (analog JVEG)', () => {
    assert.match(TPL, /Reisezeit.*Stundensatz/i);
  });

  test('Netto-Saetze-Hinweis', () => {
    assert.match(TPL, /Saetze verstehen sich netto/);
  });
});

describe('F-25 — KEINE EU AI Act Box (Honorartabelle)', () => {
  test('Keine .ai-box CSS-Klasse aktiv', () => {
    assert.doesNotMatch(TPL, /class="ai-box"/);
    assert.doesNotMatch(TPL, /\.ai-box \{/);
  });
});
