'use strict';

/**
 * MEGA⁴¹ P12 Szenario 4 — "System-Admin tagsüber"
 *
 * Pfad: Admin-Dashboard → Health-Spike-Push → Support-Inbox antworten → Audit-Trail
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

test('SZ4-1: Admin-Cockpit-Page mit 12 Sections', () => {
  assert.ok(exists('admin-cockpit.html'));
  const html = read('admin-cockpit.html');
  const sections = html.match(/Section [0-9]+/g) || [];
  assert.ok(sections.length >= 12);
});

test('SZ4-2: 28+ admin-* Lambdas (mind. 25 lt. Audit)', () => {
  const fns = fs.readdirSync(path.join(ROOT, 'netlify/functions'));
  const adminFns = fns.filter(f => f.startsWith('admin-') && f.endsWith('.js'));
  assert.ok(adminFns.length >= 25);
});

test('SZ4-3: Health-Check-Cron mit 8 Services', () => {
  assert.ok(exists('netlify/functions/health-check-cron.js'));
  const Cron = require(path.join(ROOT, 'netlify/functions/health-check-cron.js'));
  assert.ok(Cron.__internals.SERVICES.length >= 8);
});

test('SZ4-4: Push-Throttling 1/Service/h', () => {
  const Cron = require(path.join(ROOT, 'netlify/functions/health-check-cron.js'));
  assert.strictEqual(Cron.__internals.ALERT_THROTTLE_MIN, 60);
});

test('SZ4-5: 3 Alert-Types (down/recovery/latency)', () => {
  const src = read('netlify/functions/health-check-cron.js');
  ['down', 'recovery', 'latency'].forEach(t => {
    assert.match(src, new RegExp("alert_type:\\s*['\"]" + t + "['\"]|'" + t + "'"));
  });
});

test('SZ4-6: Admin-System-Uptime-Lambda für Dashboard', () => {
  assert.ok(exists('netlify/functions/admin-system-uptime.js'));
  const src = read('netlify/functions/admin-system-uptime.js');
  assert.match(src, /v_service_status_latest/);
  assert.match(src, /v_service_uptime/);
});

test('SZ4-7: Support-Inbox-Lambda mit defensive Fallback', () => {
  assert.ok(exists('netlify/functions/admin-support-inbox.js'));
});

test('SZ4-8: Support-Ticket-Create + faq-search', () => {
  assert.ok(exists('netlify/functions/support-ticket-create.js'));
  assert.ok(exists('netlify/functions/faq-search.js'));
});

test('SZ4-9: Audit-Trail-Lambda + Viewer-Page', () => {
  assert.ok(exists('netlify/functions/admin-audit-trail.js'));
  assert.ok(exists('audit-trail.html'));
});

test('SZ4-10: KI-vs-SV-Trennung via source-ENUM', () => {
  const mig = read('supabase-migrations/37_audit_trail_ki_source.sql');
  assert.match(mig, /CREATE TYPE audit_source/);
  assert.match(mig, /'ki'/);
  assert.match(mig, /'sv_eigen'/);
});

test('SZ4-11: PDFMonkey-Inventory + Pseudonymisierungs-Audit', () => {
  assert.ok(exists('netlify/functions/admin-pdfmonkey-inventory.js'));
  assert.ok(exists('netlify/functions/admin-pseudonymisierung-audit.js'));
});
