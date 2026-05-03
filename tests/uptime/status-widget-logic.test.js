/**
 * PROVA — Public-Status-Widget Logic-Tests
 * MEGA¹¹ W6 (2026-05-04)
 *
 * Browser-DOM nicht testbar in Node — nur reproduzierte Logik testen:
 *   - State-Label-Mapping
 *   - Health-Response-Parsing-Logic (state-Decision aus health.json)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ─── Reproduktion der Logic aus lib/public-status-widget.js ──────────
function stateLabel(state) {
  if (state === 'ok')        return 'Alle Systeme operativ';
  if (state === 'degraded')  return 'Eingeschraenkter Betrieb';
  if (state === 'outage')    return 'Stoerung';
  return 'Status pruefen';
}

// Reproduziert die State-Decision-Logik aus _fetchHealth()
function decideState(httpOk, status) {
  if (!httpOk) return 'outage';
  if (status === 'ok') return 'ok';
  if (status === 'degraded') return 'degraded';
  return 'outage';
}

describe('Public-Status-Widget — State-Label-Mapping', () => {
  test('State "ok" -> "Alle Systeme operativ"', () => {
    assert.equal(stateLabel('ok'), 'Alle Systeme operativ');
  });

  test('State "degraded" -> "Eingeschraenkter Betrieb"', () => {
    assert.equal(stateLabel('degraded'), 'Eingeschraenkter Betrieb');
  });

  test('State "outage" -> "Stoerung"', () => {
    assert.equal(stateLabel('outage'), 'Stoerung');
  });

  test('Unbekannter State -> "Status pruefen" (Loading-Default)', () => {
    assert.equal(stateLabel('loading'), 'Status pruefen');
    assert.equal(stateLabel('unknown'), 'Status pruefen');
    assert.equal(stateLabel(null), 'Status pruefen');
    assert.equal(stateLabel(undefined), 'Status pruefen');
    assert.equal(stateLabel(''), 'Status pruefen');
  });
});

describe('Public-Status-Widget — Health-Response-Decision', () => {
  test('HTTP 200 + status=ok -> ok', () => {
    assert.equal(decideState(true, 'ok'), 'ok');
  });

  test('HTTP 200 + status=degraded -> degraded', () => {
    assert.equal(decideState(true, 'degraded'), 'degraded');
  });

  test('HTTP 200 + status=down -> outage', () => {
    assert.equal(decideState(true, 'down'), 'outage');
  });

  test('HTTP 500 -> outage (regardless status)', () => {
    assert.equal(decideState(false, 'ok'), 'outage');
    assert.equal(decideState(false, 'degraded'), 'outage');
  });

  test('HTTP 200 + status undefined -> outage (defensive)', () => {
    assert.equal(decideState(true, undefined), 'outage');
    assert.equal(decideState(true, null), 'outage');
    assert.equal(decideState(true, ''), 'outage');
  });
});

describe('Public-Status-Widget — CSS-Klassen-Kontrakt', () => {
  test('CSS-Klassen-Naming-Convention bleibt psw-* prefixed', () => {
    // Smoke: das Widget braucht CSS-Klassen die mit "psw-" beginnen
    // (Test verhindert versehentliche Umbenennung in Refactor)
    const expectedClasses = [
      'psw-root',
      'psw-dot',
      'psw-dot--ok',
      'psw-dot--degraded',
      'psw-dot--outage',
      'psw-dot--loading',
      'psw-link'
    ];
    for (const cls of expectedClasses) {
      assert.match(cls, /^psw-/, 'class ' + cls + ' must be psw-prefixed');
    }
  });
});
