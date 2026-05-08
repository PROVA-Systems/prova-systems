import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CODE_REGEX = /^PROVA-FRIEND-[A-Z]{1,4}-[A-Z2-9]{6}$/;
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const url = new URL(req.url);
  const code = String(url.searchParams.get('code') ?? '').trim().toUpperCase();
  if (!code || !CODE_REGEX.test(code)) return jsonResponse({ valid: false, error: 'Code-Format ungueltig' }, 400);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: r, error } = await sb.from('referrals').select('code, status, referrer_email, expires_at, stripe_coupon_id, personal_message').eq('code', code).maybeSingle();
    if (error) return jsonResponse({ valid: false, error: 'lookup failed' }, 500);
    if (!r) return jsonResponse({ valid: false, error: 'Code nicht gefunden' }, 404);
    if (r.status !== 'pending') return jsonResponse({ valid: false, error: 'Code bereits eingeloest oder ungueltig', status: r.status });
    const expiresAt = new Date(r.expires_at);
    if (expiresAt <= new Date()) return jsonResponse({ valid: false, error: 'Code abgelaufen' });
    let referrerName = 'Ein PROVA-Member';
    try { const { data: u } = await sb.from('users').select('full_name').eq('email', r.referrer_email).maybeSingle(); if (u?.full_name) referrerName = u.full_name; } catch { /* graceful */ }
    const expiresInHours = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 3600000));
    return jsonResponse({ valid: true, code, referrer_name: referrerName, discount_amount: 50, stripe_coupon_id: r.stripe_coupon_id, expires_in_hours: expiresInHours, personal_message: r.personal_message ?? null });
  } catch (e) { return jsonResponse({ valid: false, error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500); }
});
