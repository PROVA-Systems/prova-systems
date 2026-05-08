'use strict';

/**
 * MEGA³⁷ A2 — _oeffneSchritt Stepper-Verify
 *
 * Static-Code-Verify (kein Browser-Test): prüft die Garantien per Source-grep
 * dass _oeffneSchritt korrekt verhält für Rückwärts-Sprünge.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const wizardSrc = fs.readFileSync(
  path.join(__dirname, '..', '..', 'prova-wizard.js'), 'utf8');

test('A2: _oeffneSchritt setzt WZ.schritt = n', () => {
  // function _oeffneSchritt(n) { WZ.schritt = n; ... }
  assert.match(wizardSrc, /function _oeffneSchritt\(n\)\s*\{\s*WZ\.schritt\s*=\s*n;/);
});

test('A2: _oeffneSchritt entfernt altes Element + erstellt neues (kein State-Reset)', () => {
  // WZ.el.remove() + WZ.el = _erstelleWizard(n)
  assert.match(wizardSrc, /_oeffneSchritt[\s\S]*?WZ\.el\.remove\(\);/);
  assert.match(wizardSrc, /_oeffneSchritt[\s\S]*?WZ\.el\s*=\s*_erstelleWizard\(n\)/);
});

test('A2: _oeffneSchritt löscht WZ.felder NICHT (Datenerhalt)', () => {
  const fnMatch = wizardSrc.match(/function _oeffneSchritt\(n\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fnMatch, '_oeffneSchritt-Body gefunden');
  // Keine Manipulation von WZ.felder im Body
  assert.doesNotMatch(fnMatch[0], /WZ\.felder\s*=\s*[\{|\[]/);
  assert.doesNotMatch(fnMatch[0], /delete WZ\.felder/);
});

test('A2: _zurueck ruft _sammleDaten() VOR _oeffneSchritt auf', () => {
  // function _zurueck() { ... _sammleDaten(); _oeffneSchritt(WZ.schritt - 1); }
  const zurMatch = wizardSrc.match(/function _zurueck\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(zurMatch, '_zurueck-Body gefunden');
  // _sammleDaten muss VOR _oeffneSchritt im Body stehen
  const idxSammle = zurMatch[0].indexOf('_sammleDaten()');
  const idxOeffne = zurMatch[0].indexOf('_oeffneSchritt(');
  assert.ok(idxSammle > -1 && idxOeffne > -1, 'beide Calls vorhanden');
  assert.ok(idxSammle < idxOeffne, '_sammleDaten muss vor _oeffneSchritt stehen');
});

test('A2: _wzZurueckZuSchritt ruft _sammleDaten() VOR _oeffneSchritt auf (M³⁶ W7.4)', () => {
  const fnMatch = wizardSrc.match(/_wzZurueckZuSchritt\s*=\s*function[\s\S]*?\n\};/);
  assert.ok(fnMatch, '_wzZurueckZuSchritt-Body gefunden');
  const idxSammle = fnMatch[0].indexOf('_sammleDaten');
  const idxOeffne = fnMatch[0].indexOf('_oeffneSchritt');
  assert.ok(idxSammle > -1 && idxOeffne > -1);
  assert.ok(idxSammle < idxOeffne, '_sammleDaten muss vor _oeffneSchritt stehen');
});

test('A2: _wzZurueckZuSchritt validiert target < WZ.schritt (kein Vorwärts-Skip)', () => {
  assert.match(wizardSrc, /_wzZurueckZuSchritt[\s\S]*?if \(target >= WZ\.schritt\) return/);
});

test('A2: _oeffneSchritt ist NICHT als window-Property exportiert (interner Zugriff)', () => {
  assert.doesNotMatch(wizardSrc, /window\._oeffneSchritt\s*=/);
});
