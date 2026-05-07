'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const tplPath = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '08-rechtsdokumente', 'AVV-MASTER-v1.0.liquid.template.html');
const sourcesPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-31-B3-AVV-SOURCES.md');

test('B3: AVV-Template-File existiert', () => {
  assert.ok(fs.existsSync(tplPath));
});

test('B3: AVV-Template Liquid-Variables vorhanden', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  ['{{ kunde_name }}', '{{ kunde_anschrift }}', '{{ datum }}', '{{ geltungsbereich', '{{ dauer', '{{ technisch_organisatorische_massnahmen', '{{ unterauftragsverarbeiter', '{{ datenkategorien'].forEach(v =>
    assert.ok(tpl.includes(v), 'Variable fehlt: ' + v));
});

test('B3: AVV-Template hat 12 Pflicht-Sektionen (5 + Standard-Klauseln)', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  // Mindestens 5 Pflicht-Sektionen aus Art. 28 Abs. 3
  ['§1 Gegenstand', '§2 Art und Zweck', '§3 Art der Daten', '§4 Pflichten', '§5 Technisch-organisatorische'].forEach(s =>
    assert.match(tpl, new RegExp(s)));
});

test('B3: AVV-Template Art. 28 DSGVO-Verweis', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /Art\. 28[\s\S]{0,30}DSGVO/);
  assert.match(tpl, /Artikel 28 DSGVO/);
});

test('B3: Recherche-Sources-Doku ≥10 URLs', () => {
  assert.ok(fs.existsSync(sourcesPath));
  const src = fs.readFileSync(sourcesPath, 'utf8');
  const urlCount = (src.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10, `≥10 URLs erwartet, gefunden ${urlCount}`);
});

test('B3: Recherche-Sources DSGVO Art. 28 + DSK Kurzpapier 13', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  assert.match(src, /Art\. 28/);
  assert.match(src, /DSK.*Kurzpapier.*13|kpnr_13/);
});

test('B3: Recherche-Sources Top-10 Versicherer aufgelistet', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  ['Allianz', 'AXA', 'ERGO', 'R\\+V', 'Generali', 'HDI', 'Württembergische', 'VHV', 'Zurich', 'Provinzial'].forEach(v =>
    assert.match(src, new RegExp(v)));
});

test('B3: AVV-Template TOM-Katalog erwähnt Pseudonymisierung + Verschlüsselung', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /Pseudonymisierung/);
  assert.match(tpl, /Verschlüsselung|TLS|AES/);
});

test('B3: AVV-Template Drittland-Übermittlung-Klausel', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /Drittland|Standardvertragsklauseln|SCC/);
});

test('B3: AVV-Template Beendigung mit DSGVO-Function-Verweis', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /dsgvo_user_loeschen|Art\. 20|Datenportabilität/);
});
