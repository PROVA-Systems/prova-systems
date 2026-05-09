/* PROVA Edge — onboarding-delete-demo (User-JWT, löscht alle is_demo=true Records) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST' && req.method !== 'DELETE') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ws } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userData.user.id).eq('is_active', true).limit(1).maybeSingle();
  const workspaceId = (ws as any)?.workspace_id;
  if (!workspaceId) return J({ error: 'Kein aktiver Workspace' }, 403);

  const counts: Record<string, number> = {};
  for (const tbl of ['eintraege', 'fristen', 'kontakte', 'auftraege']) {
    const { count, error } = await sb.from(tbl).delete({ count: 'exact' }).eq('workspace_id', workspaceId).eq('is_demo', true);
    counts[tbl] = error ? 0 : (count ?? 0);
  }
  return J({ ok: true, deleted: counts, hint: 'Demo-Daten entfernt' });
});
