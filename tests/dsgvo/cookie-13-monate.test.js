'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const cookieConsentSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'cookie-consent.js'), 'utf8');

test('Cookie-Consent: 13-Monate Konstante existiert (DSK-Empfehlung 2025)', () => {
  assert.match(cookieConsentSrc, /CONSENT_MAX_AGE_MS\s*=\s*13/);
});

test('Cookie-Consent: hasConsent prüft Timestamp gegen Max-Age', () => {
  assert.match(cookieConsentSrc, /age\s*>\s*CONSENT_MAX_AGE_MS/);
});

test('Cookie-Consent: bei abgelaufenem Consent wird Storage gecleared', () => {
  // hasConsent muss localStorage.removeItem(CONSENT_KEY) aufrufen wenn abgelaufen
  const cleanupBlock = cookieConsentSrc.match(/age\s*>\s*CONSENT_MAX_AGE_MS[\s\S]{0,300}?localStorage\.removeItem\(CONSENT_KEY\)/);
  assert.ok(cleanupBlock, 'Cleanup-Block fehlt nach Max-Age-Überschreitung');
});

test('Cookie-Consent: Browser-Stub-Test (Consent älter als 14 Monate → false)', () => {
  // Mini-Stub: Wir laden lib/cookie-consent in einen sandbox-context
  const win = {};
  const localStorageStore = {};
  const localStorageStub = {
    getItem: (k) => localStorageStore[k] || null,
    setItem: (k, v) => { localStorageStore[k] = String(v); },
    removeItem: (k) => { delete localStorageStore[k]; }
  };
  // Setze Consent von vor 14 Monaten
  const fourteenMonthsAgo = new Date(Date.now() - 14 * 30 * 24 * 60 * 60 * 1000);
  localStorageStore['prova_consent_v1'] = '1';
  localStorageStore['prova_consent_v1_ts'] = fourteenMonthsAgo.toISOString();

  // Ausführen via Function-Wrapper
  win.location = { pathname: '/never-public' };
  const fn = new Function('window', 'localStorage', 'document', cookieConsentSrc + '; return window.ProvaCookieConsent;');
  const docStub = { readyState: 'complete', addEventListener: () => {}, body: null, getElementById: () => null, createElement: () => ({ setAttribute: () => {}, style: {}, innerHTML: '' }) };
  const api = fn(win, localStorageStub, docStub);

  assert.strictEqual(api.hasConsent(), false, 'Abgelaufener Consent muss false liefern');
  // Cleanup: Storage muss leer sein
  assert.strictEqual(localStorageStore['prova_consent_v1'], undefined);
  assert.strictEqual(localStorageStore['prova_consent_v1_ts'], undefined);
});

test('Cookie-Consent: Browser-Stub-Test (Consent vor 6 Monaten → true)', () => {
  const win = {};
  const localStorageStore = {};
  const localStorageStub = {
    getItem: (k) => localStorageStore[k] || null,
    setItem: (k, v) => { localStorageStore[k] = String(v); },
    removeItem: (k) => { delete localStorageStore[k]; }
  };
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  localStorageStore['prova_consent_v1'] = '1';
  localStorageStore['prova_consent_v1_ts'] = sixMonthsAgo.toISOString();

  win.location = { pathname: '/never-public' };
  const fn = new Function('window', 'localStorage', 'document', cookieConsentSrc + '; return window.ProvaCookieConsent;');
  const docStub = { readyState: 'complete', addEventListener: () => {}, body: null, getElementById: () => null, createElement: () => ({ setAttribute: () => {}, style: {}, innerHTML: '' }) };
  const api = fn(win, localStorageStub, docStub);

  assert.strictEqual(api.hasConsent(), true, 'Frischer Consent muss true liefern');
});
