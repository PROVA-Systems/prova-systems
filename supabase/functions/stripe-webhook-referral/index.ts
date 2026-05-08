import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const FRIEND_COUPON_ID = 'FRIEND-50';
const HOLD_DAYS = 30;
const STRIPE_API_VERSION = '2024-06-20';
const SIGNATURE_TOLERANCE_SECONDS = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, stripe-signature'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<{ ok: boolean; event?: any; reason?: string }> {
  const parts = header.split(',').reduce<Record<string, string[]>>((acc, kv) => {
    const [k, v] = kv.split('=');
    if (!k || !v) return acc;
    if (!acc[k]) acc[k] = [];
    acc[k].push(v);
    return acc;
  }, {});
  const ts = parts.t?.[0];
  const sigs = parts.v1 ?? [];
  if (!ts || sigs.length === 0) return { ok: false, reason: 'malformed_signature_header' };
  const tsNum = Number(ts);
  if (!isFinite(tsNum)) return { ok: false, reason: 'bad_timestamp' };
  if (Math.abs(Math.floor(Date.now() / 1000) - tsNum) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: 'stale_signature' };

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(ts + '.' + payload));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare
  let match = false;
  for (const s of sigs) {
    if (s.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff === 0) { match = true; break; }
  }
  if (!match) return { ok: false, reason: 'signature_mismatch' };
  try { return { ok: true, event: JSON.parse(payload) }; }
  catch { return { ok: false, reason: 'bad_json' }; }
}

async function stripeGet(path: string, key: string): Promise<any | null> {
  try {
    const res = await fetch('https://api.stripe.com/v1' + path, { headers: { 'Authorization': 'Bearer ' + key, 'Stripe-Version': STRIPE_API_VERSION } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function hasFriendCoupon(sub: any): boolean {
  if (!sub) return false;
  if (sub.discount?.coupon?.id === FRIEND_COUPON_ID) return true;
  if (Array.isArray(sub.discounts)) {
    return sub.discounts.some((d: any) => d?.coupon && (d.coupon.id === FRIEND_COUPON_ID || d.coupon === FRIEND_COUPON_ID));
  }
  return false;
}

async function findReferralByEmail(sb: any, email: string): Promise<any | null> {
  if (!email) return null;
  try {
    const { data } = await sb.from('referrals')
      .select('id, status, referred_email, referrer_email, code')
      .eq('referred_email', String(email).toLowerCase())
      .in('status', ['pending', 'active', 'hold'])
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0] : null;
  } catch { return null; }
}

async function findReferralByCode(sb: any, code: string): Promise<any | null> {
  if (!code) return null;
  try {
    const { data } = await sb.from('referrals')
      .select('id, status, referred_email, referrer_email, code')
      .eq('code', String(code).toUpperCase())
      .maybeSingle();
    return data || null;
  } catch { return null; }
}

async function findReferral(sb: any, sub: any, customer: any): Promise<any | null> {
  const metaCode = sub?.metadata?.prova_referral_code || sub?.metadata?.referral_code;
  if (metaCode) { const r = await findReferralByCode(sb, metaCode); if (r) return r; }
  const email = customer?.email || sub?.metadata?.email;
  if (email) { const r = await findReferralByEmail(sb, email); if (r) return r; }
  return null;
}

async function findUserIdByEmail(sb: any, email: string): Promise<string | null> {
  if (!email) return null;
  try {
    const { data } = await sb.from('users').select('id').eq('email', String(email).toLowerCase()).maybeSingle();
    return data?.id ?? null;
  } catch { return null; }
}

async function handleSubscriptionCreated(sb: any, sub: any, customer: any): Promise<any> {
  const metaCode = sub?.metadata?.prova_referral_code;
  if (!metaCode && !hasFriendCoupon(sub)) return { skipped: 'no_friend_coupon' };
  const ref = await findReferral(sb, sub, customer);
  if (!ref) return { skipped: 'no_referral_found' };
  if (ref.status !== 'pending') return { skipped: 'referral_not_pending', current_status: ref.status };
  const email = customer?.email || ref.referred_email;
  const referredUserId = await findUserIdByEmail(sb, email);
  const now = new Date();
  const rewardEligibleAt = new Date(now.getTime() + HOLD_DAYS * 86400000);
  try {
    const updatePayload: any = {
      status: 'active',
      signed_up_at: now.toISOString(),
      subscribed_at: now.toISOString(),
      reward_eligible_at: rewardEligibleAt.toISOString()
    };
    if (referredUserId) updatePayload.referred_user_id = referredUserId;
    await sb.from('referrals').update(updatePayload).eq('id', ref.id);
    return { ok: true, referral_id: ref.id, status: 'active', user_linked: !!referredUserId };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

async function handleSubscriptionDeleted(sb: any, sub: any, customer: any): Promise<any> {
  const email = customer?.email || sub?.metadata?.email;
  if (!email) return { skipped: 'no_email' };
  const ref = await findReferralByEmail(sb, email);
  if (!ref) return { skipped: 'no_referral' };
  if (ref.status === 'active' || ref.status === 'hold') {
    try {
      await sb.from('referrals').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', ref.id);
      return { ok: true, referral_id: ref.id, status: 'cancelled' };
    } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
  }
  return { skipped: 'already_rewarded_or_other' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const webhookSecret = Deno.env.get('STRIPE_REFERRAL_WEBHOOK_SECRET');
  if (!webhookSecret) return jsonResponse({ error: 'Webhook secret not configured' }, 503);
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return jsonResponse({ error: 'Stripe key not configured' }, 503);

  const sig = req.headers.get('stripe-signature') || '';
  if (!sig) return jsonResponse({ error: 'Missing Stripe signature' }, 400);

  const payload = await req.text();
  const verify = await verifyStripeSignature(payload, sig, webhookSecret);
  if (!verify.ok) return jsonResponse({ error: 'Invalid signature', detail: verify.reason }, 400);
  const stripeEvent = verify.event;

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  let result: any = { skipped: 'unknown_event_type', event_type: stripeEvent.type };
  try {
    if (stripeEvent.type === 'customer.subscription.created') {
      const sub = stripeEvent.data.object;
      const customer = sub.customer ? await stripeGet('/customers/' + sub.customer, stripeKey) : null;
      result = await handleSubscriptionCreated(sb, sub, customer);
    } else if (stripeEvent.type === 'customer.subscription.deleted') {
      const sub = stripeEvent.data.object;
      const customer = sub.customer ? await stripeGet('/customers/' + sub.customer, stripeKey) : null;
      result = await handleSubscriptionDeleted(sb, sub, customer);
    } else if (stripeEvent.type === 'charge.refunded') {
      const charge = stripeEvent.data.object;
      const customer = charge.customer ? await stripeGet('/customers/' + charge.customer, stripeKey) : null;
      result = customer?.email ? await handleSubscriptionDeleted(sb, null, customer) : { skipped: 'no_customer_for_refund' };
    }
  } catch (e) { return jsonResponse({ error: 'handler exception', detail: e instanceof Error ? e.message : String(e) }, 500); }

  return jsonResponse({ received: true, result });
});
