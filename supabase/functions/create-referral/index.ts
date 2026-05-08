import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const FRIEND_COUPON_ID = 'FRIEND-50';
const RATE_LIMIT_PER_DAY = 5;
const MAX_REFERRALS = 12;
const EXPIRY_DAYS = 7;
const MAX_MESSAGE_LENGTH = 500;
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STRIPE_API_VERSION = '2024-06-20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function safeRandom(len: number): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += SAFE_CHARS[buf[i] % SAFE_CHARS.length];
  return out;
}

function deriveInitials(nameOrEmail: string): string {
  const s = String(nameOrEmail || '').trim();
  if (!s) return 'XX';
  const local = s.includes('@') ? s.split('@')[0] : s;
  const cleaned = local.replace(/[^a-zA-ZäöüÄÖÜß ]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  let initials = '';
  for (const p of parts) { if (p[0]) initials += p[0]; if (initials.length >= 4) break; }
  initials = initials.toUpperCase().replace(/[^A-Z]/g, '');
  return initials.slice(0, 4) || 'XX';
}

function generateCode(initials: string): string {
  const cleanInit = String(initials || 'XX').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'XX';
  return 'PROVA-FRIEND-' + cleanInit + '-' + safeRandom(6);
}

function calculateExpiresAt(): string {
  return new Date(Date.now() + EXPIRY_DAYS * 86400000).toISOString();
}

function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatExpiresAt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return dd + '.' + mm + '.' + d.getFullYear() + ', ' + hh + ':' + min + ' Uhr';
}

