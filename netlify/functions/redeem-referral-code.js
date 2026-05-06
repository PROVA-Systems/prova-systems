/**
 * PROVA — redeem-referral-code.js (MEGA²⁷)
 *
 * Lookup-Endpoint für Empfehlungs-Code.
 * Public — keine Auth (Lisa kennt nur den Code, nicht das Konto).
 *
 * GET /.netlify/functions/redeem-referral-code?code=PROVA-FRIEND-XX-Y6
 *   Returns: { valid, referrer_name?, discount_amount?, code, stripe_coupon_id?,
 *              expires_in_hours?, error? }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimitIp = require('./lib/rate-limit-ip'); // MEGA²⁸ W5-I2: DDoS-Schutz für Public-Code-Lookup

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

const CODE_REGEX = /^PROVA-FRIEND-[A-Z]{1,4}-[A-Z2-9]{6}$/;

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  // MEGA²⁸ W5-I2: Rate-Limit pro IP — Code-Fishing-Schutz (10/min ist großzügig
  // für legitime "Code abgelaufen → neu generieren"-Flows, hart genug gegen
  // brute-force CODE_REGEX Enumeration).
  const rl = RateLimitIp.check(event, 10, 60, { functionName: 'redeem-referral-code' });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8',
                 'Retry-After': String(rl.retryAfter), ...getCorsHeaders(event) },
      body: JSON.stringify({ valid: false, error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' })
    };
  }

  const params = event.queryStringParameters || {};
  const code = String(params.code || '').trim().toUpperCase();
  if (!code || !CODE_REGEX.test(code)) {
    return json(event, 400, { valid: false, error: 'Code-Format ungueltig' });
  }

  const sb = getSupabase();
  if (!sb) return json(event, 503, { valid: false, error: 'Supabase not configured' });

  try {
    const { data: r, error } = await sb.from('referrals')
      .select('code, status, referrer_email, expires_at, stripe_coupon_id, personal_message')
      .eq('code', code)
      .maybeSingle();
    if (error) return json(event, 500, { valid: false, error: 'lookup failed' });
    if (!r) return json(event, 404, { valid: false, error: 'Code nicht gefunden' });

    if (r.status !== 'pending') {
      return json(event, 200, {
        valid: false,
        error: 'Code bereits eingeloest oder ungueltig',
        status: r.status
      });
    }
    const expiresAt = new Date(r.expires_at);
    const now = new Date();
    if (expiresAt <= now) {
      return json(event, 200, { valid: false, error: 'Code abgelaufen' });
    }

    // Werber-Name nachladen (best-effort, ohne Email zu leaken)
    let referrerName = 'Ein PROVA-Member';
    try {
      const { data: u } = await sb.from('users').select('full_name')
        .eq('email', r.referrer_email).maybeSingle();
      if (u && u.full_name) referrerName = u.full_name;
    } catch (_) { /* graceful */ }

    const expiresInHours = Math.max(0, Math.floor((expiresAt - now) / (60 * 60 * 1000)));

    return json(event, 200, {
      valid: true,
      code: code,
      referrer_name: referrerName,
      discount_amount: 50,
      stripe_coupon_id: r.stripe_coupon_id,
      expires_in_hours: expiresInHours,
      personal_message: r.personal_message || null
    });
  } catch (e) {
    return json(event, 500, { valid: false, error: 'unexpected', detail: e.message });
  }
}, { functionName: 'redeem-referral-code' });

exports._test = { CODE_REGEX };
