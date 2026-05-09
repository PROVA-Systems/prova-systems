/* PROVA Edge — health (public, UptimeRobot) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const start = Date.now();
  const checks: Record<string, any> = {};
  let allOk = true;

  // ENV-Variablen
  const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'];
  const missingEnv = requiredEnv.filter(k => !Deno.env.get(k));
  checks.env = { ok: missingEnv.length === 0, missing: missingEnv };
  if (!checks.env.ok) allOk = false;

  // Supabase
  try {
    const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
    const sbStart = Date.now();
    const { error } = await sb.from('audit_trail').select('id', { count: 'exact', head: true }).limit(1);
    checks.supabase = { ok: !error, ms: Date.now() - sbStart, error: error?.message ?? null };
    if (!checks.supabase.ok) allOk = false;
  } catch (e) {
    checks.supabase = { ok: false, error: e instanceof Error ? e.message : String(e) };
    allOk = false;
  }

  // OpenAI (kein Token-Verbrauch)
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + (Deno.env.get('OPENAI_API_KEY') ?? '') }, signal: ctrl.signal });
    checks.openai = { ok: res.status === 200, status: res.status };
  } catch (e) { checks.openai = { ok: false, error: e instanceof Error ? e.message : String(e) }; }

  return new Response(JSON.stringify({
    status: allOk ? 'ok' : 'degraded',
    version: 'edge-v1',
    ms: Date.now() - start,
    checks,
    ts: new Date().toISOString()
  }, null, 2), {
    status: allOk ? 200 : 503,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
});
