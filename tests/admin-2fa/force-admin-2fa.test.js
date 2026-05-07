'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const adminLogin = fs.readFileSync(path.join(__dirname, '..', '..', 'admin-login.html'), 'utf8');
const setupHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'setup-2fa.html'), 'utf8');
const adminAuth = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'admin-auth.js'), 'utf8');

test('B2: admin-login.html prüft data.totp_enabled === false → Redirect', () => {
  assert.match(adminLogin, /totp_enabled === false/);
  assert.match(adminLogin, /setup-2fa\.html\?force=admin/);
});

test('B2: setup-2fa.html generiert otpauth-URL via auth-2fa-setup Lambda', () => {
  assert.match(setupHtml, /\/\.netlify\/functions\/auth-2fa-setup/);
  assert.match(setupHtml, /otpauth_url|qr_url/);
});

test('B2: setup-2fa.html generiert 8 Backup-Codes via crypto.getRandomValues', () => {
  assert.match(setupHtml, /generateBackupCodes/);
  assert.match(setupHtml, /for\s*\(let\s+i\s*=\s*0;\s*i\s*<\s*8/);
  assert.match(setupHtml, /crypto\.getRandomValues/);
});

test('B2: setup-2fa.html Backup-Codes in Hex-Format mit Bindestrichen', () => {
  // Pattern: XXXX-XXXX-XXXX-XXXX (16 Hex-Zeichen)
  assert.match(setupHtml, /slice\(0,\s*4\)[\s\S]*?slice\(4,\s*8\)/);
});

test('B2: setup-2fa.html TOTP-Verify via auth-2fa-verify Lambda', () => {
  assert.match(setupHtml, /\/\.netlify\/functions\/auth-2fa-verify/);
  assert.match(setupHtml, /code:\s*code/);
});

test('B2: setup-2fa.html Force-Param-Erkennung (?force=admin) zeigt Banner', () => {
  assert.match(setupHtml, /params\.get\(['"]force['"]\)\s*===?\s*['"]admin['"]/);
  assert.match(setupHtml, /id="force-banner"/);
});

test('B2: admin-auth.js prüft users.totp_enabled für Marcel-Email', () => {
  assert.match(adminAuth, /MEGA³¹ B2|MEGA31-B2|totp_enabled/);
  assert.match(adminAuth, /from\(['"]users['"]\).*select\(['"]totp_enabled['"]/);
});

test('B2: admin-auth.js Defensive-Pattern bei DB-Outage (totp_enabled defaults true)', () => {
  // Bei Fehler im DB-Lookup → totp_enabled bleibt true (kein Force-Lock)
  assert.match(adminAuth, /totp_enabled = true.*default|default = OK/);
  assert.match(adminAuth, /try\s*\{[\s\S]*?totp_enabled[\s\S]*?\}\s*catch/);
});

test('B2: setup-2fa.html Backup-Codes Confirm-Checkbox vor Verify', () => {
  assert.match(setupHtml, /id="cb-backup-saved"/);
  assert.match(setupHtml, /Ich habe die Backup-Codes sicher gespeichert/);
});

test('B2: setup-2fa.html Auth-Guard (Token + Email-Check)', () => {
  assert.match(setupHtml, /prova_auth_token/);
  assert.match(setupHtml, /window\.location\.replace.*\/login/);
});
