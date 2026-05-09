/* PROVA Edge — audit-source-log (User-JWT, audit-trail-Eintrag mit Source-Code) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const action = String(body?.action ?? '').slice(0, 50);
  const entity_typ = body?.entity_typ ? String(body.entity_typ).slice(0, 50) : null;
  const entity_id = body?.entity_id ? String(body.entity_id).slice(0, 100) : null;
  const source_code = body?.source_code ? String(body.source_code).slice(0, 500) : null;
  if (!action) return J({ error: 'action erforderlich' }, 400);

  const { error } = await sb.from('audit_trail').insert({
    user_id: userData.user.id,
    action,
    entity_typ,
    entity_id,
    payload: { source_code, page_url: req.headers.get('referer'), ...(body?.payload ?? {}) },
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
    user_agent: req.headers.get('user-agent') ?? null
  });
  if (error) return J({ error: error.message }, 500);
  return J({ ok: true });
});
