/**
 * MEGA⁴² P11 — Production-Runbook Completeness-Tests
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const RUNBOOK_DIR = path.join(ROOT, 'docs', 'runbook');

const REQUIRED_RUNBOOK_FILES = [
  'README.md',
  'PUSH-ALERTS-SETUP.md',
  'PDFMONKEY-AUDIT.md',
  'MOBILE-DEVICE-TESTS.md',
  'PILOT-VEREINBARUNG.md'
];

for (const f of REQUIRED_RUNBOOK_FILES) {
  test('P11: Runbook-Datei ' + f + ' existiert', () => {
    assert.ok(fs.existsSync(path.join(RUNBOOK_DIR, f)));
  });
}

test('P11: README.md ist Master-Index mit 8 Kapiteln', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  // Jedes Kapitel als Heading
  for (let i = 1; i <= 8; i++) {
    assert.match(c, new RegExp('\\b' + i + '\\b'));
  }
});

test('P11: README.md erklärt Deploy-Workflow', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Deploy-Workflow/i);
  assert.match(c, /CACHE_VERSION/);
  assert.match(c, /git push/);
});

test('P11: README.md hat Monitoring-Dashboards-Tabelle', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Status-Page/);
  assert.match(c, /Sentry/);
  assert.match(c, /Supabase-Dashboard/);
  assert.match(c, /Netlify-Dashboard/);
  assert.match(c, /Stripe-Dashboard/);
});

test('P11: README.md hat Incident-Response 3-Stufen-Model', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Stufe 1/i);
  assert.match(c, /Stufe 2/i);
  assert.match(c, /Stufe 3/i);
});

test('P11: README.md hat Backup-Recovery-Section', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Backup/i);
  assert.match(c, /PITR|Point.in.Time/i);
  assert.match(c, /pg_dump/);
});

test('P11: README.md hat Daily-Check-Liste', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Daily-Check/i);
});

test('P11: README.md hat Notfall-Kontakte', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'README.md'), 'utf8');
  assert.match(c, /Notfall|support@/i);
});

test('P11: PUSH-ALERTS-SETUP enthält ENV-Vars', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'PUSH-ALERTS-SETUP.md'), 'utf8');
  assert.match(c, /HEALTH_CHECK_CRON_SECRET/);
  assert.match(c, /VAPID_PUBLIC_KEY/);
});

test('P11: PDFMONKEY-AUDIT enthält Drift-Behebung', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'PDFMONKEY-AUDIT.md'), 'utf8');
  assert.match(c, /Drift/i);
  assert.match(c, /[Mm]issing[ _]in/);
});

test('P11: MOBILE-DEVICE-TESTS enthält Test-Plan-Cases', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'MOBILE-DEVICE-TESTS.md'), 'utf8');
  assert.match(c, /PWA-Install/i);
  assert.match(c, /Foto-Upload/i);
  assert.match(c, /Stylus|Pencil/i);
});

test('P11: PILOT-VEREINBARUNG enthält 99€ + lifetime', () => {
  const c = fs.readFileSync(path.join(RUNBOOK_DIR, 'PILOT-VEREINBARUNG.md'), 'utf8');
  assert.match(c, /99\s*€/);
  assert.match(c, /lifetime/i);
});
