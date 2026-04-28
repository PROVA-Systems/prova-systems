/* ============================================================
   PROVA Edge Function — send-email
   Sprint K-1.2.B5

   Ersetzt Make-Scenarios K2 (Komm) + Gmail-Connection.

   Body { to, subject, html?, text?, attachments?, auftrag_id?,
          dokument_id?, zweck }

   Flow:
     1. JWT (oder Service-Token bei System-Mails von pg_cron)
     2. email_log INSERT status=queued
     3. Resend-API call
     4. email_log UPDATE status=gesendet + provider_message_id
     5. Audit + Feature-Event

   Secrets: RESEND_API_KEY
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, HttpError, withErrorHandling } from '../_shared/auth.ts';
import { createSupabaseClient, createServiceClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import type { SendEmailRequest, SendEmailResponse } from '../_shared/types.ts';

const RESEND_API = 'https://api.resend.com/emails';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_DEFAULT = Deno.env.get('PROVA_MAIL_FROM') ?? 'PROVA Systems <noreply@prova-systems.de>';
const STORAGE_BUCKET = 'sv-files';

interface ResendAttachment {
    filename: string;
    content: string;        // base64
    content_type?: string;
}

async function loadStorageAsBase64(sb: ReturnType<typeof createSupabaseClient>, path: string): Promise<{ base64: string; filename: string }> {
    const { data: blob, error } = await sb.storage.from(STORAGE_BUCKET).download(path);
    if (error || !blob) throw new HttpError(`Storage download failed: ${path}`, 404);
    const buf = new Uint8Array(await blob.arrayBuffer());
    // base64-encode
    let binary = '';
    for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);
    const filename = path.split('/').pop() || 'attachment';
    return { base64, filename };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
    if (!RESEND_KEY) return errorResponse('RESEND_API_KEY not set in secrets', 500);

    // Auth: User-JWT ODER Service-Token (für pg_cron / System-Mails).
    // Service-Token-Pattern: x-prova-system-token header gegen ein eigenes Secret
    const systemToken = req.headers.get('x-prova-system-token');
    const isSystem = systemToken && systemToken === Deno.env.get('PROVA_SYSTEM_TOKEN');

    let workspaceId: string | null = null;
    let userId: string | null = null;
    let sb: ReturnType<typeof createSupabaseClient>;

    if (isSystem) {
        sb = createServiceClient();
        const body = await req.clone().json();
        workspaceId = body.workspace_id ?? null;
    } else {
        const ctx = await verifyJwt(req);
        workspaceId = await getWorkspaceId(req, ctx);
        userId = ctx.user.id;
        sb = createSupabaseClient(req);
    }

    const body = await req.json() as SendEmailRequest;
    if (!body.to) throw new HttpError('to required', 400);
    if (!body.subject) throw new HttpError('subject required', 400);
    if (!body.html && !body.text) throw new HttpError('html or text required', 400);

    const empfaenger = Array.isArray(body.to) ? body.to[0] : body.to;

    // 1. email_log INSERT (queued)
    const { data: logRow, error: logErr } = await sb.from('email_log').insert({
        workspace_id: workspaceId,
        user_id: userId,
        empfaenger_email: empfaenger,
        betreff: body.subject,
        zweck: body.zweck ?? 'sonstiges',
        verknuepft_dokument_id: body.dokument_id ?? null,
        status: 'queued',
        provider: 'resend'
    }).select('id').single();

    if (logErr) {
        console.error('email_log insert failed:', logErr.message);
        // Nicht blocken — wir versuchen trotzdem zu senden
    }

    // 2. Attachments: storage_path → base64
    const attachments: ResendAttachment[] = [];
    for (const a of (body.attachments ?? [])) {
        if (a.content_base64) {
            attachments.push({ filename: a.filename, content: a.content_base64, content_type: 'application/octet-stream' });
        } else if (a.storage_path) {
            const { base64 } = await loadStorageAsBase64(sb, a.storage_path);
            attachments.push({ filename: a.filename, content: base64, content_type: 'application/pdf' });
        }
    }

    // 3. Resend POST
    const resp = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: FROM_DEFAULT,
            to: Array.isArray(body.to) ? body.to : [body.to],
            subject: body.subject,
            html: body.html,
            text: body.text,
            attachments: attachments.length ? attachments : undefined
        })
    });

    if (!resp.ok) {
        const err = await resp.text();
        // email_log auf fehler setzen
        if (logRow) {
            await sb.from('email_log').update({
                status: 'fehler',
                fehler_message: err.slice(0, 500)
            }).eq('id', logRow.id);
        }
        throw new HttpError(`Resend ${resp.status}: ${err.slice(0, 300)}`, 502);
    }

    const json = await resp.json();
    const messageId = json.id ?? null;

    // 4. email_log update
    if (logRow) {
        await sb.from('email_log').update({
            status: 'gesendet',
            sent_at: new Date().toISOString(),
            provider_message_id: messageId
        }).eq('id', logRow.id);
    }

    // 5. Audit + Feature-Event
    if (workspaceId && userId) {
        await logAuditEvent(sb, {
            action: 'pdf_send',
            entityTyp: 'email',
            entityId: logRow?.id ?? null,
            payload: { zweck: body.zweck, to: empfaenger, message_id: messageId },
            workspaceId,
            userId
        }, req);
        await trackFeatureEvent(sb, workspaceId, 'email_sent', `email.${body.zweck ?? 'sonstiges'}`);
    }

    const response: SendEmailResponse = { message_id: messageId, queued: true };
    return jsonResponse(response);
};

Deno.serve(withErrorHandling(handler));
