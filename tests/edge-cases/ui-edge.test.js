'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }

test('UI-EDGE-1: Mobile-Polish CSS Touch-Targets 44px', () => {
  const css = read('lib/mobile-polish.css');
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /min-height:\s*44px/);
});

test('UI-EDGE-2: Safe-Area-Insets für iOS', () => {
  // mobile-polish.css ODER safe-area-helper.css
  const css = read('lib/mobile-polish.css');
  const helper = fs.existsSync(path.join(root, 'lib', 'safe-area-helper.css'))
    ? read('lib/safe-area-helper.css') : '';
  assert.ok(/safe-area-inset/.test(css + helper));
});

test('UI-EDGE-3: Sidebar-Resize-Listener (Memory K-FIX)', () => {
  const nav = read('nav.js');
  assert.match(nav, /matchMedia|onBreakpointChange|resize/);
});

test('UI-EDGE-4: Empty-State-Pattern in Pages', () => {
  const arch = read('archiv.html');
  assert.match(arch, /empty|leer|noch keine|keine.*vorhanden/i);
});

test('UI-EDGE-5: Toast-Pattern für User-Feedback (in fachurteil.html oder app.html)', () => {
  // Toast-Pattern in einer Production-Page
  const stell = read('fachurteil.html');
  const app = read('app.html');
  assert.ok(/toast|ProvaUI|alert\(|notification/i.test(stell + app),
    'Toast/Alert-Pattern erwartet');
});

test('UI-EDGE-6: §6-Editor 60vw-Layout (M31 A1)', () => {
  const css = read('stellungnahme.css');
  // 60vw via CSS-Custom-Property
  assert.match(css, /--editor-main-width:\s*60vw|60vw/);
});

test('UI-EDGE-7: Phase-Indicator §1-§6 mit data-phase-nr', () => {
  const html = read('neuer-fall.html');
  for (let i = 1; i <= 6; i++) {
    assert.match(html, new RegExp(`data-phase-nr="${i}"`));
  }
});

test('UI-EDGE-8: Mobile-Diktat Round-Button bottom-fixed', () => {
  const html = read('diktat-mobile.html');
  assert.match(html, /dm-record-btn/);
  assert.match(html, /140px/);
});

test('UI-EDGE-9: Honorar-Rechner 3 Modi-Buttons', () => {
  const html = read('honorar-rechner.html');
  ['jveg','bvs','streitwert'].forEach(m => {
    assert.match(html, new RegExp(`id="modus-${m}"`));
  });
});

test('UI-EDGE-10: Demo-Page 6-Step-Tour', () => {
  const html = read('demo.html');
  for (let i = 1; i <= 6; i++) {
    assert.match(html, new RegExp(`id="demo-step-${i}"`));
  }
});
