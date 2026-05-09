/* PROVA Edge — import-execute (User-JWT, batch INSERT mit import_batch_id für Rollback) */
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
  const typ = body?.typ; const rows = body?.rows;
  if (!VALID_TYPES.includes(typ)) return J({ error: 'typ invalid', valid: VALID_TYPES }, 400);
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) return J({ error: 'rows[] (1-1000) erforderlich' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ws } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
  const workspaceId = (ws as any)?.workspace_id;
  if (!workspaceId) return J({ error: 'Kein aktiver Workspace' }, 403);

  const importBatchId = crypto.randomUUID();
  const enriched = rows.map((r: any) => ({ ...r, workspace_id: workspaceId, user_id: userId, import_batch_id: importBatchId }));

  const { data, error } = await sb.from(typ).insert(enriched).select('id');
  if (error) return J({ error: error.message, import_batch_id: importBatchId }, 500);

  await sb.from('audit_trail').insert({
    workspace_id: workspaceId, user_id: userId,
    action: 'import', entity_typ: typ, entity_id: importBatchId,
    payload: { typ, count: data?.length ?? 0, import_batch_id: importBatchId }
  });

  return J({ ok: true, typ, inserted: data?.length ?? 0, import_batch_id: importBatchId, ids: data?.map((d: any) => d.id) ?? [] }, 201);
});
