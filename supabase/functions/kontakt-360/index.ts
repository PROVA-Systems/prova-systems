import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  const url = new URL(req.url);
  const kontaktId = url.searchParams.get('kontakt_id');
  if (!kontaktId) return J({ error: 'kontakt_id pflicht' }, 400);

  const { data: kontakt, error: kErr } = await sb.from('kontakte').select('*').eq('id', kontaktId).maybeSingle();
  if (kErr) return J({ error: kErr.message }, 500);
  if (!kontakt) return J({ error: 'Kontakt nicht gefunden' }, 404);

  const auftraege = (await sb.from('auftraege')
    .select('id, az, titel, auftrag_typ, status, phase, created_at')
    .eq('auftraggeber_kontakt_id', kontaktId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(50)).data || [];
  const dokumente = (await sb.from('dokumente')
    .select('id, doc_nummer, titel, typ, betrag_brutto, bezahlt_at, created_at')
    .eq('kontakt_id', kontaktId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(50)).data || [];

  const stats = {
    auftraege_total: auftraege.length,
    auftraege_aktiv: auftraege.filter((a: any) => a.status !== 'abgeschlossen').length,
    dokumente_total: dokumente.length,
    summe_offen_eur: dokumente.filter((d: any) => !d.bezahlt_at && d.betrag_brutto)
      .reduce((sum: number, d: any) => sum + (parseFloat(d.betrag_brutto) || 0), 0)
  };

  return J({ kontakt, auftraege, dokumente, stats });
});
