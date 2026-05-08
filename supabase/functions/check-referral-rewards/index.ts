import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const REWARD_COUPON_ID = 'WERBER-MONAT-FREI';
const STRIPE_API_VERSION = '2024-06-20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-prova-internal'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function stripeFetch(path: string, key: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Authorization': 'Bearer ' + key, 'Stripe-Version': STRIPE_API_VERSION };
  if (init.body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  return fetch('https://api.stripe.com/v1' + path, { ...init, headers });
}

async function verifySubscriptionActive(stripeKey: string, customerEmail: string): Promise<{ eligible: boolean; reason?: string; customerId?: string; subId?: string }> {
  try {
    const cRes = await stripeFetch('/customers?email=' + encodeURIComponent(customerEmail) + '&limit=1', stripeKey, { method: 'GET' });
    if (!cRes.ok) return { eligible: false, reason: 'stripe_lookup_error' };
    const cList = await cRes.json();
    const customer = cList?.data?.[0];
    if (!customer) return { eligible: false, reason: 'no_customer' };
    const sRes = await stripeFetch('/subscriptions?customer=' + customer.id + '&status=active&limit=5', stripeKey, { method: 'GET' });
    if (!sRes.ok) return { eligible: false, reason: 'sub_lookup_error' };
    const sList = await sRes.json();
    if (!sList.data || sList.data.length === 0) return { eligible: false, reason: 'no_active_sub' };
    const since = Math.floor((Date.now() - 35 * 86400000) / 1000);
    const chRes = await stripeFetch('/charges?customer=' + customer.id + '&created[gte]=' + since + '&limit=100', stripeKey, { method: 'GET' });
    if (chRes.ok) {
      const chList = await chRes.json();
      const refunded = (chList.data || []).find((c: any) => c.refunded || (c.amount_refunded && c.amount_refunded > 0));
      if (refunded) return { eligible: false, reason: 'refund_detected' };
    }
    return { eligible: true, customerId: customer.id, subId: sList.data[0].id };
  } catch (e) { return { eligible: false, reason: 'stripe_error: ' + (e instanceof Error ? e.message : String(e)) }; }
}

async function applyRewardToReferrer(stripeKey: string, referrerEmail: string): Promise<{ ok: boolean; sub_id?: string; error?: string }> {
  try {
    const cRes = await stripeFetch('/customers?email=' + encodeURIComponent(referrerEmail) + '&limit=1', stripeKey, { method: 'GET' });
    if (!cRes.ok) return { ok: false, error: 'customer_lookup_failed' };
    const customer = (await cRes.json())?.data?.[0];
    if (!customer) return { ok: false, error: 'no_referrer_customer' };
    const sRes = await stripeFetch('/subscriptions?customer=' + customer.id + '&status=active&limit=1', stripeKey, { method: 'GET' });
    if (!sRes.ok) return { ok: false, error: 'sub_lookup_failed' };
    const sub = (await sRes.json())?.data?.[0];
    if (!sub) return { ok: false, error: 'no_referrer_sub' };
    const upRes = await stripeFetch('/subscriptions/' + sub.id, stripeKey, {
      method: 'POST',
      body: new URLSearchParams({ coupon: REWARD_COUPON_ID }).toString()
    });
    if (!upRes.ok) return { ok: false, error: 'update_failed_' + upRes.status };
    const updated = await upRes.json();
    return { ok: true, sub_id: updated.id };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

async function calculateReferrerStats(sb: any, referrerUserId: string): Promise<{ total_sent: number; total_rewarded: number; total_active_count: number }> {
  const stats = { total_sent: 0, total_rewarded: 0, total_active_count: 0 };
  if (!sb || !referrerUserId) return stats;
  try {
    const { data } = await sb.from('referrals').select('status').eq('referrer_user_id', referrerUserId);
    if (!data) return stats;
    for (const row of data) {
      if (row.status !== 'expired' && row.status !== 'cancelled') stats.total_sent++;
      if (row.status === 'rewarded') stats.total_rewarded++;
      if (['pending', 'active', 'hold', 'rewarded'].includes(row.status)) stats.total_active_count++;
    }
  } catch { /* graceful */ }
  return stats;
}

async function sendRewardEmail(sb: any, referral: any, stats: any): Promise<{ ok: boolean; reason?: string }> {
  if (!referral?.referrer_email) return { ok: false, reason: 'no_referrer_email' };
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no_resend_key' };
  const from = Deno.env.get('PROVA_RESEND_FROM_REFERRAL') ?? Deno.env.get('PROVA_RESEND_FROM') ?? 'PROVA Empfehlung <empfehlung@prova-systems.de>';

  let werberName = referral.referrer_email;
  try {
    const { data: u } = await sb.from('users').select('full_name').eq('id', referral.referrer_user_id).maybeSingle();
    if (u?.full_name) werberName = u.full_name;
  } catch { /* graceful */ }

  const totalRewarded = stats?.total_rewarded ?? 0;
  const totalSent = stats?.total_sent ?? 0;
  const text = 'Hallo ' + werberName + ',\n\n'
    + 'Deine Empfehlung an ' + (referral.referred_email || 'einen Kollegen') + ' war erfolgreich!\n'
    + 'Du hast 1 Monat PROVA gewonnen (Wert 99 EUR).\n\n'
    + 'Statistik: ' + totalRewarded + ' erfolgreiche Empfehlungen von ' + totalSent + ' versendet.\n\n'
    + 'PROVA-Systems';
  const html = '<p>Hallo ' + werberName + ',</p>'
    + '<p>🎉 Deine Empfehlung an <strong>' + (referral.referred_email || 'einen Kollegen') + '</strong> war erfolgreich!</p>'
    + '<p>Du hast <strong>1 Monat PROVA gewonnen</strong> (Wert 99 EUR).</p>'
    + '<p>Statistik: ' + totalRewarded + ' erfolgreiche Empfehlungen von ' + totalSent + ' versendet.</p>'
    + '<p>PROVA-Systems</p>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [referral.referrer_email], subject: '🎉 Du hast 1 Monat PROVA gewonnen!', text, html })
    });
    return { ok: res.ok, reason: res.ok ? undefined : 'http_' + res.status };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const secret = (req.headers.get('x-prova-internal') ?? '').trim();
  const expected = Deno.env.get('PROVA_INTERNAL_WRITE_SECRET') ?? '';
  if (!expected || secret !== expected) return jsonResponse({ error: 'Forbidden' }, 403);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return jsonResponse({ error: 'STRIPE_SECRET_KEY missing' }, 503);

  const result = { rewarded: 0, cancelled: 0, expired: 0 };
  const errors: any[] = [];

  // 1) pending → expired
  try {
    const { data: pendingExpired } = await sb.from('referrals')
      .select('id')
      .eq('status', 'pending')
      .lte('expires_at', new Date().toISOString())
      .limit(100);
    for (const r of (pendingExpired ?? [])) {
      try {
        await sb.from('referrals').update({ status: 'expired' }).eq('id', r.id);
        result.expired++;
      } catch (e) { errors.push({ id: r.id, error: e instanceof Error ? e.message : String(e), phase: 'expire' }); }
    }
  } catch (e) { errors.push({ error: e instanceof Error ? e.message : String(e), phase: 'pending_lookup' }); }

  // 2) active eligible
  try {
    const { data: activeReady } = await sb.from('referrals')
      .select('id, referrer_email, referrer_user_id, referred_email')
      .eq('status', 'active')
      .lte('reward_eligible_at', new Date().toISOString())
      .limit(100);
    for (const r of (activeReady ?? [])) {
      try {
        const verify = await verifySubscriptionActive(stripeKey, r.referred_email);
        if (!verify.eligible) {
          await sb.from('referrals').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            fraud_flags: [{ reason: verify.reason, ts: new Date().toISOString() }]
          }).eq('id', r.id);
          result.cancelled++;
          continue;
        }
        const apply = await applyRewardToReferrer(stripeKey, r.referrer_email);
        if (!apply.ok) { errors.push({ id: r.id, error: apply.error, phase: 'apply' }); continue; }
        await sb.from('referrals').update({
          status: 'rewarded',
          reward_given_at: new Date().toISOString(),
          reward_stripe_coupon_id: REWARD_COUPON_ID
        }).eq('id', r.id);
        result.rewarded++;
        try {
          const stats = await calculateReferrerStats(sb, r.referrer_user_id);
          await sendRewardEmail(sb, r, stats);
        } catch (emailErr) { errors.push({ id: r.id, error: emailErr instanceof Error ? emailErr.message : String(emailErr), phase: 'reward_email' }); }
      } catch (e) { errors.push({ id: r.id, error: e instanceof Error ? e.message : String(e), phase: 'reward' }); }
    }
  } catch (e) { errors.push({ error: e instanceof Error ? e.message : String(e), phase: 'active_lookup' }); }

  return jsonResponse({ ok: true, processed: result, errors });
});
