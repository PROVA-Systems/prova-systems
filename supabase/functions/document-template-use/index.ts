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
  if (!body.template_id) return J({ error: 'template_id pflicht' }, 400);

  const { data: tpl, error: fErr } = await sb.from('document_templates')
    .select('id, titel, beschreibung, kategorie, weg, content_json, is_global, use_count, workspace_id')
    .eq('id', body.template_id).is('deleted_at', null).maybeSingle();
  if (fErr) return J({ error: fErr.message }, 500);
  if (!tpl) return J({ error: 'Template nicht gefunden' }, 404);

  const newCount = (tpl.use_count || 0) + 1;
  const { error: uErr } = await sb.from('document_templates')
    .update({ use_count: newCount, last_used_at: new Date().toISOString() }).eq('id', body.template_id);
  if (uErr) console.warn('[document-template-use] use_count failed:', uErr.message);

  return J({
    template: {
      id: tpl.id, titel: tpl.titel, beschreibung: tpl.beschreibung,
      kategorie: tpl.kategorie, weg: tpl.weg, content_json: tpl.content_json, is_global: tpl.is_global
    },
    use_count: newCount
  });
});
