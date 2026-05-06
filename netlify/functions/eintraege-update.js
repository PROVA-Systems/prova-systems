/**
 * PROVA — eintraege-update.js (MEGA³² W12-I1 Schema-Reconciled)
 * PUT/PATCH { id, ...allowed-fields }
 * Schema-konform: existing public.eintraege
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const ALLOWED = ['typ', 'datum', 'titel', 'content', 'dauer_min', 'abrechenbar', 'ortstermin_id', 'audio_dateien_ids', 'foto_ids', 'pseudonymisiert', 'konjunktiv_check_passed', 'nr'];
const EINTRAG_TYP = ['diktat', 'text', 'foto', 'mix'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'eintraege-update' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.id) return jsonResponse(event, 400, { error: 'id pflicht' });
  if (body.typ && EINTRAG_TYP.indexOf(body.typ) < 0)
    return jsonResponse(event, 400, { error: 'typ ungültig (' + EINTRAG_TYP.join('|') + ')' });

  // Backwards-Compat: alte Frontends senden beschreibung_text + eintrag_typ
  if (!body.content && body.beschreibung_text) body.content = body.beschreibung_text;
  if (!body.typ && body.eintrag_typ && EINTRAG_TYP.indexOf(body.eintrag_typ) >= 0) body.typ = body.eintrag_typ;

  const patch = { updated_at: new Date().toISOString() };
  ALLOWED.forEach(f => { if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f]; });
  if (Object.keys(patch).length === 1) return jsonResponse(event, 400, { error: 'Keine Update-Felder' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('eintraege').update(patch)
      .eq('id', body.id).is('deleted_at', null).select().maybeSingle();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Eintrag nicht gefunden' });
    return jsonResponse(event, 200, { eintrag: data, updated: true });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-update' });

module.exports.__ALLOWED = ALLOWED;
module.exports.__EINTRAG_TYP = EINTRAG_TYP;
