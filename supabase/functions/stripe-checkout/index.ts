import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const STRIPE_API_VERSION = '2024-12-18.acacia';
const PILOT_TRIAL_DAYS = 90;

const DEFAULT_SOLO = 'price_1TSjMZRXumrtL2n5fgToRwyr';
const DEFAULT_TEAM = 'price_1TSjNXRXumrtL2n56c6emN2k';
const DEFAULT_ADDON_5 = 'price_1TSl2JRXumrtL2n52XSz85oC';
const DEFAULT_ADDON_10 = 'price_1TSl3fRXumrtL2n5Gur4BmWL';
const DEFAULT_ADDON_20 = 'price_1TSl4eRXumrtL2n5tIWx0ET8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function resolvePlanConfig(plan: string): { priceId: string; mode: 'subscription' | 'payment'; isAddon: boolean } | null {
  switch (String(plan).toLowerCase()) {
    case 'solo':     return { priceId: Deno.env.get('STRIPE_PRICE_SOLO') || DEFAULT_SOLO, mode: 'subscription', isAddon: false };
    case 'team':     return { priceId: Deno.env.get('STRIPE_PRICE_TEAM') || DEFAULT_TEAM, mode: 'subscription', isAddon: false };
    case 'addon-5':  return { priceId: Deno.env.get('STRIPE_PRICE_ADDON_5')  || DEFAULT_ADDON_5,  mode: 'payment', isAddon: true };
    case 'addon-10': return { priceId: Deno.env.get('STRIPE_PRICE_ADDON_10') || DEFAULT_ADDON_10, mode: 'payment', isAddon: true };
    case 'addon-20': return { priceId: Deno.env.get('STRIPE_PRICE_ADDON_20') || DEFAULT_ADDON_20, mode: 'payment', isAddon: true };
    default: return null;
  }
}

