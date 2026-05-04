/**
 * PROVA — log-legal-acceptance.js (Wrapper um record_einwilligung RPC)
 * MEGA²⁰ W84 (2026-05-08)
 *
 * Marcel-Decision A1: existing einwilligungen-Tabelle wiederverwenden
 * (KEIN legal_acceptances). Diese Lambda ist der Frontend-Endpoint
 * fuer Signup-Time-Acceptance + spaetere Re-Acceptance.
 *
 * POST /netlify/functions/log-legal-acceptance
 *   Body: {
 *     types: ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung', 'newsletter'?],
 *     onboarding_schritt?: 'signup'  // optional, fuer Audit
 *   }
 *   → fuer jeden type:
 *     1. SELECT id, version, inhalt_hash FROM rechtsdokumente WHERE typ=type AND aktuell=TRUE
 *     2. RPC record_einwilligung(typ, id, version, hash, ip, user_agent, ..., page_url)
 *   → returnt: { ok, results: [{ type, einwilligung_id?, error? }, ...], partial? }
 *
 * Marcel-Decision F2: Best-Effort. Bei Failure einer einzelnen Einwilligung
 * (z.B. rechtsdokument fehlt fuer 'newsletter'): partial: true. Andere
 * werden trotzdem geloggt. Frontend kann das Result analysieren.
 *
 * Wenn alle 3 Pflicht-Typen (agb/datenschutzerklaerung/avv) failen:
 * 500-Response. Sonst: 200 mit partial-Marker. Forced-Re-Consent
 * fangt User beim naechsten Login ab (existing get_pending_einwilligungen).
 *
 * Anti-Patterns vermieden:
 *   - KEIN legal_acceptances-Schema (existing einwilligungen-Tabelle)
 *   - KEINE neue ENUM-Werte (existing einwilligung_typ ENUM)
 *   - IP + user_agent automatisch (kein Frontend-Fake)
 *   - Audit-Log fire-and-forget bei jedem Call
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_TYPES = [
  'agb',
  'datenschutzerklaerung',
  'avv_auftragsverarbeitung',
  'newsletter',
  'cookies_marketing',
  'cookies_analytics',
  'ki_einsatz'
];

const PFLICHT_TYPES = ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung'];

function _extractIp(event) {
  // Netlify reicht client-IP via x-nf-client-connection-ip oder x-forwarded-for
  const headers = event.headers || {};
  return headers['x-nf-client-connection-ip']
    || (headers['x-forwarded-for'] || '').split(',')[0].trim()
    || null;
}

function _extractUserAgent(event) {
  const headers = event.headers || {};
  return headers['user-agent'] || null;
}

function _extractPageUrl(event) {
  const headers = event.headers || {};
  return headers['referer'] || headers['referrer'] || null;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  const userId = context.userId || context.user_id || null;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (!userId) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'no user_id' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['POST'] }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid JSON' }) };
  }

  const types = Array.isArray(body.types) ? body.types : null;
  if (!types || types.length === 0) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'types[] required (non-empty array)' }) };
  }

  // Validation: nur erlaubte Typen
  for (const t of types) {
    if (typeof t !== 'string' || VALID_TYPES.indexOf(t) === -1) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid type', value: t, valid: VALID_TYPES }) };
    }
  }

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  const ipAddress = _extractIp(event);
  const userAgent = _extractUserAgent(event);
  const pageUrl = _extractPageUrl(event);
  const onboardingSchritt = (typeof body.onboarding_schritt === 'string' ? body.onboarding_schritt : null);

  const results = [];

  for (const typ of types) {
    try {
      // 1) Aktuelles rechtsdokument finden
      const { data: rd, error: rdErr } = await sb.from('rechtsdokumente')
        .select('id, version, inhalt_hash')
        .eq('typ', typ)
        .eq('aktuell', true)
        .maybeSingle();

      if (rdErr) {
        if (/does not exist/i.test(rdErr.message)) {
          results.push({ type: typ, error: 'rechtsdokumente-table not migrated', code: 'MIGRATION_PENDING' });
          continue;
        }
        results.push({ type: typ, error: rdErr.message, code: 'RD_QUERY_FAILED' });
        continue;
      }

      if (!rd) {
        // Newsletter ist optional → kein rechtsdokument-Record noetig
        if (typ === 'newsletter' || typ === 'cookies_marketing' || typ === 'cookies_analytics') {
          // Fuer diese Typen kann record_einwilligung mit NULL doc_id + leerem hash geloggt werden
          // (existing RPC akzeptiert NULL)
          const { data: einwId, error: rpcErr } = await sb.rpc('record_einwilligung', {
            p_typ: typ,
            p_rechtsdokument_id: null,
            p_version: 'no-document',
            p_inhalt_hash: 'no-document',
            p_ip_address: ipAddress,
            p_user_agent: userAgent,
            p_session_id: null,
            p_onboarding_schritt: onboardingSchritt,
            p_page_url: pageUrl
          });
          if (rpcErr) {
            results.push({ type: typ, error: rpcErr.message, code: 'RPC_FAILED' });
          } else {
            results.push({ type: typ, einwilligung_id: einwId, ok: true });
          }
          continue;
        }
        // Fuer Pflicht-Typen ohne aktuelles Dokument: Fehler markieren
        results.push({ type: typ, error: 'kein aktuelles rechtsdokument fuer diesen Typ', code: 'NO_ACTIVE_DOC' });
        continue;
      }

      // 2) record_einwilligung RPC aufrufen
      const { data: einwId, error: rpcErr } = await sb.rpc('record_einwilligung', {
        p_typ: typ,
        p_rechtsdokument_id: rd.id,
        p_version: rd.version,
        p_inhalt_hash: rd.inhalt_hash,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_session_id: null,
        p_onboarding_schritt: onboardingSchritt,
        p_page_url: pageUrl
      });

      if (rpcErr) {
        results.push({ type: typ, error: rpcErr.message, code: 'RPC_FAILED' });
        continue;
      }

      results.push({ type: typ, einwilligung_id: einwId, ok: true, version: rd.version });
    } catch (e) {
      results.push({ type: typ, error: e.message, code: 'UNEXPECTED' });
    }
  }

  // Audit-Log fire-and-forget
  try {
    sb.from('audit_trail').insert({
      function_name: 'log-legal-acceptance',
      action: 'einwilligung.recorded',
      payload: {
        user_id: userId,
        types: types,
        results_count: results.length,
        success_count: results.filter(r => r.ok).length,
        onboarding_schritt: onboardingSchritt
      },
      result: 'ok'
    }).then(() => {}).catch(() => {});
  } catch (_) { /* fire-and-forget */ }

  // Outcome-Logic
  const successTypes = results.filter(r => r.ok).map(r => r.type);
  const failedTypes = results.filter(r => !r.ok).map(r => r.type);

  // Wenn ALLE Pflicht-Typen failed → 500
  const pflichtOk = PFLICHT_TYPES.filter(t => types.indexOf(t) !== -1)
    .every(t => successTypes.indexOf(t) !== -1 || types.indexOf(t) === -1);

  if (!pflichtOk && successTypes.length === 0) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({
      error: 'Alle Pflicht-Einwilligungen fehlgeschlagen',
      results: results
    }) };
  }

  // Sonst 200 mit partial-Marker falls einzelne fehlgeschlagen
  const partial = failedTypes.length > 0;
  return {
    statusCode: 200,
    headers: baseHeaders,
    body: JSON.stringify({
      ok: true,
      results: results,
      partial: partial,
      success_count: successTypes.length,
      failed_count: failedTypes.length,
      // Force-Later-Hint: User wird bei naechstem Login durch
      // get_pending_einwilligungen abgefangen falls Pflicht-Typen failed
      force_later: !pflichtOk
    })
  };
}), { functionName: 'log-legal-acceptance' });

// Test-Exports
exports._test = {
  VALID_TYPES,
  PFLICHT_TYPES,
  _extractIp,
  _extractUserAgent,
  _extractPageUrl
};
