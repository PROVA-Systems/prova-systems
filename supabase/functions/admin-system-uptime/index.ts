/* PROVA Edge — admin-system-uptime (Welle 7) */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(adminHandler({ functionName: 'admin-system-uptime' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const [{ data: current }, { data: uptime }, { data: alerts }] = await Promise.all([
    sb.from('v_service_status_latest').select('*'),
    sb.from('v_service_uptime').select('*'),
    sb.from('push_alert_log').select('service, alert_type, message, sent_at, delivery_status').order('sent_at', { ascending: false }).limit(20)
  ]);
  return jsonResponse({
    fetched_at: new Date().toISOString(),
    current: current ?? [],
    uptime: uptime ?? [],
    alerts_recent: alerts ?? []
  });
}));
