/**
 * PROVA — auftrag-eigenleistung-quote.js (MEGA⁴¹ P2)
 *
 * GET ?auftrag_id=<uuid>
 * → 200 { auftrag_id, ki_count, sv_eigen_count, sv_uebernommen_count, total_inhalt,
 *         eigenleistung_prozent, complies_407a, threshold }
 *
 * Aggregiert audit_trail-Einträge pro Auftrag und berechnet SV-Eigenleistungs-Quote.
 * Threshold default 50% — konfigurierbar via Workspace-Settings (Future).
 *
 * §407a ZPO Compliance-Check.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const DEFAULT_THRESHOLD_PROZENT = 50;

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  if (!q.auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // Query via View (mit Workspace-Scope)
    const { data, error } = await sb.from('v_auftrag_eigenleistung_quote')
      .select('*')
      .eq('workspace_id', ms.workspace_id)
      .eq('auftrag_id', q.auftrag_id)
      .maybeSingle();

    if (error) return jsonResponse(event, 500, { error: error.message });

    const threshold = parseInt(q.threshold, 10) || DEFAULT_THRESHOLD_PROZENT;
    const result = data || {
      workspace_id: ms.workspace_id,
      auftrag_id: q.auftrag_id,
      ki_count: 0,
      sv_eigen_count: 0,
      sv_uebernommen_count: 0,
      total_inhalt: 0,
      eigenleistung_prozent: 0
    };

    return jsonResponse(event, 200, {
      auftrag_id: result.auftrag_id,
      ki_count: result.ki_count,
      sv_eigen_count: result.sv_eigen_count,
      sv_uebernommen_count: result.sv_uebernommen_count,
      total_inhalt: result.total_inhalt,
      eigenleistung_prozent: parseFloat(result.eigenleistung_prozent),
      complies_407a: parseFloat(result.eigenleistung_prozent) >= threshold,
      threshold: threshold
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'auftrag-eigenleistung-quote' });

module.exports.__DEFAULT_THRESHOLD_PROZENT = DEFAULT_THRESHOLD_PROZENT;
