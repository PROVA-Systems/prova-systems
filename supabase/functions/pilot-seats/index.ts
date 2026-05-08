const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  const couponId = Deno.env.get('STRIPE_FOUNDING_COUPON_ID');
  if (!key || !couponId) return jsonResponse({ error: 'Pilot-Programm nicht konfiguriert' }, 503);
  try {
    const res = await fetch('https://api.stripe.com/v1/coupons/' + encodeURIComponent(couponId), { headers: { 'Authorization': 'Bearer ' + key } });
    if (!res.ok) return jsonResponse({ error: 'Coupon-Lookup fehlgeschlagen', status: res.status }, 502);
    const c = await res.json();
    const total = typeof c.max_redemptions === 'number' ? c.max_redemptions : null;
    const used = typeof c.times_redeemed === 'number' ? c.times_redeemed : 0;
    const remaining = total != null ? Math.max(0, total - used) : null;
    const available = c.valid === true && (remaining == null || remaining > 0);
    return jsonResponse({ available, remaining, total, reason: !available ? (c.valid === false ? 'invalid' : 'sold_out') : null });
  } catch (e) { return jsonResponse({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500); }
});
