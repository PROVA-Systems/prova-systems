/**
 * PROVA — admin-pdf-queue.js
 * MEGA⁶ S1 — Cockpit-Sektion 5/6 (PDF-Queue)
 *
 * Live-View pending + recent PDF-Generierungen.
 * Quelle 1: PDFMonkey-API /v1/documents (falls API-Key vorhanden)
 * Quelle 2: audit_trail typ='pdf.requested'/'pdf.generated' (Fallback)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

async function fetchPdfMonkey(apiKey) {
  try {
    const res = await fetch('https://api.pdfmonkey.io/api/v1/document_cards?per_page=20', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    if (!res.ok) return { error: 'PDFMonkey HTTP ' + res.status };
    const data = await res.json();
    return {
      docs: (data.document_cards || []).map(d => ({
        id: d.id,
        status: d.status,
        filename: d.filename,
        template_id: d.document_template_id,
        created_at: d.created_at,
        updated_at: d.updated_at
      }))
    };
  } catch (e) {
    return { error: e.message };
  }
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const result = {
    ok: true,
    configured: true,
    fetched_at: new Date().toISOString(),
    sources: {}
  };

  // Source 1: PDFMonkey-API
  const apiKey = process.env.PDFMONKEY_API_KEY;
  if (apiKey) {
    const r = await fetchPdfMonkey(apiKey);
    if (r.error) {
      result.sources.pdfmonkey = { ok: false, error: r.error };
    } else {
      const byStatus = {};
      for (const d of r.docs) {
        byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      }
      result.sources.pdfmonkey = {
        ok: true,
        recent_count: r.docs.length,
        by_status: byStatus,
        recent: r.docs.slice(0, 10)
      };
    }
  } else {
    result.sources.pdfmonkey = { ok: false, hint: 'PDFMONKEY_API_KEY nicht gesetzt' };
  }

  // Source 2: audit_trail
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: pdfEvents } = await sb.from('audit_trail')
    .select('typ, sv_email, details, created_at')
    .or('typ.eq.pdf.requested,typ.eq.pdf.generated,typ.eq.pdf.failed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  const auditByTyp = {};
  for (const e of (pdfEvents || [])) {
    auditByTyp[e.typ] = (auditByTyp[e.typ] || 0) + 1;
  }
  result.sources.audit_trail = {
    ok: true,
    last_24h: (pdfEvents || []).length,
    by_typ: auditByTyp,
    recent: (pdfEvents || []).slice(0, 10).map(e => ({
      typ: e.typ,
      sv_email: e.sv_email,
      created_at: e.created_at
    }))
  };

  return jsonResponse(event, 200, result);
}, { functionName: 'admin-pdf-queue', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-pdf-queue' });
