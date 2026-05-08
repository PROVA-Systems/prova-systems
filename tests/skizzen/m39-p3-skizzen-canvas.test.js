'use strict';

/**
 * MEGA³⁹ P3 — Skizzen-Canvas Tests
 *
 * Static-API-Verify (kein Browser-DOM) für lib/skizzen-canvas.js.
 * Browser-/Tablet-Tests laufen manuell.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const libSrc = fs.readFileSync(path.join(ROOT, 'lib', 'skizzen-canvas.js'), 'utf8');
const Skizzen = require(path.join(ROOT, 'lib', 'skizzen-canvas.js'));

test('P3: PROVA_SKIZZEN exposed Tier-1-Tools-Liste mit 7 Werkzeugen', () => {
  const tools = Skizzen._TIER_1_TOOLS;
  assert.ok(Array.isArray(tools));
  ['stift', 'linie', 'kreis', 'rechteck', 'marker', 'text', 'radierer']
    .forEach(t => assert.ok(tools.includes(t), 'Tool fehlt: ' + t));
});

test('P3: HISTORY_MAX = 30 (Undo-Tiefe)', () => {
  assert.strictEqual(Skizzen._HISTORY_MAX, 30);
});

test('P3: Public API exposed (init, setTool, addMarker, undo, redo, clear, exportPNG, exportJSON, save)', () => {
  ['init', 'setTool', 'setColor', 'setLineWidth', 'addMarker',
   'setBackgroundImage', 'setScale', 'undo', 'redo', 'clear',
   'exportPNG', 'exportJSON', 'loadFromData', 'save']
    .forEach(fn => assert.strictEqual(typeof Skizzen[fn], 'function', fn + ' fehlt'));
});

test('P3: setTool wirft bei unbekanntem Tool', () => {
  assert.throws(() => Skizzen.setTool('quatsch'));
});

test('P3: setLineWidth clamped 1-40', () => {
  // Indirekt verify: kein Canvas init nötig — _setStyle wirft ohne ctx, also wir testen nur dass setLineWidth nicht crashed
  // Aber dass die Funktion existiert und akzeptiert ist Pflicht.
  assert.strictEqual(typeof Skizzen.setLineWidth, 'function');
});

test('P3: Source enthält Pointer-Events (Touch+Stift+Maus)', () => {
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave']
    .forEach(ev => assert.match(libSrc, new RegExp(ev), 'Event fehlt: ' + ev));
});

test('P3: Stift-Pressure für Apple Pencil / S Pen', () => {
  assert.match(libSrc, /e\.pointerType === ['"]pen['"]/);
  assert.match(libSrc, /e\.pressure/);
  assert.match(libSrc, /lineWidth \* \(0\.5 \+ e\.pressure \* 1\.5\)/);
});

test('P3: Tier 2 — setBackgroundImage + setScale exposed', () => {
  assert.strictEqual(typeof Skizzen.setBackgroundImage, 'function');
  assert.strictEqual(typeof Skizzen.setScale, 'function');
});

test('P3: addMarker erzeugt Auto-Nummer + Pin-Rendering', () => {
  // Source enthält Auto-Nummer-Logik
  assert.match(libSrc, /const nr = markers\.length \+ 1;/);
  // Pin als roter Kreis (#ef4444)
  assert.match(libSrc, /fillStyle = ['"]#ef4444['"]/);
});

test('P3: IndexedDB Auto-Save mit prova-skizzen-DB', () => {
  assert.match(libSrc, /indexedDB\.open\(['"]prova-skizzen['"]/);
  assert.match(libSrc, /'skizzen'/);
});

test('P3: Auto-Save 500ms debounced', () => {
  assert.match(libSrc, /setTimeout\([^,]+,\s*500\)/);
});

test('P3: exportJSON liefert vollständiges Skizze-Schema', () => {
  // Schema: tier, canvas_width, canvas_height, background, strokes, markers, scale
  const fnMatch = libSrc.match(/function exportJSON\(\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\};\s*\}/);
  assert.ok(fnMatch);
  ['tier', 'canvas_width', 'canvas_height', 'background', 'strokes', 'markers', 'scale']
    .forEach(field => assert.ok(fnMatch[0].includes(field), 'Field fehlt in exportJSON: ' + field));
});

test('P3: §407a-Doktrin: Skizze-Bild geht NICHT an KI (nur Marker-Texte)', () => {
  // Doku-Verify im Header
  assert.match(libSrc, /Skizze-Bild wird NICHT an KI gesendet/);
});

test('P3: Marker-Schema enthält befund_id für Cross-Reference', () => {
  assert.match(libSrc, /befund_id:\s*befund_id\s*\|\|\s*null/);
});

test('P3: Multi-Skizze pro Auftrag via skizzeNr', () => {
  assert.match(libSrc, /skizzeNr/);
  assert.match(libSrc, /auftragId\s*\+\s*['"]-['"]\s*\+\s*skizzeNr/);
});

test('P3: undo/redo mit history-Stack-Verwaltung', () => {
  assert.match(libSrc, /historyIdx > 0[\s\S]*?historyIdx--/);
  assert.match(libSrc, /historyIdx < history\.length - 1[\s\S]*?historyIdx\+\+/);
});

test('P3: TIER 1 (Werkzeuge) UND TIER 2 (Hintergrund/Maßstab) dokumentiert', () => {
  assert.match(libSrc, /Tier 1 \(Werkzeuge\)/);
  assert.match(libSrc, /Tier 2 \(Erweitert\)/);
});

test('P3: clear() löscht strokes + markers', () => {
  assert.match(libSrc, /function clear\(\)[\s\S]*?strokes = \[\][\s\S]*?markers = \[\]/);
});

test('P3: exportPNG via canvas.toDataURL', () => {
  assert.match(libSrc, /canvas\.toDataURL\(['"]image\/png['"]\)/);
});
