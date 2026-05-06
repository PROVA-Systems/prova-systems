/**
 * PROVA — MEGA²¹ Pricing-Update Tests (W91+W92)
 * Solo 149€→179€ + Founding 125€ + Starter/Team Coming Soon
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const PREISE_SRC = fs.readFileSync(path.join(ROOT, 'prova-preise.js'), 'utf8');
const LOGIN_HTML = fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8');
const PRICING_HTML = fs.readFileSync(path.join(ROOT, 'pricing.html'), 'utf8');

function loadPreise() {
  const ctx = { window: {}, global: {} };
  vm.createContext(ctx);
  vm.runInContext(PREISE_SRC, ctx);
  return ctx.window.PROVA_PREISE || ctx.global.PROVA_PREISE;
}

describe('prova-preise.js — MEGA²¹ Solo 179€ Update', () => {
  test('Solo preis_monatlich = 179', () => {
    assert.match(PREISE_SRC, /preis_monatlich:\s*179/);
  });

  test('Solo preis_jaehrlich = 149', () => {
    assert.match(PREISE_SRC, /preis_jaehrlich:\s*149/);
  });

  test('Solo preis_jahr_total = 1788', () => {
    assert.match(PREISE_SRC, /preis_jahr_total:\s*1788/);
  });

  test('Solo onboarding = 179', () => {
    assert.match(PREISE_SRC, /onboarding:\s*179/);
  });

  test('Solo MEGA²¹-Comment vorhanden', () => {
    assert.match(PREISE_SRC, /MEGA²¹ Pricing-Update.*149€.*179€/);
  });
});

describe('prova-preise.js — Founding-Member 125€ NEU', () => {
  test('preis_founding = 125', () => {
    assert.match(PREISE_SRC, /preis_founding:\s*125/);
  });

  test('founding_member_max = 10', () => {
    assert.match(PREISE_SRC, /founding_member_max:\s*10/);
  });

  test('founding_member_label mit 🎁-Emoji', () => {
    assert.match(PREISE_SRC, /founding_member_label:.*🎁/);
  });

  test('stripe_price_founding feld vorhanden', () => {
    assert.match(PREISE_SRC, /stripe_price_founding/);
  });
});

describe('prova-preise.js — Starter-Tier (Coming Soon Juni)', () => {
  test('Starter-Block existiert', () => {
    assert.match(PREISE_SRC, /Starter:\s*\{/);
  });

  test('Starter preis_monatlich = 89', () => {
    assert.match(PREISE_SRC, /Starter:[\s\S]{0,400}preis_monatlich:\s*89/);
  });

  test('Starter coming_soon = true', () => {
    assert.match(PREISE_SRC, /Starter:[\s\S]{0,1200}coming_soon:\s*true/);
  });

  test('Starter coming_soon_label "Juni 2026"', () => {
    assert.match(PREISE_SRC, /Starter:[\s\S]{0,1200}coming_soon_label:.*Juni 2026/);
  });

  test('Starter kontingent_gutachten = 5', () => {
    assert.match(PREISE_SRC, /Starter:[\s\S]{0,1200}kontingent_gutachten:\s*5/);
  });
});

describe('prova-preise.js — Team-Tier (Coming Soon Juli, 379€)', () => {
  test('Team preis_monatlich = 379 (war 279)', () => {
    assert.match(PREISE_SRC, /Team:[\s\S]{0,1500}preis_monatlich:\s*379/);
  });

  test('Team coming_soon = true', () => {
    assert.match(PREISE_SRC, /Team:[\s\S]{0,2500}coming_soon:\s*true/);
  });

  test('Team coming_soon_label "Juli 2026"', () => {
    assert.match(PREISE_SRC, /Team:[\s\S]{0,2500}coming_soon_label:.*Juli 2026/);
  });

  test('Team preis_jaehrlich = 299', () => {
    assert.match(PREISE_SRC, /Team:[\s\S]{0,1500}preis_jaehrlich:\s*299/);
  });
});

describe('login.html — Pricing-Strip MEGA²¹', () => {
  test('"Solo 179 €/Monat" im Strip', () => {
    assert.match(LOGIN_HTML, /Solo 179\s*€\/Monat/);
  });

  test('Founding Members 125€ Hint mit 🎁', () => {
    assert.match(LOGIN_HTML, /🎁 Founding Members.*125\s*€/);
  });

  test('"erste 10 Pilot-SVs" Wording', () => {
    assert.match(LOGIN_HTML, /erste 10 Pilot-SVs/);
  });

  test('Starter Coming-Soon-Badge mit "89€" + "Juni"', () => {
    assert.match(LOGIN_HTML, /Starter 89€.*Coming Soon Juni/);
  });

  test('Team Coming-Soon-Badge mit "379€" + "Juli"', () => {
    assert.match(LOGIN_HTML, /Team 379€.*Coming Soon Juli/);
  });
});

describe('pricing.html — 3-Tier-Vergleichstabelle', () => {
  test('meta description aktualisiert (179€ + Founding 125€)', () => {
    assert.match(PRICING_HTML, /meta name="description"[\s\S]{0,500}179.*Founding/i);
  });

  test('Starter Card mit "Coming Soon · Juni 2026"', () => {
    assert.match(PRICING_HTML, /Coming Soon.*Juni 2026/);
  });

  test('Solo Card "PILOT-AKTIV" Badge', () => {
    assert.match(PRICING_HTML, /PILOT-AKTIV/);
  });

  test('Solo Card mit 179€-Preis', () => {
    assert.match(PRICING_HTML, /<span class="amount">179 €<\/span>/);
  });

  test('Team Card mit 379€-Preis + Coming-Soon', () => {
    assert.match(PRICING_HTML, /<span class="amount">379 €<\/span>/);
    assert.match(PRICING_HTML, /Coming Soon.*Juli 2026/);
  });

  test('Founding-Programm-Hint 125€ Lifetime', () => {
    assert.match(PRICING_HTML, /125\s*€\/Monat lebenslang/);
  });

  test('30% Lifetime-Discount erwaehnt', () => {
    assert.match(PRICING_HTML, /30%/);
  });

  test('Triple-Mode (A\\/B\\/C) bei Solo gelistet', () => {
    assert.match(PRICING_HTML, /Triple-Mode.*A\/B\/C/);
  });

  test('Coming-Soon-Buttons disabled', () => {
    assert.match(PRICING_HTML, /button class="cta" disabled/);
  });
});

describe('Pricing-Loader Sanity (vm-loaded)', () => {
  test('PROVA_PREISE loadable + 3 Tiers', () => {
    const preise = loadPreise();
    assert.ok(preise, 'PROVA_PREISE not loaded');
    assert.ok(preise.Starter, 'Starter missing');
    assert.ok(preise.Solo, 'Solo missing');
    assert.ok(preise.Team, 'Team missing');
  });

  test('Solo + Team coming_soon-Markers', () => {
    const preise = loadPreise();
    if (preise && preise.Starter) assert.equal(preise.Starter.coming_soon, true);
    if (preise && preise.Team) assert.equal(preise.Team.coming_soon, true);
    if (preise && preise.Solo) assert.equal(!!preise.Solo.coming_soon, false);  // Solo aktiv
  });

  test('Solo preis_founding 125', () => {
    const preise = loadPreise();
    if (preise && preise.Solo) assert.equal(preise.Solo.preis_founding, 125);
  });
});
