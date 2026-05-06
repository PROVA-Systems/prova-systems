/**
 * PROVA — ki-cost-calc Tests (MEGA²⁸ W1-I4)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'netlify/functions/lib/ki-cost-calc.js'));

describe('ki-cost-calc — calculateUsdCost', () => {
  test('GPT-4o: 1000 prompt + 500 completion = ~$0.0075', () => {
    const c = Lib.calculateUsdCost('gpt-4o', 1000, 500);
    assert.equal(c, 0.0075);
  });

  test('GPT-4o-mini günstiger als gpt-4o um Faktor 16x prompt', () => {
    const cMini = Lib.calculateUsdCost('gpt-4o-mini', 1000, 0);
    const c4o = Lib.calculateUsdCost('gpt-4o', 1000, 0);
    assert.ok(c4o / cMini > 15);
  });

  test('Claude Sonnet 4.6: 1000+500 = $0.0105', () => {
    const c = Lib.calculateUsdCost('claude-sonnet-4-6', 1000, 500);
    assert.equal(c, 0.0105);
  });

  test('Unknown-Model returnt 0', () => {
    assert.equal(Lib.calculateUsdCost('llama-99', 1000, 500), 0);
  });

  test('Null-Tokens returnt 0', () => {
    assert.equal(Lib.calculateUsdCost('gpt-4o', null, null), 0);
  });
});

describe('ki-cost-calc — calculateEurCost', () => {
  test('EUR ≈ USD × 0.92', () => {
    const usd = Lib.calculateUsdCost('gpt-4o', 1000, 500);
    const eur = Lib.calculateEurCost('gpt-4o', 1000, 500);
    assert.ok(Math.abs(eur - usd * 0.92) < 0.0001);
  });
});

describe('ki-cost-calc — Whisper', () => {
  test('1 Minute = $0.006', () => {
    assert.equal(Lib.calculateWhisperUsdCost(1), 0.006);
  });

  test('60 Min Diktat = $0.36', () => {
    assert.equal(Lib.calculateWhisperUsdCost(60), 0.36);
  });
});

describe('ki-cost-calc — buildProtokollPayload', () => {
  test('vollständiger Insert-Payload', () => {
    const p = Lib.buildProtokollPayload({
      user_id: 'u1', workspace_id: 'w1', auftrag_id: 'a1',
      model: 'gpt-4o', model_enum: 'gpt_4o',
      prompt_tokens: 1000, completion_tokens: 500,
      purpose: 'fachurteil_entwurf', input_pseudonymisiert: true
    });
    assert.equal(p.user_id, 'u1');
    assert.equal(p.token_total, 1500);
    assert.ok(p.kosten_eur > 0);
    assert.equal(p.input_pseudonymisiert, true);
    assert.equal(p.purpose, 'fachurteil_entwurf');
    assert.equal(p.status, 'erfolg');
  });

  test('Default-Felder bei fehlenden Inputs', () => {
    const p = Lib.buildProtokollPayload({});
    assert.equal(p.token_total, 0);
    assert.equal(p.purpose, 'sonstiges');
    assert.equal(p.status, 'erfolg');
    assert.ok(p.started_at);
  });
});

describe('ki-cost-calc — PRICING-Konstante', () => {
  test('Backwards-Compat: deprecated gpt-4o/mini bleiben in Tabelle', () => {
    ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-6'].forEach(m => {
      assert.ok(Lib.PRICING[m], m + ' fehlt in PRICING (Backwards-Compat)');
    });
  });

  test('GPT-4o Output 4x teurer als Input', () => {
    const r = Lib.PRICING['gpt-4o'];
    assert.equal(r.completion / r.prompt, 4);
  });
});

describe('ki-cost-calc — W3-I0 GPT-5.x + Claude 4.x Pricing (10.05.2026)', () => {
  test('GPT-5.5 Pricing: $5 prompt / $30 completion', () => {
    assert.equal(Lib.PRICING['gpt-5.5'].prompt, 5.00);
    assert.equal(Lib.PRICING['gpt-5.5'].completion, 30.00);
  });

  test('GPT-5.5 Pro Pricing: $30 / $180 (ultra-kritisch)', () => {
    assert.equal(Lib.PRICING['gpt-5.5-pro'].prompt, 30.00);
    assert.equal(Lib.PRICING['gpt-5.5-pro'].completion, 180.00);
  });

  test('GPT-5.4 Pricing: $2.50 / $15', () => {
    assert.equal(Lib.PRICING['gpt-5.4'].prompt, 2.50);
    assert.equal(Lib.PRICING['gpt-5.4'].completion, 15.00);
  });

  test('GPT-5.4-mini Pricing: $0.40 / $1.60', () => {
    assert.equal(Lib.PRICING['gpt-5.4-mini'].prompt, 0.40);
    assert.equal(Lib.PRICING['gpt-5.4-mini'].completion, 1.60);
  });

  test('Claude Opus 4.7 Pricing definiert', () => {
    const r = Lib.PRICING['claude-opus-4-7'];
    assert.ok(r, 'claude-opus-4-7 fehlt');
    assert.ok(r.prompt > 0 && r.completion > 0);
  });

  test('Claude Sonnet 4.6 Pricing: $3 / $15', () => {
    assert.equal(Lib.PRICING['claude-sonnet-4-6'].prompt, 3.00);
    assert.equal(Lib.PRICING['claude-sonnet-4-6'].completion, 15.00);
  });

  test('Claude Haiku 4.5 Pricing definiert', () => {
    const r = Lib.PRICING['claude-haiku-4-5-20251001'];
    assert.ok(r, 'claude-haiku-4-5-20251001 fehlt');
    assert.ok(r.prompt > 0 && r.completion > 0);
  });

  test('GPT-5.5 ist teurer als GPT-5.4 (Frontier-Premium)', () => {
    assert.ok(Lib.PRICING['gpt-5.5'].prompt > Lib.PRICING['gpt-5.4'].prompt);
  });

  test('GPT-5.4-mini ist günstiger als GPT-5.4 (Light-Tier)', () => {
    assert.ok(Lib.PRICING['gpt-5.4-mini'].prompt < Lib.PRICING['gpt-5.4'].prompt);
  });

  test('calculateUsdCost mit gpt-5.5: 1k prompt + 500 completion = $0.020', () => {
    const c = Lib.calculateUsdCost('gpt-5.5', 1000, 500);
    // 1000 * 5/1M + 500 * 30/1M = 0.005 + 0.015 = 0.020
    assert.equal(c, 0.020);
  });

  test('calculateUsdCost mit claude-opus-4-7 substantially > Sonnet', () => {
    const opus = Lib.calculateUsdCost('claude-opus-4-7', 1000, 500);
    const sonnet = Lib.calculateUsdCost('claude-sonnet-4-6', 1000, 500);
    assert.ok(opus > sonnet * 4); // Opus ~5x teurer als Sonnet
  });
});
