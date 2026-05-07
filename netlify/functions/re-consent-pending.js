/**
 * PROVA — re-consent-pending.js (MEGA³⁰ B5)
 * GET — Liefert pending Re-Consents für aktuellen User aus v_user_pending_einwilligungen.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 200, { pending: [] }); // defensive

  try {
    const { data, error } = await sb.from('v_user_pending_einwilligungen')
      .select('*').eq('user_id', context.userId);
    if (error) return jsonResponse(event, 200, { pending: [], reason: error.message });
    return jsonResponse(event, 200, { pending: data || [] });
  } catch (e) {
    return jsonResponse(event, 200, { pending: [], reason: e.message });
  }
}), { functionName: 're-consent-pending' });
