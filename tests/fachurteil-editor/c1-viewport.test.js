'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', '..', 'stellungnahme-logic.js'), 'utf8');

test('A1: CSS-Variable --editor-main-width: 60vw existiert', () => {
  assert.match(css, /--editor-main-width:\s*60vw/);
});

test('A1: befunde-panel CSS-Klasse mit position:sticky', () => {
  assert.match(css, /\.befunde-panel\s*\{[\s\S]*?position:\s*sticky/);
});

test('A1: editor-grid mit 60vw 40vw Spalten', () => {
  assert.match(css, /grid-template-columns:\s*var\(--editor-main-width\)\s+var\(--editor-side-width\)/);
});

test('A1: Mindesthöhe 600px für Editor-Textfeld', () => {
  assert.match(css, /--editor-min-height:\s*600px/);
});

test('A1: Responsive-Fallback < 768px Stacking', () => {
  assert.match(css, /@media\s*\(\s*max-width:\s*768px\s*\)[\s\S]*?grid-template-columns:\s*1fr/);
});

test('A1: HTML enthält befunde-panel-Element', () => {
  assert.match(html, /id="befundePanel"/);
  assert.match(html, /class="befunde-panel"/);
});

test('A1: Befunde-Panel hat 5 Sektionen (§1-§5)', () => {
  ['§1 Auftrag', '§2 Sachverhalt', '§3 Anknüpfungstatsachen', '§4 Befunde', '§5 Beweisfragen'].forEach(s =>
    assert.match(html, new RegExp(s)));
});

test('A1: Auto-Fokus-Code in stellungnahme-logic.js (svTextA.focus)', () => {
  assert.match(js, /MEGA³¹ A1.*Auto-Fokus|Auto-Fokus.*§6-Editor/);
  assert.match(js, /ta\.focus\(\)/);
});
