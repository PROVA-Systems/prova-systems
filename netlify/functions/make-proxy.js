// PROVA Systems — Make.com Proxy (server-side)
// Purpose: remove Make webhooks from frontend, enforce JWT, rate-limit abuse.
//
// Client sends:
//  POST /.netlify/functions/make-proxy
//  Preferred:
//  { key: "support|g1|s3|k1|s6|f1|l3|s11|l8", payload: {...} }
//  Backwards compatible:
//  { webhookUrl: "...", payload: {...} }
//
// Server validates:
//  - Netlify Identity JWT must be present (event.clientContext.user.email)
//  - webhookUrl must be in whitelist
//  - payload size limit
//  - basic rate limiting per user

// Prefer key-based routing so webhook URLs are not shipped to browsers.
// Set these ENV vars in Netlify:
// MAKE_WEBHOOK_SUPPORT, MAKE_WEBHOOK_G1, MAKE_WEBHOOK_G3, MAKE_WEBHOOK_S3, MAKE_WEBHOOK_K1, MAKE_WEBHOOK_K2, MAKE_WEBHOOK_K3,
// MAKE_WEBHOOK_S6, MAKE_WEBHOOK_F1, MAKE_WEBHOOK_L3, MAKE_WEBHOOK_L8, MAKE_WEBHOOK_L9, MAKE_WEBHOOK_L10, MAKE_WEBHOOK_T3, MAKE_WEBHOOK_A5, MAKE_WEBHOOK_S11
const KEY_TO_WEBHOOK = {
  support: process.env.MAKE_WEBHOOK_SUPPORT || '',
  g1:      process.env.MAKE_WEBHOOK_G1      || '',
  g3:      process.env.MAKE_WEBHOOK_G3      || '',
  s3:      process.env.MAKE_WEBHOOK_S3      || '',
  k1:      process.env.MAKE_WEBHOOK_K1      || '',
  k2:      process.env.MAKE_WEBHOOK_K2      || '',
  k3:      process.env.MAKE_WEBHOOK_K3      || '',
  s6:      process.env.MAKE_WEBHOOK_S6      || '',
  f1:      process.env.MAKE_WEBHOOK_F1      || '',
  l3:      process.env.MAKE_WEBHOOK_L3      || '',
  s11:     process.env.MAKE_WEBHOOK_S11     || '',
  l8:      process.env.MAKE_WEBHOOK_L8      || '',
  l9:      process.env.MAKE_WEBHOOK_L9      || '',
  l10:     process.env.MAKE_WEBHOOK_L10     || '',
  t3:      process.env.MAKE_WEBHOOK_T3      || '',
  a5:      process.env.MAKE_WEBHOOK_A5      || '',
};

const ALLOWED_WEBHOOKS = new Set(Object.values(KEY_TO_WEBHOOK).filter(Boolean));

const rate = new Map(); // key -> {ts,count}
const WINDOW_MS = 60_000;
const LIMIT = 60; // per minute per user

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function checkRate(key) {
  const now = Date.now();
  const v = rate.get(key) || { ts: now, count: 0 };
  if (now - v.ts > WINDOW_MS) {
    rate.set(key, { ts: now, count: 1 });
    return true;
  }
  if (v.count >= LIMIT) return false;
  v.count++;
  rate.set(key, v);
  return true;
}

exports.handler = async function (event) {
  const headers = corsHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) return { statusCode: 401, headers, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };

  if (!checkRate(jwtEmail)) {
    return { statusCode: 429, headers: { ...headers, 'Retry-After': '60' }, body: JSON.stringify({ error: 'RATE_LIMIT' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const webhookUrl = String(body.webhookUrl || '').trim();
  const key = String(body.key || (event.queryStringParameters && event.queryStringParameters.key) || '').trim().toLowerCase();
  const payload = body.payload || null;

  const resolvedUrl = (key && KEY_TO_WEBHOOK[key]) ? KEY_TO_WEBHOOK[key] : webhookUrl;
  if (!resolvedUrl || !ALLOWED_WEBHOOKS.has(resolvedUrl)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'WEBHOOK_NOT_ALLOWED' }) };
  }

  // 200KB payload limit (Make scenarios should stay small)
  try {
    const size = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
    if (size > 200 * 1024) return { statusCode: 413, headers, body: JSON.stringify({ error: 'PAYLOAD_TOO_LARGE' }) };
  } catch (e) {}

  try {
    const res = await fetch(resolvedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PROVA-User': jwtEmail,
        ...(process.env.PROVA_WEBHOOK_SECRET ? { 'X-PROVA-Secret': process.env.PROVA_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify(payload || {}),
    });
    const text = await res.text();
    return { statusCode: res.status, headers, body: text || JSON.stringify({ ok: res.ok }) };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'MAKE_UNREACHABLE', detail: e.message }) };
  }
};

