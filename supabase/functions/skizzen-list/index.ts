import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  const url = new URL(req.url);
  const auftrag_id = url.searchParams.get('auftrag_id') ?? url.searchParams.get('schadensfall_id') ?? null;
  const withSvg = url.searchParams.get('with_svg') === '1';
  const cols = withSvg
    ? 'id, workspace_id, auftrag_id, titel, svg_content, foto_referenz_id, massstab, notiz, pseudonymisiert, created_at, updated_at'
    : 'id, workspace_id, auftrag_id, titel, foto_referenz_id, massstab, notiz, pseudonymisiert, created_at, updated_at';

  try {
    let query = sb.from('skizzen').select(cols).is('deleted_at', null).order('created_at', { ascending: false });
    if (auftrag_id) query = query.eq('auftrag_id', auftrag_id);
    const { data: svgSkizzen, error } = await query.limit(200);
    if (error) return J({ error: error.message }, 500);

    let canvasList: any[] = [];
    try {
      let q2 = sb.from('eintraege')
        .select('id, workspace_id, auftrag_id, titel, skizze_nr, skizze_data, skizze_image_url, created_at, updated_at')
        .eq('typ', 'skizze')
        .order('skizze_nr', { ascending: true });
      if (auftrag_id) q2 = q2.eq('auftrag_id', auftrag_id);
      const { data: cs } = await q2.limit(200);
      canvasList = (cs || []).map((c: any) => ({
        id: c.id, workspace_id: c.workspace_id, auftrag_id: c.auftrag_id,
        titel: c.titel || ('Skizze ' + (c.skizze_nr || '')),
        skizze_nr: c.skizze_nr,
        marker_count: (c.skizze_data && c.skizze_data.markers) ? c.skizze_data.markers.length : 0,
        image_url: c.skizze_image_url,
        canvas_data: c.skizze_data,
        source: 'canvas',
        created_at: c.created_at, updated_at: c.updated_at
      }));
    } catch { /* graceful */ }

    const svgItems = (svgSkizzen || []).map((s: any) => ({ ...s, source: 'svg-legacy' }));
    return J({
      skizzen: svgItems.concat(canvasList),
      total: svgItems.length + canvasList.length,
      svg_count: svgItems.length,
      canvas_count: canvasList.length
    });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
