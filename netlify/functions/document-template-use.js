/**
 * PROVA — document-template-use.js (MEGA⁴⁰ P7)
 *
 * POST { template_id }
 * → 200 { template: {titel, content_json, weg, ...}, use_count: 42 }
 *
 * Bei Use:
 *   - Hole Template (RLS sichert: nur eigene + globale)
 *   - Increment use_count + setze last_used_at = NOW (nur für eigene Templates;
 *     globale werden via Service-Role-Key inkrementiert)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.template_id) return jsonResponse(event, 400, { error: 'template_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: tpl, error: fErr } = await sb.from('document_templates')
      .select('id, titel, beschreibung, kategorie, weg, content_json, is_global, use_count, workspace_id')
      .eq('id', body.template_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (fErr) return jsonResponse(event, 500, { error: fErr.message });
    if (!tpl) return jsonResponse(event, 404, { error: 'Template nicht gefunden' });

    // Increment use_count via Service-Role (auch für globale Templates)
    const newCount = (tpl.use_count || 0) + 1;
    const { error: uErr } = await sb.from('document_templates')
      .update({ use_count: newCount, last_used_at: new Date().toISOString() })
      .eq('id', body.template_id);
    if (uErr) {
      console.warn('[document-template-use] use_count increment failed:', uErr.message);
    }

    return jsonResponse(event, 200, {
      template: {
        id: tpl.id, titel: tpl.titel, beschreibung: tpl.beschreibung,
        kategorie: tpl.kategorie, weg: tpl.weg, content_json: tpl.content_json,
        is_global: tpl.is_global
      },
      use_count: newCount
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'document-template-use' });
