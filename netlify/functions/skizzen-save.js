/**
 * PROVA — skizzen-save.js (MEGA³⁰ W10b-I5)
 * POST { id?, schadensfall_id, titel, svg_data, foto_ref?, massstab?, notiz? }
 * Upsert: id present → update, sonst insert.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const SVG_MAX_BYTES = 200 * 1024; // 200 KB

function validateSvg(s) {
  if (typeof s !== 'string' || !s.trim()) return 'svg_data leer';
  if (Buffer.byteLength(s, 'utf8') > SVG_MAX_BYTES) return 'svg_data > 200KB';
  if (!/<svg[\s>]/i.test(s)) return 'svg_data kein <svg>-Tag';
  if (/<script\b/i.test(s)) return 'svg_data: <script> nicht erlaubt';
  if (/\son\w+\s*=/i.test(s)) return 'svg_data: on*-Handler nicht erlaubt';
  return null;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'skizzen-save' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.schadensfall_id) return jsonResponse(event, 400, { error: 'schadensfall_id pflicht' });
  if (!body.titel || body.titel.length < 2) return jsonResponse(event, 400, { error: 'titel pflicht (min 2 chars)' });

  const svgErr = validateSvg(body.svg_data);
  if (svgErr) return jsonResponse(event, 400, { error: svgErr });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    if (body.id) {
      const patch = {
        titel: body.titel,
        svg_data: body.svg_data,
        foto_ref: body.foto_ref || null,
        massstab: body.massstab || null,
        notiz: body.notiz || null,
        geaendert_am: new Date().toISOString()
      };
      const { data, error } = await sb.from('skizzen').update(patch)
        .eq('id', body.id).is('deleted_at', null).select().maybeSingle();
      if (error) return jsonResponse(event, 500, { error: error.message });
      if (!data) return jsonResponse(event, 404, { error: 'Skizze nicht gefunden' });
      return jsonResponse(event, 200, { skizze: data, updated: true });
    }

    // Workspace-Resolve aus auftraege
    const { data: fall, error: fErr } = await sb.from('auftraege')
      .select('workspace_id').eq('id', body.schadensfall_id).maybeSingle();
    if (fErr) return jsonResponse(event, 500, { error: fErr.message });
    if (!fall) return jsonResponse(event, 404, { error: 'Schadensfall nicht gefunden' });

    const insert = {
      schadensfall_id: body.schadensfall_id,
      workspace_id: fall.workspace_id,
      titel: body.titel,
      svg_data: body.svg_data,
      foto_ref: body.foto_ref || null,
      massstab: body.massstab || null,
      notiz: body.notiz || null,
      erstellt_von: context.userId
    };
    const { data, error } = await sb.from('skizzen').insert(insert).select().single();
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 201, { skizze: data, created: true });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'skizzen-save' });

module.exports.__validateSvg = validateSvg;
