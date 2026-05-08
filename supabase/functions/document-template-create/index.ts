import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];
const VALID_SOURCES = ['user', 'docx_import'];

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

  if (!body.titel || typeof body.titel !== 'string') return J({ error: 'titel pflicht' }, 400);
  if (!body.weg || !VALID_WEGE.includes(body.weg)) return J({ error: 'weg invalid', valid: VALID_WEGE }, 400);
  if (!body.content_json || typeof body.content_json !== 'object') return J({ error: 'content_json (object) pflicht' }, 400);

  const source = body.source && VALID_SOURCES.includes(body.source) ? body.source : 'user';
  const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
  if (!ms) return J({ error: 'Kein Workspace' }, 404);

  const { data: ins, error: err } = await sb.from('document_templates').insert({
    workspace_id: ms.workspace_id, user_id: user.id,
    titel: body.titel.slice(0, 255),
    beschreibung: typeof body.beschreibung === 'string' ? body.beschreibung.slice(0, 500) : null,
    kategorie: typeof body.kategorie === 'string' ? body.kategorie.slice(0, 50) : null,
    weg: body.weg, content_json: body.content_json, source, is_global: false
  }).select('id, titel, kategorie, weg').maybeSingle();

  if (err) return J({ error: err.message }, 500);
  return J({ template_id: ins?.id, titel: ins?.titel, kategorie: ins?.kategorie, weg: ins?.weg });
});
