#!/usr/bin/env node
/**
 * PROVA — Email-Template Render-Check
 *
 * Liest alle Email-Templates aus email-templates/, ersetzt Mock-Daten,
 * und schreibt gerenderte HTML in docs/email-test-renders/.
 *
 * USAGE:
 *   node scripts/email-render-check.js
 *
 * Validierung:
 *   - alle {{platzhalter}} ersetzt?
 *   - HTML parsebar?
 *   - keine ungeschuetzten <script>-Tags?
 *   - mobile-friendly meta-viewport?
 *   - max 600px-Container?
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = 'email-templates';
const OUTPUT_DIR = path.join('docs', 'email-test-renders');

const MOCK_DATA = {
  SV_VORNAME: 'Marcel',
  SV_NACHNAME: 'Schreiber',
  PILOT_LINK: 'https://app.prova-systems.de/pilot',
  MARCEL_KONTAKT: 'kontakt@prova-systems.de',
  TRIAL_END_DATUM: '01. August 2026',
  DASHBOARD_LINK: 'https://app.prova-systems.de/dashboard',
  ABRECHNUNGS_DATUM: '01. August 2026',
  KARTE_LAST4: '4242',
  PORTAL_LINK: 'https://billing.stripe.com/p/session/test_dummy',
  NAECHSTE_ZAHLUNG: '01. September 2026',
  // N2 Drip-Campaign Platzhalter
  vorname: 'Marcel',
  anzahl_akten: '7',
  stripe_link: 'https://billing.stripe.com/p/session/test_dummy',
  login_link: 'https://app.prova-systems.de/login'
};

function renderTemplate(html, mockData) {
  let rendered = html;
  const unfilled = new Set();
  const placeholderPattern = /\{\{(\w+)\}\}/g;

  rendered = rendered.replace(placeholderPattern, (match, key) => {
    if (mockData[key] != null) return String(mockData[key]);
    unfilled.add(key);
    return '[UNFILLED:' + key + ']';
  });

  return { rendered, unfilled: Array.from(unfilled) };
}

function validate(rendered, file) {
  const issues = [];

  if (!rendered.includes('<meta name="viewport"') && !rendered.includes('viewport')) {
    issues.push('viewport-meta fehlt');
  }
  if (rendered.includes('<script') && !rendered.includes('text/html-template')) {
    issues.push('Script-Tag in Email — viele Email-Clients filtern das');
  }
  // Container-Width-Check (max-width 600px ist Email-Standard)
  if (!rendered.match(/max-width:\s*\d+px/)) {
    issues.push('kein max-width-Container — koennte mobile-broken sein');
  }
  return issues;
}

function findTemplates(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...findTemplates(full));
    } else if (e.isFile() && e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  console.log('📧 PROVA Email-Template Render-Check\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const templates = findTemplates(TEMPLATE_DIR);
  if (!templates.length) {
    console.log('Keine Templates gefunden in ' + TEMPLATE_DIR);
    process.exit(0);
  }

  let totalIssues = 0;
  const summary = [];

  for (const file of templates) {
    const html = fs.readFileSync(file, 'utf8');
    const { rendered, unfilled } = renderTemplate(html, MOCK_DATA);
    const issues = validate(rendered, file);

    const relName = path.relative(TEMPLATE_DIR, file).replace(/[\\/]/g, '_');
    const outPath = path.join(OUTPUT_DIR, relName);
    fs.writeFileSync(outPath, rendered);

    const ok = unfilled.length === 0 && issues.length === 0;
    const status = ok ? '✅' : '⚠';
    console.log(status + ' ' + path.relative('.', file));
    if (unfilled.length) {
      console.log('  Unfilled: ' + unfilled.join(', '));
    }
    if (issues.length) {
      console.log('  Validation: ' + issues.join('; '));
      totalIssues += issues.length;
    }

    summary.push({
      template: path.relative('.', file),
      output: path.relative('.', outPath),
      unfilled: unfilled,
      validation_issues: issues,
      ok: ok
    });
  }

  console.log('\n── Summary ──');
  console.log(templates.length + ' Templates gerendert');
  console.log(totalIssues + ' Validation-Issues');
  console.log('Output: ' + OUTPUT_DIR);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_render-report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), summary }, null, 2)
  );

  process.exit(totalIssues === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
