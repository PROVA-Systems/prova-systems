/* PROVA Edge — health-check-cron (alle 5-10 Min via pg_cron) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('HEALTH_CHECK_CRON_SECRET') ?? Deno.env.get('FRISTEN_CRON_SECRET') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const TIMEOUT_MS = 5000; const DOWN_THRESHOLD_MS = 8000; const ALERT_THROTTLE_MIN = 60; const LATENCY_WARN_MS = 5000;

const SERVICES = [
  { name: 'stripe', url: 'https://api.stripe.com/healthcheck' },
  { name: 'supabase', url: SB_URL + '/rest/v1/' },
  { name: 'openai', url: 'https://api.openai.com/v1/models' },
  { name: 'sentry', url: 'https://sentry.io/api/0/' },
  { name: 'pdfmonkey', url: 'https://api.pdfmonkey.io/api/v1/document_templates' },
  { name: 'netlify', url: 'https://api.netlify.com/api/v1/' },
  { name: 'ssl_cert', url: 'https://app.prova-systems.de/' }
];

async function checkService(svc: { name: string; url: string }) {
  const start = Date.now(); const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(svc.url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t); const ms = Date.now() - start;
    let status = 'up';
    if (!r.ok && r.status !== 401 && r.status !== 403) status = 'degraded';
    else if (ms > DOWN_THRESHOLD_MS) status = 'degraded';
    return { service: svc.name, status, response_ms: ms, http_status: r.status, error_msg: null, metadata: ms > LATENCY_WARN_MS ? { latency_warning: true } : null };
  } catch (e) {
    clearTimeout(t);
    return { service: svc.name, status: 'down', response_ms: Date.now() - start, http_status: null, error_msg: (e instanceof Error && e.name === 'AbortError') ? 'timeout' : (e instanceof Error ? e.message : String(e)), metadata: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) return J({ error: 'Unauthorized' }, 401);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = await Promise.all(SERVICES.map(checkService));
  const alerts: any[] = [];

  for (const r of results) {
    try { await sb.from('system_health_history').insert(r); } catch (e) { console.warn('insert failed:', e); }
    if (r.status === 'down') {
      const cutoff = new Date(Date.now() - ALERT_THROTTLE_MIN * 60 * 1000).toISOString();
      const { data: recent } = await sb.from('push_alert_log').select('id').eq('service', r.service).gte('sent_at', cutoff).limit(1).maybeSingle();
      if (!recent) {
        await sb.from('push_alert_log').insert({ service: r.service, alert_type: 'down', message: 'Service "' + r.service + '" ist DOWN: ' + (r.error_msg ?? 'unknown'), delivery_status: 'logged' });
        alerts.push({ service: r.service, type: 'down' });
      }
    }
  }

  return J({ checked_at: new Date().toISOString(), checks: results, alerts_triggered: alerts, services_count: SERVICES.length });
});
