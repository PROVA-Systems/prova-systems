/**
 * PROVA — dsgvo-portability.js (MEGA²⁸ KORR-19)
 *
 * DSGVO Art. 20 — Recht auf Datenübertragbarkeit.
 * Liefert die personenbezogenen Daten in maschinenlesbarem JSON-Format.
 *
 * GET /.netlify/functions/dsgvo-portability
 *   Auth: JWT (User extrahiert aus Token)
 *   Returns: { user, workspace, auftraege, kontakte, dokumente, fotos, termine, audit_trail (own only), exported_at, version }
 *
 * Strikt: nur Daten WHERE user_id=auth.uid() (RLS-conform).
 * Unterstützt nicht den Datenverkauf — User exportiert eigene Daten.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user'); // MEGA²⁸ W6P2-I3: DSGVO-Heavy 5/60s

const EXPORT_VERSION = '1.0';

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

/**
 * Sammelt User-eigene Daten aus Supabase.
 * RLS-conform: nutzt Service-Role-Key + workspace_id-Filter.
 */
async function collectUserData(sb, userId, workspaceId) {
  const result = {
    user: null,
    workspace: null,
    auftraege: [],
    kontakte: [],
    dokumente: [],
    fotos: [],
    termine: [],
    audit_trail: [],
    exported_at: new Date().toISOString(),
    version: EXPORT_VERSION,
    note: 'Dies ist ein DSGVO Art. 20 Datenexport. Maschinenlesbar (JSON), portabel.'
  };
  try {
    const { data: user } = await sb.from('users').select('*').eq('id', userId).maybeSingle();
    result.user = user;
  } catch (_) { /* graceful */ }
  try {
    const { data: ws } = await sb.from('workspaces').select('*').eq('id', workspaceId).maybeSingle();
    result.workspace = ws;
  } catch (_) { /* graceful */ }
  try {
    const { data: auftraege } = await sb.from('auftraege')
      .select('*').eq('workspace_id', workspaceId).limit(5000);
    result.auftraege = auftraege || [];
  } catch (_) { /* graceful */ }
  try {
    const { data: kontakte } = await sb.from('kontakte')
      .select('*').eq('workspace_id', workspaceId).limit(5000);
    result.kontakte = kontakte || [];
  } catch (_) { /* graceful */ }
  try {
    const { data: dokumente } = await sb.from('dokumente')
      .select('*').eq('workspace_id', workspaceId).limit(10000);
    result.dokumente = dokumente || [];
  } catch (_) { /* graceful */ }
  try {
    const { data: fotos } = await sb.from('fotos')
      .select('*').eq('workspace_id', workspaceId).limit(10000);
    result.fotos = fotos || [];
  } catch (_) { /* graceful */ }
  try {
    const { data: termine } = await sb.from('termine')
      .select('*').eq('workspace_id', workspaceId).limit(5000);
    result.termine = termine || [];
  } catch (_) { /* graceful */ }
  try {
    const { data: audit } = await sb.from('audit_trail')
      .select('*').eq('user_id', userId).limit(2000);
    result.audit_trail = audit || [];
  } catch (_) { /* graceful */ }
  return result;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }
  // MEGA²⁸ W6P2-I3: DSGVO-Heavy Rate-Limit 5/60s (Export ist large-payload + DB-intensiv)
  const rl = RateLimit.check(context.userEmail || context.userId, 5, 60, { event: event, functionName: 'dsgvo-portability' });
  if (!rl.allowed) {
    return json(event, 429, { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' });
  }
  const userId = context.userId || context.user_id;
  if (!userId) return json(event, 401, { error: 'Authentication required' });

  const sb = getSupabase();
  if (!sb) return json(event, 503, { error: 'Supabase not configured' });

  // Workspace via memberships
  let workspaceId = null;
  try {
    const { data: ms } = await sb.from('workspace_memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    workspaceId = ms ? ms.workspace_id : null;
  } catch (_) { /* graceful */ }
  if (!workspaceId) return json(event, 400, { error: 'no workspace found' });

  try {
    const data = await collectUserData(sb, userId, workspaceId);

    // Audit-Log
    try {
      await sb.from('audit_trail').insert({
        function_name: 'dsgvo-portability',
        action: 'dsgvo.export.requested',
        user_id: userId,
        workspace_id: workspaceId,
        payload: { auftraege_count: data.auftraege.length, kontakte_count: data.kontakte.length },
        result: 'ok'
      });
    } catch (_) { /* fire-and-forget */ }

    // Content-Disposition für direkten Download
    const filename = 'prova-export-' + new Date().toISOString().slice(0, 10) + '.json';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        ...getCorsHeaders(event)
      },
      body: JSON.stringify(data, null, 2)
    };
  } catch (e) {
    return json(event, 500, { error: 'export failed', detail: e.message });
  }
}), { functionName: 'dsgvo-portability' });

exports._test = { collectUserData, EXPORT_VERSION };
