import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const url = new URL(req.url);
  const query = (url.searchParams.get('q') || '').trim();
  const kategorie = url.searchParams.get('kategorie');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50);

  try {
    let qb = sb.from('faq_entries')
      .select('id, kategorie, frage, antwort, tags, view_count, helpful_count')
      .order('view_count', { ascending: false }).limit(limit);
    if (kategorie) qb = qb.eq('kategorie', kategorie);
    if (query.length >= 2) qb = qb.textSearch('search_vector', query, { config: 'german', type: 'websearch' });
    const { data, error } = await qb;
    if (error) return J({ error: error.message }, 500);
    return J({ results: data || [], total: (data || []).length, query, kategorie });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
