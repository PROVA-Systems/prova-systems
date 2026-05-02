/**
 * PROVA Stripe Price-ID Helper Tests
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadFresh() {
  const p = path.resolve(__dirname, '../../netlify/functions/lib/prova-stripe-prices.js');
  delete require.cache[p];
  return require(p);
}

describe('prova-stripe-prices', () => {
  test('Default-IDs sind die neuen Account-IDs (03.05.2026)', () => {
    delete process.env.STRIPE_PRICE_SOLO;
    delete process.env.STRIPE_PRICE_TEAM;
    delete process.env.STRIPE_PRICE_ADDON_5;
    delete process.env.STRIPE_PRICE_ADDON_10;
    delete process.env.STRIPE_PRICE_ADDON_20;
    const m = loadFresh();
    assert.equal(m.resolveSoloPriceId(),     'price_1TSjMZRXumrtL2n5fgToRwyr');
    assert.equal(m.resolveTeamPriceId(),     'price_1TSjNXRXumrtL2n56c6emN2k');
    assert.equal(m.resolveAddonPriceId(5),   'price_1TSl2JRXumrtL2n52XSz85oC');
    assert.equal(m.resolveAddonPriceId(10),  'price_1TSl3fRXumrtL2n5Gur4BmWL');
    assert.equal(m.resolveAddonPriceId(20),  'price_1TSl4eRXumrtL2n5tIWx0ET8');
  });

  test('ENV überschreibt Defaults', () => {
    process.env.STRIPE_PRICE_SOLO = 'price_test_solo';
    process.env.STRIPE_PRICE_TEAM = 'price_test_team';
    const m = loadFresh();
    assert.equal(m.resolveSoloPriceId(), 'price_test_solo');
    assert.equal(m.resolveTeamPriceId(), 'price_test_team');
    delete process.env.STRIPE_PRICE_SOLO;
    delete process.env.STRIPE_PRICE_TEAM;
  });

  test('resolveAddonPriceId(7) → null (unbekannte Größe)', () => {
    const m = loadFresh();
    assert.equal(m.resolveAddonPriceId(7), null);
    assert.equal(m.resolveAddonPriceId(0), null);
  });

  test('Founding-Coupon ohne ENV → leer (kein Default)', () => {
    delete process.env.STRIPE_FOUNDING_COUPON_ID;
    const m = loadFresh();
    assert.equal(m.resolveFoundingCouponId(), '');
  });

  test('Founding-Coupon mit ENV → ENV-Wert', () => {
    process.env.STRIPE_FOUNDING_COUPON_ID = 'FOUNDING-99';
    const m = loadFresh();
    assert.equal(m.resolveFoundingCouponId(), 'FOUNDING-99');
    delete process.env.STRIPE_FOUNDING_COUPON_ID;
  });

  test('tierFromPriceId mapped solo/team', () => {
    delete process.env.STRIPE_PRICE_SOLO;
    delete process.env.STRIPE_PRICE_TEAM;
    const m = loadFresh();
    assert.equal(m.tierFromPriceId('price_1TSjMZRXumrtL2n5fgToRwyr'), 'solo');
    assert.equal(m.tierFromPriceId('price_1TSjNXRXumrtL2n56c6emN2k'), 'team');
    assert.equal(m.tierFromPriceId('price_addon_5'), null);
    assert.equal(m.tierFromPriceId(null), null);
  });
});
