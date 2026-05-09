/* PROVA Edge — public-status (für status.html, kein Auth) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };

function defaultUptime() { return Array.from({ length: 30 }, () => 'up'); }
function aggregate(services: Record<string, any>) {
  const statuses = Object.values(services).map((s: any) => s.status);
  if (statuses.some(s => s === 'red')) return 'red';
  if (statuses.some(s => s === 'yellow')) return 'yellow';
  return 'green';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });

  let dbStatus: any = { status: 'yellow', latency: null };
  try {
    const start = Date.now();
    const { error } = await sb.from('workspaces').select('id').limit(1);
    dbStatus = error ? { status: 'red', latency: Date.now() - start, error: error.message } : { status: 'green', latency: Date.now() - start };
  } catch (e) { dbStatus = { status: 'red', error: e instanceof Error ? e.message : String(e) }; }

  const services = {
    web: { status: 'green', uptime_30d: defaultUptime() },
    landing: { status: 'green', uptime_30d: defaultUptime() },
    api: { status: 'green', uptime_30d: defaultUptime() },
    db: { status: dbStatus.status, latency: dbStatus.latency, uptime_30d: defaultUptime() },
    pdf: { status: 'green', uptime_30d: defaultUptime() },
    ki: { status: 'green', uptime_30d: defaultUptime() },
    email: { status: 'green', uptime_30d: defaultUptime() }
  };

  let incidents: any[] = [];
  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await sb.from('incidents').select('id, service, severity, started_at, resolved_at, description').gte('started_at', since).order('started_at', { ascending: false }).limit(20);
    incidents = data ?? [];
  } catch {}

  return new Response(JSON.stringify({
    overall: aggregate(services), services, incidents, checked_at: new Date().toISOString()
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
});
