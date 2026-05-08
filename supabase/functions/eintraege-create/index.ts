import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const EINTRAG_TYP = ['diktat', 'text', 'foto', 'mix', 'skizze'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function detectPii(t: string): boolean {
  if (!t) return false;
  const patterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\b[A-Z]{2}\d{2}[A-Z0-9]{15,30}\b/,
    /\b\+?\d[\d\s\-\/\(\)]{6,}\d\b/,
    /\b(?:Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ][a-zäöüß]+/
  ];
  return patterns.some(p => p.test(t));
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

  const auftrag_id = body.auftrag_id || body.schadensfall_id;
  const titel = body.titel || (body.beschreibung_text ? body.beschreibung_text.slice(0, 80) : null);
  const content = body.content || body.beschreibung_text || null;
  const typ = body.typ || body.eintrag_typ;

  if (!auftrag_id) return J({ error: 'auftrag_id pflicht' }, 400);
  if (!typ || !EINTRAG_TYP.includes(typ)) return J({ error: 'typ ungültig (' + EINTRAG_TYP.join('|') + ')' }, 400);
  if (!titel || titel.length < 2) return J({ error: 'titel pflicht' }, 400);
  if (!content || content.length < 5) return J({ error: 'content pflicht' }, 400);

  const { data: fall, error: fErr } = await sb.from('auftraege').select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (fErr) return J({ error: fErr.message }, 500);
  if (!fall) return J({ error: 'Auftrag nicht gefunden' }, 404);

  const piiDetected = detectPii(content);
  const insert = {
    auftrag_id, workspace_id: fall.workspace_id, typ,
    datum: body.datum || new Date().toISOString().slice(0, 10),
    titel, content,
    ortstermin_id: body.ortstermin_id ?? null,
    audio_dateien_ids: body.audio_dateien_ids ?? [],
    foto_ids: body.foto_ids ?? [],
    pseudonymisiert: !piiDetected,
    konjunktiv_check_passed: false,
    dauer_min: parseInt(body.dauer_min || 0, 10) || null,
    abrechenbar: body.abrechenbar !== false,
    created_by_user_id: user.id
  };

  const { data, error } = await sb.from('eintraege').insert(insert).select().single();
  if (error) return J({ error: error.message }, 500);
  return J({ eintrag: data, created: true, warnings: piiDetected ? ['Mögliche PII im content (DSGVO Art. 5)'] : [] }, 201);
});
