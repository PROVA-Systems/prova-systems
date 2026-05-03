#!/usr/bin/env node
/**
 * PROVA — Pilot-Readiness-Check
 * MEGA⁶ S4 (04.05.2026)
 *
 * 18 automatische Checks vor erstem Pilot-SV-Onboarding.
 *
 * USAGE:
 *   PROVA_BASE_URL=https://app.prova-systems.de node scripts/pilot-readiness-check.js
 *   PROVA_BASE_URL=http://localhost:8888 node scripts/pilot-readiness-check.js
 *
 * Exit-Code 0 = alles GO, > 0 = Anzahl Failures.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PROVA_BASE_URL || 'http://localhost:8888';
const TIMEOUT_MS = 8000;

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }

// ───────────────────────────────────────────────────────────────
// CHECK 1-5: Repo-Health
// ───────────────────────────────────────────────────────────────

check('Repo: package.json existiert + npm-scripts ok', async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!pkg.scripts) throw new Error('keine scripts in package.json');
  const must = ['test:stripe', 'test:schemas', 'verify-stripe'];
  for (const s of must) {
    if (!pkg.scripts[s]) throw new Error('npm-script "' + s + '" fehlt');
  }
});

check('Repo: sw.js CACHE_VERSION definiert', async () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  if (!sw.match(/CACHE_VERSION\s*=\s*['"]prova-v\d+/)) {
    throw new Error('CACHE_VERSION-Pattern fehlt in sw.js');
  }
});

check('Repo: alle Liquid-Goldstandards (6 Templates) vorhanden', async () => {
  const required = [
    'docs/templates-goldstandard/04-gutachten/F-04-KURZSTELLUNGNAHME.template.html',
    'docs/templates-goldstandard/04-gutachten/F-09-KURZGUTACHTEN.liquid.template.html',
    'docs/templates-goldstandard/04-gutachten/F-15-GERICHTSGUTACHTEN.liquid.template.html',
    'docs/templates-goldstandard/04-gutachten/F-19-WERTGUTACHTEN.template.html',
    'docs/templates-goldstandard/05-sonstige/F-20-BERATUNGSPROTOKOLL.liquid.template.html',
    'docs/templates-goldstandard/05-sonstige/F-21-BAUBEGLEITUNG-PROTOKOLL.liquid.template.html',
    'docs/templates-goldstandard/05-sonstige/F-22-BAUABNAHME.liquid.template.html'
  ];
  for (const f of required) {
    if (!fs.existsSync(f)) throw new Error('Template fehlt: ' + f);
  }
});

check('Repo: Liquid-Templates frei von Bug-Pattern (and .size > 0)', async () => {
  const dir = 'docs/templates-goldstandard';
  function walk(d) {
    const out = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.html')) out.push(p);
    }
    return out;
  }
  const files = walk(dir);
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    if (txt.match(/and\s+\w+(\.\w+)?\.size\s*>\s*0/)) {
      throw new Error('Bug-Pattern in ' + f);
    }
  }
});

check('Repo: docs/compliance/ vorhanden mit DSGVO-Audit-Pflicht-Files', async () => {
  const required = [
    'docs/compliance/DSGVO-AUDIT-CHECKLIST.md',
    'docs/compliance/VERARBEITUNGSVERZEICHNIS.md',
    'docs/compliance/DSFA-PROVA.md',
    'docs/compliance/AVV-LISTE.md'
  ];
  for (const f of required) {
    if (!fs.existsSync(f)) throw new Error('Compliance-Doku fehlt: ' + f);
  }
});

// ───────────────────────────────────────────────────────────────
// CHECK 6-9: Pilot-Doku
// ───────────────────────────────────────────────────────────────

check('Pilot: PILOT-LAUNCH-CHECKLIST.md vorhanden', async () => {
  if (!fs.existsSync('docs/strategie/PILOT-LAUNCH-CHECKLIST.md')) {
    throw new Error('Checklist fehlt');
  }
});

check('Pilot: PILOT-LAUNCH-BRIEFING.md vorhanden', async () => {
  if (!fs.existsSync('docs/strategie/PILOT-LAUNCH-BRIEFING.md')) {
    throw new Error('Briefing fehlt');
  }
});

check('Pilot: PILOT-EINLADUNG-WORKFLOW.md vorhanden', async () => {
  if (!fs.existsSync('docs/strategie/PILOT-EINLADUNG-WORKFLOW.md')) {
    throw new Error('Einladungs-Workflow fehlt');
  }
});

check('Pilot: ONBOARDING-FINAL + FAQ vorhanden', async () => {
  const need = [
    'docs/strategie/PILOT-ONBOARDING-FINAL.md',
    'docs/strategie/PILOT-FAQ.md'
  ];
  for (const f of need) {
    if (!fs.existsSync(f)) throw new Error('Pilot-Doku fehlt: ' + f);
  }
});

// ───────────────────────────────────────────────────────────────
// CHECK 10-14: Endpoint-Smoke (HTTP)
// ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

check('Endpoint: GET / erreicht (HTML Landing)', async () => {
  const r = await fetchWithTimeout(BASE_URL + '/', {});
  if (!r.ok) throw new Error('Status ' + r.status);
});

check('Endpoint: GET /pilot.html erreicht', async () => {
  const r = await fetchWithTimeout(BASE_URL + '/pilot.html', {});
  if (!r.ok) throw new Error('Status ' + r.status);
});

check('Endpoint: /.netlify/functions/health (200 oder 503 nur bei broken)', async () => {
  const r = await fetchWithTimeout(BASE_URL + '/.netlify/functions/health', {});
  // Akzeptiere 200 + 401 (wenn Auth-protected) — nicht 5xx
  if (r.status >= 500) throw new Error('Status ' + r.status);
});

check('Endpoint: /.netlify/functions/pilot-seats (Live-Counter, 200)', async () => {
  const r = await fetchWithTimeout(BASE_URL + '/.netlify/functions/pilot-seats', {});
  if (!r.ok) throw new Error('Status ' + r.status);
  const j = await r.json();
  if (typeof j.taken !== 'number') throw new Error('Response-Format fehlt taken-Feld');
});

check('Endpoint: /.netlify/functions/sentry-test ohne Secret = 401', async () => {
  const r = await fetchWithTimeout(BASE_URL + '/.netlify/functions/sentry-test', {});
  if (r.status !== 401) throw new Error('Erwartet 401 (no secret), got ' + r.status);
});

// ───────────────────────────────────────────────────────────────
// CHECK 15-18: Tests + Tools
// ───────────────────────────────────────────────────────────────

check('Tests: tests/schemas/ + tests/stripe/ + tests/auth/ existieren', async () => {
  const need = ['tests/schemas', 'tests/stripe', 'tests/auth'];
  for (const d of need) {
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
      throw new Error('Test-Folder fehlt: ' + d);
    }
  }
});

check('Tests: tests/dsgvo/ existiert (MEGA⁶ S2)', async () => {
  if (!fs.existsSync('tests/dsgvo')) {
    throw new Error('DSGVO-Tests-Folder fehlt');
  }
});

check('Storage-Router: lib/storage-router.js + Schema-Mapping-Doku', async () => {
  const need = [
    'netlify/functions/lib/storage-router.js',
    'docs/diagnose/AIRTABLE-DRIFT-SCHEMA-MAPPING.md'
  ];
  for (const f of need) {
    if (!fs.existsSync(f)) throw new Error('Storage-Router-File fehlt: ' + f);
  }
});

check('Admin-Cockpit: alle 12 Backend-Endpoints + admin/voll.html', async () => {
  const need = [
    'admin/voll.html',
    'netlify/functions/admin-pilot-list.js',
    'netlify/functions/admin-stripe-kpis.js',
    'netlify/functions/admin-sentry-errors.js',
    'netlify/functions/admin-audit-trail.js',
    'netlify/functions/admin-impersonate.js',
    'netlify/functions/admin-send-email.js',
    'netlify/functions/admin-force-logout.js',
    'netlify/functions/admin-live-sessions.js',
    'netlify/functions/admin-ki-costs.js',
    'netlify/functions/admin-system-health.js',
    'netlify/functions/admin-time-tracking.js',
    'netlify/functions/admin-feature-heatmap.js',
    'netlify/functions/admin-funnel.js',
    'netlify/functions/admin-churn.js',
    'netlify/functions/admin-pdf-queue.js',
    'netlify/functions/admin-push-alerts.js'
  ];
  for (const f of need) {
    if (!fs.existsSync(f)) throw new Error('Cockpit-File fehlt: ' + f);
  }
});

// ───────────────────────────────────────────────────────────────
// RUN
// ───────────────────────────────────────────────────────────────

(async () => {
  console.log('🚦 PROVA Pilot-Readiness-Check');
  console.log('   Base-URL: ' + BASE_URL);
  console.log('   Total Checks: ' + checks.length);
  console.log('');

  let pass = 0, fail = 0;
  const results = [];

  for (const c of checks) {
    process.stdout.write('  ' + c.name + ' ... ');
    const t0 = Date.now();
    try {
      await c.fn();
      const ms = Date.now() - t0;
      console.log('✅ (' + ms + 'ms)');
      pass++;
      results.push({ name: c.name, ok: true, ms });
    } catch (e) {
      const ms = Date.now() - t0;
      console.log('❌ ' + e.message);
      fail++;
      results.push({ name: c.name, ok: false, ms, error: e.message });
    }
  }

  console.log('');
  console.log('── Summary ──');
  console.log('Passed: ' + pass + '/' + checks.length);
  console.log('Failed: ' + fail);

  if (fail === 0) {
    console.log('');
    console.log('🟢 GO — Pilot-Readiness bestaetigt.');
  } else {
    console.log('');
    console.log('🔴 NO-GO — ' + fail + ' Check(s) fehlgeschlagen.');
  }

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    total: checks.length,
    pass: pass,
    fail: fail,
    go_no_go: fail === 0 ? 'GO' : 'NO-GO',
    results: results
  };
  const reportPath = 'docs/sprint-status/PILOT-READINESS-CHECK-' +
    new Date().toISOString().slice(0, 10) + '.json';
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('   Report: ' + reportPath);
  } catch (e) {
    console.warn('   Report-Write fehlgeschlagen: ' + e.message);
  }

  process.exit(fail);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
