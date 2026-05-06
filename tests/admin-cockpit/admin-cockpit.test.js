/**
 * Tests für admin-cockpit.html (MEGA²⁸ V3.2-W5-I9 KORR-23)
 * Strukturelle Verifikation der 12-Sektionen-Page.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', '..', 'admin-cockpit.html'),
  'utf8'
);

test('admin-cockpit.html: Auth-Guard mit is_admin-Check', () => {
  assert.match(html, /prova_is_admin/);
  assert.match(html, /window\.location\.replace\(['"]\/login/);
});

test('admin-cockpit.html: lädt runAuthGuard via module', () => {
  assert.match(html, /import\s+\{\s*runAuthGuard\s*\}\s+from\s+['"]\/lib\/auth-guard\.js['"]/);
});

test('admin-cockpit.html: hat alle 12 Sektionen', () => {
  // Pro Sektion: <span class="cp-card-num">N</span>
  for (let i = 1; i <= 12; i++) {
    assert.match(html, new RegExp('class="cp-card-num">' + i + '<'),
      'Sektion ' + i + ' fehlt');
  }
});

test('admin-cockpit.html: 10 LIVE + 2 SKELETON Status (W7-I4 erweitert)', () => {
  const live = (html.match(/class="cp-status live"/g) || []).length;
  const skeleton = (html.match(/class="cp-status skeleton"/g) || []).length;
  assert.strictEqual(live, 10, '10 LIVE-Sektionen erwartet (W7-I4 fügt 9+10 hinzu)');
  assert.strictEqual(skeleton, 2, '2 SKELETON verbleiben (7 Support-Inbox, 12 Billing-Sync)');
});

test('W7-I4: loadGutachtenTiming + loadConversion Live-Fetch', () => {
  assert.match(html, /async function loadGutachtenTiming/);
  assert.match(html, /async function loadConversion/);
  assert.match(html, /admin-time-tracking\?range=30d/);
  assert.match(html, /admin-funnel\?range=30d/);
});

test('W6P2-I4: loadAuditTrail / loadPushAlerts / loadChurn Live-Fetch', () => {
  assert.match(html, /async function loadAuditTrail/);
  assert.match(html, /async function loadPushAlerts/);
  assert.match(html, /async function loadChurn/);
  assert.match(html, /admin-audit-trail\?limit=5/);
  assert.match(html, /admin-push-alerts\?limit=5/);
  assert.match(html, /admin-churn\?range=30d/);
});

test('admin-cockpit.html: Section-Titles korrekt', () => {
  const titles = [
    'KPIs Live', 'User-Management', 'Usage-Analytics', 'System-Health',
    'Audit-Trail', 'KI-Token-Cost', 'Support-Inbox', 'Push-Alerts-Stream',
    'Gutachten-Timing', 'Trial→Paid Conversion', 'Churn-Reasons', 'Billing-Sync'
  ];
  titles.forEach(t => {
    assert.ok(html.includes(t), 'Title fehlt: ' + t);
  });
});

test('admin-cockpit.html: SUPER-ADMIN Badge', () => {
  assert.match(html, /SUPER-ADMIN/);
});

test('admin-cockpit.html: linkt zu existierenden admin-Lambdas', () => {
  ['admin-stripe-kpis', 'admin-pilot-list', 'admin-feature-heatmap',
   'admin-system-health', 'admin-audit-trail', 'admin-ki-costs'].forEach(fn => {
    assert.match(html, new RegExp(fn), 'Lambda-Link fehlt: ' + fn);
  });
});

test('admin-cockpit.html: Mobile-responsive (@media)', () => {
  assert.match(html, /@media\(max-width:600px\)/);
});

test('admin-cockpit.html: cp-grid Layout mit auto-fill', () => {
  assert.match(html, /grid-template-columns:repeat\(auto-fill/);
});

test('admin-cockpit.html: Hinweis-Box für Welle 6 + 2FA', () => {
  assert.match(html, /Welle 6/);
  assert.match(html, /2FA/);
});

test('admin-cockpit.html: title + lang Attribut', () => {
  assert.match(html, /<title>[^<]*Admin-Cockpit/);
  assert.match(html, /<html\s+lang="de"/);
});

test('W6-I4: loadKPIs() Live-Fetch-Function für Sektion 1', () => {
  assert.match(html, /async function loadKPIs/);
  assert.match(html, /admin-stripe-kpis/);
  assert.match(html, /MRR/);
  assert.match(html, /Trial/);
  assert.match(html, /Founding/);
});

test('W6-I4: loadKICosts() Live-Fetch-Function für Sektion 6', () => {
  assert.match(html, /async function loadKICosts/);
  assert.match(html, /admin-ki-costs/);
  assert.match(html, /total_eur/);
  assert.match(html, /total_calls/);
});

test('W6-I4: Auto-Load bei DOMContentLoaded', () => {
  assert.match(html, /DOMContentLoaded/);
  assert.match(html, /loadKPIs\(\)/);
  assert.match(html, /loadKICosts\(\)/);
});

test('W6-I4: escHtml + fmtEUR + fmtCount Helpers', () => {
  assert.match(html, /function escHtml/);
  assert.match(html, /function fmtEUR/);
  assert.match(html, /function fmtCount/);
  assert.match(html, /Intl\.NumberFormat\(['"]de-DE['"]/);
});

test('W6-I4: Aktualisieren-Button + Raw JSON-Link pro Live-Sektion', () => {
  assert.match(html, /onclick="loadKPIs\(\)"/);
  assert.match(html, /onclick="loadKICosts\(\)"/);
  assert.match(html, /Raw JSON/);
});
