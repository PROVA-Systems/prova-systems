/**
 * PROVA — MEGA²¹ Admin-Cockpit Extensions Tests (W93+W94+W95)
 * Quick-Links + Auto-Refresh + Login-as-User + Pipeline-Tab
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ADMIN_HTML = fs.readFileSync(path.join(ROOT, 'admin-dashboard.html'), 'utf8');

describe('admin-dashboard.html — 7. Tab Pipeline (Marcel-Decision F1)', () => {
  test('Tab-Button data-tab="pipeline"', () => {
    assert.match(ADMIN_HTML, /<button class="tab-btn" data-tab="pipeline"/);
  });

  test('Tab-Panel id="tab-pipeline" mit display:none initial', () => {
    assert.match(ADMIN_HTML, /id="tab-pipeline"[\s\S]{0,80}style="display:none/);
  });

  test('4 KPIs (Pilot/Founding/Conversion/Wert)', () => {
    ['kpiPipelinePilot', 'kpiPipelineFounding', 'kpiPipelineConversion', 'kpiPipelineWert'].forEach(id => {
      assert.match(ADMIN_HTML, new RegExp('id="' + id + '"'), 'missing kpi: ' + id);
    });
  });

  test('Founding-Sub-Text "von 10 verfuegbar"', () => {
    assert.match(ADMIN_HTML, /von 10 verfuegbar/);
  });

  test('Lazy-Load-Trigger im showTab', () => {
    assert.match(ADMIN_HTML, /name === ['"]pipeline['"][\s\S]{0,40}loadPipeline/);
  });
});

describe('admin-dashboard.html — loadPipeline Function', () => {
  test('GET /netlify/functions/admin-pilot-list', () => {
    assert.match(ADMIN_HTML, /\/\.netlify\/functions\/admin-pilot-list/);
  });

  test('GET /netlify/functions/admin-funnel', () => {
    assert.match(ADMIN_HTML, /\/\.netlify\/functions\/admin-funnel/);
  });

  test('Founding-Member-Counter "10 - foundingCount"', () => {
    assert.match(ADMIN_HTML, /Math\.max\(0,\s*10\s*-\s*foundingCount\)/);
  });

  test('Pilot-Liste rendert email + status', () => {
    assert.match(ADMIN_HTML, /\(p\.email\|\|/);
    assert.match(ADMIN_HTML, /\(p\.status\|\|/);
  });

  test('Conversion-Rate als Prozent gerendert', () => {
    assert.match(ADMIN_HTML, /conversion_rate \* 100/);
  });

  test('Graceful skip bei Fetch-Fehler (try/catch)', () => {
    assert.match(ADMIN_HTML, /\/\* graceful skip \*\//);
  });
});

describe('admin-dashboard.html — Quick-Links (Marcel-Direktive Section 6)', () => {
  test('Quick-Links Card mit 🚀-Header', () => {
    assert.match(ADMIN_HTML, /Quick-Links \(externe Tools\)/);
  });

  test('Stripe Dashboard-Link', () => {
    assert.match(ADMIN_HTML, /href="https:\/\/dashboard\.stripe\.com"/);
  });

  test('Make.com-Link', () => {
    assert.match(ADMIN_HTML, /href="https:\/\/eu1\.make\.com"/);
  });

  test('PDFMonkey-Link', () => {
    assert.match(ADMIN_HTML, /href="https:\/\/app\.pdfmonkey\.io"/);
  });

  test('Supabase-Link mit Project-ID cngteblrbpwsyypexjrv', () => {
    assert.match(ADMIN_HTML, /supabase\.com\/dashboard\/project\/cngteblrbpwsyypexjrv/);
  });

  test('Plausible + UptimeRobot + Netlify + GitHub Links', () => {
    assert.match(ADMIN_HTML, /plausible\.io/);
    assert.match(ADMIN_HTML, /uptimerobot\.com/);
    assert.match(ADMIN_HTML, /app\.netlify\.com/);
    assert.match(ADMIN_HTML, /github\.com\/prova-systems/);
  });

  test('Alle Links mit target="_blank" rel="noopener"', () => {
    const matches = ADMIN_HTML.match(/<a href="https:\/\/[^"]+" target="_blank" rel="noopener"/g) || [];
    assert.ok(matches.length >= 7, 'expected >=7 quick-links: ' + matches.length);
  });
});

describe('admin-dashboard.html — Login-as-User (Marcel-Decision B1 Standard-Audit)', () => {
  test('window.adminImpersonate Function exposed', () => {
    assert.match(ADMIN_HTML, /window\.adminImpersonate\s*=/);
  });

  test('Confirmation-Dialog mit "Audit-Trail" Hinweis', () => {
    assert.match(ADMIN_HTML, /Audit-Trail.*impersonation_log/);
  });

  test('POST /netlify/functions/admin-impersonate', () => {
    assert.match(ADMIN_HTML, /\/\.netlify\/functions\/admin-impersonate/);
    assert.match(ADMIN_HTML, /method:\s*['"]POST['"]/);
  });

  test('redirect_url-Behandlung', () => {
    assert.match(ADMIN_HTML, /data\.redirect_url/);
  });

  test('Fallback: session_token + sessionStorage', () => {
    assert.match(ADMIN_HTML, /data\.session_token/);
    assert.match(ADMIN_HTML, /sessionStorage\.setItem\(['"]prova_impersonate_session['"]/);
  });

  test('Error-Handling mit alert()', () => {
    assert.match(ADMIN_HTML, /Login-as-User fehlgeschlagen/);
  });
});

describe('admin-dashboard.html — Auto-Refresh (Marcel-Decision C2 30s)', () => {
  test('setInterval mit 30000ms', () => {
    assert.match(ADMIN_HTML, /setInterval\([\s\S]{0,800}30000\)/);
  });

  test('Auto-Refresh nur fuer Health-Tab + Overview-Tab', () => {
    assert.match(ADMIN_HTML, /activeName === ['"]health['"][\s\S]{0,60}loadHealth\(\)/);
    assert.match(ADMIN_HTML, /activeName === ['"]overview['"][\s\S]{0,60}loadAll\(\)/);
  });

  test('Auto-Refresh-Comment dokumentiert C2-Decision', () => {
    assert.match(ADMIN_HTML, /Marcel-Decision C2/);
  });
});
