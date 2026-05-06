/**
 * PROVA — rate-limit-helper.js Tests (MEGA²⁸ KORR-21)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'netlify/functions/lib/rate-limit-helper.js'));

describe('rate-limit-helper — checkAndIncrement', () => {
  test('erlaubt unter Limit', () => {
    Lib._reset();
    const r = Lib.checkAndIncrement('u1', 'test-fn', { max: 5, windowSec: 60 });
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, 4);
  });

  test('blockt über Limit', () => {
    Lib._reset();
    for (let i = 0; i < 5; i++) Lib.checkAndIncrement('u1', 'test-fn', { max: 5, windowSec: 60 });
    const r = Lib.checkAndIncrement('u1', 'test-fn', { max: 5, windowSec: 60 });
    assert.equal(r.allowed, false);
    assert.equal(r.remaining, 0);
    assert.ok(r.retryAfter >= 0 && r.retryAfter <= 60);
  });

  test('isoliert pro User', () => {
    Lib._reset();
    for (let i = 0; i < 5; i++) Lib.checkAndIncrement('u1', 'test-fn', { max: 5, windowSec: 60 });
    const r = Lib.checkAndIncrement('u2', 'test-fn', { max: 5, windowSec: 60 });
    assert.equal(r.allowed, true);
  });

  test('isoliert pro Function', () => {
    Lib._reset();
    for (let i = 0; i < 5; i++) Lib.checkAndIncrement('u1', 'fn-a', { max: 5, windowSec: 60 });
    const r = Lib.checkAndIncrement('u1', 'fn-b', { max: 5, windowSec: 60 });
    assert.equal(r.allowed, true);
  });

  test('Default-Limits aus DEFAULT_LIMITS', () => {
    assert.equal(Lib.DEFAULT_LIMITS['ki-proxy'].max, 30);
    assert.equal(Lib.DEFAULT_LIMITS['create-referral'].max, 5);
    assert.equal(Lib.DEFAULT_LIMITS.default.max, 60);
  });
});

describe('rate-limit-helper — rateLimitResponse', () => {
  test('returnt null bei allowed', () => {
    Lib._reset();
    const r = Lib.rateLimitResponse({}, { userId: 'u1', functionName: 'test', max: 5 });
    assert.equal(r, null);
  });

  test('returnt 429-Response bei blocked', () => {
    Lib._reset();
    for (let i = 0; i < 5; i++) Lib.rateLimitResponse({}, { userId: 'u1', functionName: 'test', max: 5 });
    const r = Lib.rateLimitResponse({}, { userId: 'u1', functionName: 'test', max: 5 });
    assert.equal(r.statusCode, 429);
    assert.match(r.body, /Rate-Limit/);
    assert.ok(r.headers['Retry-After']);
  });
});

describe('rate-limit-helper — rateLimitOrThrow', () => {
  test('throwt 429-Error bei blocked', async () => {
    Lib._reset();
    for (let i = 0; i < 3; i++) Lib.checkAndIncrement('u1', 'test', { max: 3, windowSec: 60 });
    await assert.rejects(
      async () => await Lib.rateLimitOrThrow({ userId: 'u1', functionName: 'test', max: 3 }),
      (err) => err.statusCode === 429
    );
  });

  test('returnt result bei allowed', async () => {
    Lib._reset();
    const r = await Lib.rateLimitOrThrow({ userId: 'u1', functionName: 'test', max: 5 });
    assert.equal(r.allowed, true);
  });
});

describe('rate-limit-helper — anonymer User', () => {
  test('user_id null wird als "anon" behandelt', () => {
    Lib._reset();
    const r1 = Lib.checkAndIncrement(null, 'test', { max: 5 });
    const r2 = Lib.checkAndIncrement(null, 'test', { max: 5 });
    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 3);
  });
});
