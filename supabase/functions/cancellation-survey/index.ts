/* PROVA Edge — cancellation-survey (Welle 6)
   POST { cancellation_reason, feedback?, feature_request?, recommend_anyway? }
   INSERT in churn_reasons + audit_trail.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const VALID_REASONS = [
  'too_expensive', 'missing_feature', 'low_quality', 'switched_service',
  'unused', 'too_complex', 'customer_service', 'other'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const reason = String(body?.cancellation_reason ?? '');
  if (!VALID_REASONS.includes(reason)) {
    return J({ error: 'cancellation_reason invalid', valid: VALID_REASONS }, 400);
  }
  const feedback = body?.feedback ? String(body.feedback).slice(0, 2000) : null;
  const featureRequest = body?.feature_request ? String(body.feature_request).slice(0, 500) : null;
  const recommendAnyway = body?.recommend_anyway === true;
  const konkurrenz = body?.konkurrenz ? String(body.konkurrenz).slice(0, 200) : null;

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });

  // Workspace + abonniert_seit
  const { data: membership } = await sb.from('workspace_memberships')
    .select('workspace_id, joined_at').eq('user_id', userId).eq('is_active', true)
    .order('joined_at', { ascending: true }).limit(1).maybeSingle();
  const workspaceId = (membership as any)?.workspace_id ?? null;
  const joinedAt = (membership as any)?.joined_at;
  const abonniertSeitTagen = joinedAt
    ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / 86400000)
    : null;

  const detailsObj = {
    feedback, feature_request: featureRequest, recommend_anyway: recommendAnyway,
    submitted_at: new Date().toISOString()
  };

  const { error: chErr } = await sb.from('churn_reasons').insert({
    workspace_id: workspaceId,
    user_id: userId,
    grund_kategorie: reason,
    details: JSON.stringify(detailsObj),
    konkurrenz_genannt: konkurrenz,
    abonniert_seit_tagen: abonniertSeitTagen,
    win_back_versucht: false
  });
  if (chErr) return J({ error: chErr.message }, 500);

  await sb.from('audit_trail').insert({
    workspace_id: workspaceId, user_id: userId,
    action: 'update', entity_typ: 'churn',
    payload: { reason, source: 'cancellation_survey' }
  });

  return J({
    ok: true,
    message: 'Vielen Dank für dein Feedback.',
    next_step: 'Bitte fahre mit der Stripe-Customer-Portal-Kündigung fort.'
  });
});
