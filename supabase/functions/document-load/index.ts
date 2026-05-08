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
  const id = url.searchParams.get('id');
  if (!id) return J({ error: 'id pflicht' }, 400);

  try {
    const { data: doc, error: dErr } = await sb.from('documents')
      .select('id, workspace_id, auftrag_id, user_id, titel, weg, content_json, locked_sections, template_id, status, current_version, imported_from_docx, imported_filename, imported_warnings, created_at, updated_at')
      .eq('id', id).is('deleted_at', null).maybeSingle();
    if (dErr) return J({ error: dErr.message }, 500);
    if (!doc) return J({ error: 'Document nicht gefunden' }, 404);

    let contentToReturn = doc.content_json;
    const versionParam = url.searchParams.get('version');
    if (versionParam) {
      const versionNr = parseInt(versionParam, 10);
      if (!isNaN(versionNr) && versionNr > 0) {
        const { data: v } = await sb.from('documents_versions').select('content_json').eq('document_id', id).eq('version_nr', versionNr).maybeSingle();
        if (v) contentToReturn = v.content_json;
      }
    }
    const { data: versions } = await sb.from('documents_versions').select('version_nr, saved_at, byte_size, notiz').eq('document_id', id).order('version_nr', { ascending: false }).limit(50);
    return J({ document: { ...doc, content_json: contentToReturn }, versions: versions || [] });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
