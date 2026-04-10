// PROVA Systems — Stripe Price ID Helper
// ENV STRIPE_PRICE_SOLO / STRIPE_PRICE_TEAM ueberschreiben diese Defaults.

const DEFAULT_SOLO = 'price_1TEHG68d1CNm0HvYFNx99Tq6';
const DEFAULT_TEAM = 'price_1TEHH68d1CNm0HvYLeG1Or7T';

function resolveSoloPriceId() {
  return process.env.STRIPE_PRICE_SOLO || DEFAULT_SOLO;
}

function resolveTeamPriceId() {
  return process.env.STRIPE_PRICE_TEAM || DEFAULT_TEAM;
}

module.exports = {
  resolveSoloPriceId,
  resolveTeamPriceId,
  PRICE_SOLO_DEFAULT: DEFAULT_SOLO,
  PRICE_TEAM_DEFAULT: DEFAULT_TEAM
};
