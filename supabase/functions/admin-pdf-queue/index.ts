/* admin-pdf-queue — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface PdfDoc {
    id: string;
    status: string;
    filename: string | null;
    template_id: string | null;
    created_at: string;
    updated_at: string;
}

async function fetchPdfMonkey(apiKey: string): Promise<{ docs?: PdfDoc[]; error?: string }> {
    try {
        const res = await fetch('https://api.pdfmonkey.io/api/v1/document_cards?per_page=20', {
            headers: { 'Authorization': 'Bearer ' + apiKey }
        });
        if (!res.ok) return { error: 'PDFMonkey HTTP ' + res.status };
        const data = await res.json();
        return {
            docs: (data.document_cards ?? []).map((d: { id: string; status: string; filename: string | null; document_template_id: string | null; created_at: string; updated_at: string }) => ({
                id: d.id,
                status: d.status,
                filename: d.filename,
                template_id: d.document_template_id,
                created_at: d.created_at,
                updated_at: d.updated_at
            }))
        };
    } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
    }
}

Deno.serve(adminHandler(
    { functionName: 'admin-pdf-queue' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const result: Record<string, unknown> = {
            ok: true,
            configured: true,
            fetched_at: new Date().toISOString(),
            sources: {} as Record<string, unknown>
        };
        const sources = result.sources as Record<string, unknown>;

        const apiKey = Deno.env.get('PDFMONKEY_API_KEY');
        if (apiKey) {
            const r = await fetchPdfMonkey(apiKey);
            if (r.error) {
                sources.pdfmonkey = { ok: false, error: r.error };
            } else {
                const byStatus: Record<string, number> = {};
                for (const d of (r.docs ?? [])) {
                    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
                }
                sources.pdfmonkey = {
                    ok: true,
                    recent_count: (r.docs ?? []).length,
                    by_status: byStatus,
                    recent: (r.docs ?? []).slice(0, 10)
                };
            }
        } else {
            sources.pdfmonkey = { ok: false, hint: 'PDFMONKEY_API_KEY nicht gesetzt' };
        }

        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: pdfEvents } = await sb.from('audit_trail')
            .select('typ, sv_email, details, created_at')
            .or('typ.eq.pdf.requested,typ.eq.pdf.generated,typ.eq.pdf.failed')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(50);

        const auditByTyp: Record<string, number> = {};
        for (const e of (pdfEvents ?? [])) {
            auditByTyp[e.typ] = (auditByTyp[e.typ] ?? 0) + 1;
        }
        sources.audit_trail = {
            ok: true,
            last_24h: (pdfEvents ?? []).length,
            by_typ: auditByTyp,
            recent: (pdfEvents ?? []).slice(0, 10).map((e: { typ: string; sv_email: string | null; created_at: string }) => ({
                typ: e.typ,
                sv_email: e.sv_email,
                created_at: e.created_at
            }))
        };

        return jsonResponse(result);
    }
));
