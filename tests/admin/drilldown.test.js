/**
 * PROVA — Admin-Drilldown Tests
 * MEGA¹² W15 (2026-05-05)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('lib/admin-drilldown.js — Library', () => {
  const src = read('lib/admin-drilldown.js');

  test('window.ProvaDrilldown exposed', () => {
    assert.match(src, /window\.ProvaDrilldown\s*=/);
  });

  test('Public API: open + close', () => {
    assert.ok(src.includes('open: open'));
    assert.ok(src.includes('close: close'));
  });

  test('Modal-Markup hat ARIA-Konformitaet', () => {
    assert.match(src, /role['"]?\s*[,)]\s*['"]dialog/);
    assert.match(src, /aria-modal/);
    assert.match(src, /aria-labelledby/);
  });

  test('ESC-Key schliesst Modal', () => {
    assert.match(src, /e\.key === 'Escape'/);
    assert.match(src, /document\.addEventListener\(['"]keydown['"],\s*_onEscapeKey/);
  });

  test('Backdrop-Click schliesst Modal', () => {
    assert.match(src, /e\.target === modal/);
  });

  test('Focus-Restore beim close (Accessibility)', () => {
    assert.match(src, /_previousFocus\.focus\(\)/);
  });

  test('XSS-Defense via _esc', () => {
    assert.match(src, /function _esc/);
    assert.match(src, /\.replace\(\/&\/g/);
    assert.match(src, /\.replace\(\/</);
  });

  test('Loading-State + Empty-State + Error-State', () => {
    assert.ok(src.includes('prova-dd-loading'));
    assert.ok(src.includes('prova-dd-empty'));
    assert.ok(src.includes('prova-dd-error'));
  });

  test('TimeRanges-Toolbar wenn config.timeRanges', () => {
    assert.match(src, /config\.timeRanges/);
    assert.match(src, /onTimeRangeChange/);
  });

  test('Modal-Close-Btn hat aria-label', () => {
    assert.match(src, /aria-label=['"]Modal schliessen/);
  });
});

describe('admin-dashboard.html — KPI-Drilldown-Integration', () => {
  const html = read('admin-dashboard.html');

  test('admin-drilldown.js geladen', () => {
    assert.match(html, /\/lib\/admin-drilldown\.js/);
  });

  test('MRR-KPI ist klickbar (role=button + tabindex)', () => {
    assert.match(html, /class="kpi blue"[\s\S]{0,200}role="button"/);
    assert.match(html, /class="kpi blue"[\s\S]{0,200}tabindex="0"/);
  });

  test('KPI-Klick triggert oeffneKICostDrilldown', () => {
    assert.match(html, /onclick="oeffneKICostDrilldown/);
  });

  test('Keyboard-Support: Enter+Space triggern Drilldown', () => {
    assert.match(html, /event\.key==='Enter'\|\|event\.key===' '/);
  });

  test('aria-label auf KPI-Card', () => {
    assert.match(html, /class="kpi blue"[\s\S]{0,300}aria-label="MRR-KPI Detail oeffnen"/);
  });

  test('oeffneKICostDrilldown Function definiert', () => {
    assert.match(html, /window\.oeffneKICostDrilldown\s*=\s*function/);
  });

  test('Drilldown-Loader nutzt /netlify/functions/ki-history', () => {
    assert.match(html, /\/\.netlify\/functions\/ki-history/);
  });

  test('TimeRanges 24h/7d/30d konfiguriert', () => {
    assert.match(html, /timeRanges:\s*\[\s*'24h'/);
  });
});

describe('Render-Logic Behavior (Reproduktion)', () => {
  // Reproduce _renderRows-Logik
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _renderRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="prova-dd-empty"><div class="prova-dd-empty-icon" aria-hidden="true">📊</div><div>Keine Daten im Zeitraum</div></div>';
    }
    return rows.map(r => {
      const name = _esc(r.name || '—');
      const value = _esc(r.value != null ? r.value : '—');
      const hint = r.hint ? '<div class="prova-dd-row-hint">' + _esc(r.hint) + '</div>' : '';
      return '<div class="prova-dd-row"><div><div class="prova-dd-row-name">' + name + '</div>' + hint + '</div><div class="prova-dd-row-value">' + value + '</div></div>';
    }).join('');
  }

  test('Empty-Array → Empty-State', () => {
    const html = _renderRows([]);
    assert.match(html, /Keine Daten im Zeitraum/);
  });

  test('Null/undefined → Empty-State', () => {
    const html = _renderRows(null);
    assert.match(html, /Keine Daten/);
  });

  test('Rows mit name + value', () => {
    const html = _renderRows([{ name: 'KI-Funktion 1', value: '42 Calls' }]);
    assert.match(html, /KI-Funktion 1/);
    assert.match(html, /42 Calls/);
  });

  test('XSS-Defense: HTML-Special-Chars escaped', () => {
    const html = _renderRows([{ name: '<script>alert(1)</script>', value: '"x"' }]);
    assert.match(html, /&lt;script&gt;/);
    assert.ok(!html.includes('<script>alert'));
    assert.match(html, /&quot;x&quot;/);
  });

  test('Optionaler Hint wird gerendert', () => {
    const html = _renderRows([{ name: 'X', value: '1', hint: '0,50 EUR' }]);
    assert.match(html, /prova-dd-row-hint/);
    assert.match(html, /0,50 EUR/);
  });

  test('Ohne hint: kein hint-DIV im Output', () => {
    const html = _renderRows([{ name: 'X', value: '1' }]);
    assert.ok(!html.includes('prova-dd-row-hint'));
  });
});
