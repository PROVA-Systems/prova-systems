/**
 * PROVA — dashboard-fristen-upcoming.js (MEGA³² W11-I2)
 * GET — Top 5 anstehende offene Fristen über alle Aufträge des Workspaces.
 * RLS-Filter via workspace_memberships (auth.uid()) automatisch.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'dashboard-fristen-upcoming' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const today = new Date().toISOString().slice(0, 10);

  try {
    // RLS automatisch via workspace_memberships
    const { data, error } = await sb.from('fristen')
      .select('id, auftrag_id, frist_typ, datum_soll, notiz, pipeline, status, auftraege(az, schadensart_label)')
      .eq('status', 'offen')
      .is('deleted_at', null)
      .gte('datum_soll', today)
      .order('datum_soll', { ascending: true })
      .limit(5);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { fristen: data || [], total: (data || []).length, generated_at: new Date().toISOString() });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'dashboard-fristen-upcoming' });
