/**
 * netlify/functions/get-referral-stats.js — MEGA³⁶ W2.4
 * GET /.netlify/functions/get-referral-stats
 * Returns: { total_invited, total_converted, total_rewards_eur, mrr_attributed_eur, conversion_rate_pct }
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

function computeStats(rows) {
  const total_invited = rows.length;
  const converted = rows.filter(r => r.status === 'converted' || r.status === 'rewarded' || r.redeemed_at);
  const total_converted = converted.length;
  const total_rewards_eur = rows.reduce((s, r) => s + (r.reward_amount_eur || 0), 0);
  const mrr_attributed_eur = converted.reduce((s, r) => s + (r.mrr_eur || 0), 0);
  const conversion_rate_pct = total_invited > 0
    ? Math.round((total_converted / total_invited) * 1000) / 10
    : 0;
  return {
    total_invited,
    total_converted,
    total_rewards_eur: Math.round(total_rewards_eur * 100) / 100,
    mrr_attributed_eur: Math.round(mrr_attributed_eur * 100) / 100,
    conversion_rate_pct
  };
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'get-referral-stats' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const { data: user } = await sb.from('users').select('id').eq('email', context.userEmail).maybeSingle();
  if (!user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });

  const { data, error } = await sb.from('referrals')
    .select('status, reward_amount_eur, mrr_eur, redeemed_at')
    .eq('referrer_user_id', user.id);
  if (error) return jsonResponse(event, 500, { error: error.message });

  return jsonResponse(event, 200, computeStats(data || []));
});

module.exports.__computeStats = computeStats;
