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
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);

  try {
    let query = sb.from('fotos')
      .select('id, workspace_id, auftrag_id, typ, beschreibung, storage_path, thumbnail_path, original_filename, mime_type, exif_stripped, captured_at, uploaded_at')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    const { data, error } = await query.limit(limit);
    if (error) return J({ error: error.message }, 500);
    return J({ fotos: data || [], total: (data || []).length });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
