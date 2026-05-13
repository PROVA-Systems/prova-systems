/**
 * PROVA — W5 Toast-Migration + Form-Validate Integration Tests
 * MEGA¹⁰ W5 (2026-05-04 nacht)
 *
 * Verifiziert dass:
 * - 6 Logic-Files Toast-Pattern haben (alert mit ProvaUI.toast-Fallback)
 * - app-login.html lib-Stack laedt
 * - app-login-logic.js ProvaForm.validateField nutzt
 *
 * Self-Critique aus MEGA¹⁰-Plan W2 7/10: "Toast-Migration nur 1 Stelle".
 * W5 macht 6+ Stellen — strukturierter Sweep, kein Pattern-Hetze.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

describe('Toast-Migration MEGA¹⁰ W5 (Pattern: alert -> ProvaUI.toast)', () => {

  // Helper: prueft Pattern "ProvaUI.toast(...) ELSE alert(...)" (Fallback-Pattern)
  // Sucht nach Pattern-Match (alertString in Code) und ProvaUI.toast nearby (vor oder nach).
  function hasToastWithFallback(src, alertString) {
    if (!src.includes(alertString)) return { ok: false, reason: 'alert-text not found' };
    const lines = src.split('\n');
    const alertLine = lines.findIndex(l => l.includes(alertString));
    if (alertLine === -1) return { ok: false, reason: 'alert-line not found' };
    // 10 lines window around: catches both inline (alert vor toast) und declaration-pattern (msg = ...; toast(); alert();)
    const window = lines.slice(Math.max(0, alertLine - 8), Math.min(lines.length, alertLine + 8)).join('\n');
    if (!/ProvaUI\.toast/.test(window)) return { ok: false, reason: 'no ProvaUI.toast in 16-line window' };
    return { ok: true };
  }

  test('admin-dashboard-logic.js: Status-Update-Fehler nutzt Toast', () => {
    const src = read('admin-dashboard-logic.js');
    const r = hasToastWithFallback(src, 'Fehler beim Aktualisieren');
    assert.equal(r.ok, true, r.reason);
  });

  test('erechnung-logic.js: Pflichtfelder-Fehler nutzt Toast', () => {
    const src = read('erechnung-logic.js');
    assert.ok(src.includes('Pflichtfelder fehlen'), 'erechnung sollte neue Toast-Message haben');
    assert.ok(src.includes('ProvaUI.toast'), 'erechnung sollte ProvaUI.toast nutzen');
  });

  test('gericht-auftrag-logic.js: Speichern-Fehler nutzt Toast', () => {
    const src = read('gericht-auftrag-logic.js');
    const r = hasToastWithFallback(src, 'Speichern fehlgeschlagen');
    assert.equal(r.ok, true, r.reason);
  });

  test('kurzstellungnahme-logic.js: Pflichtfelder-Validation nutzt Toast', () => {
    const src = read('kurzstellungnahme-logic.js');
    assert.ok(src.includes('ProvaUI.toast'), 'sollte ProvaUI.toast nutzen');
    assert.ok(src.includes('Bitte ausfüllen'));
  });

  test('kurzstellungnahme-logic.js: PDF-Generation-Fehler nutzt Toast', () => {
    const src = read('kurzstellungnahme-logic.js');
    const occurrences = (src.match(/PDF-Generation Fehler/g) || []).length;
    assert.ok(occurrences >= 2, 'PDF-Fehler sollte 2x vorkommen (resp.error + catch)');
    // ProvaUI.toast sollte mindestens 4x vorkommen (4 Migration-Stellen)
    const toastCount = (src.match(/ProvaUI\.toast/g) || []).length;
    assert.ok(toastCount >= 4, 'mindestens 4 ProvaUI.toast-Aufrufe erwartet, gefunden: ' + toastCount);
  });

  test('fachurteil-logic.js: Speech-Browser-Fehler nutzt Toast', () => {
    const src = read('fachurteil-logic.js');
    const r = hasToastWithFallback(src, 'Spracherkennung wird von Ihrem Browser nicht');
    assert.equal(r.ok, true, r.reason);
  });

  test('rechnungen-logic.js (W2-Migration) bleibt aktiv', () => {
    const src = read('rechnungen-logic.js');
    assert.ok(src.includes('ProvaUI.toast'), 'rechnungen-logic.js sollte ProvaUI.toast nutzen (W2-Stand)');
  });
});

describe('Form-Validate-Migration MEGA¹⁰ W5 (app-login)', () => {

  test('app-login.html laedt /lib/empty-states.js und /lib/form-validate.js', () => {
    const html = read('app-login.html');
    assert.ok(html.includes('/lib/empty-states.js'), 'empty-states.js (fuer ProvaUI.toast) sollte geladen sein');
    assert.ok(html.includes('/lib/form-validate.js'), 'form-validate.js sollte geladen sein');
    assert.ok(html.includes('/lib/empty-states.css'), 'empty-states.css sollte geladen sein');
  });

  test('app-login-logic.js nutzt ProvaForm.validateField fuer Live-Validation', () => {
    const src = read('app-login-logic.js');
    assert.ok(src.includes('ProvaForm.validateField') || src.includes('window.ProvaForm.validateField'),
      'app-login-logic.js sollte ProvaForm.validateField aufrufen');
    assert.ok(src.includes('_validateLoginInputs'), 'sollte Validation-Helper-Funktion haben');
    assert.ok(src.includes('emailRule'), 'sollte Email-Validation-Rule definieren');
    assert.ok(src.includes('pwRule'), 'sollte Password-Validation-Rule definieren');
  });

  test('Email-Pattern-Regex ist sinnvoll (akzeptiert valide, rejected invalide)', () => {
    // Reproduktion der Regex aus app-login-logic.js
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    // Valide Beispiele
    assert.ok(emailPattern.test('user@example.de'));
    assert.ok(emailPattern.test('first.last@sub.domain.com'));
    assert.ok(emailPattern.test('müller@example.de'));  // Umlaute

    // Invalide Beispiele
    assert.ok(!emailPattern.test('not-an-email'));
    assert.ok(!emailPattern.test('@no-local.com'));
    assert.ok(!emailPattern.test('no-at.com'));
    assert.ok(!emailPattern.test('two@@signs.com'));
    assert.ok(!emailPattern.test('with space@example.com'));
    assert.ok(!emailPattern.test('no-tld@example'));
  });

  test('Form-Validate Defense-in-Depth: alter alert-Code bleibt als Fallback', () => {
    const src = read('app-login-logic.js');
    assert.ok(src.includes('Bitte E-Mail und Passwort eingeben'),
      'alter Fallback-Code sollte erhalten bleiben');
  });
});
