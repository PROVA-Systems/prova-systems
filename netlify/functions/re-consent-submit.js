/**
 * PROVA — re-consent-submit.js (MEGA³⁰ B5)
 * POST { rechtsdokument_ids: [...] } — Inserts in einwilligungen + audit_trail.
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

  const rl = RateLimit.check(context.userEmail, 10, 60, { event: event, functionName: 're-consent-submit' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const ids = Array.isArray(body.rechtsdokument_ids) ? body.rechtsdokument_ids : [];
  if (!ids.length) return jsonResponse(event, 400, { error: 'rechtsdokument_ids[] pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Hash über Doku-Inhalt holen für Compliance-Snapshot
  const { data: dokus } = await sb.from('rechtsdokumente')
    .select('id, typ, version, inhalt_hash').in('id', ids);

  const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || null;
  const ua = (event.headers && event.headers['user-agent']) || null;

  const inserts = (dokus || []).map(d => ({
    user_id: context.userId,
    rechtsdokument_id: d.id,
    rechtsdokument_typ: d.typ,
    rechtsdokument_version: d.version,
    inhalt_hash_snapshot: d.inhalt_hash,
    ip_address: ip,
    user_agent: ua,
    quelle: 'forced_re_consent_modal'
  }));

  try {
    const { error } = await sb.from('einwilligungen').insert(inserts);
    if (error) return jsonResponse(event, 500, { error: error.message });

    // Audit-Trail (defensive)
    try {
      await sb.from('audit_trail').insert({
        user_id: context.userId,
        action: 'create',
        entity_typ: 'einwilligung',
        payload: { count: inserts.length, source: 'MEGA30-B5-forced-re-consent' }
      });
    } catch (_) { /* non-blocking */ }

    return jsonResponse(event, 201, { created: inserts.length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 're-consent-submit' });
