import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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
  const auftrag_id = url.searchParams.get('auftrag_id') ?? url.searchParams.get('schadensfall_id') ?? null;
  const status = url.searchParams.get('status');
  const dueWithin = url.searchParams.get('due_within_days');

  try {
    let query = sb.from('fristen').select('*').is('deleted_at', null).order('datum_soll', { ascending: true });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    if (status) query = query.eq('status', status);
    if (dueWithin) {
      const max = new Date();
      max.setDate(max.getDate() + parseInt(dueWithin, 10));
      query = query.lte('datum_soll', max.toISOString().slice(0, 10)).eq('status', 'offen');
    }
    const { data, error } = await query.limit(500);
    if (error) return J({ error: error.message }, 500);
    return J({ fristen: data || [], total: (data || []).length });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
