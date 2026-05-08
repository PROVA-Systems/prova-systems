import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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
  if (!body.auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);
  if (!body.vorlage_id) return J({ error: 'vorlage_id pflicht' }, 400);

  const apiKey = Deno.env.get('PDFMONKEY_API_KEY');
  const templateId = Deno.env.get('PDFMONKEY_MODE_C_TEMPLATE_ID');
  if (!apiKey || !templateId) return J({ error: 'PDFMONKEY Mode-C nicht konfiguriert' }, 503);

  const { data: auftrag } = await sb.from('auftraege')
    .select('id, az, workspace_id, titel, fragestellung, kurzbeantwortung')
    .eq('id', body.auftrag_id).maybeSingle();
  if (!auftrag) return J({ error: 'Auftrag nicht gefunden' }, 404);

  const { data: vorlage } = await sb.from('user_vorlagen')
    .select('id, name, content_json, variable_mapping').eq('id', body.vorlage_id).maybeSingle();
  if (!vorlage) return J({ error: 'Vorlage nicht gefunden' }, 404);

  const variables = body.variables ?? {};

  try {
    const res = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          document_template_id: templateId, status: 'pending',
          payload: {
            az: auftrag.az, titel: auftrag.titel, vorlage_name: vorlage.name,
            content: vorlage.content_json, variables,
            fragestellung: auftrag.fragestellung, kurzbeantwortung: auftrag.kurzbeantwortung,
            generiert_am: new Date().toLocaleDateString('de-DE')
          },
          meta: { workspace_id: auftrag.workspace_id, auftrag_id: auftrag.id, typ: 'mode-c-pdf', vorlage_id: vorlage.id }
        }
      })
    });
    if (!res.ok) return J({ error: 'PDFMonkey-Fehler', status: res.status, detail: await res.text() }, 502);
    const data = await res.json();
    return J({ document_id: data.document?.id, preview_url: data.document?.preview_url, status: data.document?.status });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
