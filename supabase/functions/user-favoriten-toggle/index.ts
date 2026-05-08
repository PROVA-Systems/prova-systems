import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_KATEGORIEN = ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen'];

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
  if (!body.kategorie || !VALID_KATEGORIEN.includes(body.kategorie)) return J({ error: 'kategorie ungültig', valid: VALID_KATEGORIEN }, 400);
  if (!body.item_id || typeof body.item_id !== 'string') return J({ error: 'item_id pflicht' }, 400);

  const { data: existing } = await sb.from('user_favoriten').select('id').eq('user_id', user.id).eq('kategorie', body.kategorie).eq('item_id', body.item_id).maybeSingle();

  if (existing) {
    const { error } = await sb.from('user_favoriten').delete().eq('id', existing.id);
    if (error) return J({ error: error.message }, 500);
    return J({ ok: true, is_favorit: false, action: 'removed' });
  } else {
    const { error } = await sb.from('user_favoriten').insert({
      user_id: user.id,
      kategorie: body.kategorie,
      item_id: body.item_id,
      item_label: body.item_label ?? null
    });
    if (error) return J({ error: error.message }, 500);
    return J({ ok: true, is_favorit: true, action: 'added' });
  }
});
