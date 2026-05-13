/**
 * PROVA — W16 Toast-Migration-Sweep Tests
 * MEGA¹² W16 (2026-05-05)
 *
 * Verifiziert dass die 7 bestehenden Defense-in-Depth-Patterns aus MEGA⁹+¹⁰
 * jetzt auf 1-Liner provaAlert(...) refactored sind.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

describe('W16 Toast-Migration: Migrated Files (1-Liner-Pattern)', () => {

  test('admin-dashboard-logic.js: provaAlert verwendet, alter Pattern raus', () => {
    const src = read('admin-dashboard-logic.js');
    assert.match(src, /\(window\.provaAlert \|\| alert\)\(['"]Fehler beim Aktualisieren/);
    // Alter Pattern darf NICHT mehr sein
    assert.ok(!src.includes("if (window.ProvaUI && window.ProvaUI.toast) {\n      window.ProvaUI.toast('Fehler beim Aktualisieren"));
  });

  test('erechnung-logic.js: provaAlert verwendet', () => {
    const src = read('erechnung-logic.js');
    assert.match(src, /\(window\.provaAlert \|\| alert\)\(msg, 'error'\)/);
  });

  test('gericht-auftrag-logic.js: provaAlert verwendet', () => {
    const src = read('gericht-auftrag-logic.js');
    assert.match(src, /\(window\.provaAlert \|\| alert\)\(['"]Speichern fehlgeschlagen/);
  });

  test('kurzstellungnahme-logic.js: 4 provaAlert-Migrations', () => {
    const src = read('kurzstellungnahme-logic.js');
    const matches = (src.match(/\(window\.provaAlert \|\| alert\)/g) || []).length;
    assert.ok(matches >= 4, '4+ provaAlert-Aufrufe erwartet, gefunden: ' + matches);
  });

  test('fachurteil-logic.js: provaAlert fuer Speech-Browser', () => {
    const src = read('fachurteil-logic.js');
    assert.match(src, /\(window\.provaAlert \|\| alert\)\(['"]Spracherkennung/);
  });

  test('rechnungen-logic.js: provaAlert fuer Support-Form-Error', () => {
    const src = read('rechnungen-logic.js');
    assert.match(src, /\(window\.provaAlert \|\| alert\)\(['"]Senden fehlgeschlagen/);
  });

  test('app-login-logic.js: provaAlert fuer Login-Validation', () => {
    const src = read('app-login-logic.js');
    assert.match(src, /window\.provaAlert\(['"]Bitte Eingaben pruefen/);
  });
});

describe('W16 Toast-Migration: HTML Library-Loading', () => {

  test('admin-dashboard.html laedt /lib/prova-alert.js', () => {
    const html = read('admin-dashboard.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });

  test('rechnungen.html laedt /lib/prova-alert.js', () => {
    const html = read('rechnungen.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });

  test('app-login.html laedt /lib/prova-alert.js', () => {
    const html = read('app-login.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });

  test('erechnung.html laedt /lib/prova-alert.js', () => {
    const html = read('erechnung.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });

  test('fachurteil.html laedt /lib/prova-alert.js', () => {
    const html = read('fachurteil.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });

  test('kurzstellungnahme.html laedt /lib/prova-alert.js', () => {
    const html = read('kurzstellungnahme.html');
    assert.match(html, /\/lib\/prova-alert\.js/);
  });
});

describe('W16 Toast-Migration: Defense-in-Depth-Pattern', () => {

  test('Fallback bleibt: (window.provaAlert || alert) — ohne Library bleibt alert', () => {
    // Pattern garantiert dass Code auch ohne lib/prova-alert.js laeuft
    const files = [
      'admin-dashboard-logic.js',
      'erechnung-logic.js',
      'gericht-auftrag-logic.js',
      'kurzstellungnahme-logic.js',
      'fachurteil-logic.js',
      'rechnungen-logic.js'
    ];
    for (const f of files) {
      const src = read(f);
      assert.match(src, /\(window\.provaAlert \|\| alert\)/, f + ' sollte Defense-Pattern haben');
    }
  });

  test('Code-Reduktion: alter 5-Zeilen-Pattern weg in 6 Files', () => {
    const oldPattern = /if \(window\.ProvaUI && window\.ProvaUI\.toast\) \{[\s\S]{1,80}window\.ProvaUI\.toast/;
    const files = [
      'admin-dashboard-logic.js',
      'erechnung-logic.js',
      'gericht-auftrag-logic.js',
      'kurzstellungnahme-logic.js',
      'fachurteil-logic.js',
      'rechnungen-logic.js'
    ];
    for (const f of files) {
      const src = read(f);
      // Note: app-login-logic.js hat moeglicherweise noch andere Stellen mit ProvaUI.toast (Login-Flow)
      // — die testen wir nicht
      assert.ok(!oldPattern.test(src), f + ' sollte alten 5-Zeilen-Pattern nicht mehr haben');
    }
  });
});
