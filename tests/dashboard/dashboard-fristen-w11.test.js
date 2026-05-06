'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const widgetSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'dashboard-fristen-widget.js'), 'utf8');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'dashboard-fristen-upcoming.js'), 'utf8');
const dashHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'dashboard.html'), 'utf8');

function evalWidget() {
  const fakeWindow = { location: { search: '' }, localStorage: { getItem: () => null } };
  const fakeDoc = { readyState: 'complete', addEventListener: () => {}, querySelectorAll: () => [], head: { appendChild: () => {} }, getElementById: () => null, createElement: () => ({ id: '', textContent: '' }) };
  new Function('window', 'document', widgetSrc)(fakeWindow, fakeDoc);
  return fakeWindow.DashboardFristenWidget;
}

test('Lambda: SELECT auftrag_id + JOIN auftraege(az, schadensart_label)', () => {
  assert.match(lambdaSrc, /eq\(['"]status['"]\s*,\s*['"]offen['"]\)/);
  assert.match(lambdaSrc, /auftraege\(az/);
  assert.match(lambdaSrc, /datum_soll/);
  assert.match(lambdaSrc, /limit\(5\)/);
});

test('Lambda: order ascending + datum_soll >= today', () => {
  assert.match(lambdaSrc, /gte\(['"]datum_soll['"]/);
  assert.match(lambdaSrc, /order.*ascending:\s*true/);
});

test('Widget: colorCode T-3 → critical', () => {
  const cc = evalWidget()._internals.colorCode(2);
  assert.strictEqual(cc.cls, 'dfw-critical');
});

test('Widget: colorCode T-7 → warning', () => {
  const cc = evalWidget()._internals.colorCode(7);
  assert.strictEqual(cc.cls, 'dfw-warning');
});

test('Widget: colorCode T-10 → ok', () => {
  const cc = evalWidget()._internals.colorCode(10);
  assert.strictEqual(cc.cls, 'dfw-ok');
});

test('Widget: empty-state mit Erfolg-Message', () => {
  const html = evalWidget()._internals.buildList([]);
  assert.match(html, /grünen Bereich.*🎉/);
});

test('Widget: Link zu /akte.html?id=...&tab=fristen', () => {
  assert.match(widgetSrc, /\/akte\.html\?id=.*tab=fristen/);
});

test('Widget: Auftrag-AZ + schadensart_label im Render', () => {
  assert.match(widgetSrc, /auftraege\.az/);
  assert.match(widgetSrc, /schadensart_label/);
});

test('Widget: Auto-Refresh 5min', () => {
  assert.match(widgetSrc, /5\s*\*\s*60\s*\*\s*1000/);
  assert.match(widgetSrc, /setInterval/);
});

test('Widget: HTML-Escape gegen XSS', () => {
  const html = evalWidget()._internals.buildList([{
    auftrag_id: 'X', frist_typ: '<script>x</script>', datum_soll: '2026-12-31',
    auftraege: { az: 'AZ-1', schadensart_label: 'wasser' }, status: 'offen'
  }]);
  assert.ok(!html.includes('<script>x</script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('Dashboard: Widget-Hook + Script eingebunden', () => {
  assert.match(dashHtml, /data-dashboard-fristen/);
  assert.match(dashHtml, /dashboard-fristen-widget\.js/);
});
