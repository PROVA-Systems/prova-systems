/**
 * Tests für Inline-CSS-Extraction (MEGA²⁸ V3.2-W3-I4 KORR-24)
 * Verifiziert dass fachurteil.html + app.html keine inline <style>-Blöcke mehr haben
 * und stattdessen externe CSS-Files referenzieren.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('fachurteil.html: kein <style>-Block mehr', () => {
  const html = read('fachurteil.html');
  assert.strictEqual(html.indexOf('<style>'), -1, 'Erwartet: keine <style>-Tags');
  assert.strictEqual(html.indexOf('</style>'), -1, 'Erwartet: keine </style>-Tags');
});

test('fachurteil.html: referenziert stellungnahme.css', () => {
  const html = read('fachurteil.html');
  assert.match(html, /<link\s+rel="stylesheet"\s+href="stellungnahme\.css">/);
});

test('stellungnahme.css: existiert + hat substanziellen Inhalt', () => {
  const css = read('stellungnahme.css');
  assert.ok(css.length > 10000, 'CSS-File sollte > 10KB sein');
  assert.match(css, /:root/, 'erwartet :root Custom-Property-Block');
});

test('app.html: kein <style>-Block mehr', () => {
  const html = read('app.html');
  assert.strictEqual(html.indexOf('<style>'), -1, 'Erwartet: keine <style>-Tags');
  assert.strictEqual(html.indexOf('</style>'), -1, 'Erwartet: keine </style>-Tags');
});

test('app.html: referenziert app.css', () => {
  const html = read('app.html');
  assert.match(html, /<link\s+rel="stylesheet"\s+href="app\.css">/);
});

test('app.css: existiert + hat substanziellen Inhalt', () => {
  const css = read('app.css');
  assert.ok(css.length > 10000, 'CSS-File sollte > 10KB sein');
  assert.match(css, /:root/, 'erwartet :root Custom-Property-Block');
});

test('fachurteil.html: Filesize reduziert (vorher >70KB → nachher <50KB)', () => {
  const html = read('fachurteil.html');
  assert.ok(Buffer.byteLength(html, 'utf8') < 50000,
    'Erwartet: Inline-Extraction reduziert HTML auf < 50KB');
});

test('app.html: Filesize reduziert (vorher >95KB → nachher <80KB)', () => {
  const html = read('app.html');
  assert.ok(Buffer.byteLength(html, 'utf8') < 80000,
    'Erwartet: Inline-Extraction reduziert HTML auf < 80KB');
});

test('stellungnahme.css + app.css beide enthalten Custom-Properties', () => {
  assert.match(read('stellungnahme.css'), /--bg|--surface|--accent/);
  assert.match(read('app.css'), /--accent|--navy/);
});

test('Beide HTMLs behalten andere CSS-Links (mobile.css, page-template.css)', () => {
  assert.match(read('fachurteil.html'), /href="mobile\.css"/);
  assert.match(read('app.html'), /href="mobile\.css"/);
});
