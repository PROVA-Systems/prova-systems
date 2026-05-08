import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const ALLOWED_FIELDS = [
  'titel', 'fragestellung', 'kurzbeantwortung', 'schadensart_label',
  'schadensart_kategorie', 'schadensstichtag', 'objekt', 'details',
  'auftraggeber_typ', 'auftraggeber_kontakt_id', 'status', 'zweck', 'typ'
];

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
  if (!body.auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);

  const patch: Record<string, any> = {};
  for (const k of Object.keys(body.patch || {})) if (ALLOWED_FIELDS.includes(k)) patch[k] = body.patch[k];
  if (!Object.keys(patch).length) return J({ error: 'Keine gültigen Felder' }, 400);
  patch.updated_at = new Date().toISOString();

  const { data, error } = await sb.from('auftraege').update(patch)
    .eq('id', body.auftrag_id).is('deleted_at', null).select().maybeSingle();
  if (error) return J({ error: error.message }, 500);
  if (!data) return J({ error: 'Auftrag nicht gefunden' }, 404);
  return J({ auftrag: data, updated: Object.keys(patch) });
});
