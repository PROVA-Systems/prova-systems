/**
 * PROVA — audit-trail-write.js (MEGA³⁰ B1)
 * POST { action, entity_typ, entity_id?, payload }
 *
 * INSERT-only Audit-Log (DSGVO Art. 30 + IHK-SVO Nachweis).
 * Schema (W12-I0): public.audit_trail mit action audit_action ENUM (18 Werte).
 *
 * Defensive-Pattern: bei DB-Error keine Exception throw — Frontend-Workflow nicht blockieren.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const VALID_ACTIONS = [
  'create', 'read', 'update', 'delete', 'login', 'logout', 'login_failed',
  'export', 'import', 'pdf_generate', 'pdf_view', 'pdf_send',
  'ki_request', 'ki_response', 'workspace_invite', 'workspace_remove_member',
  'data_export_dsgvo', 'data_delete_dsgvo'
];

function clientIp(event) {
  return (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || null;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'audit-trail-write' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.action || VALID_ACTIONS.indexOf(body.action) < 0) {
    return jsonResponse(event, 400, { error: 'action ungültig (' + VALID_ACTIONS.join('|') + ')' });
  }
  if (!body.entity_typ || typeof body.entity_typ !== 'string') {
    return jsonResponse(event, 400, { error: 'entity_typ pflicht' });
  }

  const sb = getSupabase();
  if (!sb) {
    // defensive: defensive 200 zurückgeben damit Frontend-Workflow nicht blockiert
    return jsonResponse(event, 200, { logged: false, reason: 'supabase-unconfigured' });
  }

  // Workspace-Resolve via workspace_memberships (RLS-konform)
  let workspaceId = null;
  try {
    const { data: m } = await sb.from('workspace_memberships')
      .select('workspace_id').eq('user_id', context.userId).eq('is_active', true).limit(1).maybeSingle();
    workspaceId = m && m.workspace_id;
  } catch (_) { /* tolerate */ }

  const insert = {
    workspace_id: workspaceId,
    user_id: context.userId,
    action: body.action,
    entity_typ: body.entity_typ,
    entity_id: body.entity_id || null,
    payload: body.payload || {},
    ip_address: clientIp(event),
    user_agent: (event.headers && event.headers['user-agent']) || null,
    request_id: (event.headers && event.headers['x-request-id']) || null
  };

  try {
    const { error } = await sb.from('audit_trail').insert(insert);
    if (error) {
      // defensive: kein 5xx — Frontend nicht blockieren
      return jsonResponse(event, 200, { logged: false, reason: error.message });
    }
    return jsonResponse(event, 201, { logged: true });
  } catch (e) {
    return jsonResponse(event, 200, { logged: false, reason: e.message });
  }
}), { functionName: 'audit-trail-write' });

module.exports.__VALID_ACTIONS = VALID_ACTIONS;
