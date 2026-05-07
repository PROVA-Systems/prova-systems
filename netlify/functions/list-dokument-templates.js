/**
 * PROVA — list-dokument-templates.js (MEGA³⁶ W6.1)
 *
 * GET /.netlify/functions/list-dokument-templates
 *  → 200 { templates: [{id, name, typ, pdfmonkey_template_id, ...}] }
 *
 * Liefert alle aktiven dokument_templates aus der DB. Wird vom
 * Frontend via lib/dokument-templates-cache.js einmalig geladen und
 * 5 Min im Browser-Cache gehalten — ersetzt die früheren
 * PROVA_TEMPLATE_*-ENVs (Single-Source-of-Truth: DB statt ENV).
 *
 * Auth: requireAuth (jeder eingeloggte User darf Templates lesen —
 * sind System-globale Vorlagen, kein Workspace-Filter nötig).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }
  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('dokument_templates')
      .select('id, name, typ, sprache, version, pdfmonkey_template_id, pdfmonkey_template_name, rechtlicher_hinweis, din_referenzen, aktiv, is_default_for_typ, notizen')
      .eq('aktiv', true)
      .order('pdfmonkey_template_id', { ascending: true });
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { templates: data || [], count: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'list-dokument-templates' });
