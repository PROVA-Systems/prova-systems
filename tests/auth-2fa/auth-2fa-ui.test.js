'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const uiSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'auth-2fa-ui.js'), 'utf8');
const loginSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'auth-2fa-login-step.js'), 'utf8');
const settings = fs.readFileSync(path.join(__dirname, '..', '..', 'einstellungen.html'), 'utf8');

function evalUi() {
  const win = { localStorage: { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, v) { this._[k] = v; }, removeItem(k) { delete this._[k]; } } };
  const doc = { readyState: 'complete', addEventListener: () => {}, querySelectorAll: () => [], head: { appendChild: () => {} }, getElementById: () => null, createElement: () => ({ id: '', textContent: '' }) };
  new Function('window', 'document', uiSrc)(win, doc);
  return win.ProvaAuth2FA;
}

function evalLoginStep() {
  const win = { localStorage: { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, v) { this._[k] = v; } } };
  const doc = { readyState: 'complete', body: null, addEventListener: () => {}, querySelectorAll: () => [], head: { appendChild: () => {} }, getElementById: () => null, createElement: () => ({ appendChild: () => {} }) };
  new Function('window', 'document', loginSrc)(win, doc);
  return win.ProvaAuth2FALoginStep;
}

test('UI: 2FA-Setup ruft auth-2fa-setup Lambda', () => {
  assert.match(uiSrc, /\/\.netlify\/functions\/auth-2fa-setup/);
});

test('UI: 2FA-Verify ruft auth-2fa-verify Lambda', () => {
  assert.match(uiSrc, /\/\.netlify\/functions\/auth-2fa-verify/);
});

test('UI: 2FA-Disable ruft auth-2fa-disable Lambda', () => {
  assert.match(uiSrc, /\/\.netlify\/functions\/auth-2fa-disable/);
});

test('UI: extractSecret parst otpauth-URL', () => {
  const api = evalUi();
  assert.strictEqual(api._internals.extractSecret('otpauth://totp/PROVA:test?secret=ABCDEFGHIJK&issuer=PROVA'), 'ABCDEFGHIJK');
});

test('UI: QR-Code via api.qrserver.com (kein NPM-Dep)', () => {
  const api = evalUi();
  const html = api._internals.qrImg('otpauth://test');
  assert.match(html, /api\.qrserver\.com/);
  assert.match(html, /<img/);
});

test('UI: Recovery-Code Copy + Download Funktionen exposed', () => {
  assert.match(uiSrc, /_copyRecovery/);
  assert.match(uiSrc, /_downloadRecovery/);
});

test('UI: HTML escapes < und >', () => {
  const api = evalUi();
  assert.strictEqual(api._internals.escHtml('<script>'), '&lt;script&gt;');
});

test('Login-Step: Recovery-Mode-Toggle vorhanden', () => {
  assert.match(loginSrc, /recoveryMode/);
  assert.match(loginSrc, /Recovery-Code verwenden/);
});

test('Login-Step: Format-Validation 6 Ziffern OR XXXX-XXXX', () => {
  assert.match(loginSrc, /\\d\{6\}/);
  assert.match(loginSrc, /\[A-F0-9\]\{4\}/);
});

test('Login-Step: Auto-Submit bei 6 Ziffern', () => {
  assert.match(loginSrc, /Auto-Submit bei 6 Ziffern|\^\\d\{6\}\$/);
});

test('Login-Step: API-Calls verify mit code OR recovery_code', () => {
  assert.match(loginSrc, /code: raw/);
  assert.match(loginSrc, /recovery_code:/);
});

test('Login-Step: localStorage prova_totp_required Flag', () => {
  assert.match(loginSrc, /prova_totp_required/);
});

test('Login-Step: isRequired() Public API', () => {
  const api = evalLoginStep();
  assert.strictEqual(typeof api.isRequired, 'function');
  assert.strictEqual(typeof api.show, 'function');
  assert.strictEqual(typeof api.hide, 'function');
});

test('einstellungen.html: 2FA-Sektion eingebunden', () => {
  assert.match(settings, /data-auth-2fa-settings/);
  assert.match(settings, /auth-2fa-ui\.js/);
});
