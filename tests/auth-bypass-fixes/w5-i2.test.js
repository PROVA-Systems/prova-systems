/**
 * Tests für W5-I2 Auth-Bypass-Fixes (MEGA²⁸ V3.2-W5-I2)
 *
 * Befund aus W3-I7-Round-1: 6 Lambdas auf "ohne Auth-Check" geflaggt.
 * Re-Audit zeigt:
 *  - admin-ki-costs.js, admin-pilot-list.js, admin-stripe-kpis.js: ✅ requireAdmin (False-Alarm)
 *  - pilot-seats.js: ✅ public-by-design + RateLimitIp 60/min
 *  - redeem-referral-code.js: 🔴 fehlte Rate-Limit (gefixt in W5-I2)
 *  - sentry-test.js: 🟡 nur ?secret-Auth (gefixt: + NETLIFY_DEV-Gate)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FN = (name) => fs.readFileSync(path.join(ROOT, 'netlify', 'functions', name), 'utf8');

describe('W5-I2 — Admin-Lambdas: requireAdmin already in place', () => {
  ['admin-ki-costs.js', 'admin-pilot-list.js', 'admin-stripe-kpis.js'].forEach(file => {
    test(file + ' nutzt requireAdmin-Wrapper', () => {
      const src = FN(file);
      assert.match(src, /requireAdmin\(/);
      assert.match(src, /admin-auth-guard/);
    });
  });
});

describe('W5-I2 — Public-Lambdas: Rate-Limit-Coverage', () => {
  test('pilot-seats.js hat RateLimitIp (60/min) — already secured', () => {
    const src = FN('pilot-seats.js');
    assert.match(src, /RateLimitIp/);
    assert.match(src, /\.check\(event,\s*60/);
  });

  test('redeem-referral-code.js hat RateLimitIp (W5-I2 NEW)', () => {
    const src = FN('redeem-referral-code.js');
    assert.match(src, /RateLimitIp/);
    assert.match(src, /functionName:\s*['"]redeem-referral-code['"]/);
  });

  test('redeem-referral-code.js Rate-Limit ist 10/min (Code-Fishing-Schutz)', () => {
    const src = FN('redeem-referral-code.js');
    assert.match(src, /RateLimitIp\.check\(event,\s*10,\s*60/);
  });

  test('redeem-referral-code.js retourniert 429 bei Rate-Limit', () => {
    const src = FN('redeem-referral-code.js');
    assert.match(src, /statusCode:\s*429/);
    assert.match(src, /Retry-After/);
  });
});

describe('W5-I2 — sentry-test.js Defense-in-Depth (W5-I2 NEW)', () => {
  test('sentry-test.js hat ?secret-Query-Auth (already)', () => {
    const src = FN('sentry-test.js');
    assert.match(src, /PROVA_SENTRY_TEST_SECRET/);
    assert.match(src, /provided\s*!==\s*expected/);
  });

  test('sentry-test.js hat NETLIFY_DEV-Gate (W5-I2 NEW)', () => {
    const src = FN('sentry-test.js');
    assert.match(src, /NETLIFY_DEV/);
    assert.match(src, /PROVA_SENTRY_TEST_ENABLED/);
  });

  test('sentry-test.js gibt 403 in Production ohne explicit ENV-Flag', () => {
    const src = FN('sentry-test.js');
    assert.match(src, /statusCode:\s*403/);
    assert.match(src, /disabled in production/i);
  });
});
