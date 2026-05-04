/**
 * PROVA — F-24-AKTENAUSZUG Template Tests
 * MEGA¹⁹ W77 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'F-24-AKTENAUSZUG.template.html'), 'utf8');

describe('F-24-AKTENAUSZUG — Struktur', () => {
  test('Title nutzt az', () => {
    assert.match(TPL, /<title>Aktenauszug \{\{ az \}\}<\/title>/);
  });

  test('Inter + JetBrains Mono', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-Tokens', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });

  test('A4 + 20mm Margins', () => {
    assert.match(TPL, /@page \{ size: A4; margin: 20mm 20mm 22mm 20mm/);
  });
});

describe('F-24-AKTENAUSZUG — Pflicht: EU AI Act Box', () => {
  test('AI-Box CSS-Klasse aktiv genutzt', () => {
    assert.match(TPL, /class="ai-box"/);
    assert.match(TPL, /\.ai-box \{/);
  });

  test('§ 407a Abs. 3 ZPO Bezug', () => {
    assert.match(TPL, /§ 407a Abs\. 3 ZPO/);
  });

  test('EU AI Act Art. 50 Bezug', () => {
    assert.match(TPL, /EU AI Act Art\. 50/);
  });

  test('Sachverstaendigen-Verantwortung-Statement', () => {
    // Multi-line match (fachliche Bewertungen + Verantwortung)
    assert.match(TPL, /Verantwortung[\s\S]{0,200}Sachverstaendigen/i);
  });

  test('EU AI Act Marker im Header', () => {
    assert.match(TPL, /<span class="marker">EU AI Act/);
  });
});

describe('F-24-AKTENAUSZUG — Phasen-Verlauf (Section 1)', () => {
  test('Phasen-Loop optional', () => {
    assert.match(TPL, /\{% if phasen and phasen\.size > 0 %\}/);
    assert.match(TPL, /\{% for p in phasen %\}/);
  });

  test('Phase-Felder nr/name/status', () => {
    assert.match(TPL, /\{\{ p\.nr \}\}/);
    assert.match(TPL, /\{\{ p\.name \}\}/);
    assert.match(TPL, /\{\{ p\.status \| default: ['"]offen['"] \}\}/);
  });

  test('Status-Badge-Varianten (abgeschlossen/aktiv/offen)', () => {
    assert.match(TPL, /\.status\.abgeschlossen/);
    assert.match(TPL, /\.status\.aktiv/);
    assert.match(TPL, /\.status\.offen/);
  });
});

describe('F-24-AKTENAUSZUG — Chronologie (Section 2)', () => {
  test('"chronologisch" + "älteste zuerst"', () => {
    assert.match(TPL, /chronologische/i);
    assert.match(TPL, /älteste zuerst/);
  });

  test('Eintraege-Loop', () => {
    assert.match(TPL, /\{% for e in eintraege %\}/);
  });

  test('Eintrag-Felder datum/typ/titel/beschreibung/status/autor', () => {
    ['datum', 'typ', 'titel', 'beschreibung', 'status', 'autor'].forEach(f => {
      assert.match(TPL, new RegExp('\\{\\{ e\\.' + f + '(\\s|\\}|\\|)'), 'missing eintrag.' + f);
    });
  });
});

describe('F-24-AKTENAUSZUG — Foto-Liste (Section 3, optional)', () => {
  test('Fotos-Loop optional', () => {
    assert.match(TPL, /\{% if fotos and fotos\.size > 0 %\}/);
    assert.match(TPL, /\{% for f in fotos %\}/);
  });

  test('Foto-Felder', () => {
    ['nr', 'datum', 'beschreibung', 'kategorie'].forEach(field => {
      assert.match(TPL, new RegExp('\\{\\{ f\\.' + field + '(\\s|\\}|\\|)'), 'missing foto.' + field);
    });
  });

  test('Foto-Nummer-Format F-XX', () => {
    assert.match(TPL, /F-\{\{ f\.nr \}\}/);
  });
});

describe('F-24-AKTENAUSZUG — Dokumente (Section 4, optional)', () => {
  test('Dokumente-Loop optional', () => {
    assert.match(TPL, /\{% if dokumente and dokumente\.size > 0 %\}/);
    assert.match(TPL, /\{% for d in dokumente %\}/);
  });

  test('Anlage-Nr-Format A-XX', () => {
    assert.match(TPL, /A-\{\{ d\.anlage_nr \}\}/);
  });
});

describe('F-24-AKTENAUSZUG — Cover + Liquid-Pflicht-Vars', () => {
  test('az + auszug_datum + sv_name + auftraggeber_name', () => {
    ['az', 'auszug_datum', 'sv_name', 'auftraggeber_name'].forEach(v => {
      assert.match(TPL, new RegExp('\\{\\{ ' + v + '(\\s|\\}|\\|)'), 'missing: ' + v);
    });
  });

  test('Objekt-Block conditional', () => {
    assert.match(TPL, /\{% if objekt and objekt\.adresse %\}/);
    assert.match(TPL, /\{\{ objekt\.adresse \}\}/);
  });

  test('Auszug-Zeitraum optional', () => {
    assert.match(TPL, /\{% if auszug_zeitraum_von and auszug_zeitraum_bis %\}/);
  });
});

describe('F-24-AKTENAUSZUG — Unterschriften + DSGVO', () => {
  test('Unterschrift-Block fuer SV', () => {
    assert.match(TPL, /\.unterschrift-block/);
    assert.match(TPL, /\{\{ sv_name \}\}/);
  });

  test('DSGVO-Hinweis-Footer', () => {
    assert.match(TPL, /DSGVO/);
    assert.match(TPL, /vertraulich/);
    assert.match(TPL, /personenbezogene Daten/);
  });

  test('Header ab Seite 2 (first hat empty)', () => {
    assert.match(TPL, /@page :first/);
  });
});
