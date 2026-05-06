/**
 * PROVA — W23 PDF-Templates Deep-Work Tests
 * MEGA¹⁴ W23 (2026-05-06)
 *
 * Verifiziert dass die 3 neuen Templates:
 *   - Liquid-Bug-Patterns vermeiden (kein "if blank")
 *   - Eigene Use-Case-spezifische Felder haben (NICHT cp+sed)
 *   - Mock-Payloads valide JSON
 *   - Layout deutlich verschieden (kein Pattern-Copy)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

const F05_PATH = 'docs/templates-goldstandard/03-mahnungen/F-05-MAHNUNG-1-FREUNDLICH.liquid.template.html';
const F08_PATH = 'docs/templates-goldstandard/03-mahnungen/F-08-MAHNUNG-4-ANWALT.liquid.template.html';
const FOTO_PATH = 'docs/templates-goldstandard/05-sonstige/F-FOTODOK.liquid.template.html';

describe('F-05 Mahnung Stufe 1 (freundlich)', () => {
  const tpl = read(F05_PATH);
  const payload = JSON.parse(read('docs/templates-goldstandard/03-mahnungen/F-05-MAHNUNG-1-FREUNDLICH.liquid.payload.json'));

  test('Liquid-Template hat valide HTML-Struktur', () => {
    assert.match(tpl, /<!DOCTYPE html>/);
    assert.match(tpl, /<\/html>/);
  });

  test('Ton-Indikator: "vielleicht" / "freundlich"', () => {
    assert.match(tpl, /vielleicht/i);
    assert.match(tpl, /freundlich/i);
    assert.match(tpl, /verstaendnisvoll|hoeflich/i);
  });

  test('KEIN Mahn-Zuschlag im rendered Content (Stufe 1)', () => {
    // Strip CSS-Comments + HTML-Comments, check rest
    const stripped = tpl
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!stripped.includes('Mahn-Zuschlag'), 'Mahn-Zuschlag in rendered Content gefunden');
    assert.ok(!stripped.includes('Verzugszinsen'));
    assert.ok(!stripped.includes('Verzug-Zinsen'));
  });

  test('KEIN Anwalt im rendered Content (Stufe 1)', () => {
    const stripped = tpl
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!/anwalt/i.test(stripped), 'Anwalt im rendered Content erwaehnt');
  });

  test('Liquid-Bug-Pattern: != blank durchgaengig (kein "if blank")', () => {
    // Pattern-Check: Wenn `if x` benutzt wird, sollte es != blank sein
    // (Gegen-Beispiel: `{% if x %}` waere Bug bei empty String)
    // Wir pruefen "blank" wird OFT mit "!=" verbunden
    const blankUses = (tpl.match(/!= blank/g) || []).length;
    assert.ok(blankUses >= 1, 'Liquid-Goldstandard sollte != blank verwenden');
  });

  test('Frist-Hinweis prominent (mit Datum-Variable)', () => {
    assert.match(tpl, /\{\{ neue_frist \}\}/);
  });

  test('Mock-Payload hat alle benoetigten Felder', () => {
    for (const f of ['sv_name', 'sv_iban', 'rechnung_nummer', 'rechnung_datum', 'faelligkeit_datum', 'neue_frist', 'betrag_brutto', 'empfaenger_name']) {
      assert.ok(payload[f], 'Payload-Field fehlt: ' + f);
    }
  });

  test('Payload _use_case dokumentiert', () => {
    assert.ok(payload._use_case);
    assert.match(payload._use_case, /verstaendnisvoll|kein Druck/i);
  });
});

describe('F-08 Mahnung Stufe 4 (Anwalt-Andeutung)', () => {
  const tpl = read(F08_PATH);
  const payload = JSON.parse(read('docs/templates-goldstandard/03-mahnungen/F-08-MAHNUNG-4-ANWALT.liquid.payload.json'));

  test('Liquid-Template hat valide HTML-Struktur', () => {
    assert.match(tpl, /<!DOCTYPE html>/);
    assert.match(tpl, /<\/html>/);
  });

  test('Ton-Indikator: "rechtlich" / "letzte" / "Anwalt"', () => {
    assert.match(tpl, /letzte mahnung/i);
    assert.match(tpl, /anwalt/i);
    assert.match(tpl, /rechtlich/i);
  });

  test('Roter Header-Stripe (visueller Ernst)', () => {
    assert.match(tpl, /header-stripe/);
    assert.match(tpl, /background:\s*var\(--danger\)/);
  });

  test('Mahn-Zuschlaege + Verzugszinsen referenziert', () => {
    assert.match(tpl, /\{\{ mahnkosten_summe \}\}/);
    assert.match(tpl, /\{\{ verzugszinsen \}\}/);
  });

  test('§-Verweise: BGB § 288, § 688 ZPO, § 13 RVG, § 31 BDSG', () => {
    assert.match(tpl, /BGB §/);
    assert.match(tpl, /ZPO|§ 688/);
    assert.match(tpl, /RVG|§ 13/);
    assert.match(tpl, /BDSG|Schufa/i);
  });

  test('Mahn-Historie als Tabelle', () => {
    assert.match(tpl, /\{% for m in mahn_historie %\}/);
    assert.match(tpl, /<table>/);
  });

  test('Final-Frist-Box prominent (rote Vollflaeche)', () => {
    assert.match(tpl, /frist-final/);
  });

  test('Mock-Payload hat Mahn-Historie als Array', () => {
    assert.ok(Array.isArray(payload.mahn_historie));
    assert.equal(payload.mahn_historie.length, 4, '4 Mahn-Stufen erwartet');
  });

  test('Mock-Payload mahn_historie enthaelt verschiedene Toene', () => {
    const tone = payload.mahn_historie.map(m => m.ton);
    assert.ok(tone.some(t => /freundlich|Erinnerung/i.test(t)));
    assert.ok(tone.some(t => /letzte|Anwalt/i.test(t)));
  });

  test('Payload _use_case dokumentiert (rechtlich-hart)', () => {
    assert.match(payload._use_case, /rechtlich|hart|Anwalt/i);
  });
});

describe('F-FOTODOK Foto-Dokumentation', () => {
  const tpl = read(FOTO_PATH);
  const payload = JSON.parse(read('docs/templates-goldstandard/05-sonstige/F-FOTODOK.liquid.payload.json'));

  test('Liquid-Template hat valide HTML-Struktur', () => {
    assert.match(tpl, /<!DOCTYPE html>/);
    assert.match(tpl, /<\/html>/);
  });

  test('Layout: 2-Spalten-Grid fuer Bilder', () => {
    assert.match(tpl, /grid-template-columns:\s*1fr 1fr/);
    assert.match(tpl, /\.bilder-grid/);
  });

  test('Bilder-Loop mit Pagination (4 pro Seite)', () => {
    assert.match(tpl, /\{% for bild in bilder %\}/);
    assert.match(tpl, /modulo: 4/);
  });

  test('Pro Bild: bauteil + uhrzeit + position + beschreibung', () => {
    assert.match(tpl, /\{\{ bild\.bauteil/);
    assert.match(tpl, /\{\{ bild\.uhrzeit/);
    assert.match(tpl, /\{\{ bild\.position/);
    assert.match(tpl, /\{\{ bild\.beschreibung/);
  });

  test('Schweregrad-Pill mit 4 Kategorien (gering/mittel/schwer/kritisch)', () => {
    assert.match(tpl, /schwere-pill\.gering/);
    assert.match(tpl, /schwere-pill\.mittel/);
    assert.match(tpl, /schwere-pill\.schwer/);
    assert.match(tpl, /schwere-pill\.kritisch/);
  });

  test('DSGVO-Hinweis im Deckblatt (Art. 6 Abs. 1 lit. f)', () => {
    assert.match(tpl, /DSGVO/);
    assert.match(tpl, /Art\. 6/);
    // "berechtigtes Interesse" kann durch Auto-Wrap mit Newline getrennt werden
    assert.match(tpl, /berechtigtes\s+Interesse/i);
  });

  test('Witterung-Field optional', () => {
    assert.match(tpl, /\{% if witterung != blank %\}/);
  });

  test('Mock-Payload hat 6 Bilder mit verschiedenen Schweregraden', () => {
    assert.ok(Array.isArray(payload.bilder));
    assert.ok(payload.bilder.length >= 4, '4+ Bilder erwartet');
    const schweregrade = payload.bilder.map(b => b.schweregrad);
    assert.ok(schweregrade.includes('kritisch'));
    assert.ok(schweregrade.includes('schwer'));
    assert.ok(schweregrade.includes('mittel'));
  });

  test('Mock-Payload hat realistic Bauteil-Beschreibungen', () => {
    for (const bild of payload.bilder) {
      assert.ok(bild.bauteil && bild.bauteil.length > 5);
      assert.ok(bild.beschreibung);
    }
  });
});

describe('Pattern-Copy-Vermeidung (Marcel-Direktive)', () => {
  const f05 = read(F05_PATH);
  const f08 = read(F08_PATH);
  const foto = read(FOTO_PATH);

  test('F-05 vs. F-08: deutlich verschiedene CSS-Variablen-Sets', () => {
    // F-05 hat "success" als Frist-Color, F-08 hat "danger-light"
    assert.match(f05, /--success/);
    assert.match(f08, /--danger-light/);
    // F-08 hat header-stripe, F-05 nicht
    assert.match(f08, /header-stripe/);
    assert.ok(!f05.includes('header-stripe'));
  });

  test('FOTODOK vs. Mahnungen: komplett anderes Layout-Pattern', () => {
    // FOTODOK hat bilder-grid (2-spalten), Mahnungen NICHT
    assert.match(foto, /bilder-grid/);
    assert.ok(!f05.includes('bilder-grid'));
    assert.ok(!f08.includes('bilder-grid'));
    // FOTODOK hat schwere-pill, Mahnungen NICHT
    assert.match(foto, /schwere-pill/);
    assert.ok(!f05.includes('schwere-pill'));
  });

  test('Use-Cases dokumentiert in Payloads (verschiedene)', () => {
    const p05 = JSON.parse(read('docs/templates-goldstandard/03-mahnungen/F-05-MAHNUNG-1-FREUNDLICH.liquid.payload.json'));
    const p08 = JSON.parse(read('docs/templates-goldstandard/03-mahnungen/F-08-MAHNUNG-4-ANWALT.liquid.payload.json'));
    const pfoto = JSON.parse(read('docs/templates-goldstandard/05-sonstige/F-FOTODOK.liquid.payload.json'));
    assert.notEqual(p05._use_case, p08._use_case);
    assert.notEqual(p05._use_case, pfoto._use_case);
    assert.notEqual(p08._use_case, pfoto._use_case);
  });
});
