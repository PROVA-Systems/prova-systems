/* ============================================================
   PROVA Edge — admin-suspend-workspace (MEGA⁸⁹ Block E)
   ============================================================
   Marcel-only Sperr-Action für verdächtige Workspaces:
     1. workspaces.abo_status = 'pausiert'
     2. workspaces.kuendigung_grund_kategorie = 'admin_suspended_suspicious'
     3. auth.users.banned_until = NOW + 30 days (für owner-user)
     4. audit-log-v1 task=admin_action mit reason

   Body { workspace_id, reason }
============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const MARCEL_USER_ID = '68b27e9e-c32c-415d-9775-ce7273881861';
const SUPER_ADMINS = new Set([
  'marcel.schreiber891@gmail.com',
  'marcel@prova-systems.de',
  'marcel.schreiber@prova-systems.de',
  'kontakt@prova-systems.de',
  'admin@prova-systems.de'
]);

interface ReqBody {
  workspace_id?: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await verifyJwt(req);
  const callerEmail = (ctx.user.email || '').toLowerCase();
  if (ctx.user.id !== MARCEL_USER_ID && !SUPER_ADMINS.has(callerEmail)) {
    return errorResponse('Only super_admin can suspend workspaces', 403);
  }

  let body: ReqBody;
  try { body = await req.json(); } catch { throw new HttpError('Invalid JSON', 400); }

  const wsId = String(body.workspace_id ?? '').trim();
  const reason = String(body.reason ?? '').trim();
  if (!wsId) throw new HttpError('workspace_id required', 400);
  if (reason.length < 10) throw new HttpError('reason min 10 chars (DSGVO-Audit)', 400);

  const svc = createServiceClient();

  // 1. Workspace pausieren
  const { data: ws, error: wErr } = await svc
    .from('workspaces')
    .update({
      abo_status: 'pausiert',
      kuendigung_grund_kategorie: 'admin_suspended_suspicious',
      max_auftraege_pro_monat: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', wsId)
    .select('id, name')
    .single();
  if (wErr || !ws) throw new HttpError(`Workspace nicht gefunden: ${wsId}`, 404);

  // 2. Owner-Banner (best-effort)
  let ownerId: string | null = null;
  try {
    const { data: owner } = await svc.from('workspace_memberships')
      .select('user_id').eq('workspace_id', wsId).eq('rolle', 'owner').eq('is_active', true).maybeSingle();
    ownerId = owner?.user_id ?? null;
    if (ownerId) {
      const bannedUntil = new Date(Date.now() + 30 * 86400000).toISOString();
      await svc.auth.admin.updateUserById(ownerId, { ban_duration: '720h' }); // 30d
      // (alternativ: direkter UPDATE auf auth.users.banned_until via SQL via Service-Role — Supabase JS hat ban_duration-Param)
    }
  } catch (e) {
    console.warn('[suspend] owner ban failed:', (e as Error).message);
  }

  // 3. Audit-Log
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const auth = req.headers.get('Authorization') ?? '';
    await fetch(`${supabaseUrl}/functions/v1/audit-log-v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        task: 'admin_action',
        action: 'update',
        entity_typ: 'workspace',
        entity_id: wsId,
        reason: `Suspended via admin-suspend-workspace: ${reason}`,
        payload: {
          workspace_id: wsId, workspace_name: ws.name, owner_id: ownerId,
          reason, banned_until: 'NOW+30d', kategorie: 'admin_suspended_suspicious'
        },
        source: 'admin-suspend-workspace',
        kategorie: 'ADMIN'
      })
    });
  } catch(_) {}

  return jsonResponse({ ok: true, workspace_id: wsId, workspace_name: ws.name, owner_banned: ownerId !== null });
};

Deno.serve(withErrorHandling(handler));
