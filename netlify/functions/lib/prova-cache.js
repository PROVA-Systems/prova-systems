/**
 * PROVA Server Cache — In-Memory TTL Cache für Netlify Functions
 * ══════════════════════════════════════════════════════════════
 * Problem: Airtable erlaubt 5 req/s. Bei 20 SVs gleichzeitig = 60 req/s.
 * Lösung:  30-Sekunden Cache für häufige Leseanfragen.
 *
 * Wie es professionelle Systeme machen:
 * - Stripe: Redis Cache vor der Datenbank
 * - Linear: In-Memory Cache für häufige Queries
 * - Wir:    Node.js Module-Level Cache (überlebt mehrere Function-Aufrufe
 *           innerhalb desselben "warm" Containers)
 *
 * WICHTIG: Nur für GET-Requests. PATCH/POST/DELETE immer direkt.
 * WICHTIG: Nie für sicherheitskritische Daten (Passwörter, Tokens).
 */
'use strict';

/* Module-Level Map — überlebt Function-Warmup-Phase */
const _cache = new Map();

const TTL = {
  default:    30 * 1000,  // 30s — Dashboard, Listen
  sv_profil:  60 * 1000,  // 60s — SV-Profil ändert sich selten
  normen:    300 * 1000,  // 5m  — Normen-Datenbank
};

/**
 * get — Cached Value holen
 * @returns {any|null} — null wenn nicht im Cache oder abgelaufen
 */
function get(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * set — Value cachen
 */
function set(key, value, ttl) {
  _cache.set(key, {
    value,
    expires: Date.now() + (ttl || TTL.default),
  });
}

/**
 * invalidate — Cache für einen Key oder Pattern löschen
 * Wichtig: Nach PATCH/POST immer aufrufen!
 */
function invalidate(pattern) {
  if (typeof pattern === 'string') {
    _cache.delete(pattern);
  } else if (pattern instanceof RegExp) {
    for (const key of _cache.keys()) {
      if (pattern.test(key)) _cache.delete(key);
    }
  }
}

/**
 * wrap — Funktion mit Cache wrappen (häufigstes Muster)
 * @example
 * const data = await cache.wrap('dashboard:svEmail', () => fetchFromAirtable(), 30000);
 */
async function wrap(key, fn, ttl) {
  const cached = get(key);
  if (cached !== null) return cached;
  const result = await fn();
  set(key, result, ttl);
  return result;
}

/** Stats für Health-Check */
function stats() {
  return { size: _cache.size, keys: Array.from(_cache.keys()) };
}

module.exports = { get, set, invalidate, wrap, TTL, stats };
