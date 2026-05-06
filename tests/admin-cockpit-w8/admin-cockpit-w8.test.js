/**
 * Tests für admin-cockpit Sektionen 7+12 (MEGA²⁸ V3.2-W8-I7)
 * + neue Lambdas admin-support-inbox + admin-billing-sync
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('admin-cockpit W8-I7 — Sektionen 7+12 LIVE', () => {
  const html = read('admin-cockpit.html');

  test('Section 7 Support-Inbox: cp-status live (NICHT skeleton)', () => {
    const m = html.match(/Section 7[\s\S]{0,800}/);
    assert.ok(m, 'Section 7 nicht gefunden');
    assert.match(m[0], /cp-status live/);
    assert.doesNotMatch(m[0], /cp-status skeleton/);
  });

  test('Section 12 Billing-Sync: cp-status live', () => {
    const m = html.match(/Section 12[\s\S]{0,800}/);
    assert.ok(m, 'Section 12 nicht gefunden');
    assert.match(m[0], /cp-status live/);
    assert.doesNotMatch(m[0], /cp-status skeleton/);
  });

  test('Section 7 + 12 haben data-7 / data-12 IDs', () => {
    assert.match(html, /id="data-7"/);
    assert.match(html, /id="data-12"/);
  });

  test('loadSupportInbox + loadBillingSync Functions definiert', () => {
    assert.match(html, /async function loadSupportInbox/);
    assert.match(html, /async function loadBillingSync/);
  });

  test('Live-Fetch ruft neue Lambdas', () => {
    assert.match(html, /admin-support-inbox\?range=7d/);
    assert.match(html, /admin-billing-sync/);
  });

  test('12 LIVE / 0 SKELETON nach W8-I7 — admin-cockpit komplett', () => {
    const live = (html.match(/class="cp-status live"/g) || []).length;
    const skeleton = (html.match(/class="cp-status skeleton"/g) || []).length;
    assert.strictEqual(live, 12, '12 LIVE-Sektionen erwartet (komplette Vollendung)');
    assert.strictEqual(skeleton, 0, 'KEIN Skeleton mehr — admin-cockpit 12/12 LIVE');
  });

  test('Auto-Load on DOMContentLoaded ruft alle 9 Functions', () => {
    const m = html.match(/DOMContentLoaded[\s\S]{0,1000}/);
    assert.ok(m);
    ['loadKPIs', 'loadKICosts', 'loadAuditTrail', 'loadPushAlerts', 'loadChurn',
     'loadGutachtenTiming', 'loadConversion', 'loadSupportInbox', 'loadBillingSync']
      .forEach(fn => {
        assert.match(m[0], new RegExp(fn + '\\(\\)'));
      });
  });
});

describe('admin-support-inbox.js Lambda', () => {
  const SRC = read('netlify/functions/admin-support-inbox.js');

  test('requireAdmin + withSentry Wrapping', () => {
    assert.match(SRC, /requireAdmin/);
    assert.match(SRC, /withSentry/);
  });

  test('functionName: admin-support-inbox', () => {
    assert.match(SRC, /functionName:\s*['"]admin-support-inbox['"]/);
  });

  test('Defensive Fallback-Kette (support_tickets → audit_trail → empty)', () => {
    assert.match(SRC, /support_tickets/);
    assert.match(SRC, /audit_trail/);
    assert.match(SRC, /no-data-pre-pilot/);
  });

  test('Range-Query-Param mit parseSince Helper', () => {
    assert.match(SRC, /function parseSince/);
    assert.match(SRC, /event\.queryStringParameters.*range/);
  });

  test('Response-Schema: open_count + closed_count + recent', () => {
    assert.match(SRC, /open_count/);
    assert.match(SRC, /closed_count/);
    assert.match(SRC, /recent:/);
  });
});

describe('admin-billing-sync.js Lambda', () => {
  const SRC = read('netlify/functions/admin-billing-sync.js');

  test('requireAdmin + withSentry Wrapping', () => {
    assert.match(SRC, /requireAdmin/);
    assert.match(SRC, /withSentry/);
  });

  test('functionName: admin-billing-sync', () => {
    assert.match(SRC, /functionName:\s*['"]admin-billing-sync['"]/);
  });

  test('Stripe-Key defensiv (PROVA-Prefix-Migration aware)', () => {
    assert.match(SRC, /process\.env\.PROVA_STRIPE_SECRET_KEY\s*\|\|\s*process\.env\.STRIPE_SECRET_KEY/);
  });

  test('Stripe-Subscriptions Status-Aggregation (alle 6 Status-Buckets)', () => {
    assert.match(SRC, /active:\s*0/);
    assert.match(SRC, /past_due:\s*0/);
    assert.match(SRC, /canceled:\s*0/);
    assert.match(SRC, /trialing:\s*0/);
  });

  test('MRR-Berechnung mit interval-aware (month + year)', () => {
    assert.match(SRC, /interval === ['"]month['"]/);
    assert.match(SRC, /interval === ['"]year['"]/);
  });

  test('Customer-Email pseudonymisiert in Response', () => {
    assert.match(SRC, /\(\.\{2\}\)\.\*@/);
  });

  test('Pagination-Schutz (max 5 pages × 100 = 500 subs)', () => {
    assert.match(SRC, /safetyCounter < 5/);
  });

  test('502-Response bei Stripe-Error mit klarem Detail', () => {
    assert.match(SRC, /statusCode:\s*502.*Stripe-API-Fehler|jsonResponse\(event,\s*502/s);
  });
});
