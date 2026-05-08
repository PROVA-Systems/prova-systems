import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function pad3(n: number): string { return String(n).padStart(3, '0'); }

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

  const { typ, empfaenger, betreff, inhalt } = body;
  if (!typ) return J({ error: 'typ pflicht' }, 400);
  if (!empfaenger?.email) return J({ error: 'empfaenger.email pflicht' }, 400);

  const apiKey = Deno.env.get('PDFMONKEY_API_KEY');
  const templateId = Deno.env.get('PDFMONKEY_BESCHEINIGUNG_TEMPLATE_ID');
  if (!apiKey || !templateId) return J({ error: 'PDFMONKEY nicht konfiguriert' }, 503);

  const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
  if (!ms) return J({ error: 'Kein Workspace' }, 404);

  const jahr = new Date().getFullYear();
  await sb.from('bescheinigungs_sequences').upsert(
    { workspace_id: ms.workspace_id, jahr, letzte_nr: 0 },
    { onConflict: 'workspace_id,jahr', ignoreDuplicates: true }
  );
  const { data: cur } = await sb.from('bescheinigungs_sequences').select('letzte_nr').eq('workspace_id', ms.workspace_id).eq('jahr', jahr).maybeSingle();
  const newNr = (cur?.letzte_nr ?? 0) + 1;
  await sb.from('bescheinigungs_sequences').update({ letzte_nr: newNr, updated_at: new Date().toISOString() }).eq('workspace_id', ms.workspace_id).eq('jahr', jahr);
  const aktenzeichen = 'BES-' + jahr + '-' + pad3(newNr);

  try {
    const res = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          document_template_id: templateId, status: 'pending',
          payload: { aktenzeichen, typ, empfaenger, betreff, inhalt, datum: new Date().toLocaleDateString('de-DE') },
          meta: { workspace_id: ms.workspace_id, aktenzeichen, typ: 'bescheinigung' }
        }
      })
    });
    if (!res.ok) return J({ error: 'PDFMonkey-Fehler', status: res.status, detail: await res.text() }, 502);
    const data = await res.json();
    return J({ aktenzeichen, document_id: data.document?.id, preview_url: data.document?.preview_url, status: data.document?.status });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
