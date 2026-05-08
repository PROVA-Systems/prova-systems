import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_RETURN = 'https://prova-systems.de/einstellungen.html#paket';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
async function findStripeCustomerId(email: string, stripeKey: string): Promise<string | null> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: user } = await sb.from('users').select('id').eq('email', email).maybeSingle();
  if (user) {
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (ms) {
      const { data: ws } = await sb.from('workspaces').select('stripe_customer_id').eq('id', ms.workspace_id).maybeSingle();
      if (ws?.stripe_customer_id) return ws.stripe_customer_id;
    }
  }
  const res = await fetch('https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email) + '&limit=1', { headers: { 'Authorization': 'Bearer ' + stripeKey } });
  if (!res.ok) return null;
  const list = await res.json();
  return list?.data?.[0]?.id ?? null;
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
  if (userError || !userData?.user?.email) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const email = String(userData.user.email).toLowerCase();
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return jsonResponse({ error: 'STRIPE_SECRET_KEY nicht konfiguriert' }, 500);
  let body: any = {}; try { body = await req.json(); } catch { /* OK */ }
  const return_url = body?.return_url || DEFAULT_RETURN;
  try {
    const customerId = await findStripeCustomerId(email, stripeKey);
    if (!customerId) return jsonResponse({ error: 'Kein Stripe-Kunde mit dieser E-Mail gefunden', hint: 'Der SV muss zuerst ein Abo oder Trial abgeschlossen haben.' }, 404);
    const params = new URLSearchParams();
    params.append('customer', customerId);
    params.append('return_url', return_url);
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + stripeKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const session = await res.json();
    if (!res.ok) return jsonResponse({ error: 'Portal-Session-Erstellung fehlgeschlagen', detail: session?.error?.message ?? 'Unknown' }, 502);
    return jsonResponse({ url: session.url });
  } catch (e) { return jsonResponse({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500); }
});
