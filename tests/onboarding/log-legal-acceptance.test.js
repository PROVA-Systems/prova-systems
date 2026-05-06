/**
 * PROVA — log-legal-acceptance.js Tests (MEGA²⁰ W84)
 *
 * Coverage: VALID_TYPES, PFLICHT_TYPES, IP/UA-Extraction, Source-Patterns.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'log-legal-acceptance.js'), 'utf8');
const Lambda = require(path.join(ROOT, 'netlify', 'functions', 'log-legal-acceptance.js'));

describe('log-legal-acceptance — VALID_TYPES + PFLICHT_TYPES', () => {
  test('VALID_TYPES enthaelt alle einwilligung_typ ENUM-Werte aus Migration 04', () => {
    const valid = Lambda._test.VALID_TYPES;
    ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung',
     'newsletter', 'cookies_marketing', 'cookies_analytics', 'ki_einsatz'
    ].forEach(t => assert.ok(valid.indexOf(t) !== -1, 'missing valid type: ' + t));
  });

  test('PFLICHT_TYPES = [agb, datenschutzerklaerung, avv_auftragsverarbeitung]', () => {
    assert.deepEqual(Lambda._test.PFLICHT_TYPES,
      ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung']);
  });
});

describe('log-legal-acceptance — _extractIp', () => {
  test('Bevorzugt x-nf-client-connection-ip', () => {
    const event = { headers: { 'x-nf-client-connection-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' } };
    assert.equal(Lambda._test._extractIp(event), '1.2.3.4');
  });

  test('Fallback x-forwarded-for (1. IP)', () => {
    const event = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
    assert.equal(Lambda._test._extractIp(event), '1.2.3.4');
  });

  test('null wenn keine Header', () => {
    assert.equal(Lambda._test._extractIp({}), null);
    assert.equal(Lambda._test._extractIp({ headers: {} }), null);
  });
});

describe('log-legal-acceptance — _extractUserAgent + _extractPageUrl', () => {
  test('user-agent header', () => {
    assert.equal(Lambda._test._extractUserAgent({ headers: { 'user-agent': 'Mozilla/5.0' } }), 'Mozilla/5.0');
  });

  test('referer/referrer Fallback', () => {
    assert.equal(Lambda._test._extractPageUrl({ headers: { 'referer': 'https://x.de/login' } }), 'https://x.de/login');
    assert.equal(Lambda._test._extractPageUrl({ headers: { 'referrer': 'https://y.de' } }), 'https://y.de');
  });
});

describe('log-legal-acceptance — Source-Patterns', () => {
  test('POST-only Method-Allowed', () => {
    assert.match(SRC, /event\.httpMethod !== ['"]POST['"]/);
    assert.match(SRC, /allowed:\s*\[['"]POST['"]\]/);
  });

  test('Validation: types[] non-empty', () => {
    assert.match(SRC, /types\.length === 0/);
    assert.match(SRC, /types\[\] required/);
  });

  test('Validation: type muss in VALID_TYPES', () => {
    assert.match(SRC, /VALID_TYPES\.indexOf\(t\) === -1/);
  });

  test('Aktuelles rechtsdokument via aktuell=TRUE', () => {
    assert.match(SRC, /\.from\(['"]rechtsdokumente['"]\)/);
    assert.match(SRC, /\.eq\(['"]aktuell['"],\s*true\)/);
  });

  test('record_einwilligung RPC mit allen 9 Parametern', () => {
    assert.match(SRC, /record_einwilligung/);
    ['p_typ', 'p_rechtsdokument_id', 'p_version', 'p_inhalt_hash',
     'p_ip_address', 'p_user_agent', 'p_session_id',
     'p_onboarding_schritt', 'p_page_url'
    ].forEach(p => assert.match(SRC, new RegExp(p + ':')));
  });

  test('Newsletter-Branch ohne rechtsdokument (NULL doc_id)', () => {
    assert.match(SRC, /typ === ['"]newsletter['"]/);
    assert.match(SRC, /p_rechtsdokument_id: null/);
  });

  test('Force-Later Hint im Response', () => {
    assert.match(SRC, /force_later/);
  });

  test('Audit-Log fire-and-forget', () => {
    assert.match(SRC, /audit_trail/);
    assert.match(SRC, /einwilligung\.recorded/);
  });

  test('500 wenn alle Pflicht-Types failed', () => {
    assert.match(SRC, /Alle Pflicht-Einwilligungen fehlgeschlagen/);
    assert.match(SRC, /statusCode:\s*500/);
  });
});

describe('log-legal-acceptance — Migration-Pending-Detection', () => {
  test('does not exist → MIGRATION_PENDING-Code', () => {
    assert.match(SRC, /MIGRATION_PENDING/);
    assert.match(SRC, /does not exist/i);
  });
});
