/**
 * netlify/functions/get-referral-history.js — MEGA³⁶ W2.3
 * GET /.netlify/functions/get-referral-history
 * Returns: { referrals: [{ id, email_invitee, sent_at, status, reward_paid_at, redeemed_at }] }
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'get-referral-history' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const { data: user } = await sb.from('users').select('id').eq('email', context.userEmail).maybeSingle();
  if (!user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });

  const { data, error } = await sb.from('referrals')
    .select('id, email_invitee, sent_at, status, reward_paid_at, redeemed_at, code')
    .eq('referrer_user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(200);
  if (error) return jsonResponse(event, 500, { error: error.message });

  return jsonResponse(event, 200, { referrals: data || [], count: (data || []).length });
});
