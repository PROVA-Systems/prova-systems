/**
 * PROVA — fristen-mark-erfuellt.js (MEGA³⁰ W10b-I6)
 * POST { id, datum_ist? } — Convenience-Endpoint
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'fristen-mark-erfuellt' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.id) return jsonResponse(event, 400, { error: 'id pflicht' });
  const datum_ist = body.datum_ist || new Date().toISOString().slice(0, 10);

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('fristen').update({
      status: 'erfuellt',
      datum_ist: datum_ist,
      geaendert_am: new Date().toISOString()
    }).eq('id', body.id).is('deleted_at', null).select().maybeSingle();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Frist nicht gefunden' });
    return jsonResponse(event, 200, { frist: data, marked: true });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'fristen-mark-erfuellt' });
