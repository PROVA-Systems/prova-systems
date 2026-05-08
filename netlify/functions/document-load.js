/**
 * PROVA — document-load.js (MEGA⁴⁰ P1)
 *
 * GET ?id=<document_id>&version=<optional>
 *   → 200 { document: {id, titel, weg, content_json, ...}, versions: [{version_nr, saved_at, byte_size}] }
 *
 * Wenn version-Param gesetzt: liefert Version-Snapshot statt current_version.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  if (!q.id) return jsonResponse(event, 400, { error: 'id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: doc, error: dErr } = await sb.from('documents')
      .select('id, workspace_id, auftrag_id, user_id, titel, weg, content_json, locked_sections, template_id, status, current_version, imported_from_docx, imported_filename, imported_warnings, created_at, updated_at')
      .eq('id', q.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (dErr) return jsonResponse(event, 500, { error: dErr.message });
    if (!doc) return jsonResponse(event, 404, { error: 'Document nicht gefunden' });

    // Version-Override?
    let contentToReturn = doc.content_json;
    if (q.version) {
      const versionNr = parseInt(q.version, 10);
      if (!isNaN(versionNr) && versionNr > 0) {
        const { data: v } = await sb.from('documents_versions')
          .select('content_json')
          .eq('document_id', q.id)
          .eq('version_nr', versionNr)
          .maybeSingle();
        if (v) contentToReturn = v.content_json;
      }
    }

    // Versions-Liste (Metadaten)
    const { data: versions } = await sb.from('documents_versions')
      .select('version_nr, saved_at, byte_size, notiz')
      .eq('document_id', q.id)
      .order('version_nr', { ascending: false })
      .limit(50);

    return jsonResponse(event, 200, {
      document: { ...doc, content_json: contentToReturn },
      versions: versions || []
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'document-load' });
