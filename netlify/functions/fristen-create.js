/**
 * PROVA — fristen-create.js (MEGA³² W12b-I3 Schema-Reconciled)
 * POST { auftrag_id, frist_typ, datum_soll, ... } (Single)
 *   ODER { auftrag_id, pipeline_key, stichtag } (Bulk via fristen-pipelines)
 *
 * Schema (W12-I0 Audit): public.fristen mit auftrag_id + created_by_user_id + workspace_memberships RLS
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');
const Pipelines = require('../../lib/fristen-pipelines');

const FRIST_TYPEN = ['gericht', 'gutachten-erstattung', 'honorar', 'widerspruch', 'akteneinsicht', 'zeugen', 'parteien', 'ortstermin'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'fristen-create' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  // Backwards-Compat: alte Frontends senden noch schadensfall_id
  const auftrag_id = body.auftrag_id || body.schadensfall_id;

  if (!auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Workspace-Resolve via auftraege
  const { data: fall, error: fErr } = await sb.from('auftraege')
    .select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (fErr) return jsonResponse(event, 500, { error: fErr.message });
  if (!fall) return jsonResponse(event, 404, { error: 'Auftrag nicht gefunden' });

  try {
    if (body.pipeline_key) {
      // Bulk-Insert via Pipeline
      const fristen = Pipelines.applyPipeline(body.pipeline_key, { stichtag: body.stichtag });
      if (!fristen) return jsonResponse(event, 400, { error: 'Pipeline-Key unbekannt' });
      const inserts = fristen.map(function (f) {
        return Object.assign({}, f, {
          auftrag_id: auftrag_id,
          workspace_id: fall.workspace_id,
          created_by_user_id: context.userId
        });
      });
      const { data, error } = await sb.from('fristen').insert(inserts).select();
      if (error) return jsonResponse(event, 500, { error: error.message });
      return jsonResponse(event, 201, { fristen: data, created: data.length, pipeline: body.pipeline_key });
    }

    // Single
    if (!body.frist_typ || FRIST_TYPEN.indexOf(body.frist_typ) < 0)
      return jsonResponse(event, 400, { error: 'frist_typ ungültig (' + FRIST_TYPEN.join('|') + ')' });
    if (!body.datum_soll) return jsonResponse(event, 400, { error: 'datum_soll pflicht (YYYY-MM-DD)' });

    const insert = {
      auftrag_id: auftrag_id,
      workspace_id: fall.workspace_id,
      frist_typ: body.frist_typ,
      pipeline: body.pipeline || null,
      datum_soll: body.datum_soll,
      erinnerung_tage_vor: body.erinnerung_tage_vor || [14, 7, 3, 1],
      notiz: body.notiz || null,
      rechtsgrundlage: body.rechtsgrundlage || null,
      status: 'offen',
      created_by_user_id: context.userId
    };
    const { data, error } = await sb.from('fristen').insert(insert).select().single();
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 201, { frist: data, created: true });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'fristen-create' });

module.exports.__FRIST_TYPEN = FRIST_TYPEN;
