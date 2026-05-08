/**
 * PROVA — dsgvo-portabilitaet.js (MEGA³⁰ B2)
 * GET — exportiert eigene Daten als strukturiertes JSON (DSGVO Art. 20).
 * Auth: requireAuth (eigene Daten nur).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 5, 3600, { event: event, functionName: 'dsgvo-portabilitaet' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht (max 5/h)' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.rpc('dsgvo_user_portabilitaet', { p_user_id: context.userId });
    if (error) {
      if (error.code === '42501') return jsonResponse(event, 403, { error: 'Forbidden: nur eigene Daten' });
      return jsonResponse(event, 500, { error: error.message });
    }

    // Audit-Trail-Insert (data_export_dsgvo)
    try {
      await sb.from('audit_trail').insert({
        user_id: context.userId,
        action: 'data_export_dsgvo',
        entity_typ: 'user',
        entity_id: context.userId,
        payload: { format: 'json', dsgvo_art: 'Art. 20 Portabilität', source: 'MEGA30-B2' }
      });
    } catch (_) { /* defensive */ }

    return {
      statusCode: 200,
      headers: Object.assign({}, getCorsHeaders(event), {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="prova-export-' + context.userId + '-' + new Date().toISOString().slice(0, 10) + '.json"'
      }),
      body: JSON.stringify(data, null, 2)
    };
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'dsgvo-portabilitaet' });
