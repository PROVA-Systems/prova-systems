/**
 * PROVA — netlify/functions/lib/supabase-jwt.js
 * Cutover Block 3 Phase 2 (Option C, 01.05.2026)
 *
 * Server-side Verifikation von Supabase-Auth JWTs (asymmetric ES256, ECC P-256).
 * Supabase nutzt seit Mai 2025 standardmaessig den neuen JWT-Stack mit
 * JWKS-Endpoint (statt symmetric HS256). Wir verifizieren via Public-Key,
 * den jose's createRemoteJWKSet automatisch holt + cached (default 10min TTL,
 * 30s cooldown bei Network-Issues, automatischer Background-Refresh).
 *
 * ENV (alle PROVA-Prefix damit kein Konflikt mit anderen Supabase-ENVs):
 *   PROVA_SUPABASE_JWKS_URL    — Pflicht
 *     z.B. https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json
 *   PROVA_SUPABASE_PROJECT_URL — optional, sonst aus JWKS_URL abgeleitet
 *     z.B. https://cngteblrbpwsyypexjrv.supabase.co
 *
 * jose (^6.x) ist ESM-only — wir laden sie via dynamic import in async Funktionen.
 *
 * API
 *   verify(token) -> Promise<payload | null>
 *     Returnt das verifizierte JWT-Payload bei Erfolg.
 *     Returnt null bei: Format-Fehler, Signature-Fehler, expired, audience-Mismatch,
 *                      issuer-Mismatch, JWKS-Network-Fehler, Server-Misconfig.
 *     Niemals throw — Caller checkt nur auf null.
 *
 * Standard Supabase-JWT-Claims:
 *   { iss, sub (uuid), aud:'authenticated', email, exp, iat, role, ... }
 */

'use strict';

let _josePromise = null;       // Cache fuer dynamic import
let _jwks = null;              // Cache fuer createRemoteJWKSet

function getJose() {
  if (!_josePromise) {
    _josePromise = import('jose');
  }
  return _josePromise;
}

function getJwksUrl() {
  return process.env.PROVA_SUPABASE_JWKS_URL || '';
}

function getProjectUrl() {
  // Bevorzugt explizite ENV, sonst dynamisch aus JWKS_URL ableiten
  // (z.B. https://x.supabase.co/auth/v1/.well-known/jwks.json
  //   →   https://x.supabase.co)
  const explicit = process.env.PROVA_SUPABASE_PROJECT_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const jwks = getJwksUrl();
  return jwks.replace(/\/auth\/v1\/\.well-known\/jwks\.json$/, '');
}

async function getJwksSet() {
  if (_jwks) return _jwks;
  const url = getJwksUrl();
  if (!url) {
    console.warn('[supabase-jwt] PROVA_SUPABASE_JWKS_URL fehlt');
    return null;
  }
  const jose = await getJose();
  _jwks = jose.createRemoteJWKSet(new URL(url));
  return _jwks;
}

async function verify(token) {
  if (!token || typeof token !== 'string') return null;
  if (token.split('.').length !== 3) return null;   // kein JWT-Format

  const JWKS = await getJwksSet();
  if (!JWKS) return null;

  const jose = await getJose();
  const projectUrl = getProjectUrl();
  const issuer = projectUrl ? projectUrl + '/auth/v1' : null;

  try {
    const verifyOpts = {
      audience: 'authenticated',
      algorithms: ['ES256']
    };
    if (issuer) verifyOpts.issuer = issuer;

    const { payload } = await jose.jwtVerify(token, JWKS, verifyOpts);

    if (!payload || !payload.email) {
      console.warn('[supabase-jwt] Verify OK, aber kein email-Claim');
      return null;
    }
    return payload;
  } catch (e) {
    // expected: expired, invalid signature, malformed, audience mismatch, key rotation
    // Wir loggen nur den Fehler-Typ, nicht das Token (PII).
    const reason = (e && e.code) || (e && e.name) || 'unknown';
    console.info('[supabase-jwt] verify rejected:', reason);
    return null;
  }
}

module.exports = {
  verify: verify,
  // exposed fuer Tests / Debug
  _getProjectUrl: getProjectUrl,
  _getJwksUrl: getJwksUrl
};
