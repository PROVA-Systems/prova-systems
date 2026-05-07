'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Calc = require('../../netlify/functions/lib/ki-cost-calc');
const proxySrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'ki-proxy.js'), 'utf8');
const sqlSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '08_add_ki_protokoll_cached_tokens.sql'), 'utf8');

test('B2: ki-cost-calc exposiert calculateUsdCostCached + calculateEurCostCached', () => {
  assert.strictEqual(typeof Calc.calculateUsdCostCached, 'function');
  assert.strictEqual(typeof Calc.calculateEurCostCached, 'function');
});

test('B2: Cached-Discount = 90% (Cached-Faktor 0.10) bei gpt-5.5', () => {
  // Standard: 1M prompt @ $5
  const standard = Calc.calculateUsdCost('gpt-5.5', 1_000_000, 0);
  // Voll-cached: 1M prompt @ $5 × 10%
  const fullCached = Calc.calculateUsdCostCached('gpt-5.5', { prompt: 1_000_000, completion: 0, cachedPrompt: 1_000_000 });
  assert.ok(Math.abs(fullCached - standard * 0.10) < 0.01, 'Cached sollte 10% des Standard-Preises sein');
});

test('B2: 50% Cache-Hit-Rate spart ~45% Kosten', () => {
  const half = Calc.calculateUsdCostCached('gpt-5.5', { prompt: 1_000_000, completion: 0, cachedPrompt: 500_000 });
  const standard = Calc.calculateUsdCost('gpt-5.5', 1_000_000, 0);
  const ratio = half / standard;
  // 50% × 1.0 + 50% × 0.10 = 0.55 → ~45% Ersparnis
  assert.ok(ratio > 0.50 && ratio < 0.60, '50% Hit sollte ratio ~0.55 ergeben, war: ' + ratio);
});

test('B2: ki-proxy.js enableCacheControlIfStable Function vorhanden', () => {
  assert.match(proxySrc, /function enableCacheControlIfStable/);
  assert.match(proxySrc, /cache_control:\s*\{\s*type:\s*['"]ephemeral['"]/);
});

test('B2: ki-proxy.js >1024 Zeichen Schwellwert', () => {
  assert.match(proxySrc, /sys\.content\.length\s*<\s*1024/);
});

test('B2: ki-proxy.js parsed prompt_tokens_details.cached_tokens', () => {
  assert.match(proxySrc, /prompt_tokens_details/);
  assert.match(proxySrc, /cached_token_input/);
});

test('B2: SQL Schema-Migration 08 hat cached_token_input + cached_token_output', () => {
  assert.match(sqlSrc, /ADD COLUMN cached_token_input INTEGER NOT NULL DEFAULT 0/);
  assert.match(sqlSrc, /ADD COLUMN cached_token_output INTEGER NOT NULL DEFAULT 0/);
});

test('B2: SQL Idempotent (DO BEGIN IF NOT EXISTS) + Index', () => {
  assert.match(sqlSrc, /DO \$\$/);
  assert.match(sqlSrc, /IF NOT EXISTS/);
  assert.match(sqlSrc, /CREATE INDEX IF NOT EXISTS idx_ki_protokoll_cached/);
});
