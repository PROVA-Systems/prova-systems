/* ============================================================
   PROVA Edge — send-support-reply (MEGA⁸⁶ Block E)
   ============================================================
   Admin schickt Antwort auf Support-Ticket per Email.

   Body { ticket_id, reply_text }

   Flow:
     1. Admin-Auth (verifyJwt + admin-Check)
     2. support_tickets-Row laden (user_email, titel)
     3. send-email Edge intern aufrufen
     4. support_tickets.resolution_text + status=beantwortet + resolved_at
     5. audit-log-v1 task=admin_action mit reason
============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createSupabaseClient, createServiceClient } from '../_shared/supabase.ts';

const MARCEL_USER_ID = '68b27e9e-c32c-415d-9775-ce7273881861';

interface ReqBody {
  ticket_id?: string;
  reply_text?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await verifyJwt(req);
  if (ctx.user.id !== MARCEL_USER_ID) {
    return errorResponse('Only Marcel can send support replies (admin-only)', 403);
  }

  let body: ReqBody;
  try { body = await req.json(); } catch { throw new HttpError('Invalid JSON', 400); }

  const ticketId = String(body.ticket_id ?? '').trim();
  const replyText = String(body.reply_text ?? '').trim();
  if (!ticketId) throw new HttpError('ticket_id required', 400);
  if (replyText.length < 5) throw new HttpError('reply_text too short (min 5 chars)', 400);

  // Service-Client für Support-Tickets-Zugriff (RLS-bypass für admin)
  const svc = createServiceClient();

  const { data: ticket, error: tErr } = await svc
    .from('support_tickets')
    .select('id, user_email, titel, workspace_id, status')
    .eq('id', ticketId)
    .single();
  if (tErr || !ticket) throw new HttpError(`Ticket nicht gefunden: ${ticketId}`, 404);
  if (!ticket.user_email) throw new HttpError('Ticket hat keine user_email', 400);

  // 1. Email via send-email Edge
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const systemToken = Deno.env.get('PROVA_SYSTEM_TOKEN') ?? '';
  const subject = `Re: ${ticket.titel || 'Support-Anfrage'} (Ticket #${ticketId.slice(0, 8)})`;
  const htmlBody = `<p>Hallo,</p><p>vielen Dank für deine Support-Anfrage. Hier ist meine Antwort:</p>` +
    `<div style="border-left:3px solid #4f8ef7;padding:12px 16px;background:#f5f7fb;margin:14px 0;">${
      replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')
    }</div>` +
    `<p>Bei weiteren Fragen einfach antworten — du kannst direkt auf diese Mail antworten.</p>` +
    `<p>Beste Grüße<br>Marcel · PROVA Systems</p>`;

  const mailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-prova-system-token': systemToken
    },
    body: JSON.stringify({
      to: ticket.user_email,
      subject,
      html: htmlBody,
      text: replyText,
      zweck: 'support_reply',
      workspace_id: ticket.workspace_id
    })
  });
  if (!mailRes.ok) {
    const errTxt = await mailRes.text().catch(() => '');
    throw new HttpError(`send-email failed: ${mailRes.status} ${errTxt}`, 500);
  }

  // 2. Ticket-Status updaten
  const { error: uErr } = await svc.from('support_tickets').update({
    resolution_text: replyText,
    status: 'beantwortet',
    resolved_at: new Date().toISOString(),
    resolved_by_user_id: ctx.user.id
  }).eq('id', ticketId);
  if (uErr) console.warn('[send-support-reply] update ticket fail:', uErr.message);

  // 3. Audit-Log via audit-log-v1
  try {
    const auth = req.headers.get('Authorization') ?? '';
    await fetch(`${supabaseUrl}/functions/v1/audit-log-v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        task: 'admin_action',
        action: 'update',
        entity_typ: 'support_ticket',
        entity_id: ticketId,
        reason: `Support-Reply gesendet an ${ticket.user_email}`,
        payload: { ticket_id: ticketId, reply_length: replyText.length, recipient: ticket.user_email },
        source: 'send-support-reply',
        kategorie: 'ADMIN'
      })
    });
  } catch(_) { /* best-effort */ }

  return jsonResponse({ ok: true, ticket_id: ticketId, recipient: ticket.user_email });
};

Deno.serve(withErrorHandling(handler));
