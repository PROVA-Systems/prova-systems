/**
 * PROVA — uptime-webhook Tests
 * MEGA¹¹ W6 (2026-05-04)
 *
 * Testet:
 *   - Constant-Time-Secret-Comparison
 *   - Idempotenz (gleicher alert + Stunde = dedupe)
 *   - alertType-Label-Mapping
 *   - HTTP 405 bei non-POST
 *   - HTTP 401 bei falschem Secret
 *   - HTTP 200 bei valider Request
 *   - Body-Parsing (JSON + form-encoded)
 */
'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Module-Cache invalidate (sodass ENV-Setzung greift)
const FUNC_PATH = require.resolve('../../netlify/functions/uptime-webhook');

function loadModule(envOverrides) {
  delete require.cache[FUNC_PATH];
  // Set ENV (NICHT restoren — Handler liest ENV at request-time, nicht module-load-time)
  if (envOverrides) {
    for (const [k, v] of Object.entries(envOverrides)) {
      if (v === null) delete process.env[k];
      else process.env[k] = v;
    }
  }
  // Mock sentry-wrap to be no-op
  const sentryPath = require.resolve('../../netlify/functions/lib/sentry-wrap');
  delete require.cache[sentryPath];
  require.cache[sentryPath] = {
    id: sentryPath, filename: sentryPath, loaded: true, exports: {
      withSentry: (fn) => fn
    }
  };

  // Mock cors-helper
  const corsPath = require.resolve('../../netlify/functions/lib/cors-helper');
  delete require.cache[corsPath];
  require.cache[corsPath] = {
    id: corsPath, filename: corsPath, loaded: true, exports: {
      getCorsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' })
    }
  };

  // Mock storage-router (no Supabase)
  const srPath = require.resolve('../../netlify/functions/lib/storage-router');
  delete require.cache[srPath];
  require.cache[srPath] = {
    id: srPath, filename: srPath, loaded: true, exports: {
      getSupabase: () => null
    }
  };

  return require(FUNC_PATH);
}

describe('uptime-webhook — Helper-Functions', () => {

  test('alertTypeLabel mapping', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    assert.equal(mod._test.alertTypeLabel('1'), 'outage_start');
    assert.equal(mod._test.alertTypeLabel('2'), 'outage_recovery');
    assert.equal(mod._test.alertTypeLabel('3'), 'monitor_paused');
    assert.equal(mod._test.alertTypeLabel('99'), 'unknown_alert_type');
    assert.equal(mod._test.alertTypeLabel(''), 'unknown_alert_type');
    assert.equal(mod._test.alertTypeLabel(null), 'unknown_alert_type');
  });

  test('constantTimeEqual: gleiche Strings = true', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    assert.equal(mod._test.constantTimeEqual('foo', 'foo'), true);
    assert.equal(mod._test.constantTimeEqual('', ''), true);
  });

  test('constantTimeEqual: andere Strings = false', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    assert.equal(mod._test.constantTimeEqual('foo', 'bar'), false);
    assert.equal(mod._test.constantTimeEqual('foo', 'foox'), false);  // unterschiedliche Laenge
    assert.equal(mod._test.constantTimeEqual('foo', null), false);
    assert.equal(mod._test.constantTimeEqual(null, 'foo'), false);
    assert.equal(mod._test.constantTimeEqual(undefined, undefined), false);
  });

  test('hashAlert: gleicher Alert in gleicher Stunde = gleicher Hash', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const p1 = { monitorID: '12345', alertType: '1' };
    const p2 = { monitorID: '12345', alertType: '1' };
    assert.equal(mod._test.hashAlert(p1), mod._test.hashAlert(p2));
  });

  test('hashAlert: anderer Monitor = anderer Hash', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const p1 = { monitorID: '12345', alertType: '1' };
    const p2 = { monitorID: '99999', alertType: '1' };
    assert.notEqual(mod._test.hashAlert(p1), mod._test.hashAlert(p2));
  });

  test('hashAlert: anderer alertType = anderer Hash', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const p1 = { monitorID: '12345', alertType: '1' };  // down
    const p2 = { monitorID: '12345', alertType: '2' };  // up
    assert.notEqual(mod._test.hashAlert(p1), mod._test.hashAlert(p2));
  });

  test('hashAlert: kurzer Hash (16 chars)', () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const h = mod._test.hashAlert({ monitorID: 'x', alertType: '1' });
    assert.equal(h.length, 16);
    assert.match(h, /^[0-9a-f]+$/);
  });
});

