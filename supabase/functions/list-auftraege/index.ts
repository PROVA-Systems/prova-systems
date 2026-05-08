import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  const url = new URL(req.url);
  const typenRaw = (url.searchParams.get('typen') ?? '').trim();
  const typen = typenRaw ? typenRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  let q = sb.from('auftraege')
    .select('id, az, auftrag_typ, auftraggeber, phase, status, created_at, frist_ist', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (typen.length) q = q.in('auftrag_typ', typen);

  const { data, error, count } = await q;
  if (error) return J({ error: error.message }, 500);

  const total = count || 0;
  return J({ items: data || [], total, page, total_pages: Math.max(1, Math.ceil(total / limit)), limit });
});
