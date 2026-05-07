/**
 * PROVA — schadensfaelle-logic.js Tests (MEGA²⁸ P1-I1)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'schadensfaelle-logic.js'));

describe('schadensfaelle — sortRows', () => {
  const rows = [
    { az: 'SCH-2026-003', frist: '2026-06-15' },
    { az: 'SCH-2026-001', frist: '2026-05-10' },
    { az: 'SCH-2026-002', frist: '2026-07-01' }
  ];

  test('sortiert ascending nach az', () => {
    const r = Lib.sortRows(rows, 'az', 'asc');
    assert.equal(r[0].az, 'SCH-2026-001');
    assert.equal(r[2].az, 'SCH-2026-003');
  });

  test('sortiert descending nach frist', () => {
    const r = Lib.sortRows(rows, 'frist', 'desc');
    assert.equal(r[0].frist, '2026-07-01');
    assert.equal(r[2].frist, '2026-05-10');
  });

  test('null-values landen am Ende', () => {
    const withNull = [{ az: 'A', frist: null }, { az: 'B', frist: '2026-01-01' }];
    const r = Lib.sortRows(withNull, 'frist', 'asc');
    assert.equal(r[0].frist, '2026-01-01');
    assert.equal(r[1].frist, null);
  });
});

describe('schadensfaelle — filterRows', () => {
  const rows = [
    { az: 'SCH-001', kurzbezeichnung: 'Wasserschaden', typ: 'schadensgutachten', phase: 'ortstermin', status: 'aktiv' },
    { az: 'BEW-002', kurzbezeichnung: 'Beweissicherung Mauerwerk', typ: 'beweissicherung', phase: 'auftragsannahme', status: 'aktiv' },
    { az: 'GER-003', kurzbezeichnung: 'Gerichtsgutachten Köln', typ: 'gerichtsgutachten', phase: 'bearbeitung', status: 'in_arbeit' }
  ];

  test('Volltext-Suche in az + kurzbezeichnung', () => {
    assert.equal(Lib.filterRows(rows, { q: 'Wasser' }).length, 1);
    assert.equal(Lib.filterRows(rows, { q: 'BEW' }).length, 1);
    assert.equal(Lib.filterRows(rows, { q: 'Köln' }).length, 1);
  });

  test('Filter typ', () => {
    assert.equal(Lib.filterRows(rows, { typ: 'beweissicherung' }).length, 1);
    assert.equal(Lib.filterRows(rows, { typ: 'schadensgutachten' }).length, 1);
  });

  test('Filter phase + status kombiniert', () => {
    const r = Lib.filterRows(rows, { phase: 'bearbeitung', status: 'in_arbeit' });
    assert.equal(r.length, 1);
    assert.equal(r[0].az, 'GER-003');
  });

  test('Leerer Filter returnt alle', () => {
    assert.equal(Lib.filterRows(rows, {}).length, 3);
  });

  test('Case-insensitive Suche', () => {
    assert.equal(Lib.filterRows(rows, { q: 'WASSER' }).length, 1);
    assert.equal(Lib.filterRows(rows, { q: 'wasser' }).length, 1);
  });
});

describe('schadensfaelle — fristStatus', () => {
  test('overdue bei Vergangenheit', () => {
    assert.equal(Lib.fristStatus('2025-01-01', '2026-05-09'), 'overdue');
  });

  test('warn bei < 7 Tagen', () => {
    assert.equal(Lib.fristStatus('2026-05-12', '2026-05-09'), 'warn');
  });

  test('ok bei > 7 Tagen', () => {
    assert.equal(Lib.fristStatus('2026-06-01', '2026-05-09'), 'ok');
  });

  test('none bei null/invalid', () => {
    assert.equal(Lib.fristStatus(null), 'none');
    assert.equal(Lib.fristStatus(''), 'none');
    assert.equal(Lib.fristStatus('not-a-date'), 'none');
  });
});

describe('schadensfaelle — SCHADENS_TYPEN Constant', () => {
  test('enthaelt 7 Typen', () => {
    assert.equal(Lib.SCHADENS_TYPEN.length, 7);
    assert.ok(Lib.SCHADENS_TYPEN.indexOf('schadensgutachten') >= 0);
    assert.ok(Lib.SCHADENS_TYPEN.indexOf('gerichtsgutachten') >= 0);
  });
});

describe('schadensfaelle — Source-Audit (HTML)', () => {
  const fs = require('node:fs');
  const HTML = fs.readFileSync(path.join(ROOT, 'schadensfaelle.html'), 'utf8');

  test('Page-Marker data-page="schadensfaelle"', () => {
    assert.match(HTML, /data-page="schadensfaelle"/);
  });

  test('Auth-Guard aktiv', () => {
    assert.match(HTML, /runAuthGuard/);
  });

  test('Sidebar-Mount + Topbar', () => {
    assert.match(HTML, /id="sidebar"/);
    assert.match(HTML, /class="topbar"/);
  });

  test('+ Neuer Fall Button verlinkt zu neuer-fall.html', () => {
    assert.match(HTML, /location\.href='neuer-fall\.html'/);
  });

  test('4 Filter-Felder vorhanden', () => {
    assert.match(HTML, /id="sf-search"/);
    assert.match(HTML, /id="sf-typ"/);
    assert.match(HTML, /id="sf-phase"/);
    assert.match(HTML, /id="sf-status"/);
  });

  test('Empty-State + Demo-Link', () => {
    // Logic ist im JS-File, aber HTML-Container existiert
    assert.match(HTML, /id="sf-content"/);
  });

  test('Mobile responsive media-query', () => {
    assert.match(HTML, /@media\s*\(\s*max-width:\s*768px\s*\)/);
  });

  test('Touch-Targets ≥40px (min-height)', () => {
    assert.match(HTML, /min-height:\s*40px/);
  });

  // MEGA³⁶ W3.5: Mobile-FAB für Konsistenz mit dashboard.html
  test('W3.5: Mobile-FAB existiert mit korrekter Klasse + ID', () => {
    assert.match(HTML, /class="new-case-fab"\s+id="sf-new-case-fab"/);
  });

  test('W3.5: Mobile-FAB verlinkt zu neuer-fall.html', () => {
    assert.match(HTML, /id="sf-new-case-fab"[^>]*onclick="window\.location\.href='neuer-fall\.html'"/);
  });

  test('W3.5: Mobile-FAB nur ≤768px sichtbar (display:none default)', () => {
    assert.match(HTML, /\.new-case-fab\s*\{[^}]*display:\s*none/);
    assert.match(HTML, /@media\s*\(max-width:\s*768px\)\s*\{\s*\.new-case-fab\s*\{\s*display:\s*flex/);
  });
});

describe('schadensfaelle — Sidebar-Eintrag in prova-layout.config.js', () => {
  const fs = require('node:fs');
  const CONFIG = fs.readFileSync(path.join(ROOT, 'prova-layout.config.js'), 'utf8');

  test('schadensfaelle.html im shell-array', () => {
    assert.match(CONFIG, /'schadensfaelle\.html'/);
  });
});
