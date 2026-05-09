/* PROVA Edge — admin-pdfmonkey-inventory (Welle 7)
   GET. PDFMonkey-Templates + Supabase-dokument_templates Drift-Check.
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1';
const COMPLIANCE_REGEX = {
  '407a_blocks': /§\s*407a|407a\s*ZPO/i,
  'ai_act_disclosure': /EU\s*AI\s*Act|VO\s*2024\/1689|Verordnung.*1689/i,
  'gpt4o_references': /gpt-4o\b/i
};

async function fetchPdfmonkey(apiKey: string) {
  if (!apiKey) return { ok: false, error: 'PDFMONKEY_API_KEY fehlt', templates: [] };
  try {
    const res = await fetch(PDFMONKEY_API + '/document_templates?per_page=100', {
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status, templates: [] };
    const data = await res.json();
    return { ok: true, templates: data.document_templates ?? data.templates ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), templates: [] };
  }
}

Deno.serve(adminHandler({ functionName: 'admin-pdfmonkey-inventory' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const apiKey = Deno.env.get('PDFMONKEY_API_KEY') ?? '';
  const [pdfRes, sbRes] = await Promise.all([
    fetchPdfmonkey(apiKey),
    sb.from('dokument_templates').select('id, code, name, typ, pdfmonkey_template_id').order('code')
  ]);
  const pdfTpls = pdfRes.templates;
  const sbTpls = sbRes.data ?? [];

  const pdfMap: Record<string, any> = {};
  for (const t of pdfTpls) pdfMap[t.id ?? t.identifier] = t;
  const sbMap: Record<string, any> = {};
  for (const t of sbTpls) if (t.pdfmonkey_template_id) sbMap[t.pdfmonkey_template_id] = t;

  const missing_in_supabase = Object.keys(pdfMap).filter(id => !sbMap[id])
    .map(id => ({ pdfmonkey_id: id, name: pdfMap[id].identifier ?? pdfMap[id].name }));
  const missing_in_pdfmonkey = Object.keys(sbMap).filter(id => !pdfMap[id])
    .map(id => ({ supabase_code: sbMap[id].code, pdfmonkey_id: id }));
  const matched = Object.keys(sbMap).filter(id => pdfMap[id])
    .map(id => ({ supabase_code: sbMap[id].code, pdfmonkey_id: id, pdfmonkey_name: pdfMap[id].identifier ?? pdfMap[id].name }));

  const counts = { '407a_blocks': 0, 'ai_act_disclosure': 0, 'gpt4o_references': 0 };
  const gpt4oViolations: string[] = [];
  for (const t of pdfTpls) {
    const body = (t.body ?? '') + ' ' + (t.identifier ?? '') + ' ' + (t.name ?? '');
    for (const k of Object.keys(COMPLIANCE_REGEX) as Array<keyof typeof COMPLIANCE_REGEX>) {
      if (COMPLIANCE_REGEX[k].test(body)) {
        counts[k]++;
        if (k === 'gpt4o_references') gpt4oViolations.push(t.identifier ?? t.id);
      }
    }
  }

  return jsonResponse({
    fetched_at: new Date().toISOString(),
    pdfmonkey: { ok: pdfRes.ok, error: pdfRes.error ?? null, count: pdfTpls.length, templates: pdfTpls.map((t: any) => ({ id: t.id, identifier: t.identifier, name: t.name, app_id: t.app_id })) },
    supabase: { count: sbTpls.length, templates: sbTpls },
    drift: { missing_in_supabase, missing_in_pdfmonkey, matched },
    compliance: {
      counts, gpt4o_violations: gpt4oViolations,
      gpt4o_must_be_zero: gpt4oViolations.length === 0
    }
  });
}));
