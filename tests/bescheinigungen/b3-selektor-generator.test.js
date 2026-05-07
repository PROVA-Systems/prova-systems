'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/bescheinigung-generate');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'bescheinigung-generate.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'bescheinigung-erstellen.html'), 'utf8');

test('B3: TEMPLATE_MAP 8 Bescheinigungs-Typen', () => {
  const keys = Object.keys(Lambda.__TEMPLATE_MAP);
  assert.ok(keys.length >= 8);
  ['sv_bestaetigung', 'maengelfreiheit', 'zustand', 'beweissicherung', 'sv_anerkennung']
    .forEach(t => assert.ok(t in Lambda.__TEMPLATE_MAP));
});

test('B3: VALID_TYPEN deckt alle 8 Arten', () => {
  assert.strictEqual(Lambda.__VALID_TYPEN.length, Object.keys(Lambda.__TEMPLATE_MAP).length);
});

test('B3: Lambda requireAuth + Rate-Limit', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit\.check/);
});

test('B3: Lambda mappt typ → existing Template-Name', () => {
  assert.strictEqual(Lambda.__TEMPLATE_MAP.maengelfreiheit.name, 'B-04-MAENGELFREIHEIT');
  assert.strictEqual(Lambda.__TEMPLATE_MAP.zustand.name, 'B-05-ZUSTANDSBESCHEINIGUNG');
  assert.strictEqual(Lambda.__TEMPLATE_MAP.beweissicherung.name, 'B-06-BEWEISSICHERUNGSBESTAETIGUNG');
});

test('B3: Lambda dokumente-Insert mit pdfmonkey_template_id', () => {
  assert.match(lambdaSrc, /pdfmonkey_template_id/);
  assert.match(lambdaSrc, /from\(['"]dokumente['"]\)\.insert/);
});

test('B3: Lambda audit_trail-Insert action=pdf_generate', () => {
  assert.match(lambdaSrc, /action:\s*['"]pdf_generate['"]/);
  assert.match(lambdaSrc, /entity_typ:\s*['"]bescheinigung['"]/);
});

test('B3: HTML bescheinigung-erstellen Selector-Grid', () => {
  assert.match(html, /id="bescheinigungs-grid"/);
  assert.match(html, /data-typ="/);
});

test('B3: HTML 8 Bescheinigungs-Typen im TYPEN-Array', () => {
  const m = html.match(/typ:\s*['"]([^'"]+)['"]/g);
  assert.ok((m || []).length >= 8);
});
