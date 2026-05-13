/**
 * PROVA — Disclaimer-Page-Wiring Tests (MEGA²³ Block 2)
 *
 * Validates that all KI-relevant pages reference /lib/prova-disclaimer.js
 * and (for active-KI pages) contain inline §407a-disclaimer markup.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

const SCRIPT_REGEX = /<script[^>]*src=["']\/lib\/prova-disclaimer\.js["']/;
const PROVA_DISCLAIMER_CLASS = /class="prova-ki-disclaimer"/;
const PARAGRAPH_407A = /§407a/;

const SCRIPT_WIRED_PAGES = [
  'gericht-auftrag.html',
  'ortstermin-modus.html',
  'fachurteil.html',
  'akte.html',
  'app.html',
  'freigabe.html',
  'kurzstellungnahme.html',
  'wertgutachten.html'
];

const INLINE_DISCLAIMER_PAGES = [
  'gericht-auftrag.html',
  'ortstermin-modus.html',
  'fachurteil.html'
];

describe('Disclaimer-Page-Wiring — script tag', () => {
  SCRIPT_WIRED_PAGES.forEach(page => {
    test(page + ' laedt /lib/prova-disclaimer.js', () => {
      const html = read(page);
      assert.match(html, SCRIPT_REGEX,
        page + ' fehlt <script src="/lib/prova-disclaimer.js"> Tag');
    });
  });
});

describe('Disclaimer-Page-Wiring — inline §407a-Disclaimer', () => {
  INLINE_DISCLAIMER_PAGES.forEach(page => {
    test(page + ' enthaelt class="prova-ki-disclaimer" Block', () => {
      const html = read(page);
      assert.match(html, PROVA_DISCLAIMER_CLASS,
        page + ' fehlt class="prova-ki-disclaimer" Inline-Block');
    });

    test(page + ' enthaelt §407a-Referenz', () => {
      const html = read(page);
      assert.match(html, PARAGRAPH_407A,
        page + ' fehlt §407a-Referenz');
    });
  });
});

describe('Disclaimer-Page-Wiring — Tooltip auf KI-Buttons', () => {
  test('ortstermin-modus.html: Foto-KI-Button hat title-Attribut mit §407a', () => {
    const html = read('ortstermin-modus.html');
    const m = html.match(/id="ki-foto-btn"[^>]*title="[^"]*§407a/);
    assert.ok(m, 'ki-foto-btn fehlt title-Attribut mit §407a');
  });

  test('ortstermin-modus.html: Diktat-KI-Button hat title-Attribut', () => {
    const html = read('ortstermin-modus.html');
    const m = html.match(/id="ki-btn"[^>]*title="[^"]*§407a/);
    assert.ok(m, 'ki-btn (Diktat) fehlt title-Attribut mit §407a');
  });

  test('fachurteil.html: KI-Assist-Button hat title-Attribut', () => {
    const html = read('fachurteil.html');
    const m = html.match(/onclick="kiAssist\('assist'\)"[^>]*title="[^"]*§407a/);
    assert.ok(m, 'KI-Assist-Button fehlt title-Attribut mit §407a');
  });
});

describe('Disclaimer-Page-Wiring — Disclaimer-Lib in sw.js APP_SHELL', () => {
  test('sw.js cached /lib/prova-disclaimer.js', () => {
    const sw = read('sw.js');
    assert.match(sw, /\/lib\/prova-disclaimer\.js/,
      'sw.js APP_SHELL fehlt /lib/prova-disclaimer.js Eintrag');
  });

  test('sw.js cached /lib/beweisbeschluss-upload.js', () => {
    const sw = read('sw.js');
    assert.match(sw, /\/lib\/beweisbeschluss-upload\.js/,
      'sw.js APP_SHELL fehlt /lib/beweisbeschluss-upload.js Eintrag');
  });
});

describe('Disclaimer-Page-Wiring — Coverage-Mindestanzahl', () => {
  test('Mindestens 5 Pages mit Disclaimer-Script', () => {
    let count = 0;
    SCRIPT_WIRED_PAGES.forEach(page => {
      const html = read(page);
      if (SCRIPT_REGEX.test(html)) count++;
    });
    assert.ok(count >= 5, 'Block 2 verlangt 5+ Pages, gefunden: ' + count);
  });

  test('Mindestens 3 Pages mit Inline-Disclaimer-Block', () => {
    let count = 0;
    INLINE_DISCLAIMER_PAGES.forEach(page => {
      const html = read(page);
      if (PROVA_DISCLAIMER_CLASS.test(html)) count++;
    });
    assert.ok(count >= 3, 'Block 2 verlangt 3+ Inline-Disclaimers, gefunden: ' + count);
  });
});
