/**
 * PROVA — dokumente-list.js (MEGA³² W11-I1)
 * GET ?auftrag_id=&typ=&limit=
 * Schema (W12-I0): public.dokumente mit auftrag_id + typ dokument_typ ENUM (33 Werte)
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

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'dokumente-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  const auftrag_id = q.auftrag_id || q.schadensfall_id || null;
  const limit = Math.min(parseInt(q.limit || 50, 10), 200);

  try {
    let query = sb.from('dokumente')
      .select('id, workspace_id, auftrag_id, typ, status, doc_nummer, betreff, storage_path, pdf_url, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    if (q.typ) query = query.eq('typ', q.typ);
    const { data, error } = await query.limit(limit);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { dokumente: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'dokumente-list' });
