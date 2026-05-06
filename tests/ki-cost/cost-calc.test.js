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
  test('alle 4 Modelle definiert', () => {
    ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-6'].forEach(m => {
      assert.ok(Lib.PRICING[m], m + ' fehlt in PRICING');
    });
  });

  test('GPT-4o Output 4x teurer als Input', () => {
    const r = Lib.PRICING['gpt-4o'];
    assert.equal(r.completion / r.prompt, 4);
  });
});
