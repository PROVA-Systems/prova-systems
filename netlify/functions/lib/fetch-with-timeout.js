/**
 * PROVA — fetch-with-timeout.js
 * Alle externen API-Calls (Airtable, OpenAI, PDFMonkey, Make.com)
 * bekommen automatisch einen Timeout. Verhindert dass eine hängende
 * API unsere Netlify Function für 10 Sekunden blockiert.
 *
 * Standard-Timeouts (basierend auf API-Benchmarks):
 *   Airtable:  5 Sekunden
 *   OpenAI:   25 Sekunden (Streaming kann länger dauern)
 *   PDFMonkey: 30 Sekunden (PDF-Generierung)
 *   Make.com:  8 Sekunden
 *   SMTP:     10 Sekunden
 */
'use strict';

const DEFAULT_TIMEOUTS = {
  airtable:  5000,
  openai:   25000,
  pdfmonkey: 30000,
  make:      8000,
  smtp:     10000,
  default:   8000,
};

/**
 * fetch() mit automatischem Timeout und sauberem Fehler
 * @param {string} url
 * @param {object} options - fetch options
 * @param {number} timeoutMs - optional override
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs) {
  // Timeout automatisch aus URL ableiten wenn nicht explizit gesetzt
  if (!timeoutMs) {
    if (url.includes('airtable.com'))    timeoutMs = DEFAULT_TIMEOUTS.airtable;
    else if (url.includes('openai.com')) timeoutMs = DEFAULT_TIMEOUTS.openai;
    else if (url.includes('pdfmonkey')) timeoutMs = DEFAULT_TIMEOUTS.pdfmonkey;
    else if (url.includes('make.com') || url.includes('hook.eu')) timeoutMs = DEFAULT_TIMEOUTS.make;
    else                                 timeoutMs = DEFAULT_TIMEOUTS.default;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const apiName = url.includes('airtable') ? 'Airtable'
        : url.includes('openai') ? 'OpenAI'
        : url.includes('pdfmonkey') ? 'PDFMonkey'
        : 'API';
      const timeoutSec = (timeoutMs / 1000).toFixed(0);
      throw new Error(`${apiName} Timeout nach ${timeoutSec}s — bitte erneut versuchen`);
    }
    throw err;
  }
}

/**
 * Retry mit exponentiellem Backoff — wie Stripe es macht
 * Versucht max. 3 Mal, wartet 1s → 2s → 4s
 * Nur bei transienten Fehlern (429, 503, 502, Timeout)
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, timeoutMs) {
  const RETRYABLE = new Set([429, 502, 503, 504]);
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);

      // Rate Limit: warten und nochmal
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '1', 10);
        const wait = Math.min(retryAfter * 1000, 8000);
        console.warn(`[PROVA] Rate limit (429), warte ${wait}ms, Versuch ${attempt}/${maxRetries}`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Andere Fehler die einen Retry rechtfertigen
      if (!res.ok && RETRYABLE.has(res.status) && attempt < maxRetries) {
        const wait = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(`[PROVA] HTTP ${res.status}, warte ${wait}ms, Versuch ${attempt}/${maxRetries}`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      const isTimeout = err.message.includes('Timeout');
      const isNetwork = err.message.includes('network') || err.code === 'ECONNREFUSED';

      if ((isTimeout || isNetwork) && attempt < maxRetries) {
        const wait = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[PROVA] ${err.message}, warte ${wait}ms, Versuch ${attempt}/${maxRetries}`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Maximale Anzahl Versuche erreicht');
}

module.exports = { fetchWithTimeout, fetchWithRetry, DEFAULT_TIMEOUTS };
