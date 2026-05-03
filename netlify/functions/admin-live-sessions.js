/**
 * PROVA — admin-live-sessions.js
 * MEGA⁴ Q6 (04.05.2026) — AUTH-COCKPIT Voll-Sektion 1
 *
 * Listet aktive User-Sessions (User mit Login letzte 30 Min).
 * Datenquelle: audit_trail letzter login-Event pro User.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  // Letzte 30 Min Login-Events
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: events } = await sb.from('audit_trail')
    .select('sv_email, workspace_id, typ, created_at, details')
    .like('typ', 'auth.login%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  // Pro Email letzter Eintrag
  const sessionMap = {};
  for (const e of (events || [])) {
    const k = e.sv_email || '[anon]';
    if (!sessionMap[k]) {
      sessionMap[k] = {
        email: e.sv_email,
        workspace_id: e.workspace_id,
        last_login: e.created_at,
        typ: e.typ
      };
    }
  }
  const sessions = Object.values(sessionMap);

  return jsonResponse(event, 200, {
    ok: true,
    fetched_at: new Date().toISOString(),
    active_count: sessions.length,
    sessions: sessions
  });
}, { functionName: 'admin-live-sessions', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-live-sessions' });
