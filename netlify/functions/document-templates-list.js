/**
 * PROVA — document-templates-list.js (MEGA⁴⁰ P7)
 *
 * GET ?filter=alle|eigene|prova_default|docx_import&kategorie=&q=
 * → 200 { templates: [{id, titel, kategorie, weg, source, is_global, use_count, ...}] }
 *
 * RLS handhabt Access — User sieht eigene + globale Templates.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_FILTERS = ['alle', 'eigene', 'prova_default', 'docx_import'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  const filter = VALID_FILTERS.indexOf(q.filter) >= 0 ? q.filter : 'alle';
  const kategorie = q.kategorie || null;
  const search = q.q || null;

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    let qb = sb.from('document_templates')
      .select('id, workspace_id, user_id, titel, beschreibung, kategorie, weg, source, is_global, use_count, last_used_at, created_at')
      .is('deleted_at', null);

    // Filter-Logik (zusätzlich zu RLS)
    if (filter === 'prova_default') {
      qb = qb.eq('is_global', true);
    } else if (filter === 'eigene') {
      // RLS lässt eigene + globale zu → wir wollen nur eigene
      qb = qb.eq('is_global', false);
    } else if (filter === 'docx_import') {
      qb = qb.eq('source', 'docx_import');
    }

    if (kategorie) qb = qb.eq('kategorie', kategorie);
    if (search) qb = qb.ilike('titel', '%' + search.replace(/%/g, '') + '%');

    qb = qb.order('use_count', { ascending: false }).order('last_used_at', { ascending: false, nullsFirst: false }).limit(100);

    const { data, error } = await qb;
    if (error) return jsonResponse(event, 500, { error: error.message });

    return jsonResponse(event, 200, { templates: data || [], filter, kategorie, search });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'document-templates-list' });

module.exports.__VALID_FILTERS = VALID_FILTERS;
