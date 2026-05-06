/**
 * PROVA — Referral-Lambdas Tests (MEGA²⁷)
 *
 * Source-Code-Audit + Pure-Function-Tests fuer alle 4 Lambdas.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FN = path.join(ROOT, 'netlify', 'functions');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function loadWithStubs(targetPath) {
  delete require.cache[require.resolve(targetPath)];
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(FN, relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
  stubMod('lib/jwt-middleware.js', { requireAuth: (fn) => fn });
  stubMod('lib/cors-helper.js', {
    getCorsHeaders: () => ({}),
    corsOptionsResponse: () => ({ statusCode: 200 })
  });
  stubMod('lib/storage-router.js', { getSupabase: () => null });
  return require(targetPath);
}

describe('create-referral.js — Source-Audit', () => {
  const SRC = read(path.join(FN, 'create-referral.js'));

  test('FRIEND-50 Coupon-ID hardcoded', () => {
    assert.match(SRC, /FRIEND-50/);
  });

  test('Rate-Limit RATE_LIMIT_PER_DAY definiert', () => {
    assert.match(SRC, /RATE_LIMIT_PER_DAY/);
  });

  test('Stripe Promo-Code first_time_transaction true', () => {
    assert.match(SRC, /first_time_transaction:\s*true/);
  });

  test('max_redemptions 1 (Code 1× verwendbar)', () => {
    assert.match(SRC, /max_redemptions:\s*1/);
  });

  test('Workflow-Step Cap-Check via DB', () => {
    assert.match(SRC, /Cap erreicht/);
  });

  test('Self-Referral-Check', () => {
    assert.match(SRC, /checkSelfReferral/);
  });

  test('Duplicate-Email-Check (bereits eingeladen)', () => {
    assert.match(SRC, /bereits eingeladen/);
  });

  test('JWT-Auth via requireAuth', () => {
    assert.match(SRC, /requireAuth/);
  });

  test('Reply-To Werber-Email in Email-Versand', () => {
    assert.match(SRC, /replyTo/);
  });

  test('Test-Exports definiert', () => {
    assert.match(SRC, /exports\._test/);
  });
});

describe('redeem-referral-code.js — CODE_REGEX', () => {
  test('akzeptiert valides Format', () => {
    const mod = loadWithStubs(path.join(FN, 'redeem-referral-code.js'));
    assert.match('PROVA-FRIEND-HM-A7B3K2', mod._test.CODE_REGEX);
    assert.match('PROVA-FRIEND-X-AAAAAA', mod._test.CODE_REGEX);
  });

  test('lehnt invalides Format ab', () => {
    const mod = loadWithStubs(path.join(FN, 'redeem-referral-code.js'));
    assert.doesNotMatch('not-a-code', mod._test.CODE_REGEX);
    assert.doesNotMatch('PROVA-FOO-XX-YYYYYY', mod._test.CODE_REGEX);
    assert.doesNotMatch('PROVA-FRIEND-XX-YYYYY', mod._test.CODE_REGEX); // 5 chars
    assert.doesNotMatch('PROVA-FRIEND--YYYYYY', mod._test.CODE_REGEX); // empty initials
  });

  test('Source enthaelt 503/404/200 Response-Codes', () => {
    const SRC = read(path.join(FN, 'redeem-referral-code.js'));
    assert.match(SRC, /503/);
    assert.match(SRC, /404/);
    assert.match(SRC, /200/);
  });
});

describe('check-referral-rewards.js — Cron-Logic', () => {
  const SRC = read(path.join(FN, 'check-referral-rewards.js'));

  test('REWARD_COUPON_ID = WERBER-MONAT-FREI', () => {
    assert.match(SRC, /WERBER-MONAT-FREI/);
  });

  test('Internal-Secret-Auth (Cron-Trigger)', () => {
    assert.match(SRC, /PROVA_INTERNAL_WRITE_SECRET/);
  });

  test('Refund-Detection in verifySubscriptionActive', () => {
    assert.match(SRC, /refunded/);
    assert.match(SRC, /amount_refunded/);
  });

  test('Pending → Expired Logic', () => {
    assert.match(SRC, /\.eq\(['"]status['"],\s*['"]pending['"]\)/);
    assert.match(SRC, /'expired'/);
  });

  test('Active → Rewarded Logic mit Stripe-Verify', () => {
    assert.match(SRC, /reward_eligible_at/);
    assert.match(SRC, /verifySubscriptionActive/);
    assert.match(SRC, /applyRewardToReferrer/);
  });

  test('Cancelled-Tracking bei nicht-eligible', () => {
    assert.match(SRC, /'cancelled'/);
    assert.match(SRC, /cancelled_at/);
  });

  test('Test-Exports', () => {
    assert.match(SRC, /exports\._test/);
  });
});

describe('stripe-webhook-referral.js — Event-Handler', () => {
  const SRC = read(path.join(FN, 'stripe-webhook-referral.js'));

  test('Behandelt subscription.created', () => {
    assert.match(SRC, /customer\.subscription\.created/);
  });

  test('Behandelt subscription.deleted', () => {
    assert.match(SRC, /customer\.subscription\.deleted/);
  });

  test('Behandelt charge.refunded', () => {
    assert.match(SRC, /charge\.refunded/);
  });

  test('Webhook-Signature-Verify via constructEvent', () => {
    assert.match(SRC, /constructEvent/);
  });

  test('STRIPE_REFERRAL_WEBHOOK_SECRET-Pflicht', () => {
    assert.match(SRC, /STRIPE_REFERRAL_WEBHOOK_SECRET/);
  });

  test('FRIEND-50 Coupon-Detection', () => {
    assert.match(SRC, /FRIEND-50/);
    assert.match(SRC, /_hasFriendCoupon/);
  });

  test('HOLD_DAYS = 30 für reward_eligible_at', () => {
    assert.match(SRC, /HOLD_DAYS\s*=\s*30/);
  });

  test('Idempotenz: bereits "rewarded" wird nicht ueberschrieben', () => {
    assert.match(SRC, /already_rewarded/);
  });
});

describe('stripe-webhook-referral.js — _hasFriendCoupon', () => {
  test('detects coupon in discount.coupon.id', () => {
    const mod = loadWithStubs(path.join(FN, 'stripe-webhook-referral.js'));
    const sub = { discount: { coupon: { id: 'FRIEND-50' } } };
    assert.equal(mod._test._hasFriendCoupon(sub), true);
  });

  test('detects coupon in discounts[]', () => {
    const mod = loadWithStubs(path.join(FN, 'stripe-webhook-referral.js'));
    const sub = { discounts: [{ coupon: { id: 'FRIEND-50' } }] };
    assert.equal(mod._test._hasFriendCoupon(sub), true);
  });

  test('returns false wenn anderer Coupon', () => {
    const mod = loadWithStubs(path.join(FN, 'stripe-webhook-referral.js'));
    const sub = { discount: { coupon: { id: 'FOUNDING-99' } } };
    assert.equal(mod._test._hasFriendCoupon(sub), false);
  });

  test('returns false bei leerer Sub', () => {
    const mod = loadWithStubs(path.join(FN, 'stripe-webhook-referral.js'));
    assert.equal(mod._test._hasFriendCoupon({}), false);
    assert.equal(mod._test._hasFriendCoupon(null), false);
  });
});

describe('Migration 12 — Schema-Audit', () => {
  const SQL = read(path.join(ROOT, 'supabase-migrations', '12_referrals_system.sql'));

  test('Tabelle referrals existiert', () => {
    assert.match(SQL, /CREATE TABLE IF NOT EXISTS public\.referrals/);
  });

  test('6 Status-Werte (pending/active/hold/rewarded/expired/cancelled)', () => {
    ['pending', 'active', 'hold', 'rewarded', 'expired', 'cancelled'].forEach(s => {
      assert.match(SQL, new RegExp("'" + s + "'"));
    });
  });

  test('UNIQUE-Constraint auf code', () => {
    assert.match(SQL, /code\s+TEXT\s+UNIQUE/);
  });

  test('RLS aktiv mit referrer_user_id-Policy', () => {
    assert.match(SQL, /ENABLE ROW LEVEL SECURITY/);
    assert.match(SQL, /referrer_user_id\s*=\s*auth\.uid\(\)/);
  });

  test('Service-Role-Policy (Lambda-Zugriff)', () => {
    assert.match(SQL, /auth\.role\(\)\s*=\s*['"]service_role['"]/);
  });

  test('updated_at-Trigger', () => {
    assert.match(SQL, /TRIGGER trg_referrals_updated_at/);
    assert.match(SQL, /BEFORE UPDATE/);
  });

  test('6 Indices definiert', () => {
    const idxCount = (SQL.match(/CREATE INDEX/g) || []).length;
    assert.ok(idxCount >= 6, 'Mindestens 6 Indices erwartet, gefunden: ' + idxCount);
  });

  test('Anti-Fraud Felder (signup_ip, user_agent, fraud_flags)', () => {
    assert.match(SQL, /signup_ip/);
    assert.match(SQL, /signup_user_agent/);
    assert.match(SQL, /fraud_flags/);
  });

  test('30-Tage-Hold-Felder (reward_eligible_at, reward_given_at)', () => {
    assert.match(SQL, /reward_eligible_at/);
    assert.match(SQL, /reward_given_at/);
  });
});
