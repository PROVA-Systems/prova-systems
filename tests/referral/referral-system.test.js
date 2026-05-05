/**
 * PROVA — referral-system.js Tests (MEGA²⁷)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'lib', 'referral-system.js'));

describe('referral-system — generateCode', () => {
  test('Format: PROVA-FRIEND-{INITIALS}-{6-char-RANDOM}', () => {
    const code = Lib.generateCode('HM');
    assert.match(code, /^PROVA-FRIEND-HM-[A-Z2-9]{6}$/);
  });

  test('Initials werden auf max 4 Buchstaben gekuerzt', () => {
    const code = Lib.generateCode('VeryLongName');
    assert.match(code, /^PROVA-FRIEND-VERY-/);
  });

  test('Initials non-A-Z werden gefiltert', () => {
    const code = Lib.generateCode('H1M2');
    assert.match(code, /^PROVA-FRIEND-HM-/);
  });

  test('Empty Initials → fallback XX', () => {
    const code = Lib.generateCode('');
    assert.match(code, /^PROVA-FRIEND-XX-/);
  });

  test('100 Codes mit gleichem Prefix sind alle unique', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) codes.add(Lib.generateCode('AB'));
    assert.equal(codes.size, 100);
  });

  test('Code enthaelt KEINE 0/O/1/I (Verwechslungs-Schutz)', () => {
    for (let i = 0; i < 50; i++) {
      const code = Lib.generateCode('AB');
      const random = code.split('-')[3];
      assert.doesNotMatch(random, /[01OI]/);
    }
  });
});

describe('referral-system — validateEmail', () => {
  test('akzeptiert valide Email', () => {
    assert.equal(Lib.validateEmail('test@example.de').ok, true);
    assert.equal(Lib.validateEmail('a.b+c@sub.domain.com').ok, true);
  });

  test('lehnt fehlende Email ab', () => {
    assert.equal(Lib.validateEmail('').ok, false);
    assert.equal(Lib.validateEmail(null).ok, false);
    assert.equal(Lib.validateEmail(undefined).ok, false);
  });

  test('lehnt invalide Format ab', () => {
    assert.equal(Lib.validateEmail('no-at-sign').ok, false);
    assert.equal(Lib.validateEmail('@no-local.de').ok, false);
    assert.equal(Lib.validateEmail('no-tld@x').ok, false);
    assert.equal(Lib.validateEmail('with space@x.de').ok, false);
  });
});

describe('referral-system — checkSelfReferral', () => {
  test('lehnt gleiche Email ab', () => {
    const r = Lib.checkSelfReferral('hans@x.de', 'hans@x.de');
    assert.equal(r.ok, false);
    assert.match(r.error, /selbst empfehlen/);
  });

  test('case-insensitive', () => {
    const r = Lib.checkSelfReferral('Hans@X.de', 'hans@x.DE');
    assert.equal(r.ok, false);
  });

  test('akzeptiert verschiedene Emails', () => {
    const r = Lib.checkSelfReferral('hans@x.de', 'lisa@y.de');
    assert.equal(r.ok, true);
  });
});

describe('referral-system — validateMessage', () => {
  test('akzeptiert leeren String + null', () => {
    assert.equal(Lib.validateMessage('').ok, true);
    assert.equal(Lib.validateMessage(null).ok, true);
    assert.equal(Lib.validateMessage(undefined).ok, true);
  });

  test('akzeptiert kurze Nachricht', () => {
    assert.equal(Lib.validateMessage('Hi Lisa').ok, true);
  });

  test('lehnt > 500 Zeichen ab', () => {
    const r = Lib.validateMessage('a'.repeat(501));
    assert.equal(r.ok, false);
    assert.match(r.error, /500/);
  });

  test('akzeptiert genau 500 Zeichen', () => {
    const r = Lib.validateMessage('a'.repeat(500));
    assert.equal(r.ok, true);
  });
});

describe('referral-system — canCreateMore (Cap=12)', () => {
  test('0 used → 12 remaining', () => {
    const r = Lib.canCreateMore({});
    assert.equal(r.ok, true);
    assert.equal(r.remaining, 12);
  });

  test('5 active + 3 rewarded = 8 used → 4 remaining', () => {
    const r = Lib.canCreateMore({ total_active: 5, total_rewarded: 3 });
    assert.equal(r.ok, true);
    assert.equal(r.remaining, 4);
  });

  test('12 used → blocked', () => {
    const r = Lib.canCreateMore({ total_rewarded: 12 });
    assert.equal(r.ok, false);
    assert.equal(r.remaining, 0);
    assert.match(r.error, /12/);
  });

  test('expired/cancelled werden NICHT gezaehlt', () => {
    // Keine total_expired/total_cancelled-Felder im stats-Objekt → werden ignoriert
    const r = Lib.canCreateMore({ total_rewarded: 0 });
    assert.equal(r.remaining, 12);
  });

  test('pending + hold zaehlen mit', () => {
    const r = Lib.canCreateMore({ total_pending: 5, total_hold: 5 });
    assert.equal(r.remaining, 2);
  });
});

describe('referral-system — calculateExpiresAt (7 Tage)', () => {
  test('genau 7 Tage spaeter', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const r = Lib.calculateExpiresAt(now);
    const diff = new Date(r) - now;
    assert.equal(diff, 7 * 24 * 60 * 60 * 1000);
  });

  test('Default = jetzt', () => {
    const r = Lib.calculateExpiresAt();
    const ago = Date.now() + 7 * 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(new Date(r).getTime() - ago) < 5000);
  });
});

describe('referral-system — calculateRewardEligibleAt (30 Tage)', () => {
  test('30 Tage nach Subscription', () => {
    const r = Lib.calculateRewardEligibleAt('2026-05-01T12:00:00Z');
    const expected = new Date('2026-05-31T12:00:00Z').toISOString();
    assert.equal(r, expected);
  });

  test('null bei missing input', () => {
    assert.equal(Lib.calculateRewardEligibleAt(null), null);
    assert.equal(Lib.calculateRewardEligibleAt(''), null);
  });

  test('null bei invalid date', () => {
    assert.equal(Lib.calculateRewardEligibleAt('not-a-date'), null);
  });
});

describe('referral-system — statusLabel', () => {
  test('alle 6 Status mit Icon', () => {
    assert.match(Lib.statusLabel('pending'), /⏰/);
    assert.match(Lib.statusLabel('active'), /🔄/);
    assert.match(Lib.statusLabel('hold'), /⏳/);
    assert.match(Lib.statusLabel('rewarded'), /✅/);
    assert.match(Lib.statusLabel('expired'), /❌/);
    assert.match(Lib.statusLabel('cancelled'), /🚫/);
  });

  test('unbekannter Status passthrough', () => {
    assert.equal(Lib.statusLabel('foo'), 'foo');
  });
});

describe('referral-system — deriveInitials', () => {
  test('"Hans Mueller" → "HM"', () => {
    assert.equal(Lib.deriveInitials('Hans Mueller'), 'HM');
  });

  test('"Marcel" → "M"', () => {
    assert.equal(Lib.deriveInitials('Marcel'), 'M');
  });

  test('"Hans Peter Schmidt" → "HS"', () => {
    assert.equal(Lib.deriveInitials('Hans Peter Schmidt'), 'HS');
  });

  test('Empty → "XX"', () => {
    assert.equal(Lib.deriveInitials(''), 'XX');
    assert.equal(Lib.deriveInitials(null), 'XX');
  });
});

describe('referral-system — escapeHtml (XSS-Schutz)', () => {
  test('escaped < > & " \'', () => {
    const r = Lib.escapeHtml('<script>alert("x&y")</script>');
    assert.doesNotMatch(r, /<script>alert/);
    assert.match(r, /&lt;script&gt;/);
  });

  test('null + undefined → empty', () => {
    assert.equal(Lib.escapeHtml(null), '');
    assert.equal(Lib.escapeHtml(undefined), '');
  });
});

describe('referral-system — Constants', () => {
  test('MAX_REFERRALS = 12', () => {
    assert.equal(Lib._const.MAX_REFERRALS, 12);
  });

  test('HOLD_DAYS = 30', () => {
    assert.equal(Lib._const.HOLD_DAYS, 30);
  });

  test('EXPIRY_DAYS = 7', () => {
    assert.equal(Lib._const.EXPIRY_DAYS, 7);
  });

  test('MAX_MESSAGE_LENGTH = 500', () => {
    assert.equal(Lib._const.MAX_MESSAGE_LENGTH, 500);
  });

  test('SAFE_CHARS enthaelt KEIN 0/O/1/I', () => {
    assert.doesNotMatch(Lib._const.SAFE_CHARS, /[01OI]/);
  });
});
