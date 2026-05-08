'use strict';

/**
 * MEGA⁴¹ P3 — Push-Alerts + Health-Coverage Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Cron = require(path.join(ROOT, 'netlify', 'functions', 'health-check-cron.js'));
const cronSrc = read('netlify/functions/health-check-cron.js');
const uptimeSrc = read('netlify/functions/admin-system-uptime.js');
const migSrc = read('supabase-migrations/38_system_health_history.sql');

// ─────────────────────────────────────────────────────────────────
//  P3-1 Migration 38
// ─────────────────────────────────────────────────────────────────

test('P3-1: Migration 38 — system_health_history Tabelle', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.system_health_history/);
  assert.match(migSrc, /service TEXT NOT NULL/);
  assert.match(migSrc, /status TEXT NOT NULL/);
  assert.match(migSrc, /response_ms INTEGER/);
});

test('P3-1: Migration 38 — push_alert_log Tabelle (für Throttling)', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.push_alert_log/);
  assert.match(migSrc, /alert_type TEXT NOT NULL/);
  assert.match(migSrc, /delivery_status TEXT/);
});

test('P3-1: Migration 38 — View v_service_uptime mit 24h/7d/30d', () => {
  assert.match(migSrc, /CREATE OR REPLACE VIEW public\.v_service_uptime/);
  assert.match(migSrc, /'24h'/);
  assert.match(migSrc, /'7d'/);
  assert.match(migSrc, /'30d'/);
  assert.match(migSrc, /uptime_prozent/);
});

test('P3-1: Migration 38 — View v_service_status_latest (DISTINCT ON)', () => {
  assert.match(migSrc, /CREATE OR REPLACE VIEW public\.v_service_status_latest/);
  assert.match(migSrc, /DISTINCT ON \(service\)/);
});

test('P3-1: Migration 38 — 5 Indizes', () => {
  ['idx_health_service_time', 'idx_health_status_time', 'idx_health_recent',
   'idx_push_alert_service_time', 'idx_push_alert_recent']
    .forEach(idx => assert.match(migSrc, new RegExp(idx)));
});

// ─────────────────────────────────────────────────────────────────
//  P3-2 health-check-cron Lambda
// ─────────────────────────────────────────────────────────────────

test('P3-2: Cron exports SERVICES (8+)', () => {
  assert.ok(Cron.__internals.SERVICES.length >= 8);
});

test('P3-2: Cron checkt 8 erforderliche Services', () => {
  const names = Cron.__internals.SERVICES.map(s => s.name);
  ['stripe', 'supabase', 'openai', 'sentry', 'pdfmonkey', 'make_com', 'netlify', 'ssl_cert']
    .forEach(svc => assert.ok(names.indexOf(svc) >= 0, svc + ' fehlt'));
});

test('P3-2: TIMEOUT_MS = 5000 (5s) — Reachability-Check', () => {
  assert.strictEqual(Cron.__internals.TIMEOUT_MS, 5000);
});

test('P3-2: ALERT_THROTTLE_MIN = 60 (max 1 Push/Service/h)', () => {
  assert.strictEqual(Cron.__internals.ALERT_THROTTLE_MIN, 60);
});

test('P3-2: LATENCY_WARN_MS = 5000 (>5s = Latency-Spike)', () => {
  assert.strictEqual(Cron.__internals.LATENCY_WARN_MS, 5000);
});

test('P3-2: Cron-Source: parallel Health-Checks via Promise.all', () => {
  assert.match(cronSrc, /Promise\.all\(SERVICES\.map\(_checkService\)\)/);
});

test('P3-2: Cron-Source: 401/403 als "up" akzeptiert (Reachability-Pattern)', () => {
  assert.match(cronSrc, /r\.status !== 401 && r\.status !== 403/);
});

test('P3-2: Cron-Source: Persist in system_health_history', () => {
  assert.match(cronSrc, /\.from\(['"]system_health_history['"]\)\.insert/);
});

test('P3-2: Cron-Source: Throttling via push_alert_log Lookup', () => {
  assert.match(cronSrc, /_wasRecentlyAlerted/);
  assert.match(cronSrc, /push_alert_log/);
});

test('P3-2: Cron-Source: 3 Alert-Types (down/recovery/latency)', () => {
  assert.match(cronSrc, /alert_type:\s*['"]down['"]|'down'/);
  assert.match(cronSrc, /alert_type:\s*['"]recovery['"]|'recovery'/);
  assert.match(cronSrc, /alert_type:\s*['"]latency['"]|'latency'/);
});

test('P3-2: Cron-Source: Cron-Secret-Auth via X-Cron-Secret Header', () => {
  assert.match(cronSrc, /HEALTH_CHECK_CRON_SECRET/);
  assert.match(cronSrc, /x-cron-secret/);
});

test('P3-2: Cron-Source: Push-Notify-Lambda Aufruf bei Alert', () => {
  assert.match(cronSrc, /\/\.netlify\/functions\/push-notify/);
});

// ─────────────────────────────────────────────────────────────────
//  P3-3 admin-system-uptime Lambda
// ─────────────────────────────────────────────────────────────────

test('P3-3: Uptime-Lambda hat requireAdmin + 2FA + RateLimit', () => {
  assert.match(uptimeSrc, /requireAdmin/);
  assert.match(uptimeSrc, /require2FA:\s*true/);
  assert.match(uptimeSrc, /max:\s*30/);
});

test('P3-3: Uptime-Lambda nutzt 2 Views (status_latest + uptime)', () => {
  assert.match(uptimeSrc, /v_service_status_latest/);
  assert.match(uptimeSrc, /v_service_uptime/);
});

test('P3-3: Uptime-Lambda returns alerts_recent (letzte 20)', () => {
  assert.match(uptimeSrc, /push_alert_log/);
  assert.match(uptimeSrc, /\.limit\(20\)/);
});
