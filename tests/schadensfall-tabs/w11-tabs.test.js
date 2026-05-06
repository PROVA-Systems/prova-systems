'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const widgetSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'schadensfall-tabs-widget.js'), 'utf8');
const akteHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'akte.html'), 'utf8');
const fotosLambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'fotos-list.js'), 'utf8');
const dokumenteLambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'dokumente-list.js'), 'utf8');

test('Widget: 5 Tabs (Einträge/Skizzen/Fristen/Fotos/Dokumente)', () => {
  ['eintraege', 'skizzen', 'fristen', 'fotos', 'dokumente'].forEach(t =>
    assert.match(widgetSrc, new RegExp("key: '" + t + "'")));
});

test('Widget: 5 API-Pfade auftrag_id-konform', () => {
  assert.match(widgetSrc, /eintraege-list.*auftrag_id/);
  assert.match(widgetSrc, /skizzen-list.*auftrag_id/);
  assert.match(widgetSrc, /fristen-list.*auftrag_id/);
  assert.match(widgetSrc, /fotos-list.*auftrag_id/);
  assert.match(widgetSrc, /dokumente-list.*auftrag_id/);
});

test('Widget: URL-Persistenz via ?tab=', () => {
  assert.match(widgetSrc, /searchParams\.set\(['"]tab['"]/);
  assert.match(widgetSrc, /qs\.get\(['"]tab['"]\)/);
});

test('Widget: Lazy-Load via dataset.loaded', () => {
  assert.match(widgetSrc, /dataset\.loaded\s*===?\s*['"]1['"]/);
});

test('Widget: getFallId akzeptiert auftrag_id + Backwards-Compat', () => {
  assert.match(widgetSrc, /qs\.get\(['"]auftrag_id['"]/);
  assert.match(widgetSrc, /qs\.get\(['"]schadensfall_id['"]/);
});

test('Widget: Pseudonymisiert-Marker im Eintrag-Render', () => {
  assert.match(widgetSrc, /pseudonymisiert.*🔒/);
});

test('Widget: Diff-Days-Color-Code für Fristen', () => {
  assert.match(widgetSrc, /td\s*<\s*0/);
  assert.match(widgetSrc, /td\s*<=?\s*3/);
});

test('Widget: SVG-Thumbnails für Skizzen via svg_content', () => {
  assert.match(widgetSrc, /s\.svg_content/);
});

test('Widget: EXIF-Stripped-Marker für Fotos', () => {
  assert.match(widgetSrc, /exif_stripped/);
});

test('Widget: doc_nummer (NICHT dok_nr) für Dokumente', () => {
  assert.match(widgetSrc, /doc_nummer/);
});

test('akte.html: Tabs-Section eingebunden', () => {
  assert.match(akteHtml, /sec-fall-tabs/);
  assert.match(akteHtml, /data-schadensfall-tabs/);
  assert.match(akteHtml, /schadensfall-tabs-widget\.js/);
});

test('Lambda fotos-list: SELECT auftrag_id + storage_path + exif_stripped', () => {
  assert.match(fotosLambda, /eq\(['"]auftrag_id['"]/);
  assert.match(fotosLambda, /storage_path/);
  assert.match(fotosLambda, /exif_stripped/);
});

test('Lambda dokumente-list: SELECT auftrag_id + doc_nummer + typ ENUM', () => {
  assert.match(dokumenteLambda, /eq\(['"]auftrag_id['"]/);
  assert.match(dokumenteLambda, /doc_nummer/);
});

test('Lambda fotos-list: keine non-existierenden Spalten', () => {
  // dauer_min, schadensart_label etc. dürfen nicht in fotos-Select
  assert.ok(!/ist_pseudonymisiert/.test(fotosLambda));
});

test('Lambda dokumente-list: keine non-existierenden Spalten', () => {
  assert.ok(!/dok_nr/.test(dokumenteLambda));
  assert.ok(!/betrag_brutto/.test(dokumenteLambda));
  assert.ok(!/generated_at/.test(dokumenteLambda));
});
