import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_FILTERS = ['alle', 'eigene', 'prova_default', 'docx_import'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  const url = new URL(req.url);
  const filter = VALID_FILTERS.includes(url.searchParams.get('filter') ?? '') ? url.searchParams.get('filter') : 'alle';
  const kategorie = url.searchParams.get('kategorie');
  const search = url.searchParams.get('q');

  try {
    let qb = sb.from('document_templates')
      .select('id, workspace_id, user_id, titel, beschreibung, kategorie, weg, source, is_global, use_count, last_used_at, created_at')
      .is('deleted_at', null);
    if (filter === 'prova_default') qb = qb.eq('is_global', true);
    else if (filter === 'eigene') qb = qb.eq('is_global', false);
    else if (filter === 'docx_import') qb = qb.eq('source', 'docx_import');
    if (kategorie) qb = qb.eq('kategorie', kategorie);
    if (search) qb = qb.ilike('titel', '%' + search.replace(/%/g, '') + '%');
    qb = qb.order('use_count', { ascending: false }).order('last_used_at', { ascending: false, nullsFirst: false }).limit(100);
    const { data, error } = await qb;
    if (error) return J({ error: error.message }, 500);
    return J({ templates: data || [], filter, kategorie, search });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
