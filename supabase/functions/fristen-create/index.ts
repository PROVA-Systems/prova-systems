import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const FRIST_TYPEN = ['gericht', 'gutachten-erstattung', 'honorar', 'widerspruch', 'akteneinsicht', 'zeugen', 'parteien', 'ortstermin'];

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

  const { data: fall, error: fErr } = await sb.from('auftraege').select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (fErr) return J({ error: fErr.message }, 500);
  if (!fall) return J({ error: 'Auftrag nicht gefunden' }, 404);

  if (!body.frist_typ || !FRIST_TYPEN.includes(body.frist_typ)) {
    return J({ error: 'frist_typ ungültig (' + FRIST_TYPEN.join('|') + ')' }, 400);
  }
  if (!body.datum_soll) return J({ error: 'datum_soll pflicht (YYYY-MM-DD)' }, 400);

  const insert = {
    auftrag_id,
    workspace_id: fall.workspace_id,
    frist_typ: body.frist_typ,
    pipeline: body.pipeline ?? null,
    datum_soll: body.datum_soll,
    erinnerung_tage_vor: body.erinnerung_tage_vor ?? [14, 7, 3, 1],
    notiz: body.notiz ?? null,
    rechtsgrundlage: body.rechtsgrundlage ?? null,
    status: 'offen',
    created_by_user_id: user.id
  };
  const { data, error } = await sb.from('fristen').insert(insert).select().single();
  if (error) return J({ error: error.message }, 500);
  return J({ frist: data, created: true }, 201);
});
