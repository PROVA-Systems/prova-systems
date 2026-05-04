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
  's1','s3','s6','s9',
  'sup','wh'
];

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  const key = ((event.queryStringParameters || {}).key || '').toLowerCase().trim();
  if (!ALLOWED_KEYS.includes(key)) return json(event, 400, { error: 'Ungültiger key: ' + key });

  // P5.A5: Auth-Strategie geklaert.
  // - k3 (Webhook-Forwarder fuer Server-Trigger): Interner Secret-Header
  //   PROVA_INTERNAL_WRITE_SECRET, KEIN JWT — Caller ist Server-Code, nicht
  //   Browser. Bleibt unveraendert.
  // - Alle anderen Keys: HMAC-Token-Pflicht (Browser-Trigger). Statt
  //   clientContext.user (alter Identity-Pfad) jetzt lib/auth-resolve.
  if (key === 'k3') {
    const secret = (event.headers['x-prova-internal'] || '').trim();
    const envSecret = (process.env.PROVA_INTERNAL_WRITE_SECRET || '').trim();
    if (!envSecret || secret !== envSecret) return json(event, 403, { error: 'Verboten' });
  } else {
    const { resolveUser, logAuthFailure } = require('./lib/auth-resolve');
    const u = await resolveUser(event);
    if (u.mismatch) {
      logAuthFailure('Auth-Mismatch', event, u.mismatch);
      return json(event, 403, { error: 'Auth-Mismatch' });
    }
    if (!u.email) {
      logAuthFailure('Auth-Required', event, { function: 'make-proxy', key: key });
      return json(event, 401, { error: 'Anmeldung erforderlich' });
    }
  }

  // MEGA¹⁵.5 W38: Konsolidierter Helper (MAKE_WEBHOOKS-JSON statt 21 separate ENVs)
  // Backwards-Compat: liest MAKE_WEBHOOK_<KEY>-Legacy-ENVs als Fallback
  const { getMakeWebhook } = require('./lib/make-webhooks');

  // Spezial-Mapping fuer kauf -> k2 (legacy alias)
  const aliasedKey = (key === 'kauf') ? 'k2' : key;

  const webhook = getMakeWebhook(aliasedKey) || '';
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
