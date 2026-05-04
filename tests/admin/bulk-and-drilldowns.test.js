/**
 * PROVA — W21 Bulk-Operations + 2 weitere KPI-Drilldowns Tests
 * MEGA¹³ W21 (2026-05-05)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('Admin-Bulk Library', () => {
  const src = read('lib/admin-bulk.js');

  test('window.ProvaBulk exposed', () => {
    assert.match(src, /window\.ProvaBulk\s*=/);
  });

  test('Public API: attach + detach', () => {
    assert.ok(src.includes('attach: attach'));
    assert.ok(src.includes('detach: detach'));
  });

  test('MutationObserver fuer dynamic-added Rows', () => {
    assert.match(src, /new MutationObserver/);
    assert.match(src, /observe\(containerEl/);
    assert.match(src, /detach[\s\S]*observer\.disconnect/);
  });

  test('WeakMap fuer State (Memory-Leak-Defense)', () => {
    assert.match(src, /new WeakMap\(\)/);
  });

  test('Confirm-Dialog mit Undo-Timer (10s)', () => {
    assert.match(src, /10000/);
    assert.match(src, /clearTimeout\(timer\)/);
    assert.match(src, /Rueckgaengig/);
  });

  test('Bulk-Bar mit aria-live polite', () => {
    assert.match(src, /setAttribute\(['"]aria-live['"], ['"]polite['"]\)/);
  });

  test('aria-label auf Checkboxes', () => {
    assert.match(src, /setAttribute\(['"]aria-label['"], ['"]Auswahl: ['"] \+/);
  });

  test('Checkbox stopPropagation (kein Row-Click-Trigger)', () => {
    assert.match(src, /e\.stopPropagation\(\)/);
  });

  test('Action-Buttons mit aria-label', () => {
    assert.match(src, /btn\.setAttribute\(['"]aria-label['"], action\.label\)/);
  });

  test('Danger-Action-Button hat eigene CSS-Class', () => {
    assert.match(src, /prova-bulk-action-btn--danger/);
  });

  test('XSS-Defense via _esc bei action-Label/Icon', () => {
    assert.match(src, /_esc\(action\.icon\)/);
    assert.match(src, /_esc\(action\.label\)/);
  });

  test('Touch-Target ≥ 32px (Action-Btn min-height)', () => {
    // Pattern: prova-bulk-action-btn class definiert mit min-height
    assert.match(src, /min-height:\s*32px/);
    assert.match(src, /\.prova-bulk-action-btn\s*\{/);
  });

  test('prefers-reduced-motion respektiert (Animation off)', () => {
    assert.match(src, /prefers-reduced-motion/);
  });

  test('Undo-Toast role=alert (Accessibility)', () => {
    assert.match(src, /setAttribute\(['"]role['"], ['"]alert['"]\)/);
  });

  test('Detach entfernt Checkboxes aus Rows', () => {
    assert.match(src, /querySelectorAll\(['"]\.prova-bulk-checkbox['"]\)\.forEach/);
  });
});

describe('admin-dashboard.html — 2 weitere KPI-Drilldowns (W21)', () => {
  const html = read('admin-dashboard.html');

  test('Aktive-Kunden-KPI ist klickbar', () => {
    assert.match(html, /class="kpi green"[\s\S]{0,200}role="button"/);
    assert.match(html, /onclick="oeffneKundenDrilldown/);
  });

  test('Tickets-KPI ist klickbar', () => {
    assert.match(html, /class="kpi warn"[\s\S]{0,200}role="button"/);
    assert.match(html, /onclick="oeffneTicketsDrilldown/);
  });

  test('oeffneKundenDrilldown Function definiert', () => {
    assert.match(html, /window\.oeffneKundenDrilldown\s*=\s*function/);
  });

  test('oeffneTicketsDrilldown Function definiert', () => {
    assert.match(html, /window\.oeffneTicketsDrilldown\s*=\s*function/);
  });

  test('Kunden-Drilldown aggregiert _allSvs by Paket', () => {
    assert.match(html, /_allSvs/);
    assert.match(html, /sv\.fields[\s\S]{0,30}Paket/);
  });

  test('Tickets-Drilldown aggregiert _tickets by Status', () => {
    assert.match(html, /_tickets/);
    assert.match(html, /t\.fields[\s\S]{0,30}Status/);
  });

  test('Keyboard-Support: Enter+Space triggern Drilldown auf beiden KPIs', () => {
    const matches = (html.match(/event\.key==='Enter'\|\|event\.key===' '/g) || []).length;
    assert.ok(matches >= 3, '3 KPIs mit Keyboard-Support erwartet (MRR + Kunden + Tickets), gefunden: ' + matches);
  });

  test('aria-label auf neuen klickbaren KPIs', () => {
    assert.match(html, /aria-label="Aktive Kunden Detail oeffnen"/);
    assert.match(html, /aria-label="Offene Tickets Detail oeffnen"/);
  });

  test('Pipeline-KPI bleibt unverändert (kein Drilldown)', () => {
    // Nur 3 KPIs sollten klickbar sein, Pipeline bleibt ungeklickbar
    const klickbar = (html.match(/class="kpi (blue|green|warn|purple)"[^>]*role="button"/g) || []).length;
    assert.equal(klickbar, 3, '3 KPIs klickbar erwartet');
  });
});
