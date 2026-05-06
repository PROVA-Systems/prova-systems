/**
 * PROVA — ical-subscribe-url.js (MEGA³⁰ W10b-I8)
 *
 * Liefert dem User einen authentifizierten webcal://-URL mit HMAC-Token,
 * den er in seine Calendar-App einfügen kann (Apple Cal, Outlook, Google Calendar).
 *
 * GET /.netlify/functions/ical-subscribe-url
 *   → 200 { webcal_url, https_url, token }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { _test } = require('./generate-ical');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const token = _test.generateIcalToken(context.userEmail);
  if (!token) return jsonResponse(event, 503, { error: 'ICAL_TOKEN_SECRET nicht konfiguriert' });

  const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers.host)) || 'prova-systems.netlify.app';
  const path = '/.netlify/functions/generate-ical?token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(context.userEmail);

  return jsonResponse(event, 200, {
    https_url: 'https://' + host + path,
    webcal_url: 'webcal://' + host + path,
    token: token
  });
}), { functionName: 'ical-subscribe-url' });
