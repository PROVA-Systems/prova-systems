/**
 * PROVA — Admin-Auth-Guard fuer Marcel-only Endpoints
 * MEGA-MEGA N3 (03.05.2026)
 *
 * Pattern wie requireAuth, aber zusaetzlich:
 *  - Email-Whitelist (Marcel-Founder-Account + ggf. zukuenftige Co-Founders)
 *  - Audit-Trail-Eintrag bei JEDER Admin-Aktion
 *  - Rate-Limit pro Admin-Endpoint
 *
 * Usage:
 *   const { requireAdmin } = require('./lib/admin-auth-guard');
 *   exports.handler = withSentry(requireAdmin(async (event, context) => {
 *     // context.adminEmail garantiert
 *     // ...
 *   }, { functionName: 'admin-pilot-list' }));
 */

'use strict';

const { resolveUser } = require('./auth-resolve');
const { getCorsHeaders } = require('./cors-helper');
const { createClient } = require('@supabase/supabase-js');
const RateLimit = require('./rate-limit-user');

// HARDCODED Whitelist — erweiterbar fuer zukuenftige Admins.
// Bewusst nicht aus ENV (verhindert versehentliche Prod-Aenderung).
const ADMIN_EMAILS = [
  'marcel.schreiber891@gmail.com',
  'marcel@prova-systems.de',
  'kontakt@prova-systems.de',
  'admin@prova-systems.de'
];

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  _supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabaseAdmin;
}

function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

function jsonResponse(event, statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

async function adminAuditLog(adminEmail, action, details, event) {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  try {
    const ip = (event && event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'])) || 'unknown';
    const ua = (event && event.headers && (event.headers['user-agent'] || '')).toString().slice(0, 200);
    await sb.from('audit_trail').insert({
      workspace_id: null,
      user_id: null,
      typ: 'admin.' + action,
      sv_email: adminEmail,
      details: JSON.stringify(Object.assign({ ip: ip, ua: ua, ts: new Date().toISOString() }, details || {}))
    });
  } catch (e) {
    console.warn('[admin-audit] insert failed:', e.message);
  }
}

/**
 * Wraps Handler. Pre-Checks:
 *  1. Auth-Token via resolveUser (Supabase JWT oder HMAC-Fallback)
 *  2. Email-Whitelist
 *  3. 2FA-Pflicht (AAL2) — opt-out via opts.require2FA = false
 *  4. Rate-Limit pro Admin-Endpoint (10 / Min / Email)
 *  5. Audit-Trail-Eintrag (auch bei Reject)
 *
 * opts: { functionName, rateLimit?: { max, windowSec }, require2FA?: boolean }
 */
function requireAdmin(handler, opts) {
  const fnName = (opts && opts.functionName) || 'admin-unknown';
  const rl = (opts && opts.rateLimit) || { max: 10, windowSec: 60 };
  // O4 AUTH-PERFEKT 2.0: 2FA-Pflicht fuer Admin-Endpoints.
  // Default: an. Opt-out via require2FA=false (z.B. fuer admin-pilot-list
  // wenn waehrend einer Setup-Phase Marcel noch kein 2FA hat).
  const require2FA = !(opts && opts.require2FA === false);
  // PROVA_ADMIN_REQUIRE_2FA=false in ENV deaktiviert global (Notfall).
  const globalEnable2FA = String(process.env.PROVA_ADMIN_REQUIRE_2FA || 'true').toLowerCase() !== 'false';

  return async function (event, context) {
    const method = String((event && event.httpMethod) || '').toUpperCase();
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
    }

    const u = await resolveUser(event);

    if (!u || !u.email) {
      await adminAuditLog('[unknown]', fnName + '.unauthorized', { reason: 'no-token' }, event);
      return jsonResponse(event, 401, { error: 'Authentifizierung erforderlich', code: 'UNAUTHORIZED' });
    }

    if (u.mismatch) {
      await adminAuditLog(u.mismatch.tokenEmail || '[mismatch]', fnName + '.mismatch', u.mismatch, event);
      return jsonResponse(event, 403, { error: 'Auth-Mismatch', code: 'AUTH_MISMATCH' });
    }

    if (!isAdmin(u.email)) {
      await adminAuditLog(u.email, fnName + '.forbidden', { reason: 'not-in-admin-whitelist' }, event);
      return jsonResponse(event, 403, { error: 'Admin-Zugriff erforderlich', code: 'NOT_ADMIN' });
    }

    // 2FA-Check. Nur fuer Supabase-JWTs anwendbar (HMAC-Token haben kein aal-Claim).
    if (require2FA && globalEnable2FA) {
      const aal = (u.tokenPayload && u.tokenPayload.aal) || null;
      const tokenSource = (u.tokenPayload && u.tokenPayload._source) || null;
      // Nur Supabase-Sessions koennen aal2 erreichen. HMAC-Token wird durchgelassen
      // (Backward-Compat fuer Test-Skripte und alten Auth-Stack).
      if (tokenSource === 'supabase' && aal !== 'aal2') {
        await adminAuditLog(u.email, fnName + '.no_2fa', { aal: aal || 'unset' }, event);
        return jsonResponse(event, 403, {
          error: '2FA-Pflicht fuer Admin-Zugriff. Bitte aktiviere 2FA in deinem Account und logge dich neu ein.',
          code: 'AAL2_REQUIRED',
          hint: 'Supabase Account-Settings -> Multi-Factor Authentication -> TOTP-App registrieren'
        });
      }
    }

    // Rate-Limit pro Admin-Email + Endpoint (verhindert Skript-Missbrauch wenn Token leakt)
    const rlResult = RateLimit.check(u.email + ':' + fnName, rl.max, rl.windowSec, { event, functionName: fnName });
    if (!rlResult.allowed) {
      await adminAuditLog(u.email, fnName + '.rate_limit', { retryAfter: rlResult.retryAfter }, event);
      return jsonResponse(event, 429, {
        error: 'Rate-Limit erreicht. Bitte ' + rlResult.retryAfter + 's warten.',
        code: 'RATE_LIMIT',
        retryAfter: rlResult.retryAfter
      });
    }

    // Audit-Trail bei JEDER Admin-Aktion (auch nur Read)
    await adminAuditLog(u.email, fnName + '.invoked', { method: method }, event);

    context = context || {};
    context.adminEmail = u.email;
    context.user = u.tokenPayload;

    return handler(event, context);
  };
}

module.exports = {
  requireAdmin,
  isAdmin,
  ADMIN_EMAILS,
  adminAuditLog,
  jsonResponse,
  getSupabaseAdmin
};
