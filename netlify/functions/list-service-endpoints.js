/**
 * PROVA — list-service-endpoints.js (MEGA³⁷ C4)
 *
 * GET /.netlify/functions/list-service-endpoints
 *  → 200 { endpoints: [{service_key, endpoint_url, service_type, ...}] }
 *
 * Liefert alle aktiven service_endpoints. Frontend lädt via cache-Lib
 * lib/service-endpoints-cache.js. Auth: requireAuth.
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
    const { data, error } = await sb.from('service_endpoints')
      .select('id, service_key, endpoint_url, service_type, description, active')
      .eq('active', true)
      .order('service_key', { ascending: true });
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 200, { endpoints: data || [], count: (data || []).length });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'list-service-endpoints' });
