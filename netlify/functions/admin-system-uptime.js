/**
 * PROVA — admin-system-uptime.js (MEGA⁴¹ P3)
 *
 * GET /admin-system-uptime
 * → 200 { current: [{service, status, ...}], uptime: [{service, range_label, uptime_prozent}],
 *         alerts_recent: [{service, alert_type, sent_at, delivery_status}] }
 *
 * Admin-Dashboard System-Health-Section Backend.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // Aktueller Status pro Service
    const { data: current } = await sb.from('v_service_status_latest').select('*');

    // Uptime 24h/7d/30d
    const { data: uptime } = await sb.from('v_service_uptime').select('*');

    // Letzte 20 Push-Alerts
    const { data: alerts } = await sb.from('push_alert_log')
      .select('service, alert_type, message, sent_at, delivery_status')
      .order('sent_at', { ascending: false })
      .limit(20);

    return jsonResponse(event, 200, {
      fetched_at: new Date().toISOString(),
      current: current || [],
      uptime: uptime || [],
      alerts_recent: alerts || []
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}, { functionName: 'admin-system-uptime', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-system-uptime' });
