/**
 * PROVA — audit-source-log.js (MEGA⁴¹ P2)
 *
 * POST { action, source?, original_ki_ref?, entity_typ?, entity_id?, payload? }
 * → 200 { id, integrity_hash }
 *
 * Frontend-zugängliches Audit-Logging mit KI-vs-SV-Trennung.
 * Routet zur richtigen Helper-Function basierend auf source-Parameter.
 *
 * Auth: requireAuth + Workspace-Resolve.
 * RateLimit: 120/min (häufige Aufrufe von Tracker erlaubt).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');
const AuditHelper = require('./lib/audit-source-helper');

const VALID_SOURCES = ['ki', 'sv_eigen', 'sv_uebernommen', 'system'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 120, 60, { event, functionName: 'audit-source-log' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.action || typeof body.action !== 'string') {
    return jsonResponse(event, 400, { error: 'action pflicht' });
  }
  const source = body.source || (body.action === 'sv_uebernommen' ? 'sv_uebernommen' : 'sv_eigen');
  if (VALID_SOURCES.indexOf(source) < 0) {
    return jsonResponse(event, 400, { error: 'source invalid', valid: VALID_SOURCES });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const opts = {
      workspaceId: ms.workspace_id,
      userId: profile.id,
      action: body.action,
      entityTyp: body.entity_typ || null,
      entityId: body.entity_id || null,
      payload: body.payload || {},
      ipAddress: (event.headers && event.headers['x-forwarded-for']) || null,
      userAgent: (event.headers && event.headers['user-agent']) || null
    };

    let result = null;
    if (source === 'ki') {
      opts.kiModel = body.ki_model || null;
      opts.kiConfidence = typeof body.ki_confidence === 'number' ? body.ki_confidence : null;
      result = await AuditHelper.logKiCall(sb, opts);
    } else if (source === 'sv_uebernommen') {
      if (!body.original_ki_ref) {
        return jsonResponse(event, 400, { error: 'original_ki_ref pflicht bei sv_uebernommen' });
      }
      opts.originalKiRef = body.original_ki_ref;
      result = await AuditHelper.logSvUebernommen(sb, opts);
    } else {
      // sv_eigen oder system
      result = await AuditHelper.logSvEigen(sb, opts);
    }

    if (!result) return jsonResponse(event, 500, { error: 'Insert fehlgeschlagen' });
    return jsonResponse(event, 200, { id: result.id, integrity_hash: result.integrity_hash, source: source });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'audit-source-log' });

module.exports.__VALID_SOURCES = VALID_SOURCES;
