'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const gateLibSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'editor-gate.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme-logic.js'), 'utf8');

function evalLib() {
  const win = { provaFetch: null };
  const doc = {
    addEventListener: () => {},
    head: { appendChild: () => {} },
    getElementById: () => null,
    createElement: () => ({ id: '', className: '', appendChild: () => {}, addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} }, querySelector: () => ({ addEventListener: () => {}, focus: () => {} }) }),
    body: { appendChild: () => {} }
  };
  new Function('window', 'document', gateLibSrc)(win, doc);
  return win.ProvaEditorGate;
}

test('A2: zeichenCounter HTML-Element existiert', () => {
  assert.match(html, /id="zeichenCounter"/);
  assert.match(html, /0 \/ 500 Zeichen/);
});

test('A2: zeichenWarnBanner für < 500 Zeichen', () => {
  assert.match(html, /id="zeichenWarnBanner"/);
  assert.match(html, /Mindestens 500 Zeichen Eigenleistung/);
});

test('A2: editor-gate.js Lib eingebunden in stellungnahme.html', () => {
  assert.match(html, /\/lib\/editor-gate\.js/);
  assert.match(html, /\/lib\/quality-markers\.js/);
});

test('A2: MIN_ZEICHEN = 500 + MIN_BEGRUENDUNG = 50', () => {
  const api = evalLib();
  assert.strictEqual(api.MIN_ZEICHEN, 500);
  assert.strictEqual(api.MIN_BEGRUENDUNG, 50);
});

test('A2: checkOrOverride API exposed', () => {
  const api = evalLib();
  assert.strictEqual(typeof api.checkOrOverride, 'function');
  assert.strictEqual(typeof api.updateCounter, 'function');
});

test('A2: speichereUndWeiter ruft checkOrOverride vor Redirect', () => {
  // In stellungnahme-logic.js muss vor freigabe.html-Redirect ProvaEditorGate.checkOrOverride
  const idx = js.indexOf('window.speichereUndWeiter');
  const slice = js.slice(idx, idx + 1500);
  assert.match(slice, /ProvaEditorGate/);
  assert.match(slice, /checkOrOverride/);
});

test('A2: Override-Modal triggert audit-trail-write Lambda', () => {
  assert.match(gateLibSrc, /audit-trail-write/);
  assert.match(gateLibSrc, /entity_typ:\s*['"]editor_override['"]/);
});

test('A2: payload mit gruende + zeichen_count + marker_count', () => {
  assert.match(gateLibSrc, /gruende:/);
  assert.match(gateLibSrc, /zeichen_count:/);
  assert.match(gateLibSrc, /marker_count:/);
});

test('A2: updateEigenleistung ruft EditorGate.updateCounter (Bridge)', () => {
  assert.match(js, /ProvaEditorGate.*updateCounter|window\.ProvaEditorGate/);
});

test('A2: editor-gate Modal verwendet quality-markers via window.ProvaQualityMarkers', () => {
  assert.match(gateLibSrc, /window\.ProvaQualityMarkers/);
  assert.match(gateLibSrc, /checkMarkers/);
});
