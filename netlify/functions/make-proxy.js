/**
 * PROVA — Server-Proxy zu Make.com Webhooks
 * Alle Webhook-URLs im Server (Env-Vars) — NIEMALS im Client-JS
 * v97: alle 18 Webhook-Keys + cors-helper
 */
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { fetchWithRetry } = require('./lib/fetch-with-timeout');
const { provaFetch } = require('./lib/prova-fetch');

function json(event, status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

const ALLOWED_KEYS = [
  'k3','a5',
  'f1','g1','g3',
  'k1','k2',
  'l3','l4','l5','l8','l9','l10',
  's1','s3','s6',
  'sup','wh'
];

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  const key = ((event.queryStringParameters || {}).key || '').toLowerCase().trim();
  if (!ALLOWED_KEYS.includes(key)) return json(event, 400, { error: 'Ungültiger key: ' + key });

  // k3: Interner Secret-Header (kein JWT)
  if (key === 'k3') {
    const secret = (event.headers['x-prova-internal'] || '').trim();
    const envSecret = (process.env.PROVA_INTERNAL_WRITE_SECRET || '').trim();
    if (!envSecret || secret !== envSecret) return json(event, 403, { error: 'Verboten' });
  } else {
    // Alle anderen: JWT Pflicht
    const user = context.clientContext && context.clientContext.user;
    if (!user || !user.email) return json(event, 401, { error: 'Anmeldung erforderlich' });
  }

  // Webhook-URLs aus ENV (Fallbacks nur für L4/L5/S6 die noch keine eigene ENV haben)
  const WEBHOOKS = {
    k3:  process.env.MAKE_WEBHOOK_K3,
    a5:  process.env.MAKE_WEBHOOK_A5,
    f1:  process.env.MAKE_WEBHOOK_F1,
    g1:  process.env.MAKE_WEBHOOK_G1,
    g3:  process.env.MAKE_WEBHOOK_G3,
    k1:  process.env.MAKE_WEBHOOK_K1,
    k2:  process.env.MAKE_WEBHOOK_K2      || process.env.MAKE_WEBHOOK_KAUF,
    l3:  process.env.MAKE_WEBHOOK_L3      || process.env.MAKE_S3_WEBHOOK,
    l4:  process.env.MAKE_WEBHOOK_L4      || 'https://hook.eu1.make.com/kplexov12f2qxxlb1k73tyq24gyumzb6',
    l5:  process.env.MAKE_WEBHOOK_L5      || 'https://hook.eu1.make.com/qhz3sm97i6dqm1wbxx737hd19k35pmro',
    l8:  process.env.MAKE_WEBHOOK_L8,
    l9:  process.env.MAKE_WEBHOOK_L9,
    l10: process.env.MAKE_WEBHOOK_L10     || process.env.MAKE_S4_WEBHOOK,
    s1:  process.env.MAKE_WEBHOOK_S1,
    s3:  process.env.MAKE_WEBHOOK_S3,
    s6:  process.env.MAKE_WEBHOOK_S6      || 'https://hook.eu1.make.com/b2tsqcvjgxhk9lrv3yyo9qht46k16kcq',
    sup: process.env.MAKE_WEBHOOK_SUPPORT || 'https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',
    wh:  process.env.MAKE_WEBHOOK_WHISPER,
  };

  const webhook = WEBHOOKS[key] || '';
  if (!webhook) {
    console.warn('[make-proxy] Kein Webhook fuer key:', key);
    return json(event, 200, { ok: true, skipped: true, reason: 'Webhook nicht konfiguriert' });
  }

  try {
    const res = await provaFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body || '{}'
    });
    const text = await res.text();
    let result = {};
    try { result = JSON.parse(text); } catch(e) { result = { raw: text }; }
    return json(event, 200, { ok: res.ok, status: res.status, result });
  } catch (err) {
    console.error('[make-proxy] Fehler:', err.message);
    return json(event, 502, { ok: false, error: 'Make.com nicht erreichbar: ' + err.message });
  }
};
