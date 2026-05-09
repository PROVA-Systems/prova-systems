/* PROVA Edge — create-demo-akte (User-JWT, Demo-Auftrag SCH-DEMO-001) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ws } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
  const workspaceId = (ws as any)?.workspace_id;
  if (!workspaceId) return J({ error: 'Kein aktiver Workspace gefunden' }, 403);

  // Falls Demo-Auftrag bereits existiert, nicht doppelt anlegen
  const { data: existing } = await sb.from('auftraege').select('id, az').eq('workspace_id', workspaceId).eq('az', 'SCH-DEMO-001').maybeSingle();
  if (existing) return J({ ok: true, auftrag: existing, hint: 'Demo-Auftrag existiert bereits' });

  const { data: auftrag, error } = await sb.from('auftraege').insert({
    workspace_id: workspaceId,
    user_id: userId,
    az: 'SCH-DEMO-001',
    auftragstyp: 'A',
    titel: 'Demo: Schaden Wasserrohrbruch Mehrfamilienhaus',
    beschreibung: 'Demo-Fall zum Kennenlernen von PROVA. Dieser Auftrag ist read-only und dient nur als Beispiel.',
    auftraggeber: 'Demo Versicherung GmbH',
    versicherungsnummer: 'V-DEMO-2026-001',
    schadensdatum: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    ortstermin_datum: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    status: 'In Bearbeitung',
    is_demo: true
  }).select().maybeSingle();

  if (error) return J({ error: error.message }, 500);
  return J({ ok: true, auftrag, hint: 'Demo-Auftrag SCH-DEMO-001 angelegt' }, 201);
});