async function createStripePromo(code: string, expiresAtIso: string, key: string): Promise<{ ok: boolean; promo_id?: string; error?: string }> {
  if (!key) return { ok: false, error: 'no_stripe_key' };
  try {
    const params = new URLSearchParams();
    params.append('coupon', FRIEND_COUPON_ID);
    params.append('code', code);
    params.append('max_redemptions', '1');
    params.append('expires_at', String(Math.floor(new Date(expiresAtIso).getTime() / 1000)));
    params.append('restrictions[first_time_transaction]', 'true');
    const res = await fetch('https://api.stripe.com/v1/promotion_codes', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': STRIPE_API_VERSION },
      body: params.toString()
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || 'promo_create_failed' };
    return { ok: true, promo_id: data.id };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

async function sendInviteEmail(opts: any): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no_resend_key' };
  const from = Deno.env.get('PROVA_RESEND_FROM_REFERRAL') ?? Deno.env.get('PROVA_RESEND_FROM') ?? 'PROVA Empfehlung <empfehlung@prova-systems.de>';
  const baseUrl = Deno.env.get('REFERRAL_BASE_URL') || 'https://prova-systems.de';

  const subject = (opts.referrerName || 'Ein Kollege') + ' empfiehlt PROVA-Systems';
  const text = 'Hallo,\n\n'
    + (opts.referrerName || 'Ein Kollege') + ' (' + (opts.referrerEmail || '') + ') hat dir PROVA-Systems empfohlen.\n\n'
    + 'DEIN VORTEIL: 50 EUR Rabatt im 1. Monat (statt 179 EUR nur 129 EUR)\n\n'
    + 'EINLOESEN:\nCode: ' + opts.code + '\nLink: ' + baseUrl + '/r/' + opts.code + '\n\n'
    + 'Code gueltig bis ' + formatExpiresAt(opts.expiresAt) + '.\n\n'
    + (opts.personalMessage ? 'Persönliche Nachricht von ' + (opts.referrerName || 'deinem Kollegen') + ':\n' + opts.personalMessage + '\n\n' : '')
    + 'PROVA-Systems';

  const html = '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:auto;padding:20px;color:#0f172a;line-height:1.55;">'
    + '<h2 style="color:#3b82f6;">' + escapeHtml(subject) + '</h2>'
    + '<p>Hallo,</p>'
    + '<p><strong>' + escapeHtml(opts.referrerName || 'Ein Kollege') + '</strong> (' + escapeHtml(opts.referrerEmail || '') + ') empfiehlt dir PROVA — die KI-native Software für ö.b.u.v. Bausachverständige.</p>'
    + (opts.personalMessage
        ? '<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;font-style:italic;">' + escapeHtml(opts.personalMessage) + '</div>'
        : '')
    + '<div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#fff;padding:18px 22px;border-radius:10px;margin:18px 0;">'
    +   '<div style="font-size:14px;font-weight:600;opacity:.9;">DEIN VORTEIL</div>'
    +   '<div style="font-size:22px;font-weight:800;margin:6px 0;">50 € Rabatt im 1. Monat</div>'
    +   '<div style="font-size:13px;opacity:.92;">Statt 179 € nur 129 € — Code: <strong>' + escapeHtml(opts.code) + '</strong></div>'
    + '</div>'
    + '<p style="text-align:center;margin:22px 0;">'
    +   '<a href="' + baseUrl + '/r/' + escapeHtml(opts.code) + '" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 26px;border-radius:9px;text-decoration:none;font-weight:700;">Jetzt einlösen →</a>'
    + '</p>'
    + '<p style="font-size:12px;color:#64748b;">Code gültig bis ' + escapeHtml(formatExpiresAt(opts.expiresAt)) + '. Nur für Neukunden.</p>'
    + '<p style="font-size:11px;color:#64748b;margin-top:18px;">— PROVA Systems</p>'
    + '</body></html>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.referredEmail], subject, text, html, reply_to: opts.referrerEmail })
    });
    return { ok: res.ok, reason: res.ok ? undefined : 'http_' + res.status };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication required' }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
  if (userError || !userData?.user) return jsonResponse({ error: 'Authentication required' }, 401);
  const userId = userData.user.id;
  const userEmail = String(userData.user.email ?? '').toLowerCase();

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const referredEmail = String(body.referred_email || '').trim().toLowerCase();
  const personalMessage = String(body.personal_message || '').slice(0, MAX_MESSAGE_LENGTH);

  if (!referredEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(referredEmail)) return jsonResponse({ error: 'Email-Format ungueltig' }, 400);
  if (referredEmail === userEmail) return jsonResponse({ error: 'Du kannst dich nicht selbst empfehlen' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Workspace + Referrer-Name lookup
  let workspaceId: string | null = null;
  let referrerName: string | null = null;
  try {
    const { data: u } = await sb.from('users').select('id, email, full_name, workspace_id').eq('id', userId).maybeSingle();
    if (u) { workspaceId = u.workspace_id; referrerName = u.full_name; }
  } catch { /* graceful */ }
  if (!workspaceId) {
    try {
      const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
      workspaceId = ms ? ms.workspace_id : null;
    } catch { /* graceful */ }
  }
  if (!workspaceId) return jsonResponse({ error: 'workspace not found for user' }, 400);

  // Cap-Check
  try {
    const { count } = await sb.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', userId)
      .in('status', ['pending', 'active', 'hold', 'rewarded']);
    if ((count || 0) >= MAX_REFERRALS) return jsonResponse({ error: 'Cap erreicht: ' + MAX_REFERRALS + ' Empfehlungen bereits versendet', cap: MAX_REFERRALS }, 400);
  } catch (e) { return jsonResponse({ error: 'cap check failed', detail: e instanceof Error ? e.message : String(e) }, 500); }

  // Rate-Limit
  try {
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await sb.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_user_id', userId).gte('created_at', since);
    if ((count || 0) >= RATE_LIMIT_PER_DAY) return jsonResponse({ error: 'Rate-Limit: max ' + RATE_LIMIT_PER_DAY + ' Empfehlungen pro Tag' }, 429);
  } catch { /* graceful */ }

  // Duplicate-Check
  try {
    const { data: existing } = await sb.from('referrals')
      .select('id, status')
      .eq('referred_email', referredEmail)
      .in('status', ['pending', 'active', 'hold', 'rewarded'])
      .limit(1);
    if (existing && existing.length > 0) return jsonResponse({ error: 'Diese Email wurde bereits eingeladen', status: existing[0].status }, 409);
  } catch { /* graceful */ }

  const initials = deriveInitials(referrerName || userEmail);
  let code = generateCode(initials);
  try {
    const { data: collision } = await sb.from('referrals').select('id').eq('code', code).maybeSingle();
    if (collision) code = generateCode(initials);
  } catch { /* graceful */ }

  const expiresAt = calculateExpiresAt();
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const stripeResult = await createStripePromo(code, expiresAt, stripeKey);

  let inserted: any = null;
  try {
    const { data, error } = await sb.from('referrals').insert({
      referrer_user_id: userId,
      referrer_email: userEmail,
      referred_email: referredEmail,
      code,
      stripe_promo_code_id: stripeResult.ok ? stripeResult.promo_id : null,
      stripe_coupon_id: FRIEND_COUPON_ID,
      personal_message: personalMessage || null,
      status: 'pending',
      expires_at: expiresAt,
      workspace_id: workspaceId
    }).select().maybeSingle();
    if (error) return jsonResponse({ error: 'db insert failed', detail: error.message }, 500);
    inserted = data;
  } catch (e) { return jsonResponse({ error: 'db insert exception', detail: e instanceof Error ? e.message : String(e) }, 500); }

  // Email-Versand (await damit Status korrekt geloggt wird; Failure blockt nicht)
  const mailResult = await sendInviteEmail({
    referredEmail,
    referrerName,
    referrerEmail: userEmail,
    personalMessage,
    code,
    expiresAt
  });
  try {
    if (mailResult.ok) {
      await sb.from('referrals').update({ email_sent_at: new Date().toISOString(), email_delivery_status: 'sent' }).eq('id', inserted.id);
    } else {
      await sb.from('referrals').update({ email_delivery_status: mailResult.reason || 'failed' }).eq('id', inserted.id);
    }
  } catch { /* graceful */ }

  return jsonResponse({
    ok: true,
    code,
    expires_at: expiresAt,
    stripe_promo_created: stripeResult.ok,
    referral_id: inserted?.id ?? null,
    email_sent: mailResult.ok
  });
});
