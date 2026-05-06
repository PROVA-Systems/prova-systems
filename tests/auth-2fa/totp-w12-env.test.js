'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const totpSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'lib', 'totp-helper.js'), 'utf8');

test('totp-helper: ENV-Fallback-Chain (PROVA_TOTP_ENCRYPTION_KEY → TOTP_ENCRYPTION_KEY → TWO_FACTOR_ENCRYPTION_KEY)', () => {
  assert.match(totpSrc, /PROVA_TOTP_ENCRYPTION_KEY/);
  assert.match(totpSrc, /TOTP_ENCRYPTION_KEY/);
  assert.match(totpSrc, /TWO_FACTOR_ENCRYPTION_KEY/);
});

test('totp-helper: encrypt/decrypt Round-Trip mit TWO_FACTOR_ENCRYPTION_KEY (existing Marcel-ENV)', () => {
  delete process.env.PROVA_TOTP_ENCRYPTION_KEY;
  delete process.env.TOTP_ENCRYPTION_KEY;
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte hex
  // Cache invalidieren
  delete require.cache[require.resolve('../../netlify/functions/lib/totp-helper.js')];
  const TH = require('../../netlify/functions/lib/totp-helper');
  const enc = TH.encryptSecret('secret-value');
  const dec = TH.decryptSecret(enc);
  assert.strictEqual(dec, 'secret-value');
  delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
});

test('totp-helper: ohne ENV → Throw mit deutschem Hinweis', () => {
  delete process.env.PROVA_TOTP_ENCRYPTION_KEY;
  delete process.env.TOTP_ENCRYPTION_KEY;
  delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
  delete require.cache[require.resolve('../../netlify/functions/lib/totp-helper.js')];
  const TH = require('../../netlify/functions/lib/totp-helper');
  assert.throws(() => TH.encryptSecret('x'), /TOTP-Key/);
});

test('Migration: nur 3 fehlende Spalten (NICHT 5)', () => {
  const m = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '2026_05_11_w12_2fa_complete.sql'), 'utf8');
  assert.match(m, /totp_recovery_codes TEXT\[\]/);
  assert.match(m, /totp_last_used_at TIMESTAMPTZ/);
  assert.match(m, /totp_setup_started_at TIMESTAMPTZ/);
  // KEINE totp_secret oder totp_enabled (existieren bereits)
  const c = m.replace(/--.*$/gm, '').replace(/COMMENT ON[\s\S]*$/m, ''); // nur ALTER-Block
  assert.ok(!/totp_secret\s+TEXT/.test(c));
  assert.ok(!/totp_enabled\s+BOOLEAN/.test(c));
});
