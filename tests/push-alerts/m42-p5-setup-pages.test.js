/**
 * MEGA⁴² P5 — Push-Alerts Setup-Pages + Schedule-Wiring Tests
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const pushSetup = fs.readFileSync(path.join(ROOT, 'push-setup.html'), 'utf8');
const healthTest = fs.readFileSync(path.join(ROOT, 'health-test-down.html'), 'utf8');
const netlifyToml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

// ─── push-setup.html ──────────────────────────────────────

test('P5: /push-setup.html existiert + valider HTML5', () => {
  assert.match(pushSetup, /<!DOCTYPE html>/i);
  assert.match(pushSetup, /<html lang="de">/);
});

test('P5: /push-setup.html hat 3-Step-Wizard (Berechtigung/Subscription/Test)', () => {
  assert.match(pushSetup, /Berechtigung anfragen/);
  assert.match(pushSetup, /Subscription speichern/);
  assert.match(pushSetup, /Test-Push senden/);
});

test('P5: /push-setup.html prüft Browser-Support für Push', () => {
  assert.match(pushSetup, /'Notification' in window/);
  assert.match(pushSetup, /'serviceWorker' in navigator/);
  assert.match(pushSetup, /'PushManager' in window/);
});

test('P5: /push-setup.html nutzt /.netlify/functions/push-vapid-key', () => {
  assert.match(pushSetup, /push-vapid-key/);
});

test('P5: /push-setup.html POSTet zu /.netlify/functions/push-subscribe', () => {
  assert.match(pushSetup, /push-subscribe/);
});

test('P5: /push-setup.html POSTet zu /.netlify/functions/push-test', () => {
  assert.match(pushSetup, /push-test/);
});

test('P5: /push-setup.html zeigt 8 überwachte Services', () => {
  // Sucht 8 .ps-service-pill Vorkommen
  const matches = pushSetup.match(/ps-service-pill/g) || [];
  // Mind. 8 Services + Definition selbst
  assert.ok(matches.length >= 9, 'count=' + matches.length);
});

test('P5: /push-setup.html requires Auth-Token', () => {
  assert.match(pushSetup, /prova_auth_token/);
  assert.match(pushSetup, /\/login\?next=\/push-setup\.html/);
});

// ─── health-test-down.html ─────────────────────────────────

test('P5: /health-test-down.html existiert', () => {
  assert.match(healthTest, /<!DOCTYPE html>/i);
});

test('P5: /health-test-down.html hat 3 Test-Buttons', () => {
  assert.match(healthTest, /htd-trigger-btn/);
  assert.match(healthTest, /htd-simulate-down-btn/);
  assert.match(healthTest, /htd-history-btn/);
});

test('P5: /health-test-down.html ruft health-check-cron mit manual=true', () => {
  assert.match(healthTest, /health-check-cron\?manual=true/);
});

test('P5: /health-test-down.html triggert push-notify mit test:true', () => {
  assert.match(healthTest, /push-notify/);
  assert.match(healthTest, /alert_type:\s*'service-down'/);
});

test('P5: /health-test-down.html zeigt system-health-current', () => {
  assert.match(healthTest, /system-health-current/);
});

test('P5: /health-test-down.html zeigt system-health-history', () => {
  assert.match(healthTest, /system-health-history/);
});

test('P5: /health-test-down.html requires Auth', () => {
  assert.match(healthTest, /prova_auth_token/);
  assert.match(healthTest, /\/login\?next=\/health-test-down\.html/);
});

// ─── netlify.toml Schedule ─────────────────────────────────

test('P5: netlify.toml hat health-check-cron Schedule (10 min)', () => {
  assert.match(netlifyToml, /\[functions\."health-check-cron"\]/);
  assert.match(netlifyToml, /schedule\s*=\s*"\*\/10\s+\*\s+\*\s+\*\s+\*"/);
});

test('P5: netlify.toml hat status-check Schedule (alle 5 min, unverändert)', () => {
  assert.match(netlifyToml, /\[functions\."status-check"\]/);
  assert.match(netlifyToml, /schedule\s*=\s*"\*\/5\s+\*\s+\*\s+\*\s+\*"/);
});

// ─── sw.js APP_SHELL ──────────────────────────────────────

test('P5: sw.js cached push-setup.html', () => {
  assert.match(swJs, /'\/push-setup\.html'/);
});

test('P5: sw.js cached health-test-down.html', () => {
  assert.match(swJs, /'\/health-test-down\.html'/);
});

// ─── Existing Lambda + Migration consistency ──────────────

test('P5: health-check-cron.js Lambda existiert', () => {
  const f = path.join(ROOT, 'netlify', 'functions', 'health-check-cron.js');
  assert.ok(fs.existsSync(f));
});

test('P5: push-notify.js Lambda existiert', () => {
  const f = path.join(ROOT, 'netlify', 'functions', 'push-notify.js');
  assert.ok(fs.existsSync(f));
});

test('P5: 38_system_health_history Migration existiert', () => {
  const f = path.join(ROOT, 'supabase-migrations', '38_system_health_history.sql');
  assert.ok(fs.existsSync(f));
});

// ─── Runbook ──────────────────────────────────────────────

test('P5: docs/runbook/PUSH-ALERTS-SETUP.md existiert + dokumentiert ENV-Vars', () => {
  const f = path.join(ROOT, 'docs', 'runbook', 'PUSH-ALERTS-SETUP.md');
  const content = fs.readFileSync(f, 'utf8');
  assert.match(content, /HEALTH_CHECK_CRON_SECRET/);
  assert.match(content, /VAPID_PUBLIC_KEY/);
  assert.match(content, /VAPID_PRIVATE_KEY/);
  assert.match(content, /VAPID_SUBJECT/);
});

test('P5: Runbook hat Test-Anleitung für Marcel', () => {
  const f = path.join(ROOT, 'docs', 'runbook', 'PUSH-ALERTS-SETUP.md');
  const content = fs.readFileSync(f, 'utf8');
  assert.match(content, /Marcel-Pflicht/);
  assert.match(content, /push-setup\.html/);
  assert.match(content, /health-test-down\.html/);
});
