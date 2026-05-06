/**
 * PROVA — fristen-update.js (MEGA³⁰ W10b-I6)
 * PUT { id, datum_soll?, notiz?, status?, erinnerung_tage_vor? }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const ALLOWED = ['datum_soll', 'datum_ist', 'notiz', 'status', 'erinnerung_tage_vor', 'rechtsgrundlage'];
const STATUS = ['offen', 'erfuellt', 'verfallen', 'verlaengert'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'fristen-update' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.id) return jsonResponse(event, 400, { error: 'id pflicht' });
  if (body.status && STATUS.indexOf(body.status) < 0) return jsonResponse(event, 400, { error: 'status ungültig' });

  const patch = { geaendert_am: new Date().toISOString() };
  ALLOWED.forEach(function (f) { if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f]; });
  if (Object.keys(patch).length === 1) return jsonResponse(event, 400, { error: 'Keine Update-Felder' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('fristen').update(patch)
      .eq('id', body.id).is('deleted_at', null).select().maybeSingle();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Frist nicht gefunden' });
    return jsonResponse(event, 200, { frist: data, updated: true });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'fristen-update' });
