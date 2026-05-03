/**
 * PROVA — Sentry Test-Endpoint
 * MEGA-SKALIERUNG M3 (03.05.2026)
 *
 * Triggert intentional einen Error damit Sentry-Integration verifiziert werden kann.
 * Schutz: Nur callbar mit ?secret=<PROVA_SENTRY_TEST_SECRET> ENV.
 *
 * Curl:
 *   curl https://app.prova-systems.de/.netlify/functions/sentry-test?secret=XYZ
 *   → 500 + Error in Sentry-Dashboard sichtbar
 */
'use strict';

const { getCorsHeaders } = require('./lib/cors-helper');
const { withSentry } = require('./lib/sentry-wrap');

exports.handler = withSentry(async function (event) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json; charset=utf-8' },
    getCorsHeaders(event)
  );

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const provided = (event.queryStringParameters && event.queryStringParameters.secret) || '';
  const expected = process.env.PROVA_SENTRY_TEST_SECRET || '';

  if (!expected || provided !== expected) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Set ?secret=<PROVA_SENTRY_TEST_SECRET>' })
    };
  }

  // Intentional throw → Sentry-Wrap captured + re-throws → Netlify 500
  throw new Error('PROVA Sentry-Test (' + new Date().toISOString() + ')');
}, { functionName: 'sentry-test' });
