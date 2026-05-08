/**
 * PROVA — auftraege-update.js (MEGA³² A1)
 * POST { auftrag_id, patch } — Live-Save für Wizard.
 * Auth: requireAuth, RLS via workspace_memberships.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

// Whitelist: nur diese Spalten sind via Live-Save updatable
const ALLOWED_FIELDS = [
  'titel', 'fragestellung', 'kurzbeantwortung', 'schadensart_label',
  'schadensart_kategorie', 'schadensstichtag', 'objekt', 'details',
  'auftraggeber_typ', 'auftraggeber_kontakt_id', 'status',
  'zweck', 'typ'
];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'auftraege-update' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
  const patch = body.patch || {};
  const cleanPatch = {};
  Object.keys(patch).forEach(k => { if (ALLOWED_FIELDS.includes(k)) cleanPatch[k] = patch[k]; });
  if (!Object.keys(cleanPatch).length) return jsonResponse(event, 400, { error: 'Keine gültigen Felder' });

  cleanPatch.updated_at = new Date().toISOString();

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('auftraege').update(cleanPatch)
      .eq('id', body.auftrag_id).is('deleted_at', null).select().maybeSingle();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Auftrag nicht gefunden' });
    return jsonResponse(event, 200, { auftrag: data, updated: Object.keys(cleanPatch) });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'auftraege-update' });

module.exports.__ALLOWED_FIELDS = ALLOWED_FIELDS;
