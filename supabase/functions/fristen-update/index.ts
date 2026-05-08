import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const ALLOWED = ['datum_soll', 'datum_ist', 'notiz', 'status', 'erinnerung_tage_vor', 'rechtsgrundlage'];
const STATUS = ['offen', 'erfuellt', 'verfallen', 'verlaengert'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'PUT' && req.method !== 'PATCH') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  if (!body.id) return J({ error: 'id pflicht' }, 400);
  if (body.status && !STATUS.includes(body.status)) return J({ error: 'status ungültig' }, 400);

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const f of ALLOWED) if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f];
  if (Object.keys(patch).length === 1) return J({ error: 'Keine Update-Felder' }, 400);

  const { data, error } = await sb.from('fristen').update(patch).eq('id', body.id).is('deleted_at', null).select().maybeSingle();
  if (error) return J({ error: error.message }, 500);
  if (!data) return J({ error: 'Frist nicht gefunden' }, 404);
  return J({ frist: data, updated: true });
});
