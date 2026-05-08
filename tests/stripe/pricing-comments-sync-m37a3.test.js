'use strict';

/**
 * MEGA³⁷ A3 — Pricing-Comments-Sync (CLAUDE.md Regel 21)
 *
 * Verifiziert dass alle Code-Comments und KI-Prompt-Kontexte den aktuellen
 * Preis (Solo 179€ / Team 379€ ab 2026-05-08) reflektieren — kein Drift mehr
 * zu alten Werten 149€/279€.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PATHS = [
  ['netlify', 'functions', 'lib', 'prova-stripe-prices.js'],
  ['netlify', 'functions', 'ki-proxy.js'],
  ['admin-dashboard-logic.js']
];

function readFile(parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

test('A3: prova-stripe-prices.js Comments → Solo 179€, Team 379€', () => {
  const src = readFile(PATHS[0]);
  assert.match(src, /STRIPE_PRICE_SOLO[^\n]*179€/);
  assert.match(src, /STRIPE_PRICE_TEAM[^\n]*379€/);
});

test('A3: ki-proxy.js Pakete-Beschreibung → Solo 179€, Team 379€', () => {
  const src = readFile(PATHS[1]);
  assert.match(src, /Solo \(179€\/Mo/);
  assert.match(src, /Team \(379€\/Mo/);
});

test('A3: admin-dashboard-logic.js MRR-Mix → 179/379', () => {
  const src = readFile(PATHS[2]);
  assert.match(src, /mrrs\s*=\s*\{Solo:179,Team:379\}/);
});

test('A3: keine "149€" oder "279€" mehr in den 3 Production-Files', () => {
  PATHS.forEach(parts => {
    const src = readFile(parts);
    assert.doesNotMatch(src, /149€/, 'alte Preis-Drift in: ' + parts.join('/'));
    assert.doesNotMatch(src, /279€/, 'alte Preis-Drift in: ' + parts.join('/'));
  });
});

test('A3: keine "Solo.*149" oder "Team.*279" Patterns mehr', () => {
  PATHS.forEach(parts => {
    const src = readFile(parts);
    assert.doesNotMatch(src, /Solo[^\n]{0,40}149/);
    assert.doesNotMatch(src, /Team[^\n]{0,40}279/);
  });
});
