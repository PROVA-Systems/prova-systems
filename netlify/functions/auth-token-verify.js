/**
 * PROVA — auth-token-verify.js
 * S-SICHER P4A.3 (25.04.2026)
 *
 * Verifiziert einen HMAC-signierten PROVA-Auth-Token.
 *
 * Akzeptiert:
 *  - Authorization: Bearer <token>   (Standard, fuer geschuetzte Functions)
 *  - POST { token: '...' }            (Convenience für Frontend)
 *  - GET  ?token=...                  (Debug, NICHT fuer Produktion-Linking)
 *
 * Antworten:
 *   200 { valid: true, payload: { sub, sv_id, plan, iat, exp } }
 *   401 { valid: false, error: 'no token' | 'invalid or expired' }
 *
 * Diese Function ist die Kanon-Stelle fuer Token-Pruefung. Andere Functions
 * (kommt in Sprint 3 P4B) koennen alternativ direkt lib/auth-token.js
 * importieren — kein zusaetzlicher HTTP-Roundtrip noetig.
 */

'use strict';

const AuthToken = require('./lib/auth-token');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

function j(event, statusCode, obj) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, getCorsHeaders(event)),
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  // S-SICHER P4A.3-fix: case-insensitiver Method-Check + Diagnostic.
  const method = String((event && event.httpMethod) || '').toUpperCase();
  if (method === 'OPTIONS') return corsOptionsResponse(event);
  if (method !== 'POST' && method !== 'GET') {
    console.warn('[auth-token-verify] 405 — method=' + JSON.stringify(event && event.httpMethod));
    return j(event, 405, { error: 'Method Not Allowed' });
  }
  // Body/Header-Lookups arbeiten weiter mit event.httpMethod, das ist OK.

  let token = '';

  // 1. Authorization: Bearer ...
  const authHdr = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (authHdr.toLowerCase().startsWith('bearer ')) {
    token = authHdr.slice(7).trim();
  }

  // 2. POST-Body { token }
  if (!token && method === 'POST' && event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body && typeof body.token === 'string') token = body.token;
    } catch (e) { /* ignore */ }
  }

  // 3. GET ?token=...
  if (!token && method === 'GET' && event.queryStringParameters) {
    const qt = event.queryStringParameters.token;
    if (typeof qt === 'string') token = qt;
  }

  if (!token) return j(event, 401, { valid: false, error: 'no token' });

  const payload = AuthToken.verify(token);
  if (!payload) return j(event, 401, { valid: false, error: 'invalid or expired' });

  return j(event, 200, { valid: true, payload: payload });
};
