/* PROVA Edge — admin-push-alerts (Welle 7)
   GET. Live-Feed kritischer Events aus audit_trail letzten 24h.
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const ALERT_PATTERNS: Array<{ entity: string; severity: 'high' | 'medium' | 'low'; label: string }> = [
  { entity: 'admin_endpoint', severity: 'medium', label: 'Admin Endpoint' },
  { entity: 'admin_impersonation', severity: 'high', label: 'Admin Impersonation' },
  { entity: 'user', severity: 'low', label: 'User Action' }
];

Deno.serve(adminHandler({ functionName: 'admin-push-alerts' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data, error } = await sb.from('audit_trail')
    .select('id, action, entity_typ, entity_id, payload, user_id, workspace_id, created_at')
    .gte('created_at', since)
    .in('action', ['login', 'login_failed', 'data_delete_dsgvo', 'data_export_dsgvo', 'workspace_remove_member'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return jsonResponse({ ok: true, configured: false, hint: 'audit_trail-Query fehlgeschlagen', error: error.message });

  const alerts = (data ?? []).map((e: any) => {
    let severity: 'high' | 'medium' | 'low' = 'low';
    let label = e.action;
    if (e.action === 'data_delete_dsgvo') { severity = 'high'; label = 'DSGVO Löschung'; }
    else if (e.action === 'login_failed') { severity = 'medium'; label = 'Login Failed'; }
    else if (e.entity_typ === 'admin_impersonation') { severity = 'high'; label = 'Admin Impersonation'; }
    return {
      id: e.id, action: e.action, entity_typ: e.entity_typ, severity, label,
      user_id: e.user_id, workspace_id: e.workspace_id, created_at: e.created_at,
      payload_short: JSON.stringify(e.payload ?? {}).slice(0, 200)
    };
  });

  const counts = { high: 0, medium: 0, low: 0 };
  for (const a of alerts) counts[a.severity]++;

  return jsonResponse({
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since, total: alerts.length, counts, alerts
  });
}));
