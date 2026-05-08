'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SF = require('../../schadensfaelle-logic');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'schadensfaelle.html'), 'utf8');
const logicSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'schadensfaelle-logic.js'), 'utf8');

test('A2: schadensfaelle.html hat filter-bar + paginate Klassen', () => {
  assert.match(html, /filter-bar/);
  assert.match(html, /paginate/);
});

test('A2: 11 Auftragstyp-Optionen (alle Flow A/B/C/D + 7 Spezial)', () => {
  ['schadensgutachten','wertgutachten','beratung','baubegleitung',
   'beweissicherung','gegengutachten','ergaenzungsgutachten','gerichtsgutachten',
   'stellungnahme','gutachterliche-stellungnahme'].forEach(t => {
    assert.match(html, new RegExp(`value="${t}"`));
  });
});

test('A2: Datum-Range-Filter (von+bis)', () => {
  assert.match(html, /id="sf-date-from"/);
  assert.match(html, /id="sf-date-to"/);
});

test('A2: Pagination-Bar mit Prev/Next-Buttons', () => {
  assert.match(html, /id="sf-page-prev"/);
  assert.match(html, /id="sf-page-next"/);
  assert.match(html, /id="sf-page-info"/);
});

test('A2: Bulk-Actions-Bar mit 3 Actions', () => {
  assert.match(html, /sf-bulk-bar/);
  assert.match(html, /bulkComplete\(\)/);
  assert.match(html, /exportCSV\(\)/);
  assert.match(html, /bulkClear\(\)/);
});

test('A2: Pure paginate(50 rows, page=2, size=10) = 10 rows', () => {
  const rows = Array.from({length: 50}, (_, i) => ({id: i}));
  const r = SF.paginate(rows, 2, 10);
  assert.strictEqual(r.length, 10);
  assert.strictEqual(r[0].id, 10);
});

test('A2: totalPages(50, 10) = 5; (51, 10) = 6', () => {
  assert.strictEqual(SF.totalPages(50, 10), 5);
  assert.strictEqual(SF.totalPages(51, 10), 6);
  assert.strictEqual(SF.totalPages(0, 10), 1);
});

test('A2: filterByDateRange filtert korrekt', () => {
  const rows = [
    {datum: '2026-01-15'}, {datum: '2026-03-10'}, {datum: '2026-05-01'}
  ];
  const r = SF.filterByDateRange(rows, '2026-02-01', '2026-04-30');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].datum, '2026-03-10');
});

test('A2: exportCSV produziert CSV mit Header + Zeilen', () => {
  const rows = [
    {az: 'TEST-001', auftragstyp: 'schaden', auftraggeber: 'Müller "GmbH"', phase: 'p1', datum: '2026-05-07', status: 'aktiv'}
  ];
  const csv = SF.exportCSV(rows);
  assert.match(csv, /^Aktenzeichen;Auftragstyp/);
  assert.match(csv, /TEST-001/);
  // Quote-Escape für doppelte Anführungszeichen
  assert.match(csv, /Müller ""GmbH""/);
});

test('A2: sortBy-Function in Public-API', () => {
  // shorthand object literal: { sortBy, ... } — match pattern variants
  assert.match(logicSrc, /window\.SF\s*=\s*\{[\s\S]*sortBy[\s\S]*\}/);
  assert.match(logicSrc, /function sortBy\(key\)/);
});

test('A2: SF.page() für Pagination-Navigation', () => {
  assert.match(logicSrc, /page:\s*pageGo/);
  assert.match(logicSrc, /function pageGo\(delta\)/);
});

test('A2: Logic-File hat _state mit page+pageSize+selected', () => {
  assert.match(logicSrc, /_state\s*=\s*\{[^}]*page:/);
  assert.match(logicSrc, /pageSize:\s*50/);
  assert.match(logicSrc, /selected:\s*new Set/);
});
