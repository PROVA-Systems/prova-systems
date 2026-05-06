/**
 * PROVA — eintraege-list.js (MEGA³⁰ W10b-I4)
 * Liste der Einträge zu einem Schadensfall (oder Workspace-weit).
 * Pattern aus admin-support-inbox.js (W8-I7).
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

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'eintraege-list' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const params = event.queryStringParameters || {};
  const schadensfallId = params.schadensfall_id || null;
  const eintragTyp = params.eintrag_typ || null;
  const dateFrom = params.from || null;
  const dateTo = params.to || null;
  const limit = Math.min(200, parseInt(params.limit || '50', 10));

  try {
    let q = sb.from('eintraege')
      .select('id, schadensfall_id, eintrag_typ, datum, uhrzeit_von, dauer_min, beschreibung_text, anhang_files, abrechenbar, abgerechnet, erstellt_am')
      .is('deleted_at', null)
      .order('datum', { ascending: false })
      .limit(limit);
    if (schadensfallId) q = q.eq('schadensfall_id', schadensfallId);
    if (eintragTyp) q = q.eq('eintrag_typ', eintragTyp);
    if (dateFrom) q = q.gte('datum', dateFrom);
    if (dateTo) q = q.lte('datum', dateTo);

    const { data, error } = await q;
    if (error) return jsonResponse(event, 500, { error: error.message });

    return jsonResponse(event, 200, {
      total: (data || []).length,
      limit,
      eintraege: data || []
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-list' });
