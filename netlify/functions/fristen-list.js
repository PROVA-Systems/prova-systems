/**
 * PROVA — fristen-list.js (MEGA³² W12b-I3 Schema-Reconciled)
 * GET ?auftrag_id=&status=&due_within_days=
 * Schema (W12-I0 Audit): public.fristen mit auftrag_id + workspace_memberships RLS
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

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'fristen-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  // Backwards-Compat
  const auftrag_id = q.auftrag_id || q.schadensfall_id || null;

  try {
    let query = sb.from('fristen').select('*').is('deleted_at', null).order('datum_soll', { ascending: true });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    if (q.status) query = query.eq('status', q.status);
    if (q.due_within_days) {
      const max = new Date();
      max.setDate(max.getDate() + parseInt(q.due_within_days, 10));
      query = query.lte('datum_soll', max.toISOString().slice(0, 10)).eq('status', 'offen');
    }
    const { data, error } = await query.limit(500);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { fristen: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'fristen-list' });
