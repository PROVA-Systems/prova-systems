/**
 * PROVA — rate-limit-helper.js (MEGA²⁸ KORR-21)
 *
 * Edge-Function-Rate-Limiter pro User pro Function pro Minute.
 * Default-Limits + Override-Möglichkeit pro Function.
 *
 * Nutzung in Lambda:
 *   const { rateLimitOrThrow } = require('./lib/rate-limit-helper');
 *   await rateLimitOrThrow({ userId, functionName: 'ki-proxy', max: 30, windowSec: 60 });
 *
 * Storage: in-memory pro Lambda-Container (Cache-Lifetime ~5-15 Min).
 * Production-Note: für Cross-Container-Persistenz Redis/Upstash empfehlen.
 */
'use strict';

const _store = new Map();

const DEFAULT_LIMITS = {
  'ki-proxy': { max: 30, windowSec: 60 },
  'whisper-diktat': { max: 10, windowSec: 60 },
  'pdf-generate': { max: 60, windowSec: 60 },
  'foto-captioning': { max: 20, windowSec: 60 },
  'create-referral': { max: 5, windowSec: 86400 }, // 5/Tag (siehe create-referral.js)
  'send-welcome-email': { max: 100, windowSec: 60 }, // intern
  'redeem-referral-code': { max: 60, windowSec: 60 },
  'default': { max: 60, windowSec: 60 }
};

/**
 * Pure-Function: prüfe + zähle.
 * @returns {{ allowed:boolean, remaining:number, retryAfter:number }}
 */
function checkAndIncrement(userId, functionName, opts) {
  opts = opts || {};
  const limit = DEFAULT_LIMITS[functionName] || DEFAULT_LIMITS.default;
  const max = opts.max || limit.max;
  const windowSec = opts.windowSec || limit.windowSec;
  const key = (userId || 'anon') + ':' + functionName;
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSec;

  const entries = _store.get(key) || [];
  const fresh = entries.filter(ts => ts > cutoff);

  if (fresh.length >= max) {
    const oldestInWindow = fresh[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfter: oldestInWindow + windowSec - now
    };
  }
  fresh.push(now);
  _store.set(key, fresh);
  return {
    allowed: true,
    remaining: max - fresh.length,
    retryAfter: 0
  };
}

/**
 * Lambda-Helper: ruft checkAndIncrement, throwt 429-Response wenn limit überschritten.
 */
async function rateLimitOrThrow(opts) {
  const result = checkAndIncrement(opts.userId, opts.functionName, opts);
  if (!result.allowed) {
    const err = new Error('Rate-Limit überschritten');
    err.statusCode = 429;
    err.retryAfter = result.retryAfter;
    err.headers = { 'Retry-After': String(result.retryAfter) };
    throw err;
  }
  return result;
}

/**
 * Helper für graceful Lambda-Response (alternative zu throw).
 */
function rateLimitResponse(event, opts) {
  const result = checkAndIncrement(opts.userId, opts.functionName, opts);
  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(result.retryAfter)
      },
      body: JSON.stringify({
        error: 'Rate-Limit überschritten',
        retry_after_seconds: result.retryAfter,
        function: opts.functionName
      })
    };
  }
  return null;
}

/**
 * Reset für Tests.
 */
function _reset() {
  _store.clear();
}

module.exports = {
  checkAndIncrement,
  rateLimitOrThrow,
  rateLimitResponse,
  _reset,
  DEFAULT_LIMITS
};
