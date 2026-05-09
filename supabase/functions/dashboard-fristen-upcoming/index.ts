/* PROVA Edge — dashboard-fristen-upcoming (User-JWT, kommende 7-Tage-Fristen) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-prova-workspace' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  const url = new URL(req.url);
  const days = Math.min(30, Math.max(1, parseInt(url.searchParams.get('days') ?? '7')));
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  const { data, error } = await sb.from('fristen')
    .select('id, frist_datum, betreff, az, auftrag_id, status, prio')
    .gte('frist_datum', today)
    .lte('frist_datum', horizon)
    .neq('status', 'erfuellt')
    .order('frist_datum', { ascending: true });

  if (error) return J({ error: error.message }, 500);

  const fristen = (data ?? []).map((f: any) => {
    const tage = Math.ceil((new Date(f.frist_datum).getTime() - Date.now()) / 86400000);
    return { ...f, tage_bis_frist: tage, dringlichkeit: tage <= 1 ? 'hoch' : tage <= 3 ? 'mittel' : 'niedrig' };
  });

  return J({ fristen, horizon_days: days, count: fristen.length, fetched_at: new Date().toISOString() });
});
