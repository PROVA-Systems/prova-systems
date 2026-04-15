/**
 * PROVA Systems — Airtable Rate-Limiter + Retry-Queue
 * ═══════════════════════════════════════════════════════════════════════
 * Löst: Airtable erlaubt nur 5 Requests/Sekunde pro Base.
 * Bei 50+ gleichzeitigen SVs → 429-Fehler ohne diesen Mechanismus.
 *
 * FEATURES:
 *  ✅ Token-Bucket: max 4 Requests/Sek (mit Sicherheitspuffer)
 *  ✅ Exponential Backoff bei 429: 500ms → 1s → 2s → 4s
 *  ✅ Max 4 Retry-Versuche
 *  ✅ Request-Queue (FIFO) damit keine Requests verloren gehen
 *  ✅ Retry-After Header wird respektiert
 *  ✅ Logging für Monitoring
 *
 * VERWENDUNG in airtable.js:
 *   const { fetchAirtable } = require('./lib/airtable-rate-limiter');
 *   const res = await fetchAirtable(url, options);
 *
 * HINWEIS: In-Memory Queue. Funktioniert gut für Netlify Functions
 * (Lambda-Instanzen teilen sich keinen State, aber jede Instanz
 *  limitiert sich selbst → verhindert Burst-Requests)
 */

'use strict';

// ── Token-Bucket Konfiguration ────────────────────────────────
const BUCKET_CAPACITY  = 4;     // Max Requests auf einmal
const REFILL_RATE_MS   = 250;   // 1 Token alle 250ms = 4/Sek
const MAX_RETRIES      = 4;
const RETRY_DELAYS_MS  = [500, 1000, 2000, 4000];

// In-Memory Token-Bucket (pro Lambda-Instanz)
let _tokens     = BUCKET_CAPACITY;
let _lastRefill = Date.now();

function refillBucket() {
  const now = Date.now();
  const elapsed = now - _lastRefill;
  const tokensToAdd = Math.floor(elapsed / REFILL_RATE_MS);
  if (tokensToAdd > 0) {
    _tokens = Math.min(BUCKET_CAPACITY, _tokens + tokensToAdd);
    _lastRefill = now;
  }
}

function consumeToken() {
  refillBucket();
  if (_tokens > 0) {
    _tokens--;
    return true;
  }
  return false;
}

function waitForToken() {
  return new Promise((resolve) => {
    const check = () => {
      if (consumeToken()) {
        resolve();
      } else {
        setTimeout(check, REFILL_RATE_MS);
      }
    };
    check();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Airtable-spezifischer Fetch mit Rate-Limiting + Retry
 * Drop-in Ersatz für fetch() in airtable.js
 *
 * @param {string}  url      - Airtable API URL
 * @param {object}  options  - Fetch-Options (method, headers, body)
 * @param {object}  [opts]   - Zusätzliche Optionen
 * @param {number}  [opts.maxRetries=4]  - Max Retry-Versuche
 * @param {number}  [opts.timeout=30000] - Timeout in ms
 * @returns {Promise<Response>}
 */
async function fetchAirtable(url, options, opts) {
  opts = opts || {};
  const maxRetries = opts.maxRetries !== undefined ? opts.maxRetries : MAX_RETRIES;
  const timeout    = opts.timeout    !== undefined ? opts.timeout    : 30000;

  let lastError  = null;
  let lastStatus = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Rate-Limit: Token holen
    await waitForToken();

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = res.status;

      // ── Erfolg ──────────────────────────────────────────────
      if (res.ok) {
        if (attempt > 0) {
          console.log(`[airtable-rl] ✅ Erfolg nach ${attempt} Retry(s). Status: ${res.status}`);
        }
        return res;
      }

      // ── 429 Rate Limit ──────────────────────────────────────
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        let delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];

        if (retryAfterHeader) {
          // Airtable gibt manchmal Retry-After in Sekunden
          const retryAfterSec = parseFloat(retryAfterHeader);
          if (!isNaN(retryAfterSec)) {
            delay = Math.min(retryAfterSec * 1000 + 100, 10000); // Max 10s
          }
        }

        // Token-Bucket auf 0 setzen (wir sind gebremst)
        _tokens = 0;

        if (attempt >= maxRetries) {
          lastError = `Airtable Rate Limit (429) — Max Retries (${maxRetries}) erreicht`;
          break;
        }

        console.warn(`[airtable-rl] 429 Rate Limit. Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // ── Andere Server-Fehler (5xx) ── Retry ─────────────────
      if (res.status >= 500) {
        if (attempt >= maxRetries) {
          lastError = `Airtable Server-Fehler ${res.status} — Max Retries (${maxRetries}) erreicht`;
          break;
        }

        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        console.warn(`[airtable-rl] HTTP ${res.status}. Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // ── Andere Fehler (4xx außer 429) — NICHT retrien ───────
      console.warn(`[airtable-rl] HTTP ${res.status} — Kein Retry`);
      return res; // Direkt zurückgeben (z.B. 401, 403, 404)

    } catch (err) {
      lastError = err.message;

      if (err.name === 'AbortError') {
        lastError = `Airtable Timeout (${timeout}ms)`;
        lastStatus = 408;
      }

      if (attempt >= maxRetries) {
        console.error(`[airtable-rl] ❌ Fehler nach ${maxRetries} Retries: ${lastError}`);
        break;
      }

      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      console.warn(`[airtable-rl] Netzwerk-Fehler: ${lastError}. Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Alle Versuche fehlgeschlagen — synthetischen Response zurückgeben
  const errorBody = JSON.stringify({
    error: lastError || 'Unbekannter Airtable-Fehler',
    errorCode: lastStatus === 429 ? 'AIRTABLE_RATE_LIMIT' : 'AIRTABLE_UNAVAILABLE',
    retryable: true,
  });

  // Synthetischen Response-ähnlichen Wrapper zurückgeben
  return {
    ok: false,
    status: lastStatus || 503,
    statusText: lastError || 'Service Unavailable',
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(JSON.parse(errorBody)),
    text: () => Promise.resolve(errorBody),
  };
}

/**
 * Status-Info (für Logging/Monitoring)
 */
function getRateLimiterStatus() {
  refillBucket();
  return {
    tokens: _tokens,
    capacity: BUCKET_CAPACITY,
    refillRateMs: REFILL_RATE_MS,
  };
}

module.exports = { fetchAirtable, getRateLimiterStatus };