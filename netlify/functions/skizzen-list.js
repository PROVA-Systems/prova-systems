/**
 * PROVA — skizzen-list.js (MEGA³⁰ W10b-I5)
 * GET ?schadensfall_id=&with_svg=0|1
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
  const cols = q.with_svg === '1'
    ? '*'
    : 'id,schadensfall_id,workspace_id,titel,foto_ref,massstab,notiz,erstellt_am,geaendert_am';

  try {
    let query = sb.from('skizzen').select(cols).is('deleted_at', null).order('erstellt_am', { ascending: false });
    if (q.schadensfall_id) query = query.eq('schadensfall_id', q.schadensfall_id);
    const { data, error } = await query.limit(200);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { skizzen: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'skizzen-list' });
