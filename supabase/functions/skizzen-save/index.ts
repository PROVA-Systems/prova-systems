import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const auftrag_id = body.auftrag_id || body.schadensfall_id;
  if (!auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);
  if (!body.titel) return J({ error: 'titel pflicht' }, 400);
  if (!body.svg_content) return J({ error: 'svg_content pflicht' }, 400);

  const { data: fall } = await sb.from('auftraege').select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (!fall) return J({ error: 'Auftrag nicht gefunden' }, 404);

  const insert = {
    workspace_id: fall.workspace_id, auftrag_id,
    titel: String(body.titel).slice(0, 255), svg_content: body.svg_content,
    foto_referenz_id: body.foto_referenz_id ?? null, massstab: body.massstab ?? null,
    notiz: body.notiz ?? null, pseudonymisiert: body.pseudonymisiert ?? false,
    created_by_user_id: user.id
  };

  if (body.id) {
    const { data, error } = await sb.from('skizzen').update({ ...insert, updated_at: new Date().toISOString() }).eq('id', body.id).is('deleted_at', null).select().maybeSingle();
    if (error) return J({ error: error.message }, 500);
    if (!data) return J({ error: 'Skizze nicht gefunden' }, 404);
    return J({ skizze: data, updated: true });
  }
  const { data, error } = await sb.from('skizzen').insert(insert).select().single();
  if (error) return J({ error: error.message }, 500);
  return J({ skizze: data, created: true }, 201);
});
