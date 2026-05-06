/**
 * PROVA — eintraege-update.js (MEGA³⁰ W10b-I4)
 * PUT { id, ...changes }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const ALLOWED_FIELDS = ['eintrag_typ','datum','uhrzeit_von','dauer_min','beschreibung_text','anhang_files','abrechenbar'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'eintraege-update' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.id) return jsonResponse(event, 400, { error: 'id pflicht' });

  const updates = {};
  ALLOWED_FIELDS.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
  if (Object.keys(updates).length === 0) return jsonResponse(event, 400, { error: 'Keine Felder zum Update' });
  updates.geaendert_am = new Date().toISOString();

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('eintraege')
      .update(updates).eq('id', body.id).is('deleted_at', null)
      .select().single();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Eintrag nicht gefunden oder gelöscht' });
    return jsonResponse(event, 200, { eintrag: data });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-update' });
