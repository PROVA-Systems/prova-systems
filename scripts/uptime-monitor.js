#!/usr/bin/env node
/**
 * PROVA — Uptime-Monitor-Script
 * MEGA⁷ U7 (04.05.2026)
 *
 * Pingt alle kritischen Endpoints + protokolliert Response-Times.
 *
 * USAGE:
 *   PROVA_BASE_URL=https://app.prova-systems.de node scripts/uptime-monitor.js
 *   PROVA_BASE_URL=https://app.prova-systems.de node scripts/uptime-monitor.js --watch  # alle 60s
 *
 * Output:
 *   docs/audit/UPTIME-LOG-<YYYY-MM-DD>.jsonl (eine Line pro Run)
 *
 * Empfohlen: cron-Job alle 5 Min via Netlify-Scheduled-Function ODER lokal cronjob.
 * Alternativ Marcel-Manual: BetterUptime / UptimeRobot konfigurieren auf /health endpoint.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PROVA_BASE_URL || 'https://app.prova-systems.de';
const TIMEOUT_MS = 8000;
const WATCH = process.argv.includes('--watch');

const ENDPOINTS = [
  { name: 'landing',     path: '/',                         expected: 200 },
  { name: 'pilot-page',  path: '/pilot.html',               expected: 200 },
  { name: 'health',      path: '/.netlify/functions/health',expected: [200, 503] },
  { name: 'pilot-seats', path: '/.netlify/functions/pilot-seats', expected: 200 },
  { name: 'sentry-test', path: '/.netlify/functions/sentry-test', expected: 401 },  // ohne secret
  { name: 'sw',          path: '/sw.js',                    expected: 200 },
  { name: 'manifest',    path: '/manifest.json',            expected: 200 }
];

async function ping(ep) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(BASE_URL + ep.path, { signal: ctrl.signal });
    clearTimeout(t);
    const expected = Array.isArray(ep.expected) ? ep.expected : [ep.expected];
    const ok = expected.includes(r.status);
    return { name: ep.name, path: ep.path, status: r.status, ok, ms: Date.now() - start };
  } catch (e) {
    clearTimeout(t);
    return { name: ep.name, path: ep.path, ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message, ms: Date.now() - start };
  }
}

async function runOnce() {
  const ts = new Date().toISOString();
  const results = await Promise.all(ENDPOINTS.map(ping));
  const summary = {
    ts: ts,
    base_url: BASE_URL,
    total: results.length,
    ok: results.filter(r => r.ok).length,
    fail: results.filter(r => !r.ok).length,
    avg_ms: Math.round(results.reduce((a, r) => a + (r.ms || 0), 0) / results.length),
    endpoints: results
  };

  // Console-Output
  console.log(ts + ' | ' + summary.ok + '/' + summary.total + ' OK | avg ' + summary.avg_ms + 'ms');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const status = r.status || r.error || '?';
    console.log('  ' + icon + ' ' + r.name.padEnd(14) + ' ' + String(status).padEnd(8) + ' ' + (r.ms || 0) + 'ms');
  }

  // Append to JSONL log
  const dateStr = new Date().toISOString().slice(0, 10);
  const logPath = path.join('docs', 'audit', 'UPTIME-LOG-' + dateStr + '.jsonl');
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(summary) + '\n');
  } catch (e) {
    console.warn('Log-write fail:', e.message);
  }

  return summary;
}

(async () => {
  console.log('🔍 PROVA Uptime-Monitor');
  console.log('   Base-URL: ' + BASE_URL);
  console.log('   Mode: ' + (WATCH ? 'WATCH (60s)' : 'ONCE'));
  console.log('');

  if (!WATCH) {
    const s = await runOnce();
    process.exit(s.fail);
    return;
  }

  // Watch-Mode
  console.log('  (Strg+C zum Beenden)\n');
  await runOnce();
  setInterval(runOnce, 60000);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
