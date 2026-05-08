'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Bes = require(path.join(ROOT, 'bescheinigungs-logic.js'));
const src = fs.readFileSync(path.join(ROOT, 'bescheinigungs-logic.js'), 'utf8');

test('P9: 12 Bescheinigungs-Typen exposed', () => {
  const typen = Bes.getTypen();
  assert.strictEqual(typen.length, 12);
});

test('P9: Alle 12 Typen aus PROVA-VISION-MASTER Sprint 04d', () => {
  const ids = Bes.getTypen().map(t => t.id).sort();
  const expected = ['auftragsannahme', 'bedenken-vob', 'behinderung-vob',
    'beweissicherung-bestaetigung', 'feuchtigkeit', 'maengelfreiheit',
    'ortsbesichtigung', 'schimmelfreiheit', 'standsicherheit',
    'sv-bestaetigung', 'termin', 'zustand'].sort();
  assert.deepStrictEqual(ids, expected);
});

test('P9: Pro Typ — id, titel, icon, kurz, template_code, rechtsbasis, pflichtfelder, typ_enum', () => {
  Bes.getTypen().forEach(t => {
    ['id', 'titel', 'icon', 'kurz', 'template_code', 'rechtsbasis', 'typ_enum']
      .forEach(field => assert.ok(t[field], 'Field fehlt in ' + t.id + ': ' + field));
    assert.ok(Array.isArray(t.pflichtfelder), 'pflichtfelder muss Array sein: ' + t.id);
  });
});

test('P9: template_code BES-01 bis BES-12', () => {
  const codes = Bes.getTypen().map(t => t.template_code).sort();
  for (let i = 1; i <= 12; i++) {
    const code = 'BES-' + String(i).padStart(2, '0');
    assert.ok(codes.includes(code), 'Template-Code fehlt: ' + code);
  }
});

test('P9: Mängelfreiheit + Schimmelfreiheit + Standsicherheit haben Hinweis (compliance)', () => {
  ['maengelfreiheit', 'schimmelfreiheit', 'standsicherheit'].forEach(id => {
    const t = Bes.getTyp(id);
    assert.ok(t.hinweis, 'hinweis fehlt: ' + id);
  });
  // Standsicherheit hat saSV-Vorbehalt
  assert.match(Bes.getTyp('standsicherheit').hinweis, /saSV/);
  // Schimmelfreiheit hat Untersuchungsumfang-Vorbehalt
  assert.match(Bes.getTyp('schimmelfreiheit').hinweis, /Untersuchungsumfang/);
});

test('P9: VOB/B Anzeigen mit korrekten Paragraphen', () => {
  assert.match(Bes.getTyp('bedenken-vob').rechtsbasis, /VOB\/B §4/);
  assert.match(Bes.getTyp('behinderung-vob').rechtsbasis, /VOB\/B §6/);
});

test('P9: Beweissicherung bezieht sich auf ZPO §485', () => {
  assert.match(Bes.getTyp('beweissicherung-bestaetigung').rechtsbasis, /ZPO §485/);
});

test('P9: Schimmelfreiheit nutzt UBA-Schimmelleitfaden + DIN ISO 16000-17', () => {
  assert.match(Bes.getTyp('schimmelfreiheit').rechtsbasis, /UBA/);
  assert.match(Bes.getTyp('schimmelfreiheit').rechtsbasis, /DIN ISO 16000-17/);
});

test('P9: typ_enum-Werte mappen zu DB-ENUM-Werten dokument_typ', () => {
  // Aus M³⁷ B-Migration: ENUM dokument_typ enthält bescheinigung_*-Werte
  const dbEnumWerte = [
    'bescheinigung_sv_bestaetigung', 'bescheinigung_ortsbesichtigung',
    'bescheinigung_auftragsannahme', 'bescheinigung_termin',
    'bescheinigung_maengelfreiheit', 'bescheinigung_zustand',
    'bescheinigung_beweissicherung', 'bescheinigung_schimmelfreiheit',
    'bescheinigung_feuchtigkeit', 'bescheinigung_standsicherheit',
    'bescheinigung_bedenken_vob', 'bescheinigung_behinderung_vob'
  ];
  Bes.getTypen().forEach(t => {
    assert.ok(dbEnumWerte.includes(t.typ_enum), 'typ_enum nicht im DB-Mapping: ' + t.typ_enum);
  });
});

test('P9: getTyp mit ungültiger ID liefert null', () => {
  assert.strictEqual(Bes.getTyp('not-existing'), null);
});

test('P9: erstelle wirft bei unbekanntem Typ', async () => {
  await assert.rejects(() => Bes.erstelle('quatsch', {}));
});

test('P9: Pflichtfeld-Check wirft bei fehlenden Feldern', async () => {
  await assert.rejects(() => Bes.erstelle('sv-bestaetigung', {}), /Pflichtfelder fehlen/);
});

test('P9: AZ-Generator-Lambda generate-bescheinigungs-aktenzeichen referenziert', () => {
  assert.match(src, /generate-bescheinigungs-aktenzeichen/);
});

test('P9: bescheinigung-generate Lambda (M³⁰) referenziert für PDF/DB', () => {
  assert.match(src, /bescheinigung-generate/);
});

test('P9: Header dokumentiert AZ-Format BES-YYYY-NNN', () => {
  assert.match(src, /BES-YYYY-NNN/);
});

test('P9: Marcel-Manual: 12 Bescheinigungs-Typen mit Sprint 04d-Liste', () => {
  ['SV-Bestätigung', 'Ortsbesichtigungs', 'Auftragsannahme', 'Termin-Bestätigung',
   'Mängelfreiheits', 'Zustands', 'Beweissicherungs', 'Schimmelfreiheits',
   'Feuchtigkeits', 'Standsicherheits', 'Bedenken-Anzeige', 'Behinderungs-Anzeige']
    .forEach(t => assert.ok(src.includes(t), 'Doku-Hinweis fehlt: ' + t));
});
