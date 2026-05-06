/**
 * PROVA — totp-helper.js (MEGA²⁹ W9-I1)
 *
 * TOTP-Implementation nach RFC 6238 + RFC 4226 ohne externe npm-Dep.
 * Nutzt Node's eingebautes crypto-Module (HMAC-SHA1) + Base32-Custom-Impl.
 *
 * Sicherheits-Begründung für eigene Impl statt otplib:
 * - 0 npm-Dependencies = 0 Supply-Chain-Risk (post-2024 lieferketten-Angriffe)
 * - RFC 6238 ist <100 Zeilen Standard-Implementierung
 * - AES-256-GCM-Encryption für DB-Storage via crypto-Built-In
 *
 * Public API:
 *   generateTotpSecret() → { secret, qr_url }
 *   verifyTotpCode(secret, code, opts?) → bool (Time-Skew-Tolerance ±1 Slot)
 *   generateRecoveryCodes(n=10) → Array<string> (XXXX-XXXX-Format)
 *   encryptSecret(plain, key) → string (AES-256-GCM, iv|tag|ciphertext base64)
 *   decryptSecret(encrypted, key) → string
 *
 * ENV: PROVA_TOTP_ENCRYPTION_KEY (32-Byte hex) defensive: || TOTP_ENCRYPTION_KEY
 */
'use strict';

const crypto = require('crypto');

// ── Base32-Encoding (RFC 4648, ohne npm-Dep) ───────────────────────────────
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str) {
  const cleaned = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of cleaned) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ── TOTP Core (RFC 6238) ───────────────────────────────────────────────────
function hotp(secretBuffer, counter) {
  // Counter als 8-Byte Big-Endian
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
  // Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(code).padStart(6, '0');
}

function totp(secretBase32, time, step) {
  step = step || 30;
  time = time || Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / step);
  return hotp(base32Decode(secretBase32), counter);
}

// ── Public-API ─────────────────────────────────────────────────────────────
function generateTotpSecret(opts) {
  opts = opts || {};
  const issuer = opts.issuer || 'PROVA';
  const account = opts.account || 'user@prova-systems.de';
  // 20 Bytes random = 160 Bit Secret (RFC 4226 minimum 128 Bit)
  const buf = crypto.randomBytes(20);
  const secret = base32Encode(buf);
  // otpauth-URL für QR-Code-Generation (Standard-Format)
  const qrUrl = 'otpauth://totp/' + encodeURIComponent(issuer) + ':' + encodeURIComponent(account) +
                '?secret=' + secret +
                '&issuer=' + encodeURIComponent(issuer) +
                '&algorithm=SHA1&digits=6&period=30';
  return { secret: secret, qr_url: qrUrl };
}

function verifyTotpCode(secret, code, opts) {
  opts = opts || {};
  const window = opts.window != null ? opts.window : 1; // ±1 Slot Tolerance (default 30s)
  const now = opts.time || Math.floor(Date.now() / 1000);
  const step = opts.step || 30;
  const cleanCode = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;
  for (let i = -window; i <= window; i++) {
    if (totp(secret, now + i * step, step) === cleanCode) return true;
  }
  return false;
}

function generateRecoveryCodes(n) {
  n = Number(n) || 10;
  const codes = [];
  for (let i = 0; i < n; i++) {
    // 4 Bytes random = 32 Bit, hex-encoded → 8 Zeichen, formatiert XXXX-XXXX
    const buf = crypto.randomBytes(4);
    const hex = buf.toString('hex').toUpperCase();
    codes.push(hex.slice(0, 4) + '-' + hex.slice(4, 8));
  }
  return codes;
}

// ── Encryption für DB-Storage (AES-256-GCM) ────────────────────────────────
function getEncryptionKey() {
  // MEGA²⁹ W9-I1: defensive PROVA-Prefix-Migration
  const keyHex = process.env.PROVA_TOTP_ENCRYPTION_KEY || process.env.TOTP_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    throw new Error('PROVA_TOTP_ENCRYPTION_KEY (Legacy: TOTP_ENCRYPTION_KEY) muss 32 Bytes (64 hex chars) sein');
  }
  return Buffer.from(keyHex, 'hex');
}

function encryptSecret(plain, keyBuffer) {
  const key = keyBuffer || getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12-Byte IV für GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) | tag(16) | ciphertext, alles base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSecret(encrypted, keyBuffer) {
  const key = keyBuffer || getEncryptionKey();
  const buf = Buffer.from(String(encrypted), 'base64');
  if (buf.length < 28) throw new Error('Encrypted data too short');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ciphertext = buf.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = {
  // Public API
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  encryptSecret,
  decryptSecret,
  // Internals (exportiert für Tests)
  base32Encode,
  base32Decode,
  hotp,
  totp,
  getEncryptionKey
};
