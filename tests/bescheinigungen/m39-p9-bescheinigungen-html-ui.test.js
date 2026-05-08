'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'bescheinigungen.html'), 'utf8');

test('P9-UI: zwei separate Sections (Korrespondenz + Top-12)', () => {
  assert.match(html, /📨 Korrespondenz-Briefe \(DIN 5008\)/);
  assert.match(html, /📜 Bescheinigungen \(Sprint 04d/);
});

test('P9-UI: bs-grid-top12 Container für Top-12-Render', () => {
  assert.match(html, /id="bs-grid-top12"/);
});

test('P9-UI: bescheinigungs-logic.js wird geladen', () => {
  assert.match(html, /<script src="bescheinigungs-logic\.js"\s+defer>/);
});

test('P9-UI: renderTop12 nutzt PROVA_BESCHEINIGUNGEN.getTypen()', () => {
  assert.match(html, /window\.PROVA_BESCHEINIGUNGEN\.getTypen\(\)/);
});

test('P9-UI: Compliance-Hinweise als Warning-Box gerendert', () => {
  // ⚠️-Marker bei t.hinweis
  assert.match(html, /t\.hinweis \?[\s\S]*?⚠️/);
});

test('P9-UI: Edit-Link zu bescheinigung-erstellen.html?typ=', () => {
  assert.match(html, /bescheinigung-erstellen\.html\?typ=\$\{encodeURIComponent\(t\.id\)\}/);
});

test('P9-UI: 11 Korrespondenz-Briefe-Block bleibt unverändert', () => {
  assert.match(html, /id="bs-grid"[^t]/);  // bs-grid (NICHT bs-grid-top12)
  assert.match(html, /11 Vorlagen/);
});

test('P9-UI: defer-Render-Pattern (DOMContentLoaded oder direkt)', () => {
  assert.match(html, /if \(window\.PROVA_BESCHEINIGUNGEN\) renderTop12\(\)/);
  assert.match(html, /DOMContentLoaded[\s\S]*?renderTop12/);
});
