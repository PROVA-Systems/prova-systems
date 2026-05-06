/**
 * Tests für lib/totp-helper.js (MEGA²⁹ V3.2-W9-I1)
 *
 * Verifiziert:
 * - Base32-Encoding/Decoding (RFC 4648)
 * - HOTP/TOTP-Compatibility (RFC 6238 Test-Vektoren)
 * - generateTotpSecret + QR-URL-Format
 * - verifyTotpCode mit Time-Skew-Tolerance
 * - generateRecoveryCodes Format
 * - encryptSecret/decryptSecret Roundtrip (AES-256-GCM)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Totp = require(path.join(ROOT, 'netlify/functions/lib/totp-helper.js'));

// 32-Byte Key (64 hex chars) für Tests
const TEST_KEY = 'a'.repeat(64);
const TEST_KEY_BUF = Buffer.from(TEST_KEY, 'hex');

describe('Base32-Encoding/Decoding (RFC 4648)', () => {
  test('encode + decode roundtrip', () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const encoded = Totp.base32Encode(buf);
    const decoded = Totp.base32Decode(encoded);
    assert.deepStrictEqual(decoded, buf);
  });

  test('decode ignoriert Whitespace + Lowercase', () => {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const encoded = Totp.base32Encode(buf);
    const decoded = Totp.base32Decode(encoded.toLowerCase().split('').join(' '));
    assert.deepStrictEqual(decoded, buf);
  });
});

describe('TOTP RFC 6238 Test-Vektoren (HMAC-SHA1)', () => {
  // RFC 6238 Appendix B Test-Vektoren (SHA1-Mode)
  // Secret: '12345678901234567890' (ASCII) → Base32
  const SECRET_ASCII = '12345678901234567890';
  const SECRET_B32 = Totp.base32Encode(Buffer.from(SECRET_ASCII, 'ascii'));

  test('T=59 (1970-01-01 00:00:59) → 94287082', () => {
    assert.strictEqual(Totp.totp(SECRET_B32, 59, 30), '287082'); // 6-digit subset
  });

  test('T=1111111109 → 7081804 (6-digit: 081804)', () => {
    assert.strictEqual(Totp.totp(SECRET_B32, 1111111109, 30), '081804');
  });

  test('T=2000000000 → 69279037 (6-digit: 279037)', () => {
    assert.strictEqual(Totp.totp(SECRET_B32, 2000000000, 30), '279037');
  });
});

describe('generateTotpSecret', () => {
  test('returns secret (Base32) + qr_url', () => {
    const result = Totp.generateTotpSecret({ issuer: 'PROVA', account: 'test@x.de' });
    assert.match(result.secret, /^[A-Z2-7]+$/);
    assert.ok(result.secret.length >= 32);
    assert.match(result.qr_url, /^otpauth:\/\/totp\//);
    assert.match(result.qr_url, /issuer=PROVA/);
    assert.match(result.qr_url, /algorithm=SHA1/);
    assert.match(result.qr_url, /digits=6/);
    assert.match(result.qr_url, /period=30/);
  });

  test('default issuer + account fallback', () => {
    const result = Totp.generateTotpSecret();
    assert.match(result.qr_url, /PROVA/);
  });
});

describe('verifyTotpCode', () => {
  const secret = Totp.generateTotpSecret().secret;

  test('aktueller Code passt', () => {
    const now = Math.floor(Date.now() / 1000);
    const code = Totp.totp(secret, now, 30);
    assert.strictEqual(Totp.verifyTotpCode(secret, code), true);
  });

  test('Code +30s in Zukunft passt (Time-Skew ±1 Slot)', () => {
    const now = Math.floor(Date.now() / 1000);
    const futureCode = Totp.totp(secret, now + 30, 30);
    assert.strictEqual(Totp.verifyTotpCode(secret, futureCode), true);
  });

  test('Code -30s in Vergangenheit passt', () => {
    const now = Math.floor(Date.now() / 1000);
    const pastCode = Totp.totp(secret, now - 30, 30);
    assert.strictEqual(Totp.verifyTotpCode(secret, pastCode), true);
  });

  test('Code +120s in Zukunft passt NICHT (out of tolerance)', () => {
    const now = Math.floor(Date.now() / 1000);
    const wayFutureCode = Totp.totp(secret, now + 120, 30);
    assert.strictEqual(Totp.verifyTotpCode(secret, wayFutureCode), false);
  });

  test('Code mit Whitespace gestrippt', () => {
    const now = Math.floor(Date.now() / 1000);
    const code = Totp.totp(secret, now, 30);
    const codeWithSpaces = code.slice(0, 3) + ' ' + code.slice(3);
    assert.strictEqual(Totp.verifyTotpCode(secret, codeWithSpaces), true);
  });

  test('Nicht-numerischer Code wird abgelehnt', () => {
    assert.strictEqual(Totp.verifyTotpCode(secret, 'ABC123'), false);
  });

  test('5-stelliger Code wird abgelehnt', () => {
    assert.strictEqual(Totp.verifyTotpCode(secret, '12345'), false);
  });
});

describe('generateRecoveryCodes', () => {
  test('default 10 Codes', () => {
    const codes = Totp.generateRecoveryCodes();
    assert.strictEqual(codes.length, 10);
  });

  test('explizit 5 Codes', () => {
    const codes = Totp.generateRecoveryCodes(5);
    assert.strictEqual(codes.length, 5);
  });

  test('Format XXXX-XXXX (8 hex chars + 1 separator)', () => {
    const codes = Totp.generateRecoveryCodes(3);
    codes.forEach(c => {
      assert.match(c, /^[0-9A-F]{4}-[0-9A-F]{4}$/);
    });
  });

  test('Codes sind unique (Random-Quality)', () => {
    const codes = Totp.generateRecoveryCodes(20);
    const set = new Set(codes);
    assert.strictEqual(set.size, 20);
  });
});

describe('encryptSecret + decryptSecret (AES-256-GCM)', () => {
  test('Roundtrip: encrypt → decrypt = original', () => {
    const plain = 'JBSWY3DPEHPK3PXPMYTOPYS3LFE2L4QM';
    const encrypted = Totp.encryptSecret(plain, TEST_KEY_BUF);
    const decrypted = Totp.decryptSecret(encrypted, TEST_KEY_BUF);
    assert.strictEqual(decrypted, plain);
  });

  test('Verschiedene IVs bei zwei Encrypts (kein Determinismus)', () => {
    const plain = 'TEST';
    const e1 = Totp.encryptSecret(plain, TEST_KEY_BUF);
    const e2 = Totp.encryptSecret(plain, TEST_KEY_BUF);
    assert.notStrictEqual(e1, e2); // IV macht Output unterschiedlich
  });

  test('Decrypt mit falschem Key wirft Auth-Tag-Error', () => {
    const plain = 'TEST';
    const wrongKey = Buffer.from('b'.repeat(64), 'hex');
    const encrypted = Totp.encryptSecret(plain, TEST_KEY_BUF);
    assert.throws(() => Totp.decryptSecret(encrypted, wrongKey));
  });

  test('Decrypt mit beschädigtem Ciphertext wirft', () => {
    const plain = 'TEST';
    const encrypted = Totp.encryptSecret(plain, TEST_KEY_BUF);
    const corrupted = encrypted.slice(0, -4) + 'XXXX';
    assert.throws(() => Totp.decryptSecret(corrupted, TEST_KEY_BUF));
  });

  test('Recovery-Code-Roundtrip (8 Codes)', () => {
    const codes = Totp.generateRecoveryCodes(8);
    const encrypted = codes.map(c => Totp.encryptSecret(c, TEST_KEY_BUF));
    const decrypted = encrypted.map(e => Totp.decryptSecret(e, TEST_KEY_BUF));
    assert.deepStrictEqual(decrypted, codes);
  });
});

describe('getEncryptionKey ENV-Migration (W6P2-I5 Pattern)', () => {
  test('PROVA_TOTP_ENCRYPTION_KEY hat Vorrang', () => {
    process.env.PROVA_TOTP_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.TOTP_ENCRYPTION_KEY = 'b'.repeat(64);
    const key = Totp.getEncryptionKey();
    assert.deepStrictEqual(key, Buffer.from('a'.repeat(64), 'hex'));
    delete process.env.PROVA_TOTP_ENCRYPTION_KEY;
    delete process.env.TOTP_ENCRYPTION_KEY;
  });

  test('Fallback auf TOTP_ENCRYPTION_KEY wenn PROVA_-Variant fehlt', () => {
    delete process.env.PROVA_TOTP_ENCRYPTION_KEY;
    process.env.TOTP_ENCRYPTION_KEY = 'c'.repeat(64);
    const key = Totp.getEncryptionKey();
    assert.deepStrictEqual(key, Buffer.from('c'.repeat(64), 'hex'));
    delete process.env.TOTP_ENCRYPTION_KEY;
  });

  test('Wirft wenn keine ENV gesetzt', () => {
    delete process.env.PROVA_TOTP_ENCRYPTION_KEY;
    delete process.env.TOTP_ENCRYPTION_KEY;
    assert.throws(() => Totp.getEncryptionKey(), /PROVA_TOTP_ENCRYPTION_KEY/);
  });
});

describe('Endpoint-Files vorhanden + Audit-Marker', () => {
  const fs = require('node:fs');

  test('auth-2fa-setup.js existiert + W9-I1 Marker', () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/auth-2fa-setup.js'), 'utf8');
    assert.match(src, /MEGA.{1,3} W9-I1/);
    assert.match(src, /requireAuth/);
    assert.match(src, /withSentry/);
    assert.match(src, /functionName:\s*['"]auth-2fa-setup['"]/);
    assert.match(src, /RateLimit\.check/);
    assert.match(src, /TotpHelper\.generateTotpSecret/);
    assert.match(src, /TotpHelper\.encryptSecret/);
  });

  test('auth-2fa-verify.js existiert + Anti-Replay', () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/auth-2fa-verify.js'), 'utf8');
    assert.match(src, /MEGA.{1,3} W9-I1/);
    assert.match(src, /Anti-Replay|bereits verwendet/i);
    assert.match(src, /TotpHelper\.verifyTotpCode/);
  });

  test('auth-2fa-disable.js existiert + Daten-Löschung', () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/auth-2fa-disable.js'), 'utf8');
    assert.match(src, /MEGA.{1,3} W9-I1/);
    assert.match(src, /totp_enabled:\s*false/);
    assert.match(src, /totp_secret:\s*null/);
    assert.match(src, /totp_recovery_codes:\s*null/);
  });
});
