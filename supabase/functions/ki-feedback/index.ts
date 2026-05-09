/* PROVA Edge — ki-feedback (Welle 7)
   POST { ki_protokoll_id, bewertung, bewertung_score?, probleme?, kommentar?, sv_korrektur? }
   INSERT in ki_feedback. User-JWT.
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

const VALID_BEWERTUNG = ['gut', 'akzeptabel', 'schlecht', 'unbrauchbar'];

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

  const ki_protokoll_id = body?.ki_protokoll_id;
  const bewertung = String(body?.bewertung ?? '');
  const bewertung_score = body?.bewertung_score != null ? Number(body.bewertung_score) : null;
  if (!ki_protokoll_id) return J({ error: 'ki_protokoll_id erforderlich' }, 400);
  if (!VALID_BEWERTUNG.includes(bewertung)) return J({ error: 'bewertung invalid', valid: VALID_BEWERTUNG }, 400);
  if (bewertung_score !== null && (bewertung_score < 1 || bewertung_score > 5)) {
    return J({ error: 'bewertung_score muss 1-5 sein' }, 400);
  }

  // Workspace via membership
  const { data: ws } = await sb.from('workspace_memberships')
    .select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
  const workspaceId = (ws as any)?.workspace_id ?? null;

  const insert = {
    workspace_id: workspaceId,
    user_id: userId,
    ki_protokoll_id,
    prompt_template_id: body?.prompt_template_id ?? null,
    bewertung,
    bewertung_score,
    probleme: Array.isArray(body?.probleme) ? body.probleme : null,
    kommentar: body?.kommentar ? String(body.kommentar).slice(0, 2000) : null,
    sv_korrektur: body?.sv_korrektur ? String(body.sv_korrektur).slice(0, 5000) : null
  };

  const { data, error } = await sb.from('ki_feedback').insert(insert).select('id').maybeSingle();
  if (error) return J({ error: error.message }, 500);

  return J({ ok: true, feedback_id: (data as any)?.id }, 201);
});
