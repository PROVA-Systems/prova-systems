/**
 * PROVA — netlify/functions/lib/jwt-middleware.js
 * S-SICHER P4B.1a (26.04.2026)
 *
 * Middleware-Wrapper fuer Netlify-Functions die HMAC-Token-Auth benoetigen.
 *
 * Usage:
 *   const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
 *
 *   exports.handler = requireAuth(async (event, context) => {
 *     const userEmail = context.userEmail;     // Token-sub
 *     const payload   = context.user;          // ganzes Payload
 *     // ... Function-Logik
 *     return jsonResponse(event, 200, { ok: true, user: userEmail });
 *   });
 *
 * Verhalten:
 *   - OPTIONS-Preflight wird ohne Auth-Pruefung mit CORS-Headers durchgereicht
 *   - Token vorhanden + valide -> handler() wird aufgerufen
 *   - Token fehlt oder invalid -> 401 + Audit-Log
 *   - Token vs body._userEmail Mismatch -> 403 + Audit-Log
 */

'use strict';

const { resolveUser, logAuthFailure } = require('./auth-resolve');
const { getCorsHeaders } = require('./cors-helper');

function jsonResponse(event, statusCode, obj, extraHeaders) {
  return {
    statusCode: statusCode,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8' },
      getCorsHeaders(event),
      extraHeaders || {}
    ),
    body: JSON.stringify(obj)
  };
}

function requireAuth(handler) {
  return async function (event, context) {
    const method = String((event && event.httpMethod) || '').toUpperCase();

    // CORS-Preflight ohne Auth-Pruefung — der Browser fragt vor jedem
    // cross-origin-Call, da darf kein 401 zurueckkommen.
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
    }

    const u = await resolveUser(event);

    if (u.mismatch) {
      logAuthFailure('Auth-Mismatch', event, u.mismatch);
      return jsonResponse(event, 403, {
        error: 'Auth-Mismatch: Token-Subject und Request-Identitaet stimmen nicht ueberein'
      });
    }

    if (!u.email) {
      logAuthFailure('Auth-Required', event, {
        ua: String((event.headers || {})['user-agent'] || '').slice(0, 60)
      });
      return jsonResponse(event, 401, {
        error: 'Authentifizierung erforderlich'
      });
    }

    // context._userEmail / .user fuer den Handler bereitstellen.
    // Achtung: clientContext kann undefined sein (Netlify ohne Identity).
    context = context || {};
    context.user = u.tokenPayload;
    context.userEmail = u.email;

    return handler(event, context);
  };
}

module.exports = {
  requireAuth: requireAuth,
  jsonResponse: jsonResponse
};
