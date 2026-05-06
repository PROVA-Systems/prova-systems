/**
 * PROVA — eintraege-create.js (MEGA³⁰ W10b-I4)
 * POST { schadensfall_id, eintrag_typ, datum, dauer_min, beschreibung_text, abrechenbar, anhang_files? }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const VALID_TYPS = ['ortstermin','telefonat','email','recherche','gutachten-arbeit','akteneinsicht','korrespondenz','sonstiges'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'eintraege-create' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  // Pflicht-Validierung
  if (!body.schadensfall_id) return jsonResponse(event, 400, { error: 'schadensfall_id pflicht' });
  if (!VALID_TYPS.includes(body.eintrag_typ)) return jsonResponse(event, 400, { error: 'eintrag_typ ungültig', valid: VALID_TYPS });
  if (!body.datum) return jsonResponse(event, 400, { error: 'datum pflicht' });
  if (!body.beschreibung_text || body.beschreibung_text.length < 5) return jsonResponse(event, 400, { error: 'beschreibung_text zu kurz' });

  const userId = context.userId || context.user_id;
  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // Workspace-ID aus Schadensfall ableiten (RLS-Pflicht)
    const { data: sf } = await sb.from('auftraege')
      .select('workspace_id').eq('id', body.schadensfall_id).maybeSingle();
    if (!sf) return jsonResponse(event, 404, { error: 'Schadensfall nicht gefunden' });

    const { data, error } = await sb.from('eintraege').insert({
      schadensfall_id: body.schadensfall_id,
      workspace_id: sf.workspace_id,
      eintrag_typ: body.eintrag_typ,
      datum: body.datum,
      uhrzeit_von: body.uhrzeit_von || null,
      dauer_min: parseInt(body.dauer_min || 0, 10),
      beschreibung_text: body.beschreibung_text,
      anhang_files: Array.isArray(body.anhang_files) ? body.anhang_files : [],
      abrechenbar: body.abrechenbar !== false,
      erstellt_von: userId
    }).select().single();
    if (error) return jsonResponse(event, 500, { error: error.message });

    return jsonResponse(event, 201, { eintrag: data });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-create' });
