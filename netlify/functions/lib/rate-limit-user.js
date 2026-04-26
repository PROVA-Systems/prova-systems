/**
 * PROVA — netlify/functions/lib/rate-limit-user.js
 * S-SICHER P4B.1b (26.04.2026)
 *
 * Token-basiertes Rate-Limiting fuer User-protected Functions.
 *
 * Implementierung: In-Memory Map pro Function-Instance. Netlify-Lambdas
 * sind kurz-lebig und cold-starten oft, daher streut sich der Counter
 * ueber mehrere Instances — das ist OK fuer "Soft-Limit-vor-Missbrauch",
 * NICHT fuer harte Quotas. Fuer harte User-Quotas spaeter Sprint xx
 * mit Redis/Upstash.
 *
 * Begruendung pro Function-Instance: kein externer State, kein
 * Latency-Overhead, kein Single-Point-of-Failure. Trade-off: ein
 * Angreifer mit 5 parallelen Instances kann 5x das Limit erreichen —
 * akzeptabel fuer Pilot-Phase mit 10 Pilot-Kunden.
 *
 * API
 *   check(userEmail, max, windowSec) -> { allowed: bool, retryAfter: sec }
 *
 *   userEmail:  Token-sub (lower-case empfohlen, wir lowercasen sicher)
 *   max:        max. Anfragen pro Fenster
 *   windowSec:  Fensterlaenge in Sekunden (default 60)
 *
 *   retryAfter: Sekunden bis das Fenster zurueckgesetzt wird; 0 wenn allowed
 *
 * Caller-Pattern:
 *   const r = RateLimit.check(userEmail, 20, 60);
 *   if (!r.allowed) {
 *     return jsonResponse(event, 429,
 *       { error: 'Rate-Limit erreicht. Bitte ' + r.retryAfter + 's warten.' },
 *       { 'Retry-After': String(r.retryAfter) }
 *     );
 *   }
 */

'use strict';

const buckets = new Map();

function check(userEmail, max, windowSec) {
  if (!userEmail) return { allowed: true, retryAfter: 0 };

  const now      = Date.now();
  const windowMs = (windowSec || 60) * 1000;
  const key      = String(userEmail).toLowerCase();

  let bucket = buckets.get(key);

  if (!bucket || (now - bucket.windowStart) > windowMs) {
    // Frisches Fenster
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= max) {
    const retryAfter = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  bucket.count++;
  return { allowed: true, retryAfter: 0 };
}

// Best-effort GC: alle 5 Min Buckets aufraeumen die laenger als 5 Min alt sind.
// Verhindert unbounded Memory-Growth bei langen Function-Instances.
if (typeof setInterval === 'function') {
  setInterval(function () {
    const now = Date.now();
    buckets.forEach(function (bucket, key) {
      if (now - bucket.windowStart > 5 * 60 * 1000) {
        buckets.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

module.exports = {
  check: check
};
