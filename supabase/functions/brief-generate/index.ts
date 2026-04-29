/* ============================================================
   PROVA Edge Function — brief-generate
   Sprint K-2.0/Block 4

   Whitelist-Pattern für 9 Korrespondenz-Templates (K-01..K-09).
   Vorbild: pdf-generate (gleiche Struktur, aber Korrespondenz-Whitelist).

   Body { template_key, variables, contact_id?, auftrag_id?, az? }

   Flow:
     1. JWT verify + workspace_id
     2. getKorrespondenzTemplateId(key) → Whitelist-Check
        - 400 wenn key unbekannt
        - 503 wenn UUID = '<TODO_PDFMONKEY_UUID_*>' (Marcel-TODO)
     3. Letterhead aus users.letterhead_config (TODO K-2.1A — falls noch
        nicht verfügbar: variables-Pass-Through)
     4. PDFMonkey-Call mit Polling
     5. Storage-Upload: dokumente/briefe/{az}/{template_key}-{ts}.pdf
     6. dokumente-Insert (typ='brief', auftrag_id, kontakt_id)
     7. signed URL 1h
     8. logAuditEvent + trackFeatureEvent
     9. Response: { dokument_id, pdf_url, file_path, generated_at }

   Secrets: PDFMONKEY_API_KEY (gleicher wie pdf-generate)
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, HttpError, withErrorHandling } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import { getKorrespondenzTemplateId } from '../_shared/templates.ts';
import { resolveLetterhead, mergeLetterheadIntoVariables } from '../_shared/letterhead-resolver.ts';

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

interface BriefGenerateRequest {
    template_key: string;
    variables: Record<string, unknown>;
    contact_id?: string;
    auftrag_id?: string;
    az?: string;
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
                meta: JSON.stringify({ source: 'prova-edge', kind: 'korrespondenz' })
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

    const body = await req.json() as BriefGenerateRequest;
    if (!body.template_key) throw new HttpError('template_key required', 400);
    if (!body.variables || typeof body.variables !== 'object') {
        throw new HttpError('variables (object) required', 400);
    }

    // 1. Whitelist-Check
    const lookup = getKorrespondenzTemplateId(body.template_key);
    if (!lookup.ok) throw new HttpError(lookup.error, 400);

    if (lookup.isPending) {
        // 503: Template noch nicht in PDFMonkey angelegt (Marcel-TODO)
        return errorResponse(
            `Template "${body.template_key}" noch nicht in PDFMonkey eingerichtet. ` +
            `Marcel muss Goldstandard-Datei aus /docs/templates-goldstandard/07-korrespondenz/ ` +
            `manuell in PDFMonkey hochladen und UUID in supabase/functions/_shared/templates.ts ` +
            `(KORRESPONDENZ_TEMPLATES) eintragen.`,
            503,
            { template_key: body.template_key, status: 'pending_setup' }
        );
    }

    // 2. Letterhead aus users.letterhead_config + Storage-Signed-URLs mergen
    //    (Frontend-Variables haben Vorrang ausser bei Bild-URLs — siehe
    //    mergeLetterheadIntoVariables in _shared/letterhead-resolver.ts)
    const letterhead = await resolveLetterhead(sb, ctx.user.id);
    const mergedVariables = mergeLetterheadIntoVariables(body.variables, letterhead);

    // 3. PDFMonkey-Generation
    const created = await pdfMonkeyCreate(lookup.templateId, mergedVariables);
    const finished = await waitForPdf(created.id);
    if (!finished.download_url) throw new HttpError('PDFMonkey: no download_url', 502);

    // 4. Download PDF
    const pdfResp = await fetch(finished.download_url);
    if (!pdfResp.ok) throw new HttpError(`PDF download ${pdfResp.status}`, 502);
    const pdfBuf = new Uint8Array(await pdfResp.arrayBuffer());

    // 5. Storage-Upload
    const ts = Date.now();
    const azSlug = (body.az ?? 'no-az').replace(/[^a-zA-Z0-9-_]/g, '-');
    const storagePath = `${workspaceId}/dokumente/briefe/${azSlug}/${body.template_key}-${ts}.pdf`;
    const { error: upErr } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, pdfBuf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw new HttpError(`Storage upload: ${upErr.message}`, 500);

    // 6. dokumente-Insert (typ='brief')
    const { data: docRow, error: insErr } = await sb.from('dokumente').insert({
        workspace_id: workspaceId,
        typ: 'brief',
        auftrag_id: body.auftrag_id ?? null,
        kontakt_id: body.contact_id ?? null,
        betreff: `Korrespondenz · ${body.template_key}`,
        pdfmonkey_template_id: lookup.templateId,
        pdfmonkey_document_id: created.id,
        pdf_payload: mergedVariables,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        bytes: pdfBuf.length,
        status: 'generiert',
        generated_at: new Date().toISOString()
    }).select('id').single();
    if (insErr) throw new HttpError(`dokumente insert: ${insErr.message}`, 500);

    // 7. Signed URL für Frontend (1h)
    const { data: signed } = await sb.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600);

    // 8. Audit + Feature-Event
    await logAuditEvent(sb, {
        action: 'pdf_generate',
        entityTyp: 'dokument',
        entityId: docRow.id,
        payload: {
            template_key: body.template_key,
            kind: 'korrespondenz',
            az: body.az ?? null,
            bytes: pdfBuf.length
        },
        workspaceId,
        userId: ctx.user.id
    }, req);
    await trackFeatureEvent(sb, workspaceId, 'document_generated', `brief.${body.template_key}`);

    return jsonResponse({
        dokument_id: docRow.id,
        pdf_url: signed?.signedUrl,
        file_path: storagePath,
        generated_at: new Date().toISOString(),
        bytes: pdfBuf.length
    });
};

Deno.serve(withErrorHandling(handler));
