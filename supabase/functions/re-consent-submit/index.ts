/* PROVA Edge — re-consent-submit (Welle 6)
   POST { rechtsdokument_ids: [...] } — INSERT in einwilligungen + audit_trail.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const ids = Array.isArray(body?.rechtsdokument_ids) ? body.rechtsdokument_ids : [];
  if (!ids.length) return J({ error: 'rechtsdokument_ids[] pflicht' }, 400);

  const { data: dokus, error: dokErr } = await sb.from('rechtsdokumente')
    .select('id, typ, version, inhalt_hash').in('id', ids);
  if (dokErr) return J({ error: dokErr.message }, 500);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const ua = req.headers.get('user-agent') ?? null;

  const inserts = (dokus ?? []).map((d: any) => ({
    user_id: userId,
    rechtsdokument_id: d.id,
    rechtsdokument_typ: d.typ,
    rechtsdokument_version: d.version,
    inhalt_hash_snapshot: d.inhalt_hash,
    ip_address: ip,
    user_agent: ua,
    quelle: 'forced_re_consent_modal'
  }));

  const { error: insErr } = await sb.from('einwilligungen').insert(inserts);
  if (insErr) return J({ error: insErr.message }, 500);

  await sb.from('audit_trail').insert({
    user_id: userId, action: 'create', entity_typ: 'einwilligung',
    payload: { count: inserts.length, source: 'forced-re-consent-edge' }
  });

  return J({ created: inserts.length }, 201);
});
