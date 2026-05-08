'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lib = require('../../lib/cookie-consent');
const libSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'cookie-consent.js'), 'utf8');
const settingsHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'cookie-einstellungen.html'), 'utf8');
const fetchAuth = fs.readFileSync(path.join(__dirname, '..', '..', 'prova-fetch-auth.js'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '18_add_cookie_consents.sql'), 'utf8');
const lambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'cookie-consent-log.js'), 'utf8');
const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-34-A1-COOKIE-DSGVO-SOURCES.md'), 'utf8');

test('A1: Lib API granular (acceptAll, acceptNecessary, saveCustom, revoke)', () => {
  ['acceptAll', 'acceptNecessary', 'saveCustom', 'revoke', 'getConsent', 'hasConsent', 'show']
    .forEach(fn => assert.strictEqual(typeof Lib[fn], 'function'));
});

test('A1: getConsent default = necessary:true, andere false (KEINE Pre-Selection)', () => {
  const c = Lib.getConsent();
  assert.strictEqual(c.necessary, true);
  assert.strictEqual(c.analytics, false);
  assert.strictEqual(c.marketing, false);
});

test('A1: 3 Buttons gleichberechtigt (alle/nur-notwendige/auswahl)', () => {
  assert.match(libSrc, /id="cc-accept-all"/);
  assert.match(libSrc, /id="cc-only-necessary"/);
  assert.match(libSrc, /id="cc-save-custom"/);
});

test('A1: Modal hat 3 Granular-Choices (necessary/analytics/marketing)', () => {
  assert.match(libSrc, /id="cc-necessary"/);
  assert.match(libSrc, /id="cc-analytics"/);
  assert.match(libSrc, /id="cc-marketing"/);
});

test('A1: necessary-Checkbox disabled (kann nicht abgewählt werden)', () => {
  assert.match(libSrc, /id="cc-necessary"[^>]*checked[^>]*disabled/);
});

test('A1: Cookie-Settings-Page hat Widerruf-Button', () => {
  assert.match(settingsHtml, /Einwilligung widerrufen/);
  assert.match(settingsHtml, /onclick="revoke\(\)"/);
});

test('A1: Settings-Page listet Cookies pro Kategorie', () => {
  assert.match(settingsHtml, /prova_auth_token/);
  assert.match(settingsHtml, /Plausible/);
  assert.match(settingsHtml, /Stripe/);
});

test('A1: 13-Monate-Re-Show (DSK-Empfehlung)', () => {
  assert.match(libSrc, /13 \* 30 \* 24 \* 60 \* 60 \* 1000|MAX_AGE_MS/);
});

test('A1: Auto-Init in prova-fetch-auth.js', () => {
  assert.match(fetchAuth, /MEGA³⁴ A1/);
  assert.match(fetchAuth, /\/lib\/cookie-consent\.js/);
});

test('A1: Schema-Migration 18 cookie_consents-Tabelle', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.cookie_consents/);
  assert.match(sql, /consent\s+JSONB NOT NULL/);
});

test('A1: Lambda cookie-consent-log mit Defensive-Pattern', () => {
  assert.match(lambda, /fail-silent|reason:.*supabase-not-configured/);
  assert.match(lambda, /from\(['"]cookie_consents['"]\)\.insert/);
});

test('A1: Audit-Doku ≥10 Quellen + PROVA-Cookie-Inventar', () => {
  for (let i = 1; i <= 10; i++) {
    assert.match(sources, new RegExp(`\\|\\s*${i}\\s*\\|`));
  }
  assert.match(sources, /TTDSG/);
  assert.match(sources, /Planet49/);
  assert.match(sources, /PROVA-Cookie-Inventar/);
});

test('A1: acceptAll setzt alle 3 auf true', () => {
  // Mock localStorage
  global.localStorage = {
    _data: {},
    setItem: function(k,v){this._data[k]=v;},
    getItem: function(k){return this._data[k]||null;},
    removeItem: function(k){delete this._data[k];}
  };
  delete require.cache[require.resolve('../../lib/cookie-consent')];
  const Lib2 = require('../../lib/cookie-consent');
  const result = Lib2.acceptAll();
  assert.strictEqual(result.necessary, true);
  assert.strictEqual(result.analytics, true);
  assert.strictEqual(result.marketing, true);
  delete global.localStorage;
});
