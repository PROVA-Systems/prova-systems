/* ============================================================
   PROVA Edge — send-workspace-invitation (MEGA⁸⁷ Block F)
   ============================================================
   Admin/Owner sendet Workspace-Einladung an Email.

   Body { workspace_id, email, rolle, persoenliche_nachricht? }

   Flow:
     1. JWT-Auth + Permission-Check (owner/admin oder can_invite_members)
     2. INSERT in workspace_invitations mit Token + ablauf_at+7d
     3. send-email Edge mit Accept-Link
     4. audit-log-v1 task=admin_action
============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createSupabaseClient, createServiceClient } from '../_shared/supabase.ts';

interface ReqBody {
  workspace_id?: string;
  email?: string;
  rolle?: string;
  persoenliche_nachricht?: string;
}

const ALLOWED_ROLES = new Set(['owner', 'admin', 'sv', 'assistenz', 'readonly']);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await verifyJwt(req);
  const sb = createSupabaseClient(req);

  let body: ReqBody;
  try { body = await req.json(); } catch { throw new HttpError('Invalid JSON', 400); }

  const workspaceId = String(body.workspace_id ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const rolle = String(body.rolle ?? 'sv').trim();
  const msg = String(body.persoenliche_nachricht ?? '').trim();

  if (!workspaceId) throw new HttpError('workspace_id required', 400);
  if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) throw new HttpError('Invalid email', 400);
  if (!ALLOWED_ROLES.has(rolle)) throw new HttpError(`rolle muss aus ${[...ALLOWED_ROLES].join('|')} sein`, 400);

  // Permission-Check: User muss owner/admin sein ODER can_invite_members
  const { data: mem, error: mErr } = await sb.from('workspace_memberships')
    .select('rolle, can_invite_members')
    .eq('workspace_id', workspaceId)
    .eq('user_id', ctx.user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (mErr || !mem) throw new HttpError('Kein Membership im Workspace', 403);
  const canInvite = mem.rolle === 'owner' || mem.rolle === 'admin' || mem.can_invite_members === true;
  if (!canInvite) throw new HttpError('Keine Berechtigung zum Einladen', 403);

  // Token generieren
  const token = crypto.randomUUID();
  const ablaufAt = new Date(Date.now() + 7 * 86400000).toISOString();

  // Invitation einfuegen (Service-Client falls RLS strikt)
  const svc = createServiceClient();
  const { data: inv, error: iErr } = await svc.from('workspace_invitations').insert({
    workspace_id: workspaceId,
    eingeladen_von_user_id: ctx.user.id,
    empfaenger_email: email,
    vorgeschlagene_rolle: rolle,
    token: token,
    status: 'offen',
    versendet_at: new Date().toISOString(),
    ablauf_at: ablaufAt,
    persoenliche_nachricht: msg || null
  }).select('id').single();
  if (iErr) throw new HttpError(`Insert fail: ${iErr.message}`, 500);

  // Email senden via send-email Edge
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const acceptUrl = `https://app.prova-systems.de/workspace-accept-invitation.html?token=${encodeURIComponent(token)}`;
  const subject = 'Einladung zu PROVA Systems Workspace';
  const html = `<p>Hallo,</p>
    <p>Du wurdest zu einem PROVA-Systems-Workspace eingeladen — als Rolle <strong>${rolle}</strong>.</p>` +
    (msg ? `<div style="border-left:3px solid #4f8ef7;padding:12px 16px;background:#f5f7fb;margin:14px 0;font-style:italic;">${msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>` : '') +
    `<p><a href="${acceptUrl}" style="display:inline-block;padding:12px 20px;background:#4f8ef7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Einladung annehmen →</a></p>
    <p style="font-size:12px;color:#666;">Link ist 7 Tage gueltig. Falls du die Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
    <p>Beste Gruesse<br>PROVA Systems</p>`;

  try {
    const auth = req.headers.get('Authorization') ?? '';
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        to: email, subject, html, text: `Einladung: ${acceptUrl}`,
        zweck: 'workspace_invitation', workspace_id: workspaceId
      })
    });
  } catch(_) { /* email-fail darf invitation nicht blockieren */ }

  // Audit-Log
  try {
    const auth = req.headers.get('Authorization') ?? '';
    await fetch(`${supabaseUrl}/functions/v1/audit-log-v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        task: 'admin_action',
        action: 'workspace_invite',
        entity_typ: 'workspace_invitation',
        entity_id: inv.id,
        reason: `Workspace-Invitation an ${email} mit Rolle ${rolle}`,
        payload: { workspace_id: workspaceId, email, rolle, ablauf_at: ablaufAt },
        source: 'send-workspace-invitation',
        kategorie: 'AUTH'
      })
    });
  } catch(_) {}

  return jsonResponse({ ok: true, invitation_id: inv.id, ablauf_at: ablaufAt });
};

Deno.serve(withErrorHandling(handler));
