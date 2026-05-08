import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_MODES = ['A', 'B', 'C'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const auftragId = url.searchParams.get('auftrag_id');
    if (!auftragId) return J({ error: 'auftrag_id pflicht' }, 400);
    const { data: a } = await sb.from('auftraege').select('id, mode_override').eq('id', auftragId).maybeSingle();
    if (!a) return J({ error: 'Auftrag nicht gefunden' }, 404);
    return J({ auftrag_id: a.id, override_mode: a.mode_override || null });
  }

  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const { auftrag_id, override_mode } = body;
  if (!auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);
  if (override_mode !== null && !VALID_MODES.includes(override_mode)) return J({ error: 'override_mode ungültig — A|B|C oder null' }, 400);

  const { data: a } = await sb.from('auftraege').select('id, workspace_id').eq('id', auftrag_id).maybeSingle();
  if (!a) return J({ error: 'Auftrag nicht gefunden' }, 404);

  const { error: updErr } = await sb.from('auftraege').update({ mode_override: override_mode }).eq('id', auftrag_id);
  if (updErr) {
    try {
      await sb.from('audit_trail').insert({
        workspace_id: a.workspace_id, user_id: user.id, action: 'auftrag_mode_override_attempt',
        entity_typ: 'auftrag', entity_id: auftrag_id,
        payload: { override_mode, schema_missing: 'auftraege.mode_override', error: updErr.message }
      });
    } catch { /* graceful */ }
    return J({ error: 'Schema fehlt: auftraege.mode_override', logged: true }, 501);
  }

  try {
    await sb.from('audit_trail').insert({
      workspace_id: a.workspace_id, user_id: user.id, action: 'auftrag_mode_override',
      entity_typ: 'auftrag', entity_id: auftrag_id, payload: { override_mode }
    });
  } catch { /* graceful */ }

  return J({ auftrag_id, override_mode, applied_at: new Date().toISOString() });
});
