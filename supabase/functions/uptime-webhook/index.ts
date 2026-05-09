/* PROVA Edge — uptime-webhook (UptimeRobot Webhook) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('UPTIME_WEBHOOK_SECRET') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-secret' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) return J({ error: 'Unauthorized' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  await sb.from('system_health_history').insert({
    service: body?.monitorFriendlyName ?? body?.monitor_friendly_name ?? 'uptimerobot',
    status: body?.alertType === 1 || body?.alert_type === '1' ? 'down' : 'up',
    response_ms: Number(body?.responseTime ?? body?.response_time ?? 0),
    http_status: null,
    error_msg: body?.alertDetails ?? body?.alert_details ?? null,
    metadata: { source: 'uptimerobot', raw: body }
  });
  return J({ ok: true });
});
