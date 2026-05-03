/**
 * PROVA — Cockpit-Endpoint Tests fuer MEGA⁶ S1 6 neue Sektionen
 * MEGA⁷ U5 (04.05.2026)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const NEW_ENDPOINTS = [
  'admin-time-tracking.js',
  'admin-feature-heatmap.js',
  'admin-funnel.js',
  'admin-churn.js',
  'admin-pdf-queue.js',
  'admin-push-alerts.js'
];

describe('Cockpit-MEGA⁶-Endpoints — Code-Quality', () => {
  for (const f of NEW_ENDPOINTS) {
    test(f + ' nutzt require2FA: true', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /require2FA:\s*true/);
    });

    test(f + ' hat funktionalen Rate-Limit', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /rateLimit:\s*\{/);
    });

    test(f + ' hat GET-Method-Check', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /httpMethod\s*!==?\s*['"]GET['"]/);
    });
  }
});

describe('Cockpit-MEGA⁶-Endpoints — Pattern-Match', () => {
  test('admin-time-tracking nutzt audit_trail-Lifecycle-Events', () => {
    const txt = fs.readFileSync('netlify/functions/admin-time-tracking.js', 'utf8');
    assert.match(txt, /auftrag\.created/);
    assert.match(txt, /pdf\.generated|auftrag\.freigegeben/);
  });

  test('admin-feature-heatmap nutzt LIKE-Filter', () => {
    const txt = fs.readFileSync('netlify/functions/admin-feature-heatmap.js', 'utf8');
    assert.match(txt, /typ\.like\.feature\.%|typ\.like\.ki\.%/);
  });

  test('admin-funnel hat 5 FUNNEL_STAGES', () => {
    const txt = fs.readFileSync('netlify/functions/admin-funnel.js', 'utf8');
    assert.match(txt, /FUNNEL_STAGES/);
    const stages = txt.match(/key:\s*['"](\w+)['"]/g) || [];
    assert.ok(stages.length >= 5, 'mind. 5 Funnel-Stages');
  });

  test('admin-churn kategorisiert Reasons', () => {
    const txt = fs.readFileSync('netlify/functions/admin-churn.js', 'utf8');
    assert.match(txt, /REASON_CATEGORIES/);
    assert.match(txt, /categorizeReason/);
  });

  test('admin-pdf-queue nutzt PDFMonkey-API + audit_trail-Fallback', () => {
    const txt = fs.readFileSync('netlify/functions/admin-pdf-queue.js', 'utf8');
    assert.match(txt, /PDFMONKEY_API_KEY/);
    assert.match(txt, /document_cards|audit_trail/);
  });

  test('admin-push-alerts hat Severity-Tagging', () => {
    const txt = fs.readFileSync('netlify/functions/admin-push-alerts.js', 'utf8');
    assert.match(txt, /severity:\s*['"]high['"]/);
    assert.match(txt, /severity:\s*['"]medium['"]/);
    assert.match(txt, /severity:\s*['"]low['"]/);
  });
});
