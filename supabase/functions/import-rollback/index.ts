/* PROVA Edge — import-rollback (User-JWT, DELETE imported records by import_batch_id) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const VALID_TYPES = ['kontakte', 'auftraege', 'fristen', 'eintraege'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const typ = body?.typ; const importBatchId = body?.import_batch_id;
  if (!VALID_TYPES.includes(typ)) return J({ error: 'typ invalid', valid: VALID_TYPES }, 400);
  if (!importBatchId || !/^[0-9a-f-]{36}$/i.test(String(importBatchId))) return J({ error: 'import_batch_id (UUID) pflicht' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ws } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
  const workspaceId = (ws as any)?.workspace_id;
  if (!workspaceId) return J({ error: 'Kein aktiver Workspace' }, 403);

  const { count, error } = await sb.from(typ).delete({ count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('import_batch_id', importBatchId);
  if (error) return J({ error: error.message }, 500);

  await sb.from('audit_trail').insert({
    workspace_id: workspaceId, user_id: userId,
    action: 'delete', entity_typ: typ, entity_id: importBatchId,
    payload: { typ, deleted: count, import_batch_id: importBatchId, action_kind: 'import_rollback' }
  });

  return J({ ok: true, typ, deleted: count ?? 0, import_batch_id: importBatchId });
});
