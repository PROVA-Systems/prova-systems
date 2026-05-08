'use strict';

/**
 * MEGA³⁹ Phase 1 — KI-Modell-Update gpt-4o-Stack → gpt-5.5-Stack
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const edgeKiProxySrc = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'ki-proxy', 'index.ts'), 'utf8');
const costCalcSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'lib', 'ki-cost-calc.js'), 'utf8');
const confidenceSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'lib', 'ki-confidence.js'), 'utf8');
const anthropicSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'lib', 'ki-anthropic.js'), 'utf8');

test('P1: Edge Function ki-proxy — MODEL_API_NAME hat praezise + schnell + Legacy-Aliase', () => {
  assert.match(edgeKiProxySrc, /'praezise':\s*'gpt-5\.5'/);
  assert.match(edgeKiProxySrc, /'schnell':\s*'gpt-5\.5-instant'/);
  // Legacy-Aliase mappen auf neue Modelle
  assert.match(edgeKiProxySrc, /'gpt_4o':\s*'gpt-5\.5'/);
  assert.match(edgeKiProxySrc, /'gpt_4o_mini':\s*'gpt-5\.5-instant'/);
});

test('P1: Edge Function ki-proxy — PRICE_PER_M_TOKENS für gpt-5.5 + gpt-5.5-instant', () => {
  assert.match(edgeKiProxySrc, /'gpt-5\.5':\s*\{\s*in:/);
  assert.match(edgeKiProxySrc, /'gpt-5\.5-instant':\s*\{\s*in:/);
});

test('P1: Edge Function ki-proxy — FORCED_HIGH_MODEL_PURPOSES enthält Konjunktiv + Halluzin + 407a', () => {
  assert.match(edgeKiProxySrc, /FORCED_HIGH_MODEL_PURPOSES/);
  assert.match(edgeKiProxySrc, /'konjunktiv_korrektur'/);
  assert.match(edgeKiProxySrc, /'halluzinations_check'/);
  assert.match(edgeKiProxySrc, /'407a_konsistenz'/);
});

test('P1: Edge Function ki-proxy — Default-Modell ist "schnell" statt "gpt_4o_mini"', () => {
  assert.match(edgeKiProxySrc, /body\.model \?\? 'schnell'/);
});

test('P1: Edge Function ki-proxy — calcCostEur akzeptiert internal-name UND API-name', () => {
  assert.match(edgeKiProxySrc, /MODEL_API_NAME\[modelOrApiName\]\s*\?\?\s*modelOrApiName/);
});

test('P1: ki-cost-calc.js — gpt-5.5-instant ergänzt mit Pricing', () => {
  assert.match(costCalcSrc, /'gpt-5\.5-instant':\s*\{\s*prompt:/);
});

test('P1: ki-confidence.js — Frontier-Detection für gpt-5.5/5.4 (nicht gpt-4o-only)', () => {
  assert.match(confidenceSrc, /isFrontier/);
  assert.match(confidenceSrc, /'gpt-5\.5-pro'/);
  assert.match(confidenceSrc, /'gpt-5\.5'/);
  assert.match(confidenceSrc, /'gpt-5\.4'/);
});

test('P1: ki-confidence.js — Light-Modelle Konjunktiv-II-Penalty', () => {
  assert.match(confidenceSrc, /isLightModel/);
  assert.match(confidenceSrc, /'gpt-5\.5-instant'/);
  assert.match(confidenceSrc, /'gpt-5\.4-mini'/);
  assert.match(confidenceSrc, /Light-Modell ist nicht zuverlaessig/);
});

test('P1: ki-anthropic.js — gpt-5.5-instant Mapping zu claude-haiku', () => {
  assert.match(anthropicSrc, /'gpt-5\.5-instant':\s*'claude-haiku-4-5-20251001'/);
});
