/**
 * PROVA — admin-support-update.js (MEGA³⁷ A1)
 *
 * POST { ticket_id, status }  → updates support_tickets.status
 *
 * Ersetzt den alten Airtable-PATCH in admin-dashboard-logic.js.
 * Auth: requireAuth (Admin-User mit prova_admin-Token).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_STATUSES = ['Offen', 'In Bearbeitung', 'Gelöst', 'Geschlossen'];

exports.handler = withSentry(requireAuth(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.ticket_id) return jsonResponse(event, 400, { error: 'ticket_id pflicht' });
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return jsonResponse(event, 400, { error: 'status ungültig', valid: VALID_STATUSES });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data, error } = await sb.from('support_tickets')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.ticket_id)
      .select()
      .maybeSingle();
    if (error) return jsonResponse(event, 500, { error: error.message });
    if (!data) return jsonResponse(event, 404, { error: 'Ticket nicht gefunden' });
    return jsonResponse(event, 200, { ticket: data });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'admin-support-update' });

module.exports.__VALID_STATUSES = VALID_STATUSES;