async function generateIdempotencyKey(email: string, priceId: string, planTag: string): Promise<string> {
  const minuteBucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const raw = email + ':' + priceId + ':' + planTag + ':' + minuteBucket;
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

async function stripeFetch(path: string, key: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Authorization': 'Bearer ' + key,
    'Stripe-Version': STRIPE_API_VERSION
  };
  if (init.body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
  return fetch('https://api.stripe.com/v1' + path, { ...init, headers });
}

async function checkPilotCouponAvailability(stripeKey: string, couponId: string): Promise<{ available: boolean; remaining: number | null; total: number | null; reason?: string }> {
  try {
    const res = await stripeFetch('/coupons/' + encodeURIComponent(couponId), stripeKey, { method: 'GET' });
    if (!res.ok) {
      if (res.status === 404) return { available: false, remaining: 0, total: null, reason: 'coupon_not_found' };
      return { available: false, remaining: 0, total: null, reason: 'coupon_lookup_error' };
    }
    const coupon = await res.json();
    if (!coupon.valid) return { available: false, remaining: 0, total: null, reason: 'coupon_invalid' };
    if (coupon.max_redemptions !== null && coupon.max_redemptions !== undefined) {
      const remaining = coupon.max_redemptions - (coupon.times_redeemed || 0);
      if (remaining <= 0) return { available: false, remaining: 0, total: coupon.max_redemptions, reason: 'sold_out' };
      return { available: true, remaining, total: coupon.max_redemptions };
    }
    return { available: true, remaining: null, total: null };
  } catch (e) {
    return { available: false, remaining: 0, total: null, reason: 'exception:' + (e instanceof Error ? e.message : String(e)) };
  }
}

function buildSessionFormBody(params: Record<string, any>): string {
  const usp = new URLSearchParams();
  function appendObject(prefix: string, obj: any): void {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => appendObject(prefix + '[' + idx + ']', item));
    } else if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) appendObject(prefix + '[' + k + ']', obj[k]);
    } else {
      usp.append(prefix, String(obj));
    }
  }
  for (const k of Object.keys(params)) appendObject(k, params[k]);
  return usp.toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
  if (userError || !userData?.user?.email) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const userEmail = String(userData.user.email).toLowerCase();

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return jsonResponse({ error: 'STRIPE_SECRET_KEY nicht konfiguriert', errorCode: 'API_KEY_MISSING' }, 500);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Ungültiger JSON-Body', errorCode: 'INVALID_JSON' }, 400); }

  const planConfig = resolvePlanConfig(body.plan);
  if (!planConfig) return jsonResponse({ error: 'Unbekannter plan: ' + body.plan, errorCode: 'INVALID_PLAN' }, 400);
  if (!planConfig.priceId) return jsonResponse({ error: 'Stripe Preis-ID fehlt für plan ' + body.plan, errorCode: 'PRICE_NOT_CONFIGURED' }, 500);

  const isPilot = body.pilot_program === true;
  if (isPilot && planConfig.mode !== 'subscription') {
    return jsonResponse({ error: 'Founding-Pilot benoetigt Subscription-Modus', errorCode: 'PILOT_REQUIRES_SUBSCRIPTION' }, 400);
  }

  let discounts: any[] | null = null;
  let couponId = '';
  let pilotSeatsRemaining: number | null = null;
  let referralCodeApplied: string | null = null;

  // Referral-Code-Auto-Apply (Pilot beats Friend)
  const refCodeRaw = String(body.referral_code || '').trim().toUpperCase();
  if (refCodeRaw && /^PROVA-FRIEND-[A-Z]{1,4}-[A-Z2-9]{6}$/.test(refCodeRaw) && !isPilot) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: ref } = await sb.from('referrals')
        .select('code, status, expires_at, stripe_promo_code_id')
        .eq('code', refCodeRaw)
        .maybeSingle();
      if (ref && ref.status === 'pending' && ref.stripe_promo_code_id && new Date(ref.expires_at) > new Date()) {
        discounts = [{ promotion_code: ref.stripe_promo_code_id }];
        referralCodeApplied = refCodeRaw;
      }
    } catch { /* graceful */ }
  }

  if (isPilot || (body.coupon === 'founding' && body.plan === 'solo')) {
    couponId = Deno.env.get('STRIPE_FOUNDING_COUPON_ID') || '';
    if (!couponId) return jsonResponse({ error: 'Founding-Coupon nicht konfiguriert', errorCode: 'COUPON_NOT_CONFIGURED' }, 500);

    const availability = await checkPilotCouponAvailability(stripeKey, couponId);
    if (!availability.available) {
      const status = availability.reason === 'sold_out' ? 410 : 500;
      return jsonResponse({
        error: availability.reason === 'sold_out'
          ? 'Founding-Member-Plaetze ausgebucht (' + availability.total + '/' + availability.total + ' eingeloest)'
          : 'Founding-Coupon nicht verfuegbar: ' + availability.reason,
        errorCode: availability.reason === 'sold_out' ? 'PILOT_SOLD_OUT' : 'COUPON_INVALID',
        seats_remaining: 0
      }, status);
    }
    pilotSeatsRemaining = availability.remaining;
    discounts = [{ coupon: couponId }];
  }

  const idempotencyKey = await generateIdempotencyKey(userEmail, planConfig.priceId, (body.plan || 'solo') + (isPilot ? ':pilot' : ''));
  const baseUrl = Deno.env.get('URL') || 'https://prova-systems.de';

  const sessionParams: Record<string, any> = {
    payment_method_types: ['card', 'sepa_debit'],
    mode: planConfig.mode,
    customer_email: userEmail,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: body.successUrl || (baseUrl + '/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
    cancel_url: body.cancelUrl || (baseUrl + (isPilot ? '/pilot.html?checkout=cancelled' : '/einstellungen.html?checkout=cancelled')),
    metadata: {
      prova_plan: body.plan || 'solo',
      prova_email: userEmail,
      prova_addon: planConfig.isAddon ? '1' : '0',
      prova_pilot: isPilot ? 'true' : 'false',
      prova_referral_code: referralCodeApplied || ''
    },
    automatic_tax: { enabled: !!Deno.env.get('STRIPE_AUTO_TAX') }
  };

  if (planConfig.mode === 'subscription') {
    sessionParams.subscription_data = {
      metadata: {
        prova_plan: body.plan || 'solo',
        prova_email: userEmail,
        prova_pilot: isPilot ? 'true' : 'false',
        prova_referral_code: referralCodeApplied || ''
      }
    };
    if (isPilot) {
      sessionParams.subscription_data.trial_period_days = PILOT_TRIAL_DAYS;
      sessionParams.subscription_data.metadata.pilot_trial_days = String(PILOT_TRIAL_DAYS);
      sessionParams.discounts = discounts;
      sessionParams.payment_method_collection = 'always';
    } else if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }
  }

  try {
    const formBody = buildSessionFormBody(sessionParams);
    const res = await stripeFetch('/checkout/sessions', stripeKey, { method: 'POST', body: formBody, idempotencyKey: 'checkout_' + idempotencyKey });
    const session = await res.json();
    if (!res.ok) {
      const status = res.status >= 500 ? 502 : (res.status === 429 ? 429 : 400);
      return jsonResponse({ error: session?.error?.message || 'Stripe-Fehler', errorCode: session?.error?.code || 'STRIPE_API_ERROR', retryable: [429, 502].includes(status) }, status);
    }
    const response: any = { sessionId: session.id, sessionUrl: session.url, ok: true };
    if (isPilot) { response.pilot_seats_remaining = pilotSeatsRemaining; response.trial_period_days = PILOT_TRIAL_DAYS; }
    return jsonResponse(response);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e), errorCode: 'NETWORK', retryable: true }, 502);
  }
});
