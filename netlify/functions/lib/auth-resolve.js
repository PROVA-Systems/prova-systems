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
const SupabaseJWT = require('./supabase-jwt');

/**
 * Async Token-Resolution. Cutover Block 3 Phase 2 (Option C, 01.05.2026):
 *  1. Versuche zuerst Supabase-JWT (3-Teiler) — Migration-Vorrang
 *  2. Fallback: Legacy PROVA-HMAC-Token (2-Teiler)
 * Das Mapping unten normalisiert beide Token-Quellen auf das gleiche
 * Payload-Schema (sub=email lowercase, sv_id, plan, verified, iat, exp,
 * _source) damit Caller transparent weiterarbeiten.
 */
async function getTokenPayload(event) {
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

  const parts = tok.split('.');

  // 1) Supabase-JWT (3-Teiler header.payload.signature) — Migration-Vorrang
  if (parts.length === 3) {
    const sp = await SupabaseJWT.verify(tok);
    if (sp) {
      console.info('[auth] Verified via supabase-jwt');
      return {
        sub:      String(sp.email).toLowerCase(),  // PROVA: sub = Email lowercase
        sv_id:    sp.sub,                          // Supabase-User-UUID
        plan:     'unknown',                       // optional, aus DB falls noetig
        verified: true,
        iat:      sp.iat,
        exp:      sp.exp,
        _source:  'supabase'
      };
    }
    return null;   // 3-Teiler aber Supabase-Verify failed → ungueltig
  }

  // 2) Legacy PROVA-HMAC-Token (2-Teiler head.sig) — Fallback
  if (parts.length === 2) {
    try {
      const payload = T.verify(tok);
      if (payload) {
        console.info('[auth] Verified via legacy-hmac');
        return Object.assign({}, payload, { _source: 'hmac' });
      }
    } catch (e) {}
  }

  return null;
}

async function resolveUser(event) {
  const tokenPayload = await getTokenPayload(event);
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

// P4B.1d: Pseudonymisierung der Email vor jedem Logging.
// Bei Auth-Failures kann die "Email" ein Angreifer-Payload sein — wir
// wollen sie nicht in roher Form in console-Logs oder AUDIT_TRAIL haben.
// ProvaPseudo.apply ersetzt erkannte E-Mail-Patterns durch [E-MAIL].
function pseudoEmail(s) {
  if (!s || typeof s !== 'string') return 'unknown';
  try {
    const ProvaPseudo = require('./prova-pseudo');
    const out = ProvaPseudo.apply(s);
    // ProvaPseudo.apply gibt z.B. '[E-MAIL]' zurueck; wenn der Input gar
    // keine erkennbare Email war, lassen wir 'unknown'.
    if (!out || out === s) return 'unknown';
    return out;
  } catch (e) {
    return 'unknown';
  }
}

function logAuthFailure(reason, event, extras) {
  const headers = (event && event.headers) || {};
  const ua = String(headers['user-agent'] || '').slice(0, 120);
  const ip = headers['x-nf-client-connection-ip'] || headers['client-ip'] || 'unknown';
  const path = (event && (event.path || event.rawPath)) || '';

  // Pseudonymisierte Email-Felder fuer Konsole + AUDIT_TRAIL
  const rawEmail = (extras && (extras.tokenEmail || extras.sv_email)) || '';
  const pseudoMail = pseudoEmail(rawEmail);

  // extras-Kopie mit pseudonymisierten Email-Feldern (otherEmail kann Mismatch-Body-Email sein)
  const safeExtras = Object.assign({}, extras || {});
  if (safeExtras.tokenEmail) safeExtras.tokenEmail = pseudoEmail(safeExtras.tokenEmail);
  if (safeExtras.sv_email)   safeExtras.sv_email   = pseudoEmail(safeExtras.sv_email);
  if (safeExtras.otherEmail) safeExtras.otherEmail = pseudoEmail(safeExtras.otherEmail);

  try {
    console.warn('[auth-resolve] ' + reason, JSON.stringify(Object.assign(
      { ip: ip, ua: ua, path: path, sv_email: pseudoMail },
      safeExtras
    )));
  } catch (e) {}

  // Best-effort AUDIT_TRAIL — nie await, nie blocken.
  const pat = process.env.AIRTABLE_PAT;
  const base = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
  if (!pat) return;

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
            sv_email: pseudoMail,
            details: JSON.stringify(Object.assign({
              ts: new Date().toISOString(),
              path: path,
              ip: ip,
              ua: ua
            }, safeExtras))
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
