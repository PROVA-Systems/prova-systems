/**
 * PROVA — lib/auth-validate.js
 * S-SICHER P4A.7 (25.04.2026)
 *
 * Server-seitige Helpers für Auth-/User-Input-Validation und
 * HTML-Escape (für Server-Templates, die User-Content rendern).
 *
 * API
 *   isValidEmail(str)    -> boolean
 *   normalizeEmail(str)  -> string (lowercase + trim) oder ''
 *   escapeHtml(str)      -> string mit HTML-Entities
 *   isStrongPassword(s)  -> boolean (min 8 Zeichen — Pflicht-Check
 *                           bleibt bei Netlify Identity, hier nur Vorab)
 */

'use strict';

const MAX_EMAIL_LEN = 254;     // RFC 5321 Section 4.5.3.1.3
const MAX_LOCAL_LEN = 64;      // RFC 5321 Section 4.5.3.1.1
const EMAIL_RE      = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const ESC_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function normalizeEmail(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase();
}

function isValidEmail(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.length > MAX_EMAIL_LEN) return false;
  if (!EMAIL_RE.test(str)) return false;
  const at = str.indexOf('@');
  if (at < 1 || at > MAX_LOCAL_LEN) return false;
  return true;
}

function escapeHtml(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, function (ch) { return ESC_MAP[ch]; });
}

function isStrongPassword(s) {
  return typeof s === 'string' && s.length >= 8 && s.length <= 256;
}

module.exports = {
  isValidEmail:    isValidEmail,
  normalizeEmail:  normalizeEmail,
  escapeHtml:      escapeHtml,
  isStrongPassword: isStrongPassword,
  MAX_EMAIL_LEN:   MAX_EMAIL_LEN
};
