/**
 * PROVA — make-webhooks-config.js (MEGA³⁶ W6.2)
 *
 * Konsolidiert 8+ einzelne MAKE_WEBHOOK_*-ENVs in EINE einzige
 * MAKE_WEBHOOKS_JSON-ENV mit JSON-Map. Backward-kompatibel: bei
 * fehlender JSON-ENV fallt-back auf Legacy-Einzel-ENVs.
 *
 * Setup-Empfehlung (Marcel-Action, siehe MEGA36-MARCEL-ENV-CLEANUP.md):
 *   MAKE_WEBHOOKS_JSON='{
 *     "rechnung_generate":  "https://hook.eu1.make.com/...",
 *     "mahnung_send":       "https://hook.eu1.make.com/...",
 *     "stripe_signup":      "https://hook.eu1.make.com/...",
 *     "kontakt_sync":       "https://hook.eu1.make.com/...",
 *     "auftrag_close":      "https://hook.eu1.make.com/...",
 *     "termin_remind":      "https://hook.eu1.make.com/...",
 *     "support_inbox":      "https://hook.eu1.make.com/...",
 *     "audit_archive":      "https://hook.eu1.make.com/..."
 *   }'
 *
 * Public API:
 *   const wh = require('./lib/make-webhooks-config');
 *   wh.url('rechnung_generate')           → string|null
 *   wh.urls()                             → object (alle bekannten)
 *   wh.has('rechnung_generate')           → boolean
 */
'use strict';

// Legacy-ENV-Names (für Fallback). Pflege parallel zur JSON-Konsolidierung.
const LEGACY_MAP = {
  rechnung_generate:  'MAKE_WEBHOOK_RECHNUNG_GENERATE',
  mahnung_send:       'MAKE_WEBHOOK_MAHNUNG_SEND',
  stripe_signup:      'MAKE_WEBHOOK_STRIPE_SIGNUP',
  kontakt_sync:       'MAKE_WEBHOOK_KONTAKT_SYNC',
  auftrag_close:      'MAKE_WEBHOOK_AUFTRAG_CLOSE',
  termin_remind:      'MAKE_WEBHOOK_TERMIN_REMIND',
  support_inbox:      'MAKE_WEBHOOK_SUPPORT_INBOX',
  audit_archive:      'MAKE_WEBHOOK_AUDIT_ARCHIVE'
};

let _parsedCache = null;
let _parsedSource = '';

function parseJsonEnv() {
  const raw = process.env.MAKE_WEBHOOKS_JSON || '';
  if (raw === _parsedSource && _parsedCache) return _parsedCache;
  _parsedSource = raw;
  if (!raw) { _parsedCache = {}; return {}; }
  try {
    const obj = JSON.parse(raw);
    _parsedCache = (obj && typeof obj === 'object') ? obj : {};
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[make-webhooks-config] MAKE_WEBHOOKS_JSON parse-error:', e.message);
    }
    _parsedCache = {};
  }
  return _parsedCache;
}

function url(key) {
  if (!key) return null;
  const fromJson = parseJsonEnv();
  if (typeof fromJson[key] === 'string' && fromJson[key]) return fromJson[key];
  // Fallback auf Legacy-ENV
  const legacyName = LEGACY_MAP[key];
  if (legacyName && process.env[legacyName]) return process.env[legacyName];
  return null;
}

function has(key) {
  return !!url(key);
}

function urls() {
  const out = {};
  Object.keys(LEGACY_MAP).forEach(k => {
    const u = url(k);
    if (u) out[k] = u;
  });
  // Plus eventuell zusätzliche Keys aus JSON die nicht in LEGACY_MAP sind
  const json = parseJsonEnv();
  Object.keys(json).forEach(k => {
    if (!(k in out) && typeof json[k] === 'string' && json[k]) out[k] = json[k];
  });
  return out;
}

function _resetCacheForTests() {
  _parsedCache = null;
  _parsedSource = '__force_reset_' + Math.random();
}

module.exports = {
  url: url,
  has: has,
  urls: urls,
  _LEGACY_MAP: LEGACY_MAP,
  _resetCacheForTests: _resetCacheForTests
};
