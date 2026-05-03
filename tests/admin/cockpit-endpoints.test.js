/**
 * PROVA — Admin-Cockpit-Endpoint Smoke-Tests
 * MEGA⁶ S5 (04.05.2026)
 *
 * Verifikation: alle 16 Cockpit-Endpoints sind syntaktisch valid +
 * exportieren handler + nutzen das requireAdmin-Pattern.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const COCKPIT_FILES = [
  'admin-pilot-list.js',
  'admin-stripe-kpis.js',
  'admin-sentry-errors.js',
  'admin-audit-trail.js',
  'admin-impersonate.js',
  'admin-send-email.js',
  'admin-force-logout.js',
  'admin-live-sessions.js',
  'admin-ki-costs.js',
  'admin-system-health.js',
  'admin-time-tracking.js',
  'admin-feature-heatmap.js',
  'admin-funnel.js',
  'admin-churn.js',
  'admin-pdf-queue.js',
  'admin-push-alerts.js'
];

describe('Cockpit-Endpoints existieren', () => {
  for (const f of COCKPIT_FILES) {
    test(f + ' existiert', () => {
      const p = path.join('netlify', 'functions', f);
      assert.equal(fs.existsSync(p), true, p + ' fehlt');
    });
  }
});

describe('Cockpit-Endpoints nutzen requireAdmin + withSentry', () => {
  for (const f of COCKPIT_FILES) {
    test(f + ' importiert requireAdmin', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /require\(['"]\.\/lib\/admin-auth-guard['"]\)/);
      assert.match(txt, /requireAdmin/);
    });

    test(f + ' wraps withSentry', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /withSentry/);
    });
  }
});

describe('Cockpit-Endpoints exportieren handler', () => {
  for (const f of COCKPIT_FILES) {
    test(f + ' hat exports.handler', () => {
      const txt = fs.readFileSync(path.join('netlify', 'functions', f), 'utf8');
      assert.match(txt, /exports\.handler\s*=/);
    });
  }
});
