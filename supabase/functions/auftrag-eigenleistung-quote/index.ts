/* PROVA Edge — auftrag-eigenleistung-quote (User-JWT, §407a Eigenleistungs-Quote) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let auftragId: string | null = null;
  if (req.method === 'POST') {
    let body: any = {}; try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
    auftragId = body?.auftrag_id ?? null;
  } else {
    const url = new URL(req.url);
    auftragId = url.searchParams.get('auftrag_id');
  }
  if (!auftragId) return J({ error: 'auftrag_id erforderlich' }, 400);

  const { data: eigene } = await sb.from('eintraege').select('id, bezeichnung, dauer_minuten, eigenleistung').eq('auftrag_id', auftragId).eq('eigenleistung', true);
  const { data: alle } = await sb.from('eintraege').select('id, dauer_minuten').eq('auftrag_id', auftragId);

  const totalMin = (alle ?? []).reduce((s: number, e: any) => s + (e.dauer_minuten ?? 0), 0);
  const eigenMin = (eigene ?? []).reduce((s: number, e: any) => s + (e.dauer_minuten ?? 0), 0);
  const quote = totalMin > 0 ? eigenMin / totalMin : 1;
  const compliant = quote >= 0.5;

  return J({
    auftrag_id: auftragId,
    eigenleistung_minuten: eigenMin,
    gesamt_minuten: totalMin,
    eigenleistung_quote: Math.round(quote * 1000) / 1000,
    compliant_407a: compliant,
    hinweis: compliant ? 'Eigenleistung ≥ 50% (§407a ZPO)' : 'WARNUNG: Eigenleistung unter 50% — § 407a ZPO Verstoß möglich',
    eigene_eintraege: eigene ?? []
  });
});
