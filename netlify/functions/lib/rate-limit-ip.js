/**
 * PROVA — IP-basiertes Rate-Limiting (für Auth-Endpoints + Public-Functions)
 *
 * Ergänzung zu lib/rate-limit-user.js (Token-basiert).
 * Pattern identisch — nur Bucket-Key ist IP statt Email.
 *
 * Usage:
 *   const RL = require('./lib/rate-limit-ip');
 *   const r = RL.check(event, 5, 15 * 60, { functionName: 'admin-auth' });
 *   if (!r.allowed) {
 *     return { statusCode: 429, headers: { 'Retry-After': String(r.retryAfter), ... } };
 *   }
 *
 * Hinweise:
 *  - In-Memory pro Function-Instance (Soft-Limit, nicht hart).
 *  - Bei verteilter Lambda-Instanz kann ein Angreifer mit N Instanzen N×Limit hitten.
 *    Akzeptabel fuer Pre-Pilot-Phase. Fuer harte Limits: Redis/Upstash Folge-Sprint.
 */

'use strict';

const buckets = new Map();

function getClientIp(event) {
  if (!event || !event.headers) return 'unknown';
  const h = event.headers;
  const xff = String(h['x-forwarded-for'] || h['X-Forwarded-For'] || '').split(',')[0].trim();
  if (xff) return xff;
  return String(h['x-nf-client-connection-ip'] || h['client-ip'] || 'unknown').trim();
}

function check(event, max, windowSec, opts) {
  const ip = getClientIp(event);
  if (ip === 'unknown') return { allowed: true, retryAfter: 0, ip };

  const now = Date.now();
  const windowMs = (windowSec || 60) * 1000;
  const key = ip;
  let bucket = buckets.get(key);

  if (!bucket || (now - bucket.windowStart) > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0, ip };
  }

  if (bucket.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
    try {
      console.warn('[rate-limit-ip] HIT', JSON.stringify({
        ip,
        function: (opts && opts.functionName) || 'unknown',
        count: bucket.count,
        max,
        windowSec: windowSec || 60,
        retryAfter
      }));
    } catch (e) {}
    return { allowed: false, retryAfter, ip };
  }

  bucket.count++;
  return { allowed: true, retryAfter: 0, ip };
}

// Best-effort GC
if (typeof setInterval === 'function') {
  const gcHandle = setInterval(function () {
    const now = Date.now();
    buckets.forEach(function (bucket, key) {
      if (now - bucket.windowStart > 30 * 60 * 1000) {
        buckets.delete(key);
      }
    });
  }, 5 * 60 * 1000);
  // M1c: GC-Timer darf Test-Prozesse nicht am Leben halten.
  if (gcHandle && typeof gcHandle.unref === 'function') gcHandle.unref();
}

module.exports = {
  check,
  getClientIp
};
