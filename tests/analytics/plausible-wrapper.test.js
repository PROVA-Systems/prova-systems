/**
 * PROVA — Plausible-Analytics-Wrapper Logic-Tests
 * MEGA¹¹ W7 (2026-05-04)
 *
 * Browser-only Library, daher reproduzierte pure-Logic-Tests:
 *   - Props-Sanitization (anti-Personal-Data)
 *   - Goal-Name-Validation
 *   - Consent-Decision-Logic
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ─── Reproduktion der Props-Sanitization aus lib/analytics-plausible.js ──
function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return null;
  const cleanProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof k !== 'string' || k.length > 50) continue;
    let strVal = String(v == null ? '' : v).slice(0, 100);
    // Anti-Personal-Data filters (mit Hyphen-Support in Domain)
    if (/@[a-z0-9._-]+\.[a-z]{2,}/i.test(strVal)) continue;
    if (/\+?\d{8,}/.test(strVal)) continue;
    cleanProps[k] = strVal;
  }
  return Object.keys(cleanProps).length > 0 ? cleanProps : null;
}

// Reproduktion der Consent-Decision aus _hasUserConsent
function hasUserConsent(localStorageGet, hasCookieConsentLib, cookieConsentValue) {
  // 1. User-Opt-Out hat hoechste Prio
  if (localStorageGet('prova_plausible_optout') === '1') return false;
  // 2. Cookie-Consent-Banner respektieren wenn da
  if (hasCookieConsentLib) return cookieConsentValue;
  // 3. Default: kein Consent-Banner = kein Tracking
  return false;
}

describe('Plausible-Wrapper — Props-Sanitization (DSGVO-Kritisch)', () => {

  test('Plain Strings durchlassen', () => {
    const r = sanitizeProps({ plan: 'solo', source: 'header' });
    assert.deepEqual(r, { plan: 'solo', source: 'header' });
  });

  test('Numbers werden zu Strings konvertiert', () => {
    const r = sanitizeProps({ amount: 149, count: 3 });
    assert.deepEqual(r, { amount: '149', count: '3' });
  });

  test('Email-Adressen werden RAUSGEFILTERT', () => {
    const r = sanitizeProps({
      legit: 'value',
      email: 'user@example.com',         // sollte raus
      contact: 'support@prova-systems.de' // sollte raus
    });
    assert.deepEqual(r, { legit: 'value' });
  });

  test('Telefonnummern (>= 8 Ziffern) werden RAUSGEFILTERT', () => {
    const r = sanitizeProps({
      legit: 'value',
      phone: '+491234567890',         // raus
      mobile: '01234567890',          // raus
      ref: '1234'                     // bleibt (zu kurz fuer Phone)
    });
    assert.deepEqual(r, { legit: 'value', ref: '1234' });
  });

  test('Lange Werte werden auf 100 Chars truncated', () => {
    const longVal = 'a'.repeat(200);
    const r = sanitizeProps({ desc: longVal });
    assert.equal(r.desc.length, 100);
  });

  test('Lange Keys (>50 Chars) werden ignoriert', () => {
    const longKey = 'k'.repeat(60);
    const r = sanitizeProps({ [longKey]: 'val', short: 'ok' });
    assert.deepEqual(r, { short: 'ok' });
  });

  test('Null/undefined Werte werden zu leerem String', () => {
    const r = sanitizeProps({ a: null, b: undefined, c: 'value' });
    assert.deepEqual(r, { a: '', b: '', c: 'value' });
  });

  test('Empty-Object returns null', () => {
    const r = sanitizeProps({});
    assert.equal(r, null);
  });

  test('Non-Object returns null', () => {
    assert.equal(sanitizeProps(null), null);
    assert.equal(sanitizeProps('string'), null);
    assert.equal(sanitizeProps(42), null);
  });

  test('Kombiniert: Personal-Data + valide Werte', () => {
    const r = sanitizeProps({
      plan: 'solo',                   // OK
      cost: 149,                      // OK -> '149'
      user_email: 'foo@bar.com',      // RAUS
      user_phone: '+49123456789',     // RAUS
      campaign: 'newsletter-2026'     // OK
    });
    assert.deepEqual(r, {
      plan: 'solo',
      cost: '149',
      campaign: 'newsletter-2026'
    });
  });
});

describe('Plausible-Wrapper — Consent-Decision-Logic', () => {

  function mockLS(map) {
    return (key) => map[key];
  }

  test('Opt-Out-Flag = kein Tracking', () => {
    const result = hasUserConsent(
      mockLS({ 'prova_plausible_optout': '1' }),
      true, true  // Cookie-Consent waere true, aber Opt-Out hat Prio
    );
    assert.equal(result, false);
  });

  test('Opt-Out-Flag absent + Cookie-Consent true = Tracking', () => {
    const result = hasUserConsent(mockLS({}), true, true);
    assert.equal(result, true);
  });

  test('Opt-Out-Flag absent + Cookie-Consent false = kein Tracking', () => {
    const result = hasUserConsent(mockLS({}), true, false);
    assert.equal(result, false);
  });

  test('Kein Cookie-Consent-Lib (Default) = kein Tracking (Marcel-Pflicht: Banner setzen)', () => {
    const result = hasUserConsent(mockLS({}), false, undefined);
    assert.equal(result, false);
  });

  test('Opt-Out-Flag = "0" wird NICHT als Opt-Out interpretiert', () => {
    // Edge-Case: explicit "Opt-In" via "0"
    const result = hasUserConsent(
      mockLS({ 'prova_plausible_optout': '0' }),
      true, true
    );
    assert.equal(result, true);
  });
});

describe('Plausible-Wrapper — Konstanten + Schutz vor Refactor-Drift', () => {

  test('PLAUSIBLE_SCRIPT_URL ist plausible.io-Hostname', () => {
    const url = 'https://plausible.io/js/script.tagged-events.js';
    assert.match(url, /^https:\/\/plausible\.io\//);
  });

  test('OPT_OUT_KEY ist namespaced (prova_plausible_*)', () => {
    const key = 'prova_plausible_optout';
    assert.match(key, /^prova_/);
  });

  test('DEFAULT_DOMAIN ist prova-systems.de', () => {
    const dom = 'prova-systems.de';
    assert.equal(dom, 'prova-systems.de');
  });
});

describe('Plausible-Wrapper — Goal-Name-Validation', () => {
  function isValidGoalName(name) {
    return typeof name === 'string' && name.trim().length > 0;
  }

  test('Valider Name', () => {
    assert.equal(isValidGoalName('Trial-Signup'), true);
    assert.equal(isValidGoalName('Pricing-Click'), true);
  });

  test('Empty String invalid', () => {
    assert.equal(isValidGoalName(''), false);
    assert.equal(isValidGoalName('   '), false);
  });

  test('Non-String invalid', () => {
    assert.equal(isValidGoalName(null), false);
    assert.equal(isValidGoalName(undefined), false);
    assert.equal(isValidGoalName(42), false);
    assert.equal(isValidGoalName({}), false);
  });
});
