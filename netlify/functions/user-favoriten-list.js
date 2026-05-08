/**
 * PROVA — user-favoriten-list.js (MEGA³⁹ P5)
 *
 * GET ?kategorie=normen|textbausteine|...
 *   → 200 { favoriten: [{kategorie, item_id, item_label, ...}] }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const kategorie = (event.queryStringParameters && event.queryStringParameters.kategorie) || null;

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 200, { favoriten: [] });

    let q = sb.from('user_favoriten').select('id, kategorie, item_id, item_label, reihenfolge, created_at')
      .eq('user_id', profile.id);
    if (kategorie) q = q.eq('kategorie', kategorie);
    q = q.order('reihenfolge', { ascending: true }).order('created_at', { ascending: false });

    const { data, error } = await q;
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { favoriten: data || [] });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'user-favoriten-list' });
