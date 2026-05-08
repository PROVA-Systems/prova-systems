/**
 * PROVA — document-template-create.js (MEGA⁴⁰ P7)
 *
 * POST { titel, beschreibung?, kategorie?, weg, content_json, source?='user' }
 * → 200 { template_id }
 *
 * Workspace-isoliert via RLS — User-Templates immer is_global=FALSE.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];
const VALID_SOURCES = ['user', 'docx_import'];  // user kann KEIN prova_default erstellen

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event, functionName: 'document-template-create' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.titel || typeof body.titel !== 'string') return jsonResponse(event, 400, { error: 'titel pflicht' });
  if (!body.weg || VALID_WEGE.indexOf(body.weg) < 0) return jsonResponse(event, 400, { error: 'weg invalid', valid: VALID_WEGE });
  if (!body.content_json || typeof body.content_json !== 'object') return jsonResponse(event, 400, { error: 'content_json (object) pflicht' });

  const source = body.source && VALID_SOURCES.indexOf(body.source) >= 0 ? body.source : 'user';

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const { data: ins, error: err } = await sb.from('document_templates').insert({
      workspace_id: ms.workspace_id,
      user_id: profile.id,
      titel: body.titel.slice(0, 255),
      beschreibung: typeof body.beschreibung === 'string' ? body.beschreibung.slice(0, 500) : null,
      kategorie: typeof body.kategorie === 'string' ? body.kategorie.slice(0, 50) : null,
      weg: body.weg,
      content_json: body.content_json,
      source: source,
      is_global: false  // niemals true via Frontend
    }).select('id, titel, kategorie, weg').maybeSingle();

    if (err) return jsonResponse(event, 500, { error: err.message });
    return jsonResponse(event, 200, { template_id: ins.id, titel: ins.titel, kategorie: ins.kategorie, weg: ins.weg });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'document-template-create' });

module.exports.__VALID_WEGE = VALID_WEGE;
module.exports.__VALID_SOURCES = VALID_SOURCES;
