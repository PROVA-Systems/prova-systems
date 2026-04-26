/**
 * PROVA — netlify/functions/lib/auth-resolve.js
 * S-SICHER P4B.1c (26.04.2026)
 *
 * Wiederverwendbare User-Resolution fuer alle Functions. Extrahiert die
 * Logik aus airtable.js P4A.6, vereinfacht fuer den STRICT-Modus von
 * Sprint 03: kein _userEmail-Fallback mehr — Token ist Pflicht. Wenn
 * Caller Token UND _userEmail schickt, muessen sie uebereinstimmen
 * (sonst Mismatch — best-effort Audit-Log + Caller liefert 403).
 *
 * Token-Quellen (in dieser Reihenfolge):
 *   1. Authorization: Bearer <token>
 *   2. Cookie: prova_auth=<token>
 *
 * Verify-Logik in lib/auth-token.js: HMAC-SHA256, exp-Pruefung,
 * timing-safe Compare, returnt null bei Fehler statt zu werfen.
 *
 * API
 *   resolveUser(event) -> { email, source, mismatch, tokenPayload }
 *     email:        Token-sub.lowerCase oder null
 *     source:       'token' bei Erfolg, null sonst
 *     mismatch:     { tokenEmail, otherEmail, otherSource } bei Konflikt
 *     tokenPayload: das ganze verifizierte Token-Payload (sub, sv_id,
 *                   plan, verified, provisional, iat, exp, ...)
 *
 *   logAuthFailure(reason, event, extras)
 *     Console.warn + best-effort AUDIT_TRAIL-Insert.
 *     reason: 'Auth-Required' | 'Auth-Mismatch' | 'Rate-Limit'
 */

'use strict';

const T = require('./auth-token');

function getTokenPayload(event) {
  let tok = null;

  // 1. Authorization: Bearer <token>
  const headers = event && event.headers ? event.headers : {};
  const auth = headers.authorization || headers.Authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    tok = auth.replace(/^Bearer\s+/i, '').trim();
  }

  // 2. Cookie: prova_auth=<token>
  if (!tok) {
    const cookie = headers.cookie || headers.Cookie;
    if (cookie) {
      const m = cookie.match(/(?:^|;\s*)prova_auth=([^;]+)/);
      if (m) {
        try { tok = decodeURIComponent(m[1]); } catch (e) {}
      }
    }
  }

  if (!tok) return null;

  try {
    return T.verify(tok);
  } catch (e) {
    return null;
  }
}

function resolveUser(event) {
  const tokenPayload = getTokenPayload(event);
  const tokenEmail = (tokenPayload && tokenPayload.sub)
    ? String(tokenPayload.sub).toLowerCase()
    : null;

  if (!tokenEmail) {
    return { email: null, source: null, mismatch: null, tokenPayload: null };
  }

  // Defense-in-depth Cross-Check: wenn der Caller zusaetzlich body._userEmail
  // schickt (Legacy-Frontend-Code), MUSS es mit dem Token uebereinstimmen —
  // sonst ist's entweder Bug oder Identitaets-Spoofing.
  let bodyEmail = null;
  try {
    const body = JSON.parse(event.body || '{}');
    if (body._userEmail && typeof body._userEmail === 'string') {
      bodyEmail = body._userEmail.toLowerCase();
    }
  } catch (e) {}

  if (bodyEmail && bodyEmail !== tokenEmail) {
    return {
      email: null,
      source: null,
      mismatch: { tokenEmail: tokenEmail, otherEmail: bodyEmail, otherSource: 'body' },
      tokenPayload: null
    };
  }

  return {
    email: tokenEmail,
    source: 'token',
    mismatch: null,
    tokenPayload: tokenPayload
  };
}

function logAuthFailure(reason, event, extras) {
  const headers = (event && event.headers) || {};
  const ua = String(headers['user-agent'] || '').slice(0, 120);
  const ip = headers['x-nf-client-connection-ip'] || headers['client-ip'] || 'unknown';
  const path = (event && (event.path || event.rawPath)) || '';

  try {
    console.warn('[auth-resolve] ' + reason, JSON.stringify(Object.assign({ ip: ip, ua: ua, path: path }, extras || {})));
  } catch (e) {}

  // Best-effort AUDIT_TRAIL — nie await, nie blocken.
  const pat = process.env.AIRTABLE_PAT;
  const base = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
  if (!pat) return;

  const sv_email = (extras && (extras.tokenEmail || extras.sv_email)) || 'unbekannt';
  // tblqQmMwJKxltXXXl = AUDIT_TRAIL
  try {
    fetch('https://api.airtable.com/v0/' + base + '/tblqQmMwJKxltXXXl', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + pat,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            typ: reason,
            sv_email: sv_email,
            details: JSON.stringify(Object.assign({
              ts: new Date().toISOString(),
              path: path,
              ip: ip,
              ua: ua
            }, extras || {}))
          }
        }]
      })
    }).catch(function () { /* best-effort */ });
  } catch (e) { /* fetch nicht verfuegbar — Netlify hat global fetch */ }
}

module.exports = {
  resolveUser: resolveUser,
  getTokenPayload: getTokenPayload,
  logAuthFailure: logAuthFailure
};
