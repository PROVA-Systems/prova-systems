/**
 * PROVA Systems — Make-Webhooks Helper
 * MEGA¹⁵.5 W38 (2026-05-07)
 *
 * Konsolidiert 21 separate ENV-Vars (MAKE_WEBHOOK_A5, _F1, ...) in
 * eine einzige ENV: MAKE_WEBHOOKS (JSON-Object).
 *
 * AWS-Lambda-4KB-ENV-Limit Hotfix.
 *
 * USAGE:
 *   const { getMakeWebhook } = require('./lib/make-webhooks');
 *   const url = getMakeWebhook('a5');  // → https://...
 *
 * Backwards-Compat: liest Legacy-ENV (MAKE_WEBHOOK_<KEY>) als Fallback,
 * sodass Production weiter funktioniert waehrend Migration.
 *
 * ENV-Format:
 *   MAKE_WEBHOOKS='{"a5":"https://hook.eu1.make.com/abc","f1":"...","g1":"..."}'
 *
 * Anti-Pattern vermieden:
 *   - JSON.parse pro Aufruf vermeiden (cached Module-Level)
 *   - Fail-loud bei korrupter JSON (devops-friendly)
 *   - Backwards-Compat zu Legacy MAKE_WEBHOOK_* ohne Migration-Pflicht
 *   - Case-insensitive Lookup (a5/A5/A5_TRIGGER alles ok)
 */
'use strict';

let _cached = null;
let _cacheError = null;

/**
 * Lazy-Parsing der MAKE_WEBHOOKS JSON-ENV.
 * Cache-Lifetime = Lambda-Container-Lifetime (5-15 Min typisch).
 */
function _parseConfig() {
  if (_cached !== null) return _cached;
  if (_cacheError !== null) throw _cacheError;

  const raw = process.env.MAKE_WEBHOOKS;
  if (!raw) {
    _cached = {};
    return _cached;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Normalisiere Keys zu lowercase fuer case-insensitive lookup
      const normalized = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v) {
          normalized[String(k).toLowerCase()] = v;
        }
      }
      _cached = normalized;
      return _cached;
    }
    _cacheError = new Error('MAKE_WEBHOOKS must be a JSON object');
    throw _cacheError;
  } catch (e) {
    _cacheError = new Error('MAKE_WEBHOOKS JSON parse failed: ' + e.message);
    throw _cacheError;
  }
}

/**
 * Resolve Webhook-URL fuer einen Key.
 *
 * Reihenfolge:
 *   1. process.env.MAKE_WEBHOOKS[key] (JSON-Object)
 *   2. process.env.MAKE_WEBHOOK_<KEY> (Legacy-Backwards-Compat)
 *   3. null
 *
 * @param {string} key z.B. 'a5', 'f1', 'support', 'kauf'
 * @returns {string|null}
 */
function getMakeWebhook(key) {
  if (!key || typeof key !== 'string') return null;
  const lower = key.toLowerCase();
  const upper = key.toUpperCase();

  // 1. JSON-Lookup
  try {
    const config = _parseConfig();
    if (config[lower]) return config[lower];
  } catch (_) {
    // Fall through to legacy
  }

  // 2. Legacy-ENV (Backwards-Compat)
  const legacyKey = 'MAKE_WEBHOOK_' + upper;
  if (process.env[legacyKey]) return process.env[legacyKey];

  // 2b. Special-Case fuer MAKE_S3_WEBHOOK / MAKE_S4_WEBHOOK (alte Namens-Pattern)
  if (lower === 's3' && process.env.MAKE_S3_WEBHOOK) return process.env.MAKE_S3_WEBHOOK;
  if (lower === 's4' && process.env.MAKE_S4_WEBHOOK) return process.env.MAKE_S4_WEBHOOK;

  return null;
}

/**
 * Liefert ALLE konfigurierten Webhooks (fuer Debug/Health-Check).
 * Werte werden NICHT zurueckgegeben (Security) — nur Keys.
 *
 * @returns {string[]} Array von Webhook-Keys
 */
function listMakeWebhooks() {
  try {
    const config = _parseConfig();
    return Object.keys(config).sort();
  } catch (_) {
    return [];
  }
}

/**
 * Reset Cache (fuer Tests).
 */
function _resetCache() {
  _cached = null;
  _cacheError = null;
}

module.exports = {
  getMakeWebhook,
  listMakeWebhooks,
  _resetCache  // test-only
};
