'use strict';

/**
 * MEGA³⁹ P4 — Einträge-System Skizze-Integration in akte.html
 *
 * Static-Verify dass:
 *   - skizzen-list.js liest BEIDE Quellen (skizzen-Tabelle + eintraege typ='skizze')
 *   - lib/schadensfall-tabs-widget.js render-pfad unterscheidet SVG-Legacy vs Canvas
 *   - Marker-Count-Badge bei Canvas-Skizzen
 *   - Canvas-Edit-Link nutzt ?az=&nr=
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const lambdaSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'skizzen-list.js'), 'utf8');
const widgetSrc = fs.readFileSync(path.join(ROOT, 'lib', 'schadensfall-tabs-widget.js'), 'utf8');

test('P4: skizzen-list liest BEIDE Quellen (skizzen-Tabelle + eintraege typ=skizze)', () => {
  // Beide Tabellen werden abgefragt
  assert.match(lambdaSrc, /\.from\(['"]skizzen['"]\)/);
  assert.match(lambdaSrc, /\.from\(['"]eintraege['"]\)[\s\S]*?\.eq\(['"]typ['"],\s*['"]skizze['"]\)/);
});

test('P4: skizzen-list source-Marker (svg-legacy vs canvas)', () => {
  assert.match(lambdaSrc, /source:\s*['"]svg-legacy['"]/);
  assert.match(lambdaSrc, /source:\s*['"]canvas['"]/);
});

test('P4: skizzen-list Response enthält svg_count + canvas_count', () => {
  assert.match(lambdaSrc, /svg_count:\s*svgItems\.length/);
  assert.match(lambdaSrc, /canvas_count:\s*canvasList\.length/);
});

test('P4: Canvas-Skizzen exposed marker_count + image_url', () => {
  assert.match(lambdaSrc, /marker_count:[\s\S]*?markers\)\s*\?\s*c\.skizze_data\.markers\.length\s*:\s*0/);
  assert.match(lambdaSrc, /image_url:\s*c\.skizze_image_url/);
});

test('P4: graceful-Fallback bei eintraege-Fehler (Backwards-Compat falls noch nicht migriert)', () => {
  assert.match(lambdaSrc, /catch\s*\(_\)\s*\{\s*\/\*[^*]*graceful/);
});

test('P4: Widget renderSkizzen unterscheidet Canvas vs SVG', () => {
  assert.match(widgetSrc, /isCanvas\s*=\s*s\.source\s*===\s*['"]canvas['"]/);
});

test('P4: Widget Canvas-Edit-Link nutzt ?az= + &nr=', () => {
  assert.match(widgetSrc, /skizzen\.html\?az=\$\{encodeURIComponent\(fallId\)\}&nr=\$\{encodeURIComponent\(s\.skizze_nr/);
});

test('P4: Widget Marker-Badge mit marker_count', () => {
  assert.match(widgetSrc, /isCanvas && s\.marker_count > 0/);
  assert.match(widgetSrc, /📍/);
});

test('P4: Widget Canvas-Image als <img> rendert (statt SVG inline)', () => {
  assert.match(widgetSrc, /s\.source === 'canvas' && s\.image_url/);
  assert.match(widgetSrc, /<img src="\$\{escHtml\(s\.image_url\)/);
});

test('P4: Widget Action-Button zeigt "+ Skizze erstellen (Canvas)"', () => {
  assert.match(widgetSrc, /\+ Skizze erstellen \(Canvas\)/);
});
