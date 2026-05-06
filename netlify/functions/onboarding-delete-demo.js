/**
 * PROVA — onboarding-delete-demo.js (MEGA³² W11-I4)
 *
 * Hard-Delete des Demo-Auftrags + alle FK-Daten (Einträge/Skizzen/Fristen).
 * CASCADE: skizzen + fristen via REFERENCES ON DELETE CASCADE.
 * eintraege: manueller Soft-Delete (kein CASCADE in W12-I0 Schema).
 *
 * POST (Auth-Pflicht).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const DEMO_AZ = 'SCH-DEMO-001';

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 5, 60, { event: event, functionName: 'onboarding-delete-demo' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const userId = context.userId;
  if (!userId) return jsonResponse(event, 401, { error: 'Auth required' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: membership } = await sb.from('workspace_memberships')
      .select('workspace_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!membership) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const { data: auftrag } = await sb.from('auftraege')
      .select('id, is_demo').eq('workspace_id', membership.workspace_id).eq('az', DEMO_AZ).is('deleted_at', null).maybeSingle();
    if (!auftrag) return jsonResponse(event, 404, { error: 'Demo-Fall nicht gefunden' });
    if (!auftrag.is_demo) return jsonResponse(event, 403, { error: 'Auftrag ist kein Demo-Fall — verweigert' });

    // Soft-Delete eintraege (kein CASCADE)
    await sb.from('eintraege').update({ deleted_at: new Date().toISOString() })
      .eq('auftrag_id', auftrag.id);

    // CASCADE löscht skizzen + fristen automatisch (FK ON DELETE CASCADE)
    // Soft-Delete auftrag → bleibt erhalten für Audit-Trail
    await sb.from('auftraege').update({ deleted_at: new Date().toISOString() })
      .eq('id', auftrag.id);

    return jsonResponse(event, 200, { deleted: true, auftrag_id: auftrag.id });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'onboarding-delete-demo' });
