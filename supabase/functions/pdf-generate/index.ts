/* ============================================================
   PROVA Edge Function — pdf-generate
   Sprint K-1.2.B4

   Ersetzt Make-Scenario G3 (PDFMonkey-Wrapper).

   Flow:
     1. JWT
     2. Body { template_key, payload, auftrag_id, kontakt_id, typ, betreff }
     3. Template-ID lookup
     4. PDFMonkey POST /documents
     5. Polling (max 30s, 1s interval) bis status=success
     6. Fetch PDF blob
     7. Upload zu Supabase Storage (workspace-scoped Pfad)
     8. dokumente-Insert (status='generiert')
     9. audit_log + Feature-Event
    10. JSON-Response { dokument_id, storage_path, pdf_url, bytes }

   Secrets: PDFMONKEY_API_KEY
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, HttpError, withErrorHandling } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import { getTemplateId } from '../_shared/templates.ts';
import type { PdfGenerateRequest, PdfGenerateResponse } from '../_shared/types.ts';

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1';
const PDFMONKEY_KEY = Deno.env.get('PDFMONKEY_API_KEY') ?? '';
const STORAGE_BUCKET = 'sv-files';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

interface PdfMonkeyDoc {
    id: string;
    status: 'pending' | 'generating' | 'success' | 'failure';
    download_url?: string;
    failure_cause?: string;
}

async function pdfMonkeyCreate(templateId: string, payload: Record<string, unknown>): Promise<PdfMonkeyDoc> {
    const resp = await fetch(`${PDFMONKEY_API}/documents`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PDFMONKEY_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            document: {
                document_template_id: templateId,
                payload: JSON.stringify(payload),
                status: 'pending',
                meta: JSON.stringify({ source: 'prova-edge' })
            }
        })
    });
    if (!resp.ok) throw new HttpError(`PDFMonkey create ${resp.status}: ${(await resp.text()).slice(0, 300)}`, 502);
    const json = await resp.json();
    return json.document;
}

async function pdfMonkeyGet(id: string): Promise<PdfMonkeyDoc> {
    const resp = await fetch(`${PDFMONKEY_API}/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${PDFMONKEY_KEY}` }
    });
    if (!resp.ok) throw new HttpError(`PDFMonkey get ${resp.status}`, 502);
    const json = await resp.json();
    return json.document;
}

async function waitForPdf(id: string): Promise<PdfMonkeyDoc> {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
        const doc = await pdfMonkeyGet(id);
        if (doc.status === 'success') return doc;
        if (doc.status === 'failure') {
            throw new HttpError(`PDFMonkey failure: ${doc.failure_cause ?? 'unknown'}`, 502);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new HttpError(`PDFMonkey timeout after ${POLL_TIMEOUT_MS}ms`, 504);
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
    if (!PDFMONKEY_KEY) return errorResponse('PDFMONKEY_API_KEY not set', 500);

    const ctx = await verifyJwt(req);
    const workspaceId = await getWorkspaceId(req, ctx);
    const sb = createSupabaseClient(req);

    const body = await req.json() as PdfGenerateRequest;
    if (!body.template_key) throw new HttpError('template_key required', 400);
    if (!body.typ) throw new HttpError('typ (dokument_typ) required', 400);

    const templateId = getTemplateId(body.template_key);

    // 1. Trigger PDFMonkey
    const created = await pdfMonkeyCreate(templateId, body.payload);

    // 2. Poll
    const finished = await waitForPdf(created.id);
    if (!finished.download_url) throw new HttpError('PDFMonkey: no download_url', 502);

    // 3. Download PDF
    const pdfResp = await fetch(finished.download_url);
    if (!pdfResp.ok) throw new HttpError(`PDF download ${pdfResp.status}`, 502);
    const pdfBuf = new Uint8Array(await pdfResp.arrayBuffer());

    // 4. Upload zu Storage (workspace-scoped Pfad)
    const datePath = new Date().toISOString().slice(0, 10);
    const storagePath = `${workspaceId}/dokumente/${datePath}/${body.template_key}-${created.id}.pdf`;
    const { error: upErr } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, pdfBuf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw new HttpError(`Storage upload: ${upErr.message}`, 500);

    // 5. dokumente-Insert
    const { data: docRow, error: insErr } = await sb.from('dokumente').insert({
        workspace_id: workspaceId,
        typ: body.typ,
        auftrag_id: body.auftrag_id ?? null,
        kontakt_id: body.kontakt_id ?? null,
        betreff: body.betreff ?? null,
        pdfmonkey_template_id: templateId,
        pdfmonkey_document_id: created.id,
        pdf_payload: body.payload,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        bytes: pdfBuf.length,
        status: 'generiert',
        generated_at: new Date().toISOString()
    }).select('id').single();
    if (insErr) throw new HttpError(`dokumente insert: ${insErr.message}`, 500);

    // 6. Signed URL für Frontend (1h gültig)
    const { data: signed } = await sb.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600);

    // 7. Audit + Feature-Event
    await logAuditEvent(sb, {
        action: 'pdf_generate',
        entityTyp: 'dokument',
        entityId: docRow.id,
        payload: { template_key: body.template_key, typ: body.typ, bytes: pdfBuf.length },
        workspaceId,
        userId: ctx.user.id
    }, req);
    await trackFeatureEvent(sb, workspaceId, 'document_generated', `pdf.${body.template_key}`);

    const response: PdfGenerateResponse = {
        dokument_id: docRow.id,
        pdfmonkey_document_id: created.id,
        storage_path: storagePath,
        pdf_url: signed?.signedUrl,
        bytes: pdfBuf.length
    };
    return jsonResponse(response);
};

Deno.serve(withErrorHandling(handler));
