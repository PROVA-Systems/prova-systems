import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STUFEN = [
  { stufe: 1, tage_nach_faellig: 14, gebuehr_eur: 0,  template: 'F-05-MAHNUNG-1-FREUNDLICH' },
  { stufe: 2, tage_nach_faellig: 21, gebuehr_eur: 5,  template: 'F-07-MAHNUNG-2' },
  { stufe: 3, tage_nach_faellig: 35, gebuehr_eur: 10, template: 'F-08-MAHNUNG-3-LETZTE' }
];
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function daysSince(dateStr: string | null): number { if (!dateStr) return 0; return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expected = Deno.env.get('PROVA_FRISTEN_CRON_SECRET') ?? Deno.env.get('FRISTEN_CRON_SECRET') ?? Deno.env.get('PROVA_MAHN_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized — X-Cron-Secret missing' }, 401);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const { data: rechnungen, error } = await sb.from('dokumente').select('id, workspace_id, auftrag_id, doc_nummer, faelligkeit, mahn_stufe, mahn_datum_letzte, mahn_gebuehr, betrag_brutto, bezahlt_at').in('typ', ['rechnung', 'rechnung_jveg', 'rechnung_stunden']).is('bezahlt_at', null).is('deleted_at', null).lte('faelligkeit', cutoff);
  if (error) return jsonResponse({ error: error.message }, 500);
  let processed = 0, eskaliert = 0, skipped = 0;
  const heute = new Date().toISOString();
  const heuteDate = heute.slice(0, 10);
  for (const r of (rechnungen ?? [])) {
    processed++;
    const tage = daysSince(r.faelligkeit);
    const aktuelleStufe = r.mahn_stufe ?? 0;
    if (r.mahn_datum_letzte && r.mahn_datum_letzte.slice(0, 10) === heuteDate) { skipped++; continue; }
    const naechsteStufe = STUFEN.find(s => tage >= s.tage_nach_faellig && s.stufe > aktuelleStufe);
    if (!naechsteStufe) { skipped++; continue; }
    const updateRes = await sb.from('dokumente').update({ mahn_stufe: naechsteStufe.stufe, mahn_datum_letzte: heute, mahn_gebuehr: (parseFloat(String(r.mahn_gebuehr ?? 0)) + naechsteStufe.gebuehr_eur) }).eq('id', r.id);
    if (updateRes.error) { skipped++; continue; }
    try { await sb.from('audit_trail').insert({ workspace_id: r.workspace_id, action: 'create', entity_typ: 'mahnung', entity_id: r.id, payload: { stufe: naechsteStufe.stufe, tage_nach_faellig: tage, gebuehr_eur: naechsteStufe.gebuehr_eur, template: naechsteStufe.template, source: 'MEGA43-mahnwesen-cron-edge' } }); } catch { /* defensive */ }
    eskaliert++;
  }
  return jsonResponse({ processed, eskaliert, skipped, cutoff, heute: heuteDate });
});
