'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/global-search');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'global-search.js'), 'utf8');
const frontSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'global-search.js'), 'utf8');

test('A3: Cmd-K-Wiring (metaKey/ctrlKey + key=k)', () => {
  assert.match(frontSrc, /metaKey \|\| e\.ctrlKey/);
  assert.match(frontSrc, /e\.key === 'k'/);
});

test('A3: keydown-Listener global registriert', () => {
  assert.match(frontSrc, /document\.addEventListener\(['"]keydown['"]/);
  assert.match(frontSrc, /preventDefault\(\)/);
});

test('A3: ESC-Handler schließt Modal', () => {
  assert.match(frontSrc, /Escape|ESC|esc/);
});

test('A3: Modal-Element prova-search-overlay', () => {
  assert.match(frontSrc, /prova-search-overlay/);
  assert.match(frontSrc, /prova-search-input|prova-search-field/);
});

test('A3: Lambda exposed __matchActions + __QUICK_ACTIONS', () => {
  assert.strictEqual(typeof Lambda.__matchActions, 'function');
  assert.ok(Array.isArray(Lambda.__QUICK_ACTIONS));
  assert.ok(Lambda.__QUICK_ACTIONS.length >= 6);
});

test('A3: Quick-Actions matcht Label-Substring', () => {
  const r = Lambda.__matchActions('auftrag');
  assert.ok(r.length >= 1);
  assert.ok(r.some(a => a.id === 'new-auftrag'));
});

test('A3: Quick-Actions matcht Keyword', () => {
  const r = Lambda.__matchActions('jveg');
  assert.ok(r.some(a => a.id === 'honorar-rechner'));
});

test('A3: Quick-Actions matcht Cookie/DSGVO', () => {
  const r = Lambda.__matchActions('cookie');
  assert.ok(r.some(a => a.id === 'cookie-settings'));
});

test('A3: Quick-Actions leer bei Query < 2 Zeichen', () => {
  assert.strictEqual(Lambda.__matchActions('').length, 0);
  assert.strictEqual(Lambda.__matchActions('a').length, 0);
});

test('A3: Lambda Volltext-Search über 3 Tabellen (auftraege, kontakte, dokumente)', () => {
  ['auftraege', 'kontakte', 'gutachten', 'bescheinigung'].forEach(t => {
    assert.ok(lambdaSrc.includes(t), 'Lambda fehlt Tabelle: ' + t);
  });
});

test('A3: Lambda hat requireAuth + Rate-Limit', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit/);
});

test('A3: Aktionen-Response-Field in Lambda-Output', () => {
  assert.match(lambdaSrc, /aktionen:\s*matchActions/);
});
