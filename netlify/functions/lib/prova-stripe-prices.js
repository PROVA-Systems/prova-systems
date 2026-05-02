/**
 * PROVA Systems — Stripe Price ID Helper
 *
 * Sprint Stripe-Migration 03.05.2026: neuer Account, 0 Kunden, neue Price-IDs.
 * Alte Account-Defaults entfernt (Sandbox-Test).
 *
 * ENV-Vars überschreiben Defaults — Reihenfolge:
 *   1. process.env.STRIPE_PRICE_<TIER>
 *   2. Default (= neuer-Account-Live-Price-ID, hardcoded für Stabilität)
 *
 * **Subscriptions** (mode='subscription'):
 *   STRIPE_PRICE_SOLO  → 149€/Monat, 25 Gutachten
 *   STRIPE_PRICE_TEAM  → 279€/Monat, 60 Gutachten
 *
 * **Add-on-Pakete** (mode='payment', one-time, 12 Monate gültig):
 *   STRIPE_PRICE_ADDON_5   → 25€, +5 Gutachten
 *   STRIPE_PRICE_ADDON_10  → 45€, +10 Gutachten
 *   STRIPE_PRICE_ADDON_20  → 80€, +20 Gutachten
 *
 * **Founding-Coupon** (lifetime 50€ off Solo, max 10 Plätze):
 *   STRIPE_FOUNDING_COUPON_ID  → muss in Stripe-Dashboard angelegt sein
 */

'use strict';

// Defaults aus neuem Stripe-Account (03.05.2026)
const DEFAULT_SOLO     = 'price_1TSjMZRXumrtL2n5fgToRwyr';
const DEFAULT_TEAM     = 'price_1TSjNXRXumrtL2n56c6emN2k';
const DEFAULT_ADDON_5  = 'price_1TSl2JRXumrtL2n52XSz85oC';
const DEFAULT_ADDON_10 = 'price_1TSl3fRXumrtL2n5Gur4BmWL';
const DEFAULT_ADDON_20 = 'price_1TSl4eRXumrtL2n5tIWx0ET8';

function resolveSoloPriceId() {
  return process.env.STRIPE_PRICE_SOLO || DEFAULT_SOLO;
}

function resolveTeamPriceId() {
  return process.env.STRIPE_PRICE_TEAM || DEFAULT_TEAM;
}

function resolveAddonPriceId(paketGroesse) {
  // paketGroesse = 5 | 10 | 20
  switch (Number(paketGroesse)) {
    case 5:  return process.env.STRIPE_PRICE_ADDON_5  || DEFAULT_ADDON_5;
    case 10: return process.env.STRIPE_PRICE_ADDON_10 || DEFAULT_ADDON_10;
    case 20: return process.env.STRIPE_PRICE_ADDON_20 || DEFAULT_ADDON_20;
    default: return null;
  }
}

function resolveFoundingCouponId() {
  // Coupon muss in Stripe-Dashboard angelegt sein. Kein Default — leer = kein Coupon.
  return process.env.STRIPE_FOUNDING_COUPON_ID || '';
}

/**
 * Alle bekannten PROVA-Subscription-Price-IDs (für paketFromSubscription-Mapping).
 */
function isSoloPriceId(priceId) {
  return priceId === resolveSoloPriceId();
}
function isTeamPriceId(priceId) {
  return priceId === resolveTeamPriceId();
}

/**
 * Tier-Mapping für workspaces.abo_tier (enum: 'solo' | 'team').
 * Returnt null wenn unbekannt.
 */
function tierFromPriceId(priceId) {
  if (isSoloPriceId(priceId)) return 'solo';
  if (isTeamPriceId(priceId)) return 'team';
  return null;
}

module.exports = {
  resolveSoloPriceId,
  resolveTeamPriceId,
  resolveAddonPriceId,
  resolveFoundingCouponId,
  isSoloPriceId,
  isTeamPriceId,
  tierFromPriceId,

  // exposed für Tests + Debug
  PRICE_SOLO_DEFAULT:     DEFAULT_SOLO,
  PRICE_TEAM_DEFAULT:     DEFAULT_TEAM,
  PRICE_ADDON_5_DEFAULT:  DEFAULT_ADDON_5,
  PRICE_ADDON_10_DEFAULT: DEFAULT_ADDON_10,
  PRICE_ADDON_20_DEFAULT: DEFAULT_ADDON_20
};
