import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  if (!body.auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);
  const skizze_nr = parseInt(body.skizze_nr || 1, 10);
  if (isNaN(skizze_nr) || skizze_nr < 1) return J({ error: 'skizze_nr muss positive Zahl sein' }, 400);
  if (!body.data || typeof body.data !== 'object') return J({ error: 'data (Skizze-JSON) pflicht' }, 400);

  const { data: fall } = await sb.from('auftraege').select('workspace_id').eq('id', body.auftrag_id).maybeSingle();
  if (!fall) return J({ error: 'Auftrag nicht gefunden' }, 404);

  let imageUrl: string | null = null;
  if (body.png && typeof body.png === 'string' && body.png.startsWith('data:image/')) {
    try {
      const base64 = body.png.split(',')[1];
      const bytes = base64ToBytes(base64);
      const key = `skizzen/${fall.workspace_id}/${body.auftrag_id}/${skizze_nr}.png`;
      const { error: upErr } = await sb.storage.from('sv-files').upload(key, bytes, { contentType: 'image/png', upsert: true });
      if (!upErr) {
        const { data: pubUrl } = sb.storage.from('sv-files').getPublicUrl(key);
        imageUrl = pubUrl?.publicUrl ?? null;
      }
    } catch { /* graceful */ }
  }

  const eintragRow = {
    workspace_id: fall.workspace_id,
    auftrag_id: body.auftrag_id,
    typ: 'skizze',
    skizze_nr,
    titel: body.data.titel || ('Skizze ' + skizze_nr),
    content: 'Skizze ' + skizze_nr,
    skizze_data: body.data,
    skizze_image_url: imageUrl,
    created_by_user_id: user.id,
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await sb.from('eintraege').select('id')
    .eq('auftrag_id', body.auftrag_id).eq('typ', 'skizze').eq('skizze_nr', skizze_nr).maybeSingle();

  let result: any;
  if (existing) {
    const { data, error } = await sb.from('eintraege').update(eintragRow).eq('id', existing.id).select().maybeSingle();
    if (error) return J({ error: error.message }, 500);
    result = data;
  } else {
    const { data, error } = await sb.from('eintraege').insert(eintragRow).select().maybeSingle();
    if (error) return J({ error: error.message }, 500);
    result = data;
  }

  return J({ eintrag_id: result.id, auftrag_id: body.auftrag_id, skizze_nr, image_url: imageUrl, marker_count: (body.data.markers || []).length });
});
