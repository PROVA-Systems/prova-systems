/**
 * PROVA — auth-token-issue.js
 * S-SICHER P4A.3 (25.04.2026), erweitert P4A.3-fix-2 (Bridge)
 *
 * Login-Endpoint: POST { email, password } → 200 { token, sv }
 *
 * ⚠ BRUECKENLOESUNG — kein Endzustand
 * Bestehende User in Netlify Identity sind groesstenteils nicht
 * "confirmed" (Email-Confirmation-Klick wurde nie ausgefuehrt). Der
 * existierende Browser-Login in app-login-logic.js:248-285 hat einen
 * Fallback: bei Identity-400 mit error_description "...confirm..." setzt
 * er eine eigene Session ohne Identity-Bestaetigung. Dieser Function
 * spiegelt jetzt dasselbe Verhalten serverseitig, weil sonst alle
 * Bestands-User ausgesperrt waeren bis zum manuellen Confirm.
 *
 * AUDIT-REPORT Finding 7.1 ist damit NICHT vollstaendig geschlossen —
 * der Bypass ist jetzt explizit, geloggt, mit verified-Flag im Token.
 * AUTH-PERFEKT 2.0 (post-Pilot) wird:
 *   - Provisional-Tokens erkennen + zur Re-Confirmation zwingen, oder
 *   - eigenes bcrypt-Schema einfuehren (SACHVERSTAENDIGE.password_hash)
 *   - Identity-Bypass komplett eliminieren
 *
 * Token-Payload neu (P4A.3-fix-2):
 *   { sub, sv_id, plan, verified: boolean, provisional: boolean,
 *     iat, exp }
 *   verified=true   wenn Netlify Identity erfolgreich Passwort geprueft
 *   verified=false  wenn Provisional via Airtable-Existenz-Check
 *   (provisional ist nur Convenience-Spiegel von !verified)
 *
 * Flow:
 *  1. E-Mail/Passwort-Validation (Format)
 *  2. Netlify Identity grant_type=password
 *     200 OK              → verified=true, weiter zu Step 3
 *     400 + "confirm..."  → Provisional-Pfad (Step 3 mit Existenz-Check)
 *     400 sonst / 401/422 → 401 'E-Mail oder Passwort ungueltig'
 *  3. SACHVERSTAENDIGE-Lookup in Airtable
 *  4. Account-Status: Gesperrt → 403; Provisional ohne SV-Eintrag → 401
 *  5. AuthToken.sign() mit 7-Tage-TTL, verified-Flag eingebrannt
 *  6. Response { token, sv: {email, paket, status, subscription_status, ...} }
 *
 * Fehler-Pfade:
 *  - 400: Format-Fehler (E-Mail/Passwort fehlt oder Email-Regex fail)
 *  - 401: Identity hat abgelehnt UND/ODER Provisional-Pfad fand keinen SV
 *  - 403: Konto Gesperrt
 *  - 502: Identity-Backend nicht erreichbar
 *  - 500: Server-Misconfig (AUTH_HMAC_SECRET fehlt)
 *
 * ENV: AUTH_HMAC_SECRET, AIRTABLE_PAT, URL
 */

'use strict';

