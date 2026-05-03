/**
 * PROVA — Zod-Schema-Tests
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * Pro Schema mindestens 3 Cases: valid, invalid, edge.
 *
 * USAGE: node --test tests/schemas/schemas.test.js
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { parseStripeCheckout, PLAN_VALUES } = require('../../lib/schemas/stripe-checkout');
const { parseDsgvoLoeschen }                = require('../../lib/schemas/dsgvo-loeschen');
const { parseAkteExport }                   = require('../../lib/schemas/akte-export');
const { parseSmtpSenden, MAX_BODY_LEN }     = require('../../lib/schemas/smtp-senden');
const { parseTeamInterest }                 = require('../../lib/schemas/team-interest');
const { safeParse, emailStrict }            = require('../../lib/schemas/_common');

// ── stripe-checkout ─────────────────────────────────────────────────────────

describe('stripe-checkout schema', () => {
  test('valid: solo plan default', () => {
    const r = parseStripeCheckout({});
    assert.equal(r.ok, true);
    assert.equal(r.data.plan, 'solo');
  });

  test('valid: pilot_program with solo', () => {
    const r = parseStripeCheckout({ plan: 'solo', pilot_program: true });
    assert.equal(r.ok, true);
    assert.equal(r.data.pilot_program, true);
  });

  test('invalid: unknown plan', () => {
    const r = parseStripeCheckout({ plan: 'enterprise' });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /plan/);
  });

  test('invalid: pilot_program with team', () => {
    const r = parseStripeCheckout({ plan: 'team', pilot_program: true });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /Solo/);
  });

  test('invalid: extra unknown field rejected (strict)', () => {
    const r = parseStripeCheckout({ plan: 'solo', injected_price: 'price_evil' });
    assert.equal(r.ok, false);
  });

  test('edge: invalid URL', () => {
    const r = parseStripeCheckout({ plan: 'solo', successUrl: 'javascript:alert(1)' });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /URL/);
  });

  test('edge: addon-10 valid', () => {
    const r = parseStripeCheckout({ plan: 'addon-10' });
    assert.equal(r.ok, true);
    assert.equal(r.data.plan, 'addon-10');
  });

  test('PLAN_VALUES constant exposed', () => {
    assert.ok(PLAN_VALUES.includes('solo'));
    assert.ok(PLAN_VALUES.includes('team'));
  });
});

// ── dsgvo-loeschen ──────────────────────────────────────────────────────────

describe('dsgvo-loeschen schema', () => {
  test('valid: confirm true + reason', () => {
    const r = parseDsgvoLoeschen({ confirm: true, reason: 'Account-Schliessung' });
    assert.equal(r.ok, true);
  });

  test('invalid: confirm false', () => {
    const r = parseDsgvoLoeschen({ confirm: false });
    assert.equal(r.ok, false);
  });

  test('invalid: confirm missing', () => {
    const r = parseDsgvoLoeschen({ reason: 'Test' });
    assert.equal(r.ok, false);
  });

  test('edge: reason zu lang (>500)', () => {
    const r = parseDsgvoLoeschen({ confirm: true, reason: 'x'.repeat(501) });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /zu lang/);
  });

  test('edge: extra Field rejected (strict)', () => {
    const r = parseDsgvoLoeschen({ confirm: true, extra: 'x' });
    assert.equal(r.ok, false);
  });
});

// ── akte-export ─────────────────────────────────────────────────────────────

describe('akte-export schema', () => {
  test('valid: minimal az + sv_email', () => {
    const r = parseAkteExport({ az: 'SCH-2026-001', sv_email: 'sv@example.de' });
    assert.equal(r.ok, true);
  });

  test('invalid: missing sv_email', () => {
    const r = parseAkteExport({ az: 'SCH-2026-001' });
    assert.equal(r.ok, false);
  });

  test('invalid: az mit ungueltigen Zeichen', () => {
    const r = parseAkteExport({ az: 'SCH<script>', sv_email: 'sv@example.de' });
    assert.equal(r.ok, false);
  });

  test('edge: gutachten + briefe Arrays mit Records', () => {
    const r = parseAkteExport({
      az: 'SCH-2026-001',
      sv_email: 'sv@example.de',
      fall: { Auftraggeber_Name: 'Mustermann' },
      gutachten: [{ fields: { Version: '1.0' } }],
      briefe: [{ fields: { brief_typ: 'OT-Einladung' } }]
    });
    assert.equal(r.ok, true);
  });

  test('edge: zu viele gutachten (>200)', () => {
    const arr = new Array(201).fill({ x: 1 });
    const r = parseAkteExport({ az: 'A', sv_email: 'sv@example.de', gutachten: arr });
    assert.equal(r.ok, false);
  });
});

// ── smtp-senden ─────────────────────────────────────────────────────────────

describe('smtp-senden schema', () => {
  test('valid: text-only mail', () => {
    const r = parseSmtpSenden({ to: 'kunde@example.de', subject: 'Hallo', text: 'Inhalt' });
    assert.equal(r.ok, true);
  });

  test('valid: html-only mail with az', () => {
    const r = parseSmtpSenden({ to: 'kunde@example.de', subject: 'Hi', html: '<p>X</p>', az: 'SCH-2026-001' });
    assert.equal(r.ok, true);
  });

  test('invalid: CRLF im Subject (Header-Injection)', () => {
    const r = parseSmtpSenden({
      to: 'kunde@example.de',
      subject: 'Hi\r\nBcc: angreifer@evil.com',
      text: 'X'
    });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /CRLF/);
  });

  test('invalid: Multi-Recipient via Komma (Smuggling)', () => {
    const r = parseSmtpSenden({
      to: 'kunde@example.de,angreifer@evil.com',
      subject: 'Hi',
      text: 'X'
    });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /Multi-Recipient/);
  });

  test('invalid: weder text noch html', () => {
    const r = parseSmtpSenden({ to: 'kunde@example.de', subject: 'Hi' });
    assert.equal(r.ok, false);
    assert.match(r.error.message, /text oder html/);
  });

  test('edge: Subject genau 200 Zeichen', () => {
    const r = parseSmtpSenden({
      to: 'kunde@example.de',
      subject: 'x'.repeat(200),
      text: 'X'
    });
    assert.equal(r.ok, true);
  });

  test('edge: Subject 201 Zeichen → Fehler', () => {
    const r = parseSmtpSenden({
      to: 'kunde@example.de',
      subject: 'x'.repeat(201),
      text: 'X'
    });
    assert.equal(r.ok, false);
  });

  test('edge: text+html zusammen ueber MAX_BODY_LEN', () => {
    const half = MAX_BODY_LEN; // schon einzeln Limit, kombiniert garantiert ueber
    const r = parseSmtpSenden({
      to: 'kunde@example.de',
      subject: 'Hi',
      text: 'x'.repeat(half),
      html: 'x'.repeat(100)
    });
    assert.equal(r.ok, false);
  });
});

// ── team-interest ───────────────────────────────────────────────────────────

describe('team-interest schema', () => {
  test('valid: nur email', () => {
    const r = parseTeamInterest({ email: 'lead@example.de' });
    assert.equal(r.ok, true);
  });

  test('valid: alle Felder', () => {
    const r = parseTeamInterest({
      name: 'Max Mustermann',
      email: 'max@example.de',
      kanzlei_info: 'Kanzlei Mustermann + Partner, 5 SVs',
      svs_anzahl: '5'
    });
    assert.equal(r.ok, true);
  });

  test('invalid: kein email', () => {
    const r = parseTeamInterest({ name: 'X' });
    assert.equal(r.ok, false);
  });

  test('invalid: email ohne @', () => {
    const r = parseTeamInterest({ email: 'kein-at-zeichen' });
    assert.equal(r.ok, false);
  });

  test('edge: kanzlei_info zu lang (>2000)', () => {
    const r = parseTeamInterest({ email: 'x@y.de', kanzlei_info: 'x'.repeat(2001) });
    assert.equal(r.ok, false);
  });

  test('edge: extra Feld rejected (strict)', () => {
    const r = parseTeamInterest({ email: 'x@y.de', injected: 'evil' });
    assert.equal(r.ok, false);
  });
});

// ── _common helpers ─────────────────────────────────────────────────────────

describe('_common: emailStrict + safeParse', () => {
  test('emailStrict: valid email', () => {
    const r = safeParse(emailStrict, 'a@b.de');
    assert.equal(r.ok, true);
  });

  test('emailStrict: CRLF blocked', () => {
    const r = safeParse(emailStrict, 'a@b.de\r\nBcc: evil@x');
    assert.equal(r.ok, false);
  });

  test('emailStrict: Komma blocked', () => {
    const r = safeParse(emailStrict, 'a@b.de,c@d.de');
    assert.equal(r.ok, false);
  });

  test('emailStrict: 254 Zeichen max', () => {
    const long = 'x'.repeat(245) + '@b.de'; // 251 Zeichen → grenzt
    const r = safeParse(emailStrict, long);
    assert.equal(r.ok, true);
    const tooLong = 'x'.repeat(255) + '@b.de';
    const r2 = safeParse(emailStrict, tooLong);
    assert.equal(r2.ok, false);
  });

  test('safeParse: error.fields pfad-aware', () => {
    const r = parseSmtpSenden({ to: 'no-at', subject: 'OK', text: 'X' });
    assert.equal(r.ok, false);
    assert.ok(r.error.fields.to, 'fields.to muss gesetzt sein');
  });
});
