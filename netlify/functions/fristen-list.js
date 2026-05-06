/**
 * PROVA — fristen-list.js (MEGA³⁰ W10b-I6)
 * GET ?schadensfall_id=&status=&due_within_days=
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
  try {
    let query = sb.from('fristen').select('*').is('deleted_at', null).order('datum_soll', { ascending: true });
    if (q.schadensfall_id) query = query.eq('schadensfall_id', q.schadensfall_id);
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
