'use strict';

const test = require('node:test');
const assert = require('node:assert');

// ENV setzen vor require
process.env.ICAL_TOKEN_SECRET = 'test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const { _test } = require('../../netlify/functions/generate-ical');
const { generateIcalToken, verifyIcalToken } = _test;

test('iCal-HMAC: Token generieren mit Secret', () => {
  const t = generateIcalToken('user@example.com');
  assert.ok(t);
  assert.strictEqual(t.length, 32);
  assert.match(t, /^[0-9a-f]{32}$/);
});

test('iCal-HMAC: Token deterministisch (gleicher Email → gleicher Token)', () => {
  const a = generateIcalToken('user@example.com');
  const b = generateIcalToken('user@example.com');
  assert.strictEqual(a, b);
});

test('iCal-HMAC: Email case-insensitive', () => {
  const a = generateIcalToken('User@Example.COM');
  const b = generateIcalToken('user@example.com');
  assert.strictEqual(a, b);
});

test('iCal-HMAC: andere Email → anderer Token', () => {
  const a = generateIcalToken('a@example.com');
  const b = generateIcalToken('b@example.com');
  assert.notStrictEqual(a, b);
});

test('iCal-HMAC: verify gültiger Token → true', () => {
  const t = generateIcalToken('user@example.com');
  assert.strictEqual(verifyIcalToken('user@example.com', t), true);
});

test('iCal-HMAC: verify falscher Token → false', () => {
  assert.strictEqual(verifyIcalToken('user@example.com', '0'.repeat(32)), false);
});

test('iCal-HMAC: verify falsche Email zu gültigem Token → false', () => {
  const t = generateIcalToken('user@example.com');
  assert.strictEqual(verifyIcalToken('hacker@example.com', t), false);
});

test('iCal-HMAC: leerer Token → false', () => {
  assert.strictEqual(verifyIcalToken('user@example.com', ''), false);
  assert.strictEqual(verifyIcalToken('user@example.com', null), false);
});

test('iCal-HMAC: ohne ENV-Secret → null', () => {
  // Cache invalidieren
  delete process.env.ICAL_TOKEN_SECRET;
  delete require.cache[require.resolve('../../netlify/functions/generate-ical')];
  const { _test: t2 } = require('../../netlify/functions/generate-ical');
  assert.strictEqual(t2.generateIcalToken('user@example.com'), null);
  // Re-set für andere Tests
  process.env.ICAL_TOKEN_SECRET = 'test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
});

test('iCal-HMAC: timing-safe Vergleich (Längenunterschied → false ohne Throw)', () => {
  // verifyIcalToken muss bei Length-Mismatch sauber false zurückgeben
  assert.strictEqual(verifyIcalToken('user@example.com', 'tooShort'), false);
  assert.strictEqual(verifyIcalToken('user@example.com', 'x'.repeat(64)), false);
});
