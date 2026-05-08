import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function ipHint(req: Request): string {
  const fwd = String(req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const raw = fwd || String(req.headers.get('x-nf-client-connection-ip') || '').trim();
  if (!raw) return '';
  if (raw.includes(':')) return raw.split(':').slice(0, 3).join(':');
  return raw.split('.').slice(0, 3).join('.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* graceful */ }

  const action = String(body.typ || body.type || body.action || 'event').slice(0, 120);
  const az = String(body.az || '').slice(0, 240);
  const detailsObj = body.details && typeof body.details === 'object' ? body.details : {};
  const hint = ipHint(req);

  try {
    await sb.from('audit_trail').insert({
      user_id: user.id,
      action,
      entity_typ: 'event',
      entity_id: body.entity_id ?? null,
      payload: { az, ip_hint: hint, ...detailsObj }
    });
  } catch { /* never block */ }

  return J({ ok: true });
});
