/**
 * MEGA⁴² P4 — Performance-Suite Smoke + Threshold-Tests
 *
 * Verifiziert dass scripts/perf-suite.js läuft und kritische Pfade
 * unter Akzeptanz-Schwellen (p95) bleiben.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const ACCEPT_THRESHOLDS_P95_MS = {
  'Flow-Configs Lookup': 1,
  'Stepper-Bridge Progress-Calc': 1,
  'Global-Search-Engine searchCases': 5,
  'FAQ-Search local-rank': 5,
  'Lambda document-save Module-Init': 100,
  'Lambda ki-proxy Module-Init': 100
};

let result = null;
function getResult() {
  if (result) return result;
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'perf-suite.js'), '--json', '--n', '50'], {
    cwd: ROOT,
    timeout: 30000,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  result = JSON.parse(out);
  return result;
}

test('P4: scripts/perf-suite.js läuft mit --json und liefert results', () => {
  const r = getResult();
  assert.ok(r);
  assert.ok(Array.isArray(r.results));
  assert.equal(r.results.length, 6);
});

test('P4: 6 erwartete Tests sind enthalten', () => {
  const r = getResult();
  const names = r.results.map(x => x.name);
  assert.ok(names.some(n => n.startsWith('Flow-Configs')));
  assert.ok(names.some(n => n.startsWith('Stepper-Bridge')));
  assert.ok(names.some(n => n.startsWith('Global-Search')));
  assert.ok(names.some(n => n.startsWith('FAQ-Search')));
  assert.ok(names.some(n => n.startsWith('Lambda document-save')));
  assert.ok(names.some(n => n.startsWith('Lambda ki-proxy')));
});

test('P4: Flow-Configs Lookup p95 < 1ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('Flow-Configs'));
  assert.ok(t);
  assert.ok(!t.error, 'no error: ' + t.error);
  assert.ok(t.p95_ms < 1, 'p95=' + t.p95_ms + 'ms exceeds 1ms threshold');
});

test('P4: Stepper-Bridge Progress-Calc p95 < 1ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('Stepper-Bridge'));
  assert.ok(t);
  assert.ok(!t.error);
  assert.ok(t.p95_ms < 1);
});

test('P4: Global-Search-Engine p95 < 5ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('Global-Search'));
  assert.ok(t);
  assert.ok(!t.error);
  assert.ok(t.p95_ms < 5, 'p95=' + t.p95_ms);
});

test('P4: FAQ-Search local-rank p95 < 5ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('FAQ-Search'));
  assert.ok(t);
  assert.ok(!t.error);
  assert.ok(t.p95_ms < 5);
});

test('P4: Lambda document-save Module-Init p95 < 100ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('Lambda document-save'));
  assert.ok(t);
  assert.ok(!t.error);
  assert.ok(t.p95_ms < 100, 'p95=' + t.p95_ms);
});

test('P4: Lambda ki-proxy Module-Init p95 < 100ms', () => {
  const r = getResult();
  const t = r.results.find(x => x.name.startsWith('Lambda ki-proxy'));
  assert.ok(t);
  assert.ok(!t.error);
  assert.ok(t.p95_ms < 100);
});

test('P4: Suite-Total-Duration < 30s', () => {
  const r = getResult();
  assert.ok(r.duration_ms < 30000, 'duration=' + r.duration_ms);
});

test('P4: Jeder Test hat n>0 + p50/p95/p99/avg/throughput', () => {
  const r = getResult();
  for (const t of r.results) {
    if (t.error) continue;
    assert.ok(t.n > 0, t.name);
    assert.equal(typeof t.p50_ms, 'number', t.name);
    assert.equal(typeof t.p95_ms, 'number');
    assert.equal(typeof t.p99_ms, 'number');
    assert.equal(typeof t.avg_ms, 'number');
    assert.equal(typeof t.throughput_per_sec, 'number');
  }
});

test('P4: p50 <= p95 <= p99 für alle Tests', () => {
  const r = getResult();
  for (const t of r.results) {
    if (t.error) continue;
    assert.ok(t.p50_ms <= t.p95_ms, t.name + ': p50>p95');
    assert.ok(t.p95_ms <= t.p99_ms, t.name + ': p95>p99');
  }
});
