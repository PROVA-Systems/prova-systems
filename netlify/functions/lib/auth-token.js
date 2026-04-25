/**
 * PROVA — lib/auth-token.js
 * S-SICHER P4A.2 (25.04.2026) · Findings 1.2, 7.1, 7.2
 *
 * HMAC-signierter Session-Token für PROVA-Auth. JWT-ähnliches Format
 * ohne externe Library: base64url(payload).base64url(HMAC-SHA256(payload)).
 *
 * Inspiration: netlify/functions/pdf-proxy.js (Sprint S-SICHER P1, Token
 * für signierte PDF-Downloads — gleiches Konzept, hier auf Sessions
 * skaliert).
 *
 * API
 *   sign(payload, ttlSec)
 *     payload = { sub, sv_id, plan, ...beliebig } — sub PFLICHT (Email)
 *     ttlSec  = Lebensdauer in Sekunden, PFLICHT
 *     -> string token, oder wirft bei fehlendem Secret/Subject
 *
 *   verify(token)
 *     -> payload (Object) bei Erfolg
 *     -> null bei ungültiger Signatur, abgelaufenem exp, fehlerhaftem Format
 *     Niemals werfen — Caller checkt nur auf null.
 *
 * Sicherheits-Prinzipien
 *   - HMAC-SHA256 mit AUTH_HMAC_SECRET aus Netlify ENV
 *   - timingSafeEqual gegen Timing-Angriffe
 *   - Server-only Modul, NIE im Client laden (Secret darf nie raus)
 *   - Token sind self-contained: keine DB-Lookups bei verify()
 */

'use strict';

const crypto = require('crypto');

const ALG = 'sha256';

function getSecret() {
  const s = process.env.AUTH_HMAC_SECRET;
  if (!s || s.length < 32) {
    // Server-misconfig — Caller sollte das als 500 abbilden.
    const err = new Error('AUTH_HMAC_SECRET fehlt oder zu kurz');
    err.code = 'NO_AUTH_SECRET';
    throw err;
  }
  return s;
}

/**
 * URL-safe Base64 (kein +, /, =).
 */
function b64url(buf) {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf8');
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

/**
 * sign(payload, ttlSec)
 *   - payload muss `sub` enthalten (E-Mail des SV)
 *   - ttlSec ist Pflicht, kein Default — Caller entscheidet (7d Normal, 30min Admin)
 */
function sign(payload, ttlSec) {
  if (!payload || typeof payload !== 'object') throw new Error('payload muss Object sein');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('payload.sub (Email) fehlt');
  if (typeof ttlSec !== 'number' || ttlSec <= 0 || ttlSec > 365 * 24 * 60 * 60) {
    throw new Error('ttlSec muss Sekunden-Zahl > 0 und ≤ 1 Jahr sein');
  }

  const secret = getSecret();
  const now    = Math.floor(Date.now() / 1000);
  const full   = Object.assign({}, payload, {
    iat: now,
    exp: now + Math.floor(ttlSec)
  });

  const head = b64url(JSON.stringify(full));
  const sig  = crypto.createHmac(ALG, secret).update(head).digest();
  return head + '.' + b64url(sig);
}

/**
 * verify(token)
 *   - Returnt payload (Object) bei Erfolg
 *   - Returnt null bei Format-Fehler, ungültiger Signatur, abgelaufenem exp
 */
function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let secret;
  try { secret = getSecret(); }
  catch (e) { return null; }

  const [head, sig] = parts;

  // HMAC neu berechnen, timing-safe vergleichen
  const expected = crypto.createHmac(ALG, secret).update(head).digest();
  let received;
  try { received = fromB64url(sig); }
  catch (e) { return null; }
  if (received.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(received, expected)) return null;

  // Payload dekodieren
  let payload;
  try {
    payload = JSON.parse(fromB64url(head).toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;

  // Expiry prüfen
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;

  return payload;
}

module.exports = { sign: sign, verify: verify };
