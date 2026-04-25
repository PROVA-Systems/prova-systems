/**
 * PROVA — auth-token-issue.js
 * S-SICHER P4A.3 (25.04.2026)
 *
 * Login-Endpoint: POST { email, password } → 200 { token, sv }
 *
 * Flow:
 *  1. E-Mail/Passwort-Validation (Format)
 *  2. Netlify Identity grant_type=password — wenn fail: 401 generic
 *  3. SACHVERSTAENDIGE-Lookup in Airtable (paket, status, etc.)
 *  4. AuthToken.sign() mit 7-Tage-TTL
 *  5. Response { token, sv: {email, paket, status, subscription_status, ...} }
 *
 * Fehler-Pfade:
 *  - 400: Format-Fehler (E-Mail/Passwort fehlt oder Email-Regex fail)
 *  - 401: Identity hat abgelehnt — generic Message, kein Hint warum
 *  - 502: Identity-Backend nicht erreichbar
 *  - 500: Server-Misconfig (AUTH_HMAC_SECRET fehlt)
 *
 * ENV: AUTH_HMAC_SECRET, AIRTABLE_PAT, URL
 */

'use strict';

const AuthToken = require('./lib/auth-token');
const { isValidEmail, normalizeEmail, isStrongPassword } = require('./lib/auth-validate');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

const TTL_NORMAL = 7 * 24 * 60 * 60; // 7 Tage Standard-Session

const AT_BASE = 'appJ7bLlAHZoxENWE';
const AT_SV   = 'tbladqEQT3tmx4DIB';

function j(event, statusCode, obj) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, getCorsHeaders(event)),
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  if (event.httpMethod !== 'POST') return j(event, 405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return j(event, 400, { error: 'Invalid JSON' }); }

  // S-SICHER P4A.7: Validation via lib/auth-validate.js Helpers.
  const email    = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!email || !password) {
    return j(event, 400, { error: 'E-Mail und Passwort erforderlich' });
  }
  if (!isValidEmail(email)) {
    return j(event, 400, { error: 'E-Mail-Format ungueltig' });
  }
  if (!isStrongPassword(password)) {
    // 8-256 Zeichen — Netlify Identity prueft echten Hash, hier nur
    // Pre-Check gegen leere/Tausend-Zeichen-Bodies.
    return j(event, 400, { error: 'Passwort ungueltig' });
  }

  // ── 1. Netlify Identity password-grant ────────────────────────────────
  const identityUrl = (process.env.URL || 'https://prova-systems.de') + '/.netlify/identity/token';
  let identityOk = false;
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', email);
    params.append('password', password);
    const r = await fetch(identityUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (r.ok) {
      identityOk = true;
    } else {
      console.warn('[auth-token-issue] Netlify Identity returned', r.status);
    }
  } catch (e) {
    console.error('[auth-token-issue] Identity-Backend nicht erreichbar:', e && e.message);
    return j(event, 502, { error: 'Auth-Backend voruebergehend nicht erreichbar' });
  }

  if (!identityOk) {
    return j(event, 401, { error: 'E-Mail oder Passwort ungueltig' });
  }

  // ── 2. SV-Lookup in Airtable ──────────────────────────────────────────
  let svFields = {};
  let svRecordId = null;
  try {
    const filter = encodeURIComponent('{Email}="' + email.replace(/"/g, '\\"') + '"');
    const url = 'https://api.airtable.com/v0/' + AT_BASE + '/' + AT_SV +
                '?filterByFormula=' + filter + '&maxRecords=1';
    const r = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + (process.env.AIRTABLE_PAT || '') }
    });
    if (r.ok) {
      const data = await r.json();
      if (data.records && data.records.length > 0) {
        svRecordId = data.records[0].id;
        svFields   = data.records[0].fields || {};
      }
    } else {
      console.warn('[auth-token-issue] Airtable SV-Lookup HTTP', r.status);
    }
  } catch (e) {
    console.warn('[auth-token-issue] Airtable-Lookup-Fehler:', e && e.message);
  }

  const paket  = (svFields.Paket  && svFields.Paket.name)  ? svFields.Paket.name  : (svFields.Paket  || 'Solo');
  const status = (svFields.Status && svFields.Status.name) ? svFields.Status.name : (svFields.Status || 'Aktiv');

  // ── 3. Account-Status-Check (Gesperrt → kein Token) ───────────────────
  if (status === 'Gesperrt') {
    return j(event, 403, { error: 'Konto gesperrt' });
  }

  // ── 4. HMAC-Token signieren ───────────────────────────────────────────
  let token;
  try {
    token = AuthToken.sign({
      sub:   email,
      sv_id: svRecordId,
      plan:  paket
    }, TTL_NORMAL);
  } catch (e) {
    console.error('[auth-token-issue] Token-Signing fehlgeschlagen:', e && e.code);
    return j(event, 500, { error: 'Server misconfigured' });
  }

  // ── 5. Response ───────────────────────────────────────────────────────
  return j(event, 200, {
    token: token,
    sv: {
      email:               email,
      sv_record_id:        svRecordId,
      paket:               paket,
      status:              status,
      subscription_status: String(svFields.subscription_status || '').toLowerCase(),
      trial_end:           svFields.trial_end ? String(svFields.trial_end).slice(0, 10) : '',
      sv_vorname:          svFields.sv_vorname || svFields.Vorname  || '',
      sv_nachname:         svFields.sv_nachname || svFields.Nachname || '',
      testpilot:           !!svFields.testpilot
    }
  });
};