describe('uptime-webhook — HTTP-Handler', () => {

  beforeEach(() => {
    // Idempotenz-Cache zwischen Tests reset
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
  });

  test('OPTIONS preflight = 204', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const res = await mod.handler({
      httpMethod: 'OPTIONS',
      headers: {}, queryStringParameters: {}
    });
    assert.equal(res.statusCode, 204);
  });

  test('GET = 405 Method Not Allowed', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const res = await mod.handler({
      httpMethod: 'GET',
      headers: {}, queryStringParameters: {}
    });
    assert.equal(res.statusCode, 405);
  });

  test('POST ohne ENV-Secret = 500', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: null });
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'foo' },
      body: '{}'
    });
    assert.equal(res.statusCode, 500);
  });

  test('POST ohne Secret-Param = 401', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: {},
      body: '{}'
    });
    assert.equal(res.statusCode, 401);
  });

  test('POST mit falschem Secret = 401', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'WRONG' },
      body: '{}'
    });
    assert.equal(res.statusCode, 401);
  });

  test('POST mit korrektem Secret + JSON-Body = 200', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'test123' },
      body: JSON.stringify({
        monitorID: '12345',
        monitorFriendlyName: 'PROVA App',
        alertType: '1',
        alertDetails: 'Connection Timeout',
        alertDuration: '300'
      })
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.action, 'outage_start');
    assert.equal(body.monitor.id, '12345');
  });

  test('Idempotenz: 2x identischer Alert = zweite ist deduplicated', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();

    const event = {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'test123' },
      body: JSON.stringify({ monitorID: '99', alertType: '1' })
    };

    const r1 = await mod.handler(event);
    const r2 = await mod.handler(event);

    assert.equal(r1.statusCode, 200);
    assert.equal(r2.statusCode, 200);
    const b1 = JSON.parse(r1.body);
    const b2 = JSON.parse(r2.body);
    assert.equal(b1.deduplicated, undefined);  // first hit not flagged
    assert.equal(b2.deduplicated, true);
    assert.equal(b1.alert_hash, b2.alert_hash);
  });

  test('POST mit form-encoded body = 200 (legacy UptimeRobot)', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      queryStringParameters: { secret: 'test123' },
      body: 'monitorID=999&alertType=2&monitorFriendlyName=Test+Monitor'
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.action, 'outage_recovery');
    assert.equal(body.monitor.id, '999');
  });

  test('POST mit invalidem Body (nicht JSON, nicht form) = 400', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'test123' },
      body: 'this-is-not-json-{{{'
    });
    assert.equal(res.statusCode, 400);
  });

  test('POST mit alertType=2 (recovery) wird korrekt gelabelt', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'test123' },
      body: JSON.stringify({ monitorID: 'r-1', alertType: '2' })
    });
    assert.equal(JSON.parse(res.body).action, 'outage_recovery');
  });

  test('POST mit unbekanntem alertType = unknown_alert_type', async () => {
    const mod = loadModule({ UPTIME_WEBHOOK_SECRET: 'test123' });
    mod._test.resetIdempotencyCache();
    const res = await mod.handler({
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      queryStringParameters: { secret: 'test123' },
      body: JSON.stringify({ monitorID: 'u-1', alertType: '99' })
    });
    assert.equal(JSON.parse(res.body).action, 'unknown_alert_type');
  });
});
