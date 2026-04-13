/**
 * PROVA — Zentraler Fetch-Wrapper für Netlify Functions
 * ══════════════════════════════════════════════════════
 * Standard in allen professionellen SaaS-Systemen:
 * - Timeout: Kein Call hängt ewig (Standard: 8s, KI: 25s)
 * - Retry: Automatisch 3× versuchen bei 429/503/Netzfehler
 * - Structured Logging: Jeder Call wird als JSON geloggt
 * - Fehlercodes: Einheitliche Fehler-Responses
 */
'use strict';

const TIMEOUTS = {
  default:  8000,  // 8s  — Airtable, Make.com, PDFMonkey
  ai:       9000,  // 9s  — OpenAI (Netlify Free Limit = 10s, 1s Puffer)
                   //        Mit Netlify Pro (26s) hier auf 24000 erhöhen
  smtp:     8000,  // 8s  — E-Mail-Versand
  stripe:   8000,  // 8s  — Stripe API
};

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES  = 3;

/**
 * provaFetch — Fetch mit Timeout, Retry und Logging
 * @param {string} url
 * @param {RequestInit} options
 * @param {object} config - { timeout, retries, service, userId }
 */
async function provaFetch(url, options = {}, config = {}) {
  const timeout  = config.timeout  || TIMEOUTS[config.service] || TIMEOUTS.default;
  const maxRetry = config.retries  !== undefined ? config.retries : 2;
  const service  = config.service  || 'unknown';
  const userId   = config.userId   || 'system';
  const reqId    = Math.random().toString(36).slice(2, 9);

  let lastError;

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const start = Date.now();

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const ms = Date.now() - start;

      // Strukturiertes Logging
      console.log(JSON.stringify({
        level:   res.ok ? 'info' : 'warn',
        reqId,
        service,
        userId:  userId.replace(/@.*/, '@…'), // E-Mail anonymisieren
        url:     url.replace(/https:\/\/[^/]+/, ''), // nur Pfad loggen
        status:  res.status,
        ms,
        attempt,
      }));

      // Bei Retry-Status: warten und nochmal
      if (!res.ok && RETRY_STATUS.has(res.status) && attempt < maxRetry) {
        const wait = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(JSON.stringify({ level: 'info', reqId, msg: `Retry in ${wait}ms`, attempt }));
        await new Promise(r => setTimeout(r, wait));
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }

      return res;

    } catch (err) {
      clearTimeout(timer);
      const ms = Date.now() - start;

      const isTimeout = err.name === 'AbortError';
      console.log(JSON.stringify({
        level:   'error',
        reqId,
        service,
        userId:  userId.replace(/@.*/, '@…'),
        error:   isTimeout ? 'TIMEOUT' : err.message,
        ms,
        attempt,
      }));

      lastError = isTimeout
        ? new Error(`Timeout nach ${timeout}ms (${service})`)
        : err;

      // Bei Netzfehler: nochmal versuchen (außer letztem Versuch)
      if (attempt < maxRetry) {
        const wait = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
    }
  }

  throw lastError || new Error(`Alle ${maxRetry + 1} Versuche fehlgeschlagen (${service})`);
}

module.exports = { provaFetch, TIMEOUTS };
