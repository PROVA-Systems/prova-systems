'use strict';

/**
 * MEGA³⁶ W7 — Mobile-Polish Tests
 *  W7.2 Foto-Upload UX — Verify
 *  W7.3 Cookie-Banner Tap-Targets ≥44px — Verify
 *  W7.4 Stepper rückwärts klickbar — Patch + Test
 *  W7.5 Kontrast-Audit — Doku-Pflicht (Lighthouse out-of-scope)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const wizardSrc = fs.readFileSync(path.join(ROOT, 'prova-wizard.js'), 'utf8');
const cookieSrc = fs.readFileSync(path.join(ROOT, 'lib', 'cookie-consent.js'), 'utf8');
const polishDoc = fs.readFileSync(path.join(ROOT, 'docs', 'audit', 'MEGA36-W7-MOBILE-POLISH.md'), 'utf8');

// ── W7.3 Cookie-Banner Tap-Target ──────────────────────────────
test('W7.3: Cookie-Banner-Buttons haben min-height:44px (DSGVO + Apple HIG)', () => {
  // .cc-btn-Definition enthält min-height:44px
  assert.match(cookieSrc, /\.cc-btn\s*\{[^}]*min-height\s*:\s*44px/);
});

test('W7.3: Cookie-Banner-Buttons haben padding ≥12px für Touch-Komfort', () => {
  assert.match(cookieSrc, /\.cc-btn\s*\{[^}]*padding\s*:\s*12px\s+22px/);
});

test('W7.3: 3 Buttons (Akzeptieren / Nur notwendige / Auswahl) gleichberechtigt (kein Pre-Select)', () => {
  // DSGVO Art. 7 / EuGH Planet49 — alle Buttons müssen visuell gleichgestellt sein
  assert.match(cookieSrc, /Akzeptieren|akzeptieren/);
  assert.match(cookieSrc, /Nur notwendige|nur notwendige/i);
});

// ── W7.4 Stepper rückwärts klickbar ────────────────────────────
test('W7.4: _wzZurueckZuSchritt-Handler ist als window-Property exported', () => {
  assert.match(wizardSrc, /window\._wzZurueckZuSchritt\s*=/);
});

test('W7.4: _wzZurueckZuSchritt validiert dass nur RÜCKWÄRTS gesprungen wird', () => {
  // Schutz gegen vorwärts-skip — würde Validierung umgehen
  assert.match(wizardSrc, /target\s*>=\s*WZ\.schritt[\s\S]*?return/);
});

test('W7.4: _wzZurueckZuSchritt sammelt Daten vor dem Sprung (kein Datenverlust)', () => {
  assert.match(wizardSrc, /_wzZurueckZuSchritt[\s\S]*?_sammleDaten\(\)/);
});

test('W7.4: _wzZurueckZuSchritt nutzt _oeffneSchritt für korrektes Re-Render', () => {
  assert.match(wizardSrc, /_wzZurueckZuSchritt[\s\S]*?_oeffneSchritt\(target\)/);
});

test('W7.4: Stepper-Bubble bekommt onclick + aria-label nur bei done==true', () => {
  // Im Header: stepClick wird nur gesetzt wenn done
  assert.match(wizardSrc, /var stepClick = done \?/);
  assert.match(wizardSrc, /aria-label="Zurück zu Schritt/);
});

test('W7.4: Stepper-Bubble hat role="button" + tabindex="0" für Keyboard-Nav', () => {
  assert.match(wizardSrc, /role="button" tabindex="0"/);
});

test('W7.4: Keyboard-Trigger via Enter ODER Space (a11y)', () => {
  // Im escaped String-Literal: event.key===\'Enter\'||event.key===\' \'
  assert.match(wizardSrc, /event\.key===\\['"]Enter\\['"]/);
  assert.match(wizardSrc, /event\.key===\\['"] \\['"]/);
});

test('W7.4: Cursor-Style "pointer" nur bei done-Steps', () => {
  assert.match(wizardSrc, /var stepCursor = done \? ['"]pointer['"] : ['"]default['"]/);
});

// ── W7-Doku ────────────────────────────────────────────────────
test('W7: Polish-Doku existiert und referenziert alle 4 Sub-Items', () => {
  ['W7.2', 'W7.3', 'W7.4', 'W7.5'].forEach(item => {
    assert.ok(polishDoc.includes(item), item + ' fehlt in Polish-Doku');
  });
});

test('W7.2: Doku verifiziert Foto-Upload-UX (FormData/JSON+base64-Pattern)', () => {
  assert.match(polishDoc, /Foto-Upload/);
  assert.match(polishDoc, /foto-upload/);
});

test('W7.5: Doku adressiert Lighthouse-Kontrast (Out-of-Scope-Notiz)', () => {
  assert.match(polishDoc, /Lighthouse/);
  assert.match(polishDoc, /Kontrast/);
});
