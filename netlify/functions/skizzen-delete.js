/**
 * PROVA — skizzen-delete.js (MEGA³⁰ W10b-I5)
 * DELETE ?id=  — Soft-Delete
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'skizzen-delete' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const id = (event.queryStringParameters && event.queryStringParameters.id) ||
             (event.body ? (JSON.parse(event.body).id || null) : null);
  if (!id) return jsonResponse(event, 400, { error: 'id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { error } = await sb.from('skizzen')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id).is('deleted_at', null);
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { deleted: true, id: id });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'skizzen-delete' });
