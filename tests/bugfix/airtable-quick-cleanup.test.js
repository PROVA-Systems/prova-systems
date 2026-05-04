/**
 * PROVA — Airtable-Quick-Cleanup Tests (MEGA¹⁹ W79)
 *
 * Pre-Post-Pattern: Beweist dass die laute Console-Errors weg sind
 * waehrend Backwards-Compat zu nicht-410-Errors gegeben ist.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HONORAR = fs.readFileSync(path.join(ROOT, 'honorar-tracker.js'), 'utf8');
const FETCH = fs.readFileSync(path.join(ROOT, 'prova-fetch-auth.js'), 'utf8');

describe('honorar-tracker.js — Silent 410-Fallback', () => {
  test('Status 410 wird gesondert behandelt (silent cache return)', () => {
    assert.match(HONORAR, /resp\.status === 410/);
    assert.match(HONORAR, /Silent-Fallback zu Cache/);
  });

  test('Catch-Block: HTTP 410 wird NICHT mehr geloggt', () => {
    assert.match(HONORAR, /\/HTTP 410\|airtable-disabled\//);
    assert.match(HONORAR, /erwarteter Disable-Zustand/);
  });

  test('Andere Errors (kein 410) weiterhin geloggt', () => {
    // Verifizieren dass console.warn(.) noch im Catch ist mit Bedingung
    assert.match(HONORAR, /console\.warn\(['"]\[HonorarTracker\] Airtable Fehler:['"]/);
    assert.match(HONORAR, /if \(!\/HTTP 410\|airtable-disabled/);
  });

  test('Cache-Fallback returnt cached bei 410', () => {
    // Test: bei 410 wird cached returnt (vor throw, vor data-parse)
    assert.match(HONORAR, /if \(resp\.status === 410\) \{[\s\S]{0,80}return cached/);
  });
});

describe('prova-fetch-auth.js — debug statt info', () => {
  test('console.info ersetzt durch console.debug', () => {
    assert.match(FETCH, /console\.debug\(['"]\[airtable-cleanup\] blocked legacy call/);
  });

  test('Kommentar erklaert DevTools-Filter-Logik', () => {
    assert.match(FETCH, /DevTools-Default-Filter/);
    assert.match(FETCH, /DEBUG nicht/);
  });

  test('Kein console.info mehr fuer airtable-cleanup', () => {
    // Suche nach console.info BEFORE airtable-cleanup → sollte 0 sein
    const idx = FETCH.indexOf("[airtable-cleanup] blocked legacy");
    assert.ok(idx > 0);
    const before = FETCH.substring(Math.max(0, idx - 200), idx);
    assert.doesNotMatch(before, /console\.info\(['"]\[airtable-cleanup\]/);
  });
});

describe('Audit-Doc — Documented Top 5 Functions', () => {
  test('Doc-File existiert', () => {
    const docPath = path.join(ROOT, 'docs', 'ops', 'airtable-quick-cleanup-2026-05-08.md');
    assert.ok(fs.existsSync(docPath));
  });

  test('Doc enthaelt Top 5 Functions + Strategy', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'ops', 'airtable-quick-cleanup-2026-05-08.md'), 'utf8');
    assert.match(doc, /honorar-tracker\.js/);
    assert.match(doc, /prova-fetch-auth\.js/);
    assert.match(doc, /MEGA²¹/);  // Voll-Migration-Verweis
    assert.match(doc, /KEINE komplette\s+Airtable-Migration/);
  });
});
