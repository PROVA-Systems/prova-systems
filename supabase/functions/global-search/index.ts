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
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return J({ results: [], total: 0, q, hint: 'Mindestens 2 Zeichen' });

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
  const typeFilter = url.searchParams.get('type') || 'all';
  const ilike = '%' + q.replace(/%/g, '\\%') + '%';
  const results: any[] = [];

  try {
    if (typeFilter === 'all' || typeFilter === 'akten') {
      const { data } = await sb.from('auftraege')
        .select('id, az, titel, auftrag_typ, created_at')
        .is('deleted_at', null)
        .or('az.ilike.' + ilike + ',titel.ilike.' + ilike)
        .limit(limit);
      for (const a of (data || [])) {
        results.push({ kind: 'auftrag', id: a.id, label: a.az + (a.titel ? ' — ' + a.titel : ''), meta: { auftrag_typ: a.auftrag_typ, created_at: a.created_at } });
      }
    }
    if (typeFilter === 'all' || typeFilter === 'kontakte') {
      const { data } = await sb.from('kontakte')
        .select('id, name, email, telefon, rolle')
        .is('deleted_at', null)
        .or('name.ilike.' + ilike + ',email.ilike.' + ilike)
        .limit(limit);
      for (const k of (data || [])) {
        results.push({ kind: 'kontakt', id: k.id, label: k.name, meta: { email: k.email, rolle: k.rolle } });
      }
    }
    if (typeFilter === 'all' || typeFilter === 'dokumente') {
      const { data } = await sb.from('dokumente')
        .select('id, doc_nummer, titel, typ')
        .is('deleted_at', null)
        .or('doc_nummer.ilike.' + ilike + ',titel.ilike.' + ilike)
        .limit(limit);
      for (const d of (data || [])) {
        results.push({ kind: 'dokument', id: d.id, label: d.doc_nummer + (d.titel ? ' — ' + d.titel : ''), meta: { typ: d.typ } });
      }
    }
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }

  return J({ results: results.slice(0, limit), total: results.length, q });
});
