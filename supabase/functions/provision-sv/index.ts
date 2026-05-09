/* PROVA Edge — provision-sv (Service-Role, Workspace + Membership Setup nach Signup)
   Aufruf: nach erfolgreichem Stripe-Checkout oder Pilot-Onboarding.
   Body: { user_id, email, paket?, founding_member?, vorname?, nachname? }
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PROVISION_SECRET = Deno.env.get('PROVA_PROVISION_SECRET') ?? Deno.env.get('PROVA_INTERNAL_WRITE_SECRET') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-internal-secret' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);
  if (!PROVISION_SECRET || req.headers.get('x-internal-secret') !== PROVISION_SECRET) return J({ error: 'Forbidden' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const userId = body?.user_id;
  const email = String(body?.email ?? '').toLowerCase().trim();
  const paket = String(body?.paket ?? 'Solo');
  const foundingMember = body?.founding_member === true;
  if (!userId || !email) return J({ error: 'user_id und email pflicht' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Users-Eintrag (oder upsert)
  await sb.from('users').upsert({
    id: userId, email,
    vorname: body?.vorname ?? null, nachname: body?.nachname ?? null,
    paket, founding_member: foundingMember
  }, { onConflict: 'id' });

  // 2. Workspace
  const { data: existingMember } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
  let workspaceId: string;
  if ((existingMember as any)?.workspace_id) {
    workspaceId = (existingMember as any).workspace_id;
  } else {
    const { data: ws, error: wsErr } = await sb.from('workspaces').insert({
      name: (body?.vorname ?? '') + ' ' + (body?.nachname ?? '') + ' SV-Büro',
      billing_email: email,
      paket, abo_status: foundingMember ? 'aktiv-founding' : 'trial',
      trial_endet_am: foundingMember ? null : new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      max_user: paket === 'Team' ? 5 : 1
    }).select('id').maybeSingle();
    if (wsErr) return J({ error: 'Workspace-Erstellung fehlgeschlagen: ' + wsErr.message }, 500);
    workspaceId = (ws as any).id;
    await sb.from('workspace_memberships').insert({
      workspace_id: workspaceId, user_id: userId,
      rolle: 'owner', is_active: true, joined_at: new Date().toISOString()
    });
  }

  // 3. Audit
  await sb.from('audit_trail').insert({
    workspace_id: workspaceId, user_id: userId,
    action: 'create', entity_typ: 'workspace_provisioning',
    payload: { paket, founding_member: foundingMember, source: 'provision-sv-edge' }
  });

  return J({ ok: true, user_id: userId, workspace_id: workspaceId, paket, founding_member: foundingMember }, 201);
});
