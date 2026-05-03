/**
 * PROVA — auth-token-issue Rate-Limit + Lockout Test
 * MEGA-SKALIERUNG M1c (RL-01 Fix, 03.05.2026)
 *
 * Verifiziert Brute-Force-Schutz:
 *  - 5 Versuche / 15 Min / IP via lib/rate-limit-ip.js
 *  - 6. Versuch → 1h Lockout (separate Map, ueberlebt 15-Min-Window)
 *  - Lockout-Hits geben 429 + Retry-After
 *
 * Strategie: Tests kommen NIE in den Token-Sign-Pfad (Identity/Airtable nicht
 * erreicht), weil Rate-Limit + JSON-Parse-Fehler vorher greifen.
 *
 * USAGE: node --test tests/auth/auth-token-issue-rate-limit.test.js
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ENV (Token-Sign nicht erreicht, aber require-Time-Reads abgesichert)
process.env.AUTH_HMAC_SECRET = process.env.AUTH_HMAC_SECRET || 'test-secret-32-chars-minimum-length-pad';
process.env.URL              = process.env.URL || 'https://prova-systems.de';
process.env.AIRTABLE_PAT     = process.env.AIRTABLE_PAT || 'pat_test_dummy';

const HANDLER_PATH = path.resolve(__dirname, '../../netlify/functions/auth-token-issue.js');
const RL_LIB_PATH  = path.resolve(__dirname, '../../netlify/functions/lib/rate-limit-ip.js');

// Frischer Handler + Lockout-Map pro Test (sonst Bucket-Carry-over)
function loadHandler() {
  delete global._authTokenIssueLockout;
  if (global._authTokenIssueLockoutGc) {
    clearInterval(global._authTokenIssueLockoutGc);
    delete global._authTokenIssueLockoutGc;
  }
  delete require.cache[require.resolve(RL_LIB_PATH)];
  delete require.cache[require.resolve(HANDLER_PATH)];
  return require(HANDLER_PATH).handler;
}

function makePostEvent(ip, body) {
  return {
    httpMethod: 'POST',
    headers: {
      'x-forwarded-for': ip,
      host: 'app.prova-systems.de',
      origin: 'https://app.prova-systems.de'
    },
    body: body == null ? '' : body
  };
}

test('5 Versuche pass-through, 6. Versuch → 429 + 1h Lockout', async () => {
  const handler = loadHandler();
  const ip = '203.0.113.10';

  for (let i = 1; i <= 5; i++) {
    const r = await handler(makePostEvent(ip, '{invalid'));
    assert.equal(r.statusCode, 400, 'Versuch ' + i + ': erwartet 400 (Invalid JSON, Rate-Limit nicht erreicht)');
  }

  const r6 = await handler(makePostEvent(ip, '{invalid'));
  assert.equal(r6.statusCode, 429, 'Versuch 6: erwartet 429');
  assert.equal(r6.headers['Retry-After'], '3600', 'Retry-After = 3600s (1h Lockout)');
  const body6 = JSON.parse(r6.body);
  assert.equal(body6.retryAfter, 3600);
  assert.match(body6.error, /Stunde gesperrt/);
});

test('Lockout aktiv: weiterer Versuch innerhalb 1h gibt 429 mit verbleibender Zeit', async () => {
  const handler = loadHandler();
  const ip = '203.0.113.20';

  for (let i = 0; i < 6; i++) await handler(makePostEvent(ip, '{invalid'));

  const r7 = await handler(makePostEvent(ip, '{invalid'));
  assert.equal(r7.statusCode, 429, 'Versuch 7: LOCKOUT-HIT erwartet');
  const retryAfter = parseInt(r7.headers['Retry-After'], 10);
  assert.ok(retryAfter > 3500 && retryAfter <= 3600,
            'Retry-After (' + retryAfter + ') muss zwischen 3500 und 3600s liegen');
});

test('Verschiedene IPs werden separat rate-limited', async () => {
  const handler = loadHandler();
  const ipA = '203.0.113.30';
  const ipB = '203.0.113.31';

  for (let i = 0; i < 6; i++) await handler(makePostEvent(ipA, '{invalid'));
  const rA = await handler(makePostEvent(ipA, '{invalid'));
  assert.equal(rA.statusCode, 429, 'IP-A geblockt');

  const rB = await handler(makePostEvent(ipB, '{invalid'));
  assert.equal(rB.statusCode, 400, 'IP-B unabhaengig — Versuch 1 nicht geblockt');
});

test('OPTIONS-Preflight umgeht Rate-Limit (CORS)', async () => {
  const handler = loadHandler();
  const ip = '203.0.113.40';

  for (let i = 0; i < 10; i++) {
    const r = await handler({
      httpMethod: 'OPTIONS',
      headers: { 'x-forwarded-for': ip, origin: 'https://app.prova-systems.de' },
      body: ''
    });
    assert.notEqual(r.statusCode, 429, 'OPTIONS sollte nie 429 zurueckliefern');
  }
});

test('IP "unknown" (kein Header) wird nicht rate-limited', async () => {
  const handler = loadHandler();

  for (let i = 0; i < 10; i++) {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{invalid' });
    assert.equal(r.statusCode, 400, 'Ohne IP weiterhin 400 (kein Rate-Limit)');
  }
});

test('Aufraeumen: Intervalle stoppen damit node:test sauber terminiert', () => {
  if (global._authTokenIssueLockoutGc) {
    clearInterval(global._authTokenIssueLockoutGc);
    delete global._authTokenIssueLockoutGc;
  }
});
