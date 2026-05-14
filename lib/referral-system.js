/**
 * PROVA — Referral-System Frontend-Library (MEGA²⁷)
 *
 * Pure-Functions + API-Wrapper fuer Founding-Member Empfehlungs-Programm.
 * UMD-Pattern (browser via window.ProvaReferral, node via require).
 *
 * Public API:
 *   ProvaReferral.generateCode(initials) → 'PROVA-FRIEND-XX-Y6'
 *   ProvaReferral.validateEmail(email) → { ok, error? }
 *   ProvaReferral.validateMessage(msg) → { ok, error? }
 *   ProvaReferral.calculateExpiresAt(now?) → ISO-string (now + 7 days)
 *   ProvaReferral.calculateRewardEligibleAt(subscribedAt) → ISO-string (sub + 30 days)
 *   ProvaReferral.statusLabel(status) → DE-readable mit Icon
 *   ProvaReferral.canCreateMore(stats) → { ok, remaining, error? }
 *   ProvaReferral.create(opts) → Promise<{ ok, code, error? }>  // browser-only
 *   ProvaReferral.getStats() → Promise<{...}>
 *   ProvaReferral.getHistory() → Promise<{ items: [...] }>
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ProvaReferral = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const MAX_REFERRALS = 12;
  const HOLD_DAYS = 30;
  const EXPIRY_DAYS = 7;
  const MAX_MESSAGE_LENGTH = 500;
  // Random-Charset ohne 0/O/1/I (Verwechslungs-Schutz)
  const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function _safeRandom(len) {
    let out = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      for (let i = 0; i < len; i++) out += SAFE_CHARS[buf[i] % SAFE_CHARS.length];
      return out;
    }
    // Node-Fallback (Tests)
    try {
      const nodeCrypto = require('node:crypto');
      const buf = nodeCrypto.randomBytes(len);
      for (let i = 0; i < len; i++) out += SAFE_CHARS[buf[i] % SAFE_CHARS.length];
      return out;
    } catch (_) {
      // Ultra-Fallback
      for (let i = 0; i < len; i++) out += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
      return out;
    }
  }

  /**
   * Generate Code im Format PROVA-FRIEND-{INITIALS}-{6-char-RANDOM}.
   * @param {string} initials — z.B. 'HM' (max 4 Zeichen, A-Z)
   * @returns {string}
   */
  function generateCode(initials) {
    const cleanInit = String(initials || 'XX').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'XX';
    const rand = _safeRandom(6);
    return 'PROVA-FRIEND-' + cleanInit + '-' + rand;
  }

  /**
   * Email-Validation (RFC-light).
   * @param {string} email
   * @returns {{ok:boolean, error?:string}}
   */
  function validateEmail(email) {
    if (!email || typeof email !== 'string') return { ok: false, error: 'Email erforderlich' };
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      return { ok: false, error: 'Email-Format ungueltig' };
    }
    return { ok: true };
  }

  /**
   * Werber-Email != Geworbene-Email.
   */
  function checkSelfReferral(referrerEmail, referredEmail) {
    if (!referrerEmail || !referredEmail) return { ok: true };
    if (String(referrerEmail).trim().toLowerCase() === String(referredEmail).trim().toLowerCase()) {
      return { ok: false, error: 'Du kannst dich nicht selbst empfehlen' };
    }
    return { ok: true };
  }

  /**
   * Validate persoenliche Nachricht.
   */
  function validateMessage(msg) {
    if (msg === null || msg === undefined || msg === '') return { ok: true };
    if (typeof msg !== 'string') return { ok: false, error: 'Ungueltiger Nachrichten-Typ' };
    if (msg.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: 'Nachricht zu lang (max ' + MAX_MESSAGE_LENGTH + ' Zeichen)' };
    }
    return { ok: true };
  }

  /**
   * Cap-Check: kann Werber noch eine Empfehlung machen?
   * @param {{total_active:number, total_rewarded:number}} stats
   * @returns {{ok:boolean, remaining:number, error?:string}}
   */
  function canCreateMore(stats) {
    const used = (stats && stats.total_active !== undefined ? stats.total_active : 0)
      + (stats && stats.total_rewarded !== undefined ? stats.total_rewarded : 0)
      + (stats && stats.total_hold !== undefined ? stats.total_hold : 0)
      + (stats && stats.total_pending !== undefined ? stats.total_pending : 0);
    const remaining = Math.max(0, MAX_REFERRALS - used);
    if (remaining === 0) {
      return { ok: false, remaining: 0, error: 'Du hast bereits ' + MAX_REFERRALS + ' Empfehlungen versendet' };
    }
    return { ok: true, remaining };
  }

  /**
   * ISO-Date 7 Tage in der Zukunft.
   */
  function calculateExpiresAt(now) {
    const base = now ? new Date(now) : new Date();
    const out = new Date(base.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    return out.toISOString();
  }

  /**
   * ISO-Date 30 Tage nach Subscription.
   */
  function calculateRewardEligibleAt(subscribedAt) {
    if (!subscribedAt) return null;
    const base = new Date(subscribedAt);
    if (isNaN(base.getTime())) return null;
    const out = new Date(base.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);
    return out.toISOString();
  }

  /**
   * Status-Label mit Icon (DE).
   */
  function statusLabel(status) {
    const map = {
      pending: '⏰ Pending',
      active: '🔄 Active',
      hold: '⏳ Hold',
      rewarded: '✅ Rewarded',
      expired: '❌ Expired',
      cancelled: '🚫 Cancelled'
    };
    return map[status] || status;
  }

  /**
   * Initials aus full name (max 2 Buchstaben).
   * "Hans Müller" → "HM", "Marcel" → "M"
   */
  function deriveInitials(fullName) {
    if (!fullName) return 'XX';
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'XX';
    if (parts.length === 1) return (parts[0][0] || 'X').toUpperCase();
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
  }

  /**
   * Browser-API: Empfehlung erstellen.
   */
  function create(opts) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch not available'));
    const body = {
      referred_email: String((opts && opts.email) || '').trim().toLowerCase(),
      personal_message: String((opts && opts.message) || '')
    };
    const headers = Object.assign({ 'Content-Type': 'application/json' },
      typeof window !== 'undefined' && window.provaAuthHeaders ? window.provaAuthHeaders() : {}
    );
    return fetch('/.netlify/functions/create-referral', {
      method: 'POST', headers, body: JSON.stringify(body)
    }).then(r => r.json());
  }

  // MEGA⁷⁵-D Bug 1: get-referral-stats / get-referral-history Endpoints
  // existieren weder in netlify/functions/ noch supabase/functions/ — MEGA⁵⁶-
  // FUNCTION-MAP behauptet "ACTIVE", aber Files fehlen real. Statt 401-Spam
  // bei jedem Dashboard-Load liefern wir empty-defaults. Wenn die Endpoints
  // tatsächlich gebaut werden, hier den fetch-Call wieder reaktivieren.
  const _EMPTY_STATS = Object.freeze({
    total_pending: 0, total_active: 0, total_hold: 0, total_rewarded: 0, items: []
  });
  function getStats() {
    return Promise.resolve(Object.assign({}, _EMPTY_STATS));
  }

  function getHistory() {
    return Promise.resolve({ items: [] });
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    generateCode,
    validateEmail,
    validateMessage,
    checkSelfReferral,
    canCreateMore,
    calculateExpiresAt,
    calculateRewardEligibleAt,
    statusLabel,
    deriveInitials,
    escapeHtml,
    create,
    getStats,
    getHistory,
    _const: { MAX_REFERRALS, HOLD_DAYS, EXPIRY_DAYS, MAX_MESSAGE_LENGTH, SAFE_CHARS }
  };
});
