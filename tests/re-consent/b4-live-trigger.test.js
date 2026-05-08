'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const proveAuthSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'prova-fetch-auth.js'), 'utf8');
const libSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 're-consent-modal.js'), 'utf8');
const pendingLambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 're-consent-pending.js'), 'utf8');
const submitLambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 're-consent-submit.js'), 'utf8');

test('B4-1: prova-fetch-auth.js Auto-Lazy-Load Hook MEGA33-B4 vorhanden', () => {
  assert.match(proveAuthSrc, /MEGA³³ B4/);
  assert.match(proveAuthSrc, /\/lib\/re-consent-modal\.js/);
  assert.match(proveAuthSrc, /data-mega33-b4/);
});

test('B4-2: Auto-Lazy-Load nur bei eingeloggtem User (token-check)', () => {
  assert.match(proveAuthSrc, /localStorage\.getItem\('prova_auth_token'\)/);
});

test('B4-3: Auto-Lazy-Load skip-Liste für Public-Pages', () => {
  ['/login.html', '/index.html', '/pricing.html', '/datenschutz.html', '/impressum.html', '/agb.html', '/avv.html', '/demo.html']
    .forEach(p => assert.match(proveAuthSrc, new RegExp(p.replace(/[/.]/g, '\\$&'))));
});

test('B4-4: Lib re-consent-modal.js exposed ProvaReConsent.checkAndShow', () => {
  assert.match(libSrc, /window\.ProvaReConsent = \{ checkAndShow, isPending/);
  assert.match(libSrc, /async function checkAndShow/);
});

test('B4-5: Lib hat eigenen DOMContentLoaded-Auto-Init (Defense-in-depth)', () => {
  assert.match(libSrc, /DOMContentLoaded/);
  assert.match(libSrc, /setTimeout\(checkAndShow, 1500\)/);
});

test('B4-6: Lambda re-consent-pending nutzt v_user_pending_einwilligungen', () => {
  assert.match(pendingLambda, /v_user_pending_einwilligungen/);
});

test('B4-7: Lambda re-consent-submit verwendet record_einwilligung', () => {
  assert.match(submitLambda, /record_einwilligung|einwilligungen/);
});

test('B4-8: Submit-Lambda hat audit_trail-Insert', () => {
  // Audit-Trail bei Submit (entweder direkt oder via DB-Function)
  assert.ok(
    /audit_trail|einwilligung_logged|aktuelle_version_id/i.test(submitLambda),
    'Submit-Lambda sollte Einwilligung loggen (audit_trail oder einwilligungen.aktuelle_version_id)'
  );
});
