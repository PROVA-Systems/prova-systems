/**
 * PROVA — skizzen-list.js (MEGA³² W12b-I2 Schema-Reconciled)
 * GET ?auftrag_id=&with_svg=0|1
 * Schema (W12-I0 Audit): public.skizzen mit auftrag_id + svg_content + workspace_memberships RLS
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'skizzen-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  // Backwards-Compat: alte Frontends senden noch schadensfall_id
  const auftrag_id = q.auftrag_id || q.schadensfall_id || null;

  const cols = q.with_svg === '1'
    ? 'id, workspace_id, auftrag_id, titel, svg_content, foto_referenz_id, massstab, notiz, pseudonymisiert, created_at, updated_at'
    : 'id, workspace_id, auftrag_id, titel, foto_referenz_id, massstab, notiz, pseudonymisiert, created_at, updated_at';

  try {
    let query = sb.from('skizzen').select(cols).is('deleted_at', null).order('created_at', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    const { data, error } = await query.limit(200);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { skizzen: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'skizzen-list' });
