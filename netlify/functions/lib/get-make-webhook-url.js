/**
 * PROVA — get-make-webhook-url.js (MEGA³⁷ C5)
 *
 * Server-side Helper: liefert eine Make-Webhook-URL für einen Service-Key.
 * Reihenfolge:
 *   1. Supabase service_endpoints-Tabelle (M³⁷ C1) — Single-Source-of-Truth
 *   2. Fallback auf legacy MAKE_WEBHOOK_*-ENV (Übergangszeit)
 *   3. null wenn nicht gefunden
 *
 * Lambdas können diesen Helper statt direkter ENV-Reads nutzen.
 *
 * Public API:
 *   await getMakeWebhookUrl('make:l3-lifecycle-trial') → string|null
 */
'use strict';

const { getSupabase } = require('./storage-router');

// Mapping service_key → Legacy-ENV-Name (Fallback)
const LEGACY_ENV_MAP = {
  'make:g1-gutachten':         'MAKE_WEBHOOK_G1',
  'make:g3-pdf':               'MAKE_WEBHOOK_G3',
  'make:k2-kommunikation':     'MAKE_WEBHOOK_K2',
  'make:l3-lifecycle-trial':   'MAKE_WEBHOOK_L3',
  'make:l8-lifecycle-renewal': 'MAKE_WEBHOOK_L8',
  'make:l9-lifecycle-cancel':  'MAKE_WEBHOOK_L9',
  'make:l10-lifecycle-final':  'MAKE_WEBHOOK_L10',
  'make:a5-admin':             'MAKE_WEBHOOK_A5',
  'make:t3-termine':           'MAKE_WEBHOOK_T3',
  'make:f1-finanzen':          'MAKE_WEBHOOK_F1'
};

// In-Memory-Cache (Lambda-Cold-Start tolerable, hot keeps cache)
let _cache = null;
let _cacheTime = 0;
const TTL_MS = 60 * 1000; // 60s — Lambda-Lifetime ist kurz

async function loadEndpointsFromDb() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('service_endpoints')
      .select('service_key, endpoint_url, active')
      .eq('active', true);
    if (error || !data) return null;
    const map = {};
    data.forEach(r => { if (r.service_key) map[r.service_key] = r.endpoint_url; });
    return map;
  } catch (e) {
    return null;
  }
}

async function getMakeWebhookUrl(serviceKey) {
  if (!serviceKey) return null;

  // 1. Cache check
  if (_cache && (Date.now() - _cacheTime) < TTL_MS && _cache[serviceKey]) {
    return _cache[serviceKey];
  }

  // 2. DB-Lookup (Single-Source-of-Truth)
  const dbMap = await loadEndpointsFromDb();
  if (dbMap) {
    _cache = dbMap;
    _cacheTime = Date.now();
    if (dbMap[serviceKey]) return dbMap[serviceKey];
  }

  // 3. Legacy-ENV-Fallback (Übergangszeit)
  const envName = LEGACY_ENV_MAP[serviceKey];
  if (envName && process.env[envName]) {
    return process.env[envName];
  }

  return null;
}

function invalidateCache() {
  _cache = null;
  _cacheTime = 0;
}

module.exports = {
  getMakeWebhookUrl: getMakeWebhookUrl,
  invalidateCache: invalidateCache,
  __LEGACY_ENV_MAP: LEGACY_ENV_MAP
};
