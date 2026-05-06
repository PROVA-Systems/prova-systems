/**
 * PROVA — eintraege-list.js (MEGA³² W12-I1 Schema-Reconciled)
 *
 * GET ?auftrag_id=&typ=&from=&to=&limit=
 * Schema-konform: existing public.eintraege (auftrag_id + typ ENUM diktat|text|foto|mix + titel + content)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const EINTRAG_TYP = ['diktat', 'text', 'foto', 'mix'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'eintraege-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  // Backwards-Compat: alte Frontends senden noch schadensfall_id
  const auftrag_id = q.auftrag_id || q.schadensfall_id || null;

  try {
    let query = sb.from('eintraege')
      .select('id, workspace_id, auftrag_id, ortstermin_id, typ, nr, datum, titel, content, audio_dateien_ids, foto_ids, pseudonymisiert, konjunktiv_check_passed, dauer_min, abrechenbar, created_by_user_id, created_at, updated_at')
      .is('deleted_at', null)
      .order('datum', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    if (q.typ && EINTRAG_TYP.indexOf(q.typ) >= 0) query = query.eq('typ', q.typ);
    if (q.from) query = query.gte('datum', q.from);
    if (q.to) query = query.lte('datum', q.to);
    const limit = Math.min(parseInt(q.limit || 100, 10), 200);
    const { data, error } = await query.limit(limit);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { eintraege: data || [], total: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-list' });

module.exports.__EINTRAG_TYP = EINTRAG_TYP;
