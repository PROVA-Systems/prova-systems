/* PROVA Edge — onboarding-create-demo (Alias zu create-demo-akte mit zusätzlichen Demo-Daten) */
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

  // Demo-Auftrag
  const { data: existing } = await sb.from('auftraege').select('id, az').eq('workspace_id', workspaceId).eq('is_demo', true).maybeSingle();
  let auftrag = existing;
  if (!auftrag) {
    const { data, error } = await sb.from('auftraege').insert({
      workspace_id: workspaceId, user_id: userId, az: 'SCH-DEMO-001', auftragstyp: 'A',
      titel: 'Demo: Wasserschaden — Beispiel-Akte',
      beschreibung: 'Demo-Fall zum Kennenlernen aller PROVA-Funktionen.',
      auftraggeber: 'Demo Versicherung GmbH',
      schadensdatum: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
      status: 'In Bearbeitung', is_demo: true
    }).select().maybeSingle();
    if (error) return J({ error: error.message }, 500);
    auftrag = data;
  }

  // Demo-Kontakt
  await sb.from('kontakte').upsert({
    workspace_id: workspaceId, user_id: userId,
    typ: 'Auftraggeber', firma: 'Demo Versicherung GmbH',
    email: 'demo@beispiel-versicherung.de', is_demo: true
  }, { onConflict: 'workspace_id,email' });

  // Demo-Frist
  await sb.from('fristen').upsert({
    workspace_id: workspaceId, user_id: userId,
    auftrag_id: (auftrag as any)?.id,
    frist_datum: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    betreff: 'Demo: Gutachten-Abgabe', status: 'Offen', is_demo: true
  }, { onConflict: 'auftrag_id,betreff' });

  return J({ ok: true, auftrag, demo_komplett: true, hint: 'Demo-Akte mit Auftrag, Kontakt und Frist angelegt' }, 201);
});
