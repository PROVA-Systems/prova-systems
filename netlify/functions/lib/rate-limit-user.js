/**
 * PROVA — netlify/functions/lib/rate-limit-user.js
 * S-SICHER P4B.1b (26.04.2026) + P4B.1d Audit-Log-Nachtrag
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
 * Bucket-Key: token.sub (Email, lower-case) — KEINE Trennung nach
 * Token-Typ. Wichtige Konsequenzen:
 *   - Provisional-Tokens (verified=false) und verifizierte Tokens teilen
 *     sich denselben Bucket pro Email.
 *   - Notfall-Tokens (emergency=true) teilen sich AUCH denselben Bucket.
 *     -> verhindert dass ein User durch parallelen Notfall-Login das
 *        Rate-Limit umgeht.
 *   - Admin-Tokens (z.B. @prova-systems.de) sind durch isAdmin in
 *     airtable.js bereits limit-frei; Rate-Limit-Pruefung umgeht der
 *     Caller dort komplett — hier wird der Bucket einfach gefuehrt.
 *
 * API
 *   check(userEmail, max, windowSec, opts) -> { allowed, retryAfter }
 *
 *     userEmail:  Token-sub (lower-case empfohlen; wir lowercasen sicher)
 *     max:        max. Anfragen pro Fenster
 *     windowSec:  Fensterlaenge in Sekunden (default 60)
 *     opts:       optional - wenn { event, functionName } uebergeben,
 *                 schreibt die Lib bei !allowed selbst einen
 *                 AUDIT_TRAIL-Eintrag (typ='Rate-Limit-Hit'). Caller
 *                 MUSS dann KEIN logAuthFailure('Rate-Limit', ...)
 *                 mehr aufrufen — sonst Doppellog.
 *
 *     retryAfter: Sekunden bis das Fenster zurueckgesetzt wird; 0 wenn allowed
 *
 * Caller-Pattern:
 *   const r = RateLimit.check(userEmail, 20, 60, { event, functionName: 'ki-proxy' });
 *   if (!r.allowed) {
 *     return jsonResponse(event, 429,
 *       { error: 'Rate-Limit erreicht. Bitte ' + r.retryAfter + 's warten.' },
 *       { 'Retry-After': String(r.retryAfter) }
 *     );
 *   }
 */

'use strict';

const { logAuthFailure } = require('./auth-resolve');

const buckets = new Map();

function check(userEmail, max, windowSec, opts) {
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
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));

    // P4B.1d: Audit-Log bei Rate-Limit-Hit, wenn Caller event+functionName mitgibt.
    // Konsole IMMER, AUDIT_TRAIL nur wenn opts.event verfuegbar (sonst kein
    // Kontext zum Loggen).
    try {
      console.warn('[rate-limit-user] HIT', JSON.stringify({
        userEmail: key,
        function: (opts && opts.functionName) || 'unknown',
        count: bucket.count,
        max: max,
        windowSec: windowSec || 60,
        retryAfter: retryAfter
      }));
    } catch (e) {}

    if (opts && opts.event) {
      logAuthFailure('Rate-Limit-Hit', opts.event, {
        tokenEmail: key,
        function: (opts && opts.functionName) || 'unknown',
        count: bucket.count,
        max: max,
        windowSec: windowSec || 60,
        retryAfter: retryAfter
      });
    }

    return { allowed: false, retryAfter: retryAfter };
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
