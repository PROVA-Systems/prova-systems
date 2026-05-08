/**
 * netlify/functions/termine-ical-token.js — MEGA³⁵ C6
 *
 * Erzeugt Signed-Token für iCal-Subscribe-URL.
 * Wrapper um signToken aus termine-ical-export.js + Insert in ical_tokens.
 *
 * POST /.netlify/functions/termine-ical-token
 * Returns: { subscribe_url, expires_at, token_hash }
 *
 * Idempotent: alter Token wird revoked bei neuem Antrag.
 */
'use strict';

const crypto = require('crypto');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');
const { __signToken } = require('./termine-ical-export');

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

const TOKEN_VALIDITY_DAYS = 90;

function buildSubscribeUrl(host, token) {
  return host + '/.netlify/functions/termine-ical-export?token=' + encodeURIComponent(token);
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 10, 3600, { event: event, functionName: 'termine-ical-token' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit (max 10 Token-Requests/h)' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // User-Resolve via JWT-Email
  const { data: user } = await sb.from('users')
    .select('id').eq('email', context.userEmail).maybeSingle();
  if (!user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });

  // Token signieren (90 Tage Gültigkeit)
  const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const token = __signToken(user.id, expiresAt);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Alte aktive Tokens revoken (idempotent: nur 1 aktiver Token pro User)
  try {
    await sb.from('ical_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('revoked_at', null);
  } catch (e) { /* defensive */ }

  // Neuen Token-Eintrag
  const { error: insErr } = await sb.from('ical_tokens').insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt
  });
  if (insErr) return jsonResponse(event, 500, { error: 'Token-Insert fehlgeschlagen: ' + insErr.message });

  // Subscribe-URL bauen
  const host = (event.headers && (event.headers['x-forwarded-proto'] && event.headers['host']
    ? (event.headers['x-forwarded-proto'] + '://' + event.headers['host'])
    : null)) || 'https://app.prova-systems.de';
  const subscribeUrl = buildSubscribeUrl(host, token);

  return jsonResponse(event, 201, {
    subscribe_url: subscribeUrl,
    expires_at: expiresAt,
    valid_days: TOKEN_VALIDITY_DAYS,
    note: 'Vorherige Tokens wurden automatisch revoked. Aktualisiert sich alle 24h im Kalender.'
  });
});

module.exports.__TOKEN_VALIDITY_DAYS = TOKEN_VALIDITY_DAYS;
module.exports.__buildSubscribeUrl = buildSubscribeUrl;
