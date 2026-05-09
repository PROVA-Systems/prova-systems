/* PROVA Edge — status-check (GET public latest, POST cron probe) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('PROVA_STATUS_CRON_SECRET') ?? Deno.env.get('STATUS_CRON_SECRET') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret' };

const SERVICES = [
  { kategorie: 'database', component: 'supabase-postgres' },
  { kategorie: 'stripe', component: 'stripe-api' },
  { kategorie: 'email_smtp', component: 'resend-api' },
  { kategorie: 'openai', component: 'openai-api' },
  { kategorie: 'pdfmonkey', component: 'pdfmonkey-api' },
  { kategorie: 'frontend', component: 'netlify-frontend' }
];

async function probe(svc: any) {
  const t0 = Date.now();
  try {
    let url = ''; const opts: any = {};
    switch (svc.kategorie) {
      case 'database': url = SB_URL + '/rest/v1/'; opts.headers = { apikey: SB_ANON || SB_SR }; break;
      case 'stripe': url = 'https://api.stripe.com/healthcheck'; break;
      case 'email_smtp': url = 'https://api.resend.com/domains'; opts.headers = { Authorization: 'Bearer ' + (Deno.env.get('RESEND_API_KEY') ?? '') }; break;
      case 'openai': url = 'https://api.openai.com/v1/models'; opts.headers = { Authorization: 'Bearer ' + (Deno.env.get('OPENAI_API_KEY') ?? '') }; break;
      case 'pdfmonkey': url = 'https://api.pdfmonkey.io/api/v1/document_cards'; opts.headers = { Authorization: 'Bearer ' + (Deno.env.get('PDFMONKEY_API_KEY') ?? '') }; break;
      case 'frontend': url = 'https://prova-systems.de/'; break;
    }
    const res = await fetch(url, opts);
    const ms = Date.now() - t0;
    const status = res.status >= 200 && res.status < 500 ? 'up' : (res.status >= 500 ? 'down' : 'degraded');
    return { kategorie: svc.kategorie, component: svc.component, status, response_time_ms: ms, details: { http_status: res.status } };
  } catch (e) { return { kategorie: svc.kategorie, component: svc.component, status: 'down', response_time_ms: Date.now() - t0, error_message: e instanceof Error ? e.message : String(e), details: { error: e instanceof Error ? e.message : String(e) } }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (req.method === 'POST') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const results = await Promise.all(SERVICES.map(probe));
    const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
    await sb.from('system_health').insert(results.map((r: any) => ({ kategorie: r.kategorie, component: r.component, status: r.status, response_time_ms: r.response_time_ms, details: r.details ?? null, error_message: r.error_message ?? null })));
    return new Response(JSON.stringify({ sampled_at: new Date().toISOString(), results }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  if (req.method === 'GET') {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const services: any[] = [];
    for (const s of SERVICES) {
      const { data } = await sb.from('system_health').select('*').eq('kategorie', s.kategorie).eq('component', s.component).order('sampled_at', { ascending: false }).limit(1).maybeSingle();
      services.push(data ?? { kategorie: s.kategorie, component: s.component, status: 'unknown' });
    }
    const overall = services.every(x => x.status === 'up') ? 'operational' : services.some(x => x.status === 'down') ? 'major-outage' : 'partial-outage';
    return new Response(JSON.stringify({ overall, services, checked_at: new Date().toISOString() }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
});
