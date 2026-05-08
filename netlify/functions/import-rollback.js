/**
 * PROVA — import-rollback.js (MEGA⁴¹ P1)
 *
 * POST { rollback_token, import_id? }
 * → 200 { rolled_back_count, status }
 *
 * Rollback eines Imports innerhalb 24h. Löscht alle inserted_ids.
 * Token wird nach Rollback NULL gesetzt (Re-Use blockiert).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 20, 3600, { event, functionName: 'import-rollback' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.rollback_token || typeof body.rollback_token !== 'string') {
    return jsonResponse(event, 400, { error: 'rollback_token pflicht' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const { data: log, error: logErr } = await sb.from('import_logs')
      .select('id, workspace_id, status, rollback_expires_at, inserted_ids')
      .eq('rollback_token', body.rollback_token)
      .maybeSingle();
    if (logErr) return jsonResponse(event, 500, { error: logErr.message });
    if (!log) return jsonResponse(event, 404, { error: 'Token ungültig oder abgelaufen' });
    if (log.workspace_id !== ms.workspace_id) {
      return jsonResponse(event, 403, { error: 'Workspace-Zugriff verweigert' });
    }
    if (log.status === 'rolled_back') {
      return jsonResponse(event, 410, { error: 'Bereits zurückgerollt' });
    }
    if (log.rollback_expires_at && new Date(log.rollback_expires_at).getTime() < Date.now()) {
      return jsonResponse(event, 410, { error: 'Rollback-Frist abgelaufen (24h)' });
    }

    const byEntity = {};
    (log.inserted_ids || []).forEach(item => {
      if (!byEntity[item.entity]) byEntity[item.entity] = [];
      byEntity[item.entity].push(item.id);
    });

    let totalDeleted = 0;
    for (const entity of Object.keys(byEntity)) {
      const ids = byEntity[entity];
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error: delErr } = await sb.from(entity).delete().in('id', batch);
        if (delErr) {
          console.warn('[import-rollback] partial delete failed for ' + entity + ':', delErr.message);
        } else {
          totalDeleted += batch.length;
        }
      }
    }

    const { error: updErr } = await sb.from('import_logs')
      .update({
        status: 'rolled_back',
        rollback_token: null,
        rolled_back_at: new Date().toISOString()
      })
      .eq('id', log.id);
    if (updErr) console.warn('[import-rollback] log update failed:', updErr.message);

    return jsonResponse(event, 200, {
      rolled_back_count: totalDeleted,
      import_id: log.id,
      status: 'rolled_back'
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'import-rollback' });
