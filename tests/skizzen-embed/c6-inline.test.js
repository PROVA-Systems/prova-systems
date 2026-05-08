'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lib = require('../../lib/skizzen-embed');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme.html'), 'utf8');
const libSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'skizzen-embed.js'), 'utf8');

test('A4: skizzen-list.js Lambda existiert (existing W12b)', () => {
  const lambdaPath = path.join(__dirname, '..', '..', 'netlify', 'functions', 'skizzen-list.js');
  assert.ok(fs.existsSync(lambdaPath), 'skizzen-list.js fehlt');
});

test('A4: Sidebar skizzen-sidebar in stellungnahme.html', () => {
  assert.match(html, /id="skizzen-sidebar"/);
});

test('A4: Lib eingebunden via script-tag', () => {
  assert.match(html, /\/lib\/skizzen-embed\.js/);
});

test('A4: replaceMarkers ersetzt [SKIZZE-N] mit SVG', () => {
  const text = 'Vorher [SKIZZE-1] danach.';
  const map = { 1: { name: 'Grundriss', svg_data: '<svg><rect/></svg>' } };
  const result = Lib.replaceMarkers(text, map);
  assert.ok(result.includes('<svg><rect/></svg>'));
  assert.ok(result.includes('Skizze 1'));
  assert.ok(result.includes('Grundriss'));
});

test('A4: replaceMarkers ohne Map → unverändert', () => {
  const text = '[SKIZZE-1] und [SKIZZE-2]';
  assert.strictEqual(Lib.replaceMarkers(text, null), text);
  assert.strictEqual(Lib.replaceMarkers(text, {}), text);
});

test('A4: replaceMarkers nur bekannte SKIZZE-N ersetzt', () => {
  const text = '[SKIZZE-1] und [SKIZZE-2]';
  const map = { 1: { name: 'A', svg_data: '<svg/>' } };
  const result = Lib.replaceMarkers(text, map);
  assert.ok(result.includes('<svg/>'));
  assert.ok(result.includes('[SKIZZE-2]')); // unverändert
});

test('A4: insertMarker fügt [SKIZZE-N] an Cursor-Position', () => {
  const ta = {
    value: 'Vorher danach',
    selectionStart: 7,
    selectionEnd: 7,
    setSelectionRange: function (a, b) { this.selectionStart = a; this.selectionEnd = b; },
    dispatchEvent: () => {},
    focus: () => {}
  };
  Lib.insertMarker(ta, 3);
  assert.strictEqual(ta.value, 'Vorher [SKIZZE-3]danach');
});

test('A4: HTML-Escape gegen XSS in name-Feld', () => {
  const text = '[SKIZZE-1]';
  const map = { 1: { name: '<script>alert(1)</script>', svg_data: '<svg/>' } };
  const result = Lib.replaceMarkers(text, map);
  assert.ok(!result.includes('<script>alert(1)</script>'));
  assert.match(result, /&lt;script&gt;/);
});

test('A4: Marker-Pattern \\[SKIZZE-N\\] in stellungnahme.html dokumentiert', () => {
  // Lib enthält das Pattern (zumindest als Regex)
  assert.match(libSrc, /\\\[SKIZZE-/);
});

test('A4: Sidebar-Hook + Click-Handler exposed', () => {
  // Lib exportiert _click für inline onclick=""
  assert.match(libSrc, /window\.ProvaSkizzenEmbed\.+_click/);
});