const AuthToken = require('./lib/auth-token');
const ProvaPseudo = require('./lib/prova-pseudo');
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
  // S-SICHER P4A.3-fix: case-insensitiver Method-Check + Diagnostic.
  // Marcel meldete 405 bei PowerShell Invoke-RestMethod -Method Post.
  // Wahrscheinlich liefert ein Caller die Methode lowercase oder
  // event.httpMethod ist gelegentlich undefined. Robuste Normalisierung.
  const method = String((event && event.httpMethod) || '').toUpperCase();
  if (method === 'OPTIONS') return corsOptionsResponse(event);
  if (method !== 'POST') {
    console.warn('[auth-token-issue] 405 — method=' + JSON.stringify(event && event.httpMethod) +
                 ' UA=' + JSON.stringify((event.headers || {})['user-agent']));
    return j(event, 405, { error: 'Method Not Allowed' });
  }

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
  // P4A.3-fix-2: Drei Outcomes — Identity-OK (verified), Identity-400 mit
  // "Email not confirmed" (Provisional-Fallback wie Browser-Login) oder
  // echtes Reject (401).
  const identityUrl = (process.env.URL || 'https://prova-systems.de') + '/.netlify/identity/token';

  // P4A.3-fix-3: Diagnose-Logging fuer Identity-Routing-Problem.
  // Marcel meldet: Direkt-Test gegen https://prova-systems.de/.netlify/
  // identity/token mit gleichen Credentials = 200 OK. Selbe Credentials
  // ueber unsere Function = 400 "no user found". Wir wissen jetzt nicht
  // welche URL die Function tatsaechlich aufruft. Einmaliger Log:
  console.log('[auth-token-issue] env-info', JSON.stringify({
    URL: process.env.URL || null,
    DEPLOY_URL: process.env.DEPLOY_URL || null,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL || null,
    SITE_NAME: process.env.SITE_NAME || null,
    host: (event.headers || {}).host || null,
    xfh: (event.headers || {})['x-forwarded-host'] || null,
    identityUrl: identityUrl
  }));

  let identityVerified = false;
  let identityProvisional = false;
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
      identityVerified = true;
    } else if (r.status === 400) {
      // Identity sagt 400 — koennte "Email not confirmed" sein.
      // Browser-Login hat den gleichen Fallback (app-login-logic.js:252-285).
      let errBody = {};
      try { errBody = await r.json(); } catch (e) { /* ignore */ }
      const desc = String(errBody.error_description || '').toLowerCase();
      if (desc.indexOf('confirm') !== -1) {
        // Provisional-Pfad: weiter zur SV-Existenz-Pruefung in Airtable.
        identityProvisional = true;
      } else {
        // P4A.3-fix-3: Volldetail-Log fuer Diagnose
        console.warn('[auth-token-issue] Identity 400 reject:', JSON.stringify({
          error: errBody.error || null,
          desc: desc.slice(0, 120),
          identityUrl: identityUrl
        }));
        return j(event, 401, { error: 'E-Mail oder Passwort ungueltig' });
      }
    } else {
      // P4A.3-fix-3: Volldetail-Log fuer non-200/non-400
      let raw = '';
      try { raw = (await r.text()).slice(0, 200); } catch (e) {}
      console.warn('[auth-token-issue] Identity non-OK:', JSON.stringify({
        status: r.status,
        raw: raw,
        identityUrl: identityUrl
      }));
      return j(event, 401, { error: 'E-Mail oder Passwort ungueltig' });
    }
  } catch (e) {
    console.error('[auth-token-issue] Identity-Backend nicht erreichbar:', e && e.message);
    return j(event, 502, { error: 'Auth-Backend voruebergehend nicht erreichbar' });
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

  // ── 3a. Provisional-Pfad: ohne SV-Eintrag KEIN Token ──────────────────
  // P4A.3-fix-2: Wenn Identity das Passwort nicht verifiziert hat,
  // muss zumindest die E-Mail einem bestehenden SACHVERSTAENDIGE-Record
  // zugeordnet sein. Sonst Provisional-Login fuer beliebige fremde Email
  // moeglich.
  if (identityProvisional && !svRecordId) {
    console.warn('[auth-token-issue] Provisional-Pfad ohne SV-Eintrag — abgelehnt:', ProvaPseudo.apply(email));
    return j(event, 401, { error: 'E-Mail oder Passwort ungueltig' });
  }

  // ── 3b. Account-Status-Check (Gesperrt → kein Token) ──────────────────
  if (status === 'Gesperrt') {
    return j(event, 403, { error: 'Konto gesperrt' });
  }

  // ── 4. HMAC-Token signieren ───────────────────────────────────────────
  // P4A.3-fix-2: verified=true nur wenn Identity OK war, sonst false.
  // provisional ist Convenience-Spiegel von !verified.
  if (identityProvisional) {
    console.log('[auth] Provisional login (Identity unconfirmed):', ProvaPseudo.apply(email));
  }
  let token;
  try {
    token = AuthToken.sign({
      sub:         email,
      sv_id:       svRecordId,
      plan:        paket,
      verified:    identityVerified,
      provisional: !identityVerified
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
      testpilot:           !!svFields.testpilot,
      // P4A.3-fix-2: Frontend kann darauf reagieren (z. B. Banner
      // "Bitte E-Mail bestaetigen" in AUTH-PERFEKT 2.0).
      verified:            identityVerified,
      provisional:         !identityVerified
    }
  });
};
