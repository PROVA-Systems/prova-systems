/**
 * PROVA — fotos-list.js (MEGA³² W11-I1)
 * GET ?auftrag_id=&limit=
 * Schema (W12-I0): public.fotos mit auftrag_id + typ foto_typ ENUM + storage_path
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

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'fotos-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  const auftrag_id = q.auftrag_id || q.schadensfall_id || null;
  const limit = Math.min(parseInt(q.limit || 50, 10), 200);

  try {
    let query = sb.from('fotos')
      .select('id, workspace_id, auftrag_id, typ, beschreibung, storage_path, thumbnail_path, original_filename, mime_type, exif_stripped, captured_at, uploaded_at')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    const { data, error } = await query.limit(limit);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { fotos: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'fotos-list' });
