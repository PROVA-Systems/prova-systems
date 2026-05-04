/**
 * PROVA — W29 PDF-Templates Tests (F-02 + F-03)
 * MEGA¹⁴-Extension W29 (2026-05-06)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

const F02_TPL = 'docs/templates-goldstandard/02-bestaetigungen/F-02-AUFTRAGSBESTAETIGUNG.liquid.template.html';
const F02_PAY = 'docs/templates-goldstandard/02-bestaetigungen/F-02-AUFTRAGSBESTAETIGUNG.liquid.payload.json';
const F03_TPL = 'docs/templates-goldstandard/02-bestaetigungen/F-03-TERMIN-BESTAETIGUNG.liquid.template.html';
const F03_PAY = 'docs/templates-goldstandard/02-bestaetigungen/F-03-TERMIN-BESTAETIGUNG.liquid.payload.json';

describe('F-02 Auftragsbestaetigung', () => {
  const tpl = read(F02_TPL);
  const payload = JSON.parse(read(F02_PAY));

  test('Liquid-Template hat valide HTML-Struktur', () => {
    assert.match(tpl, /<!DOCTYPE html>/);
    assert.match(tpl, /<\/html>/);
  });

  test('Use-Case: Auftragsannahme bestaetigt', () => {
    assert.match(tpl, /Auftragsbestaetigung/);
    assert.match(tpl, /vielen Dank fuer Ihren Auftrag/i);
  });

  test('Auftrags-Detail-Box mit Use-Case-spezifischen Feldern', () => {
    assert.match(tpl, /auftrag-box/);
    assert.match(tpl, /\{\{ auftragsart \}\}/);
    assert.match(tpl, /\{\{ auftragsdatum \}\}/);
    assert.match(tpl, /voraussichtliche_dauer/);
    assert.match(tpl, /liefertermin/);
  });

  test('Honorar-Box optional (if honorar_hinweis != blank)', () => {
    assert.match(tpl, /\{% if honorar_hinweis != blank %\}/);
    assert.match(tpl, /honorar-box/);
  });

  test('Honorar-Logik: Pauschal ODER Stundensatz (if/else)', () => {
    assert.match(tpl, /\{% if honorar_pauschal != blank %\}/);
    assert.match(tpl, /\{% else %\}/);
    assert.match(tpl, /\{\{ stundensatz \}\}/);
  });

  test('AGB+DSGVO-Hinweis Block', () => {
    assert.match(tpl, /Allgemeinen Geschaefts/);
    assert.match(tpl, /DSGVO/);
    assert.match(tpl, /Art\. 6 Abs\. 1 lit\. b/);
  });

  test('Liquid-Bug-Pattern: != blank durchgaengig', () => {
    const blankUses = (tpl.match(/!= blank/g) || []).length;
    assert.ok(blankUses >= 5, '5+ != blank Verwendungen erwartet');
  });

  test('Mock-Payload hat Honorar-Felder', () => {
    assert.equal(payload.honorar_hinweis, 'ja');
    assert.ok(payload.stundensatz);
    assert.ok(payload.voraussichtlicher_aufwand);
  });

  test('Mock-Payload _use_case dokumentiert', () => {
    assert.match(payload._use_case, /Auftragsannahme/i);
  });
});

describe('F-03 Termin-Bestaetigung', () => {
  const tpl = read(F03_TPL);
  const payload = JSON.parse(read(F03_PAY));

  test('Liquid-Template hat valide HTML-Struktur', () => {
    assert.match(tpl, /<!DOCTYPE html>/);
    assert.match(tpl, /<\/html>/);
  });

  test('Use-Case: Termin-Praezision (kein Brief-Smalltalk)', () => {
    assert.match(tpl, /Termin-Bestaetigung/);
    assert.match(tpl, /Ortstermin/i);
    // Kein "vielen Dank fuer Ihren Auftrag" wie in F-02
    assert.ok(!/vielen Dank fuer Ihren Auftrag/i.test(tpl));
  });

  test('PROMINENTER Termin-Block (gross, sofort sichtbar)', () => {
    assert.match(tpl, /termin-prominent/);
    assert.match(tpl, /font-size:\s*22pt/);  // Datum gross
    assert.match(tpl, /\{\{ termin_datum \}\}/);
    assert.match(tpl, /\{\{ termin_uhrzeit \}\}/);
  });

  test('Anfahrt-Grid mit 4 spezifischen Feldern (Parken/OePNV/Schluessel/Zugang)', () => {
    assert.match(tpl, /anfahrt-grid/);
    assert.match(tpl, /\{\{ anfahrt_parken \}\}/);
    assert.match(tpl, /\{\{ anfahrt_oeffis \}\}/);
    assert.match(tpl, /\{\{ anfahrt_schluessel \}\}/);
    assert.match(tpl, /\{\{ anfahrt_zugang \}\}/);
  });

  test('Kontakt-vor-Ort-Box (anders als F-02 Honorar)', () => {
    assert.match(tpl, /kontakt-vor-ort/);
    assert.match(tpl, /Ansprechpartner vor Ort/);
    assert.match(tpl, /\{\{ kontakt_vor_ort_name \}\}/);
  });

  test('Vorbereitungs-Checkliste mit for-Loop', () => {
    assert.match(tpl, /\{% for item in vorbereitung %\}/);
    assert.match(tpl, /<ul>/);
  });

  test('Checkliste optional (if vorbereitung.size > 0)', () => {
    assert.match(tpl, /vorbereitung\.size > 0/);
  });

  test('Termin-Icon (Emoji) prominent', () => {
    assert.match(tpl, /termin-icon/);
    assert.match(tpl, /36pt/);  // Icon gross
  });

  test('Mock-Payload hat alle Anfahrt-Details', () => {
    assert.ok(payload.anfahrt_parken);
    assert.ok(payload.anfahrt_oeffis);
    assert.ok(payload.anfahrt_schluessel);
    assert.ok(payload.anfahrt_zugang);
  });

  test('Mock-Payload Vorbereitung als Array', () => {
    assert.ok(Array.isArray(payload.vorbereitung));
    assert.ok(payload.vorbereitung.length >= 3, '3+ Items erwartet');
  });

  test('Mock-Payload _use_case dokumentiert (Termin-Praezision)', () => {
    assert.match(payload._use_case, /Termin/i);
    assert.match(payload._use_case, /Anfahrt/i);
  });
});

describe('Pattern-Copy-Vermeidung F-02 vs F-03', () => {
  const f02 = read(F02_TPL);
  const f03 = read(F03_TPL);

  test('F-02 hat auftrag-box, F-03 hat termin-prominent (anders)', () => {
    assert.match(f02, /auftrag-box/);
    assert.ok(!f02.includes('termin-prominent'));
    assert.match(f03, /termin-prominent/);
    assert.ok(!f03.includes('auftrag-box'));
  });

  test('F-02 hat honorar-box, F-03 hat anfahrt-grid', () => {
    assert.match(f02, /honorar-box/);
    assert.ok(!f02.includes('anfahrt-grid'));
    assert.match(f03, /anfahrt-grid/);
    assert.ok(!f03.includes('honorar-box'));
  });

  test('F-02 fokussiert AGB+DSGVO, F-03 fokussiert Vorbereitungs-Checkliste', () => {
    assert.match(f02, /Allgemeinen Geschaefts/);
    assert.ok(!f02.includes('checkliste'));
    assert.match(f03, /checkliste/);
    assert.ok(!f03.includes('Allgemeinen Geschaefts'));
  });

  test('Use-Cases dokumentiert (verschiedene)', () => {
    const p02 = JSON.parse(read(F02_PAY));
    const p03 = JSON.parse(read(F03_PAY));
    assert.notEqual(p02._use_case, p03._use_case);
  });

  test('CSS-Variablen-Sets unterscheiden sich (F-03 hat --termin-Color)', () => {
    assert.match(f03, /--termin:/);
    assert.match(f03, /--termin-light:/);
    assert.ok(!f02.includes('--termin'));
  });
});
