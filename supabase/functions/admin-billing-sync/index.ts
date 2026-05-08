import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const HARDCODED_ADMIN_EMAILS = ['marcel.schreiber891@gmail.com','marcel@prova-systems.de','kontakt@prova-systems.de','admin@prova-systems.de'];
const ENV_ADMIN_EMAILS = (Deno.env.get('PROVA_ADMIN_EMAILS') ?? '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = Array.from(new Set([...HARDCODED_ADMIN_EMAILS.map(e=>e.toLowerCase()),...ENV_ADMIN_EMAILS]));
const REQUIRE_2FA = String(Deno.env.get('PROVA_ADMIN_REQUIRE_2FA') ?? 'true').toLowerCase() !== 'false';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function decodeJwtClaims(jwt: string): any { try { const p = jwt.split('.'); const pad = p[1].replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-(p[1].length%4))%4); return JSON.parse(atob(pad)); } catch { return null; } }
async function requireAdmin(req: Request): Promise<{ ok: true; email: string } | { ok: false; resp: Response }> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return { ok: false, resp: jsonResponse({ error: 'UNAUTHORIZED' }, 401) };
  const token = auth.slice(7);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user?.email) return { ok: false, resp: jsonResponse({ error: 'UNAUTHORIZED' }, 401) };
  const email = String(data.user.email).toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return { ok: false, resp: jsonResponse({ error: 'NOT_ADMIN' }, 403) };
  if (REQUIRE_2FA) { const claims = decodeJwtClaims(token); if (claims?.aal !== 'aal2') return { ok: false, resp: jsonResponse({ error: 'AAL2_REQUIRED' }, 403) }; }
  return { ok: true, email };
}
async function stripeFetch(path: string, key: string): Promise<any> {
  const res = await fetch('https://api.stripe.com/v1' + path, { headers: { 'Authorization': 'Bearer ' + key } });
  if (!res.ok) throw new Error('Stripe HTTP ' + res.status);
  return res.json();
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.resp;
  const stripeKey = Deno.env.get('PROVA_STRIPE_SECRET_KEY') ?? Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return jsonResponse({ error: 'Stripe-Key nicht konfiguriert' }, 503);
  try {
    const subsByStatus: Record<string, number> = { active: 0, past_due: 0, canceled: 0, trialing: 0, unpaid: 0, incomplete: 0 };
    let mrrCents = 0; let hasMore = true; let startingAfter: string | null = null; let safety = 0;
    while (hasMore && safety < 5) {
      let path = '/subscriptions?limit=100&status=all';
      if (startingAfter) path += '&starting_after=' + encodeURIComponent(startingAfter);
      const subs = await stripeFetch(path, stripeKey);
      for (const s of (subs.data ?? [])) {
        if (subsByStatus[s.status] != null) subsByStatus[s.status]++;
        if (s.status === 'active' || s.status === 'trialing') {
          for (const item of (s.items?.data ?? [])) {
            const price = item.price; if (!price?.unit_amount) continue;
            const interval = price.recurring?.interval; const intervalCount = price.recurring?.interval_count ?? 1;
            const amount = price.unit_amount * (item.quantity ?? 1);
            if (interval === 'month') mrrCents += amount / intervalCount;
            else if (interval === 'year') mrrCents += amount / (12 * intervalCount);
          }
        }
      }
      hasMore = subs.has_more;
      startingAfter = subs.data?.length > 0 ? subs.data[subs.data.length - 1].id : null;
      safety++;
    }
    const invoices = await stripeFetch('/invoices?limit=5', stripeKey);
    const recent = (invoices.data ?? []).map((inv: any) => ({ id: inv.id, status: inv.status, amount_paid_eur: (inv.amount_paid ?? 0) / 100, created: inv.created ? new Date(inv.created * 1000).toISOString() : null, customer_email: inv.customer_email ? inv.customer_email.replace(/(.{2}).*@/, '$1***@') : null }));
    return jsonResponse({ active_count: subsByStatus.active, trialing_count: subsByStatus.trialing, past_due_count: subsByStatus.past_due, canceled_count: subsByStatus.canceled, unpaid_count: subsByStatus.unpaid, incomplete_count: subsByStatus.incomplete, mrr_eur: Math.round(mrrCents) / 100, mrr_cents: Math.round(mrrCents), recent_invoices: recent, source: 'stripe-api', timestamp: new Date().toISOString() });
  } catch (err) { return jsonResponse({ error: 'Stripe-API-Fehler', detail: err instanceof Error ? err.message : String(err), source: 'stripe-api-error' }, 502); }
});
