import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

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
  if (!body.weg || !VALID_WEGE.includes(body.weg)) return J({ error: 'weg ungültig', valid: VALID_WEGE }, 400);
  if (!body.content_json || typeof body.content_json !== 'object') return J({ error: 'content_json (object) pflicht' }, 400);

  const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
  if (!ms) return J({ error: 'Kein Workspace' }, 404);

  const contentJsonStr = JSON.stringify(body.content_json);
  const byteSize = new TextEncoder().encode(contentJsonStr).length;
  const now = new Date().toISOString();
  let documentRow: any; let versionNr: number;

  if (body.document_id) {
    const { data: existing, error: fetchErr } = await sb.from('documents').select('id, current_version, workspace_id').eq('id', body.document_id).is('deleted_at', null).maybeSingle();
    if (fetchErr) return J({ error: fetchErr.message }, 500);
    if (!existing) return J({ error: 'Document nicht gefunden' }, 404);
    if (existing.workspace_id !== ms.workspace_id) return J({ error: 'Workspace-Zugriff verweigert' }, 403);
    versionNr = (existing.current_version || 0) + 1;
    const updates: any = { content_json: body.content_json, current_version: versionNr, updated_at: now };
    if (typeof body.titel === 'string') updates.titel = body.titel;
    if (typeof body.weg === 'string') updates.weg = body.weg;
    if (Array.isArray(body.locked_sections)) updates.locked_sections = body.locked_sections;
    const { data: updated, error: upErr } = await sb.from('documents').update(updates).eq('id', body.document_id).select().maybeSingle();
    if (upErr) return J({ error: upErr.message }, 500);
    documentRow = updated;
  } else {
    versionNr = 1;
    const insertRow = {
      workspace_id: ms.workspace_id, auftrag_id: body.auftrag_id ?? null, user_id: user.id,
      titel: body.titel || 'Unbenanntes Dokument', weg: body.weg, content_json: body.content_json,
      locked_sections: Array.isArray(body.locked_sections) ? body.locked_sections : [],
      current_version: versionNr, status: 'draft'
    };
    const { data: inserted, error: insErr } = await sb.from('documents').insert(insertRow).select().maybeSingle();
    if (insErr) return J({ error: insErr.message }, 500);
    documentRow = inserted;
  }

  const { error: vErr } = await sb.from('documents_versions').insert({
    document_id: documentRow.id, workspace_id: ms.workspace_id, version_nr: versionNr,
    content_json: body.content_json, saved_by_user_id: user.id, byte_size: byteSize, notiz: body.notiz ?? null
  });
  if (vErr) console.warn('[document-save] version-insert failed:', vErr.message);

  return J({
    document_id: documentRow.id, version_nr: versionNr, byte_size: byteSize,
    updated_at: documentRow.updated_at, titel: documentRow.titel, weg: documentRow.weg
  });
});
