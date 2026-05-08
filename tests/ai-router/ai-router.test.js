'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Router = require('../../netlify/functions/lib/ai-router');

test('chooseModel: fachurteil_entwurf → gpt-5.5 (Frontier)', () => {
  assert.strictEqual(Router.chooseModel('fachurteil_entwurf', 'schnell'), 'gpt-5.5');
  assert.strictEqual(Router.chooseModel('konsistenz_check', 'schnell'), 'gpt-5.5');
});

test('chooseModel: freitext schnell → gpt-5.4-mini', () => {
  assert.strictEqual(Router.chooseModel('freitext', 'schnell'), 'gpt-5.4-mini');
});

test('chooseModel: freitext praezise → eskaliert auf gpt-5.5', () => {
  assert.strictEqual(Router.chooseModel('freitext', 'praezise'), 'gpt-5.5');
  assert.strictEqual(Router.chooseModel('support_chat', 'praezise'), 'gpt-5.5');
});

test('chooseModel: unbekannte Funktion → freitext-Default', () => {
  assert.strictEqual(Router.chooseModel('unknown', 'schnell'), 'gpt-5.4-mini');
});

test('chooseModel: assist_inline bleibt gpt-5.4 in beiden Modi', () => {
  // assist_inline ist bereits Mid-Tier — bleibt
  assert.strictEqual(Router.chooseModel('assist_inline', 'schnell'), 'gpt-5.4');
  assert.strictEqual(Router.chooseModel('assist_inline', 'praezise'), 'gpt-5.4');
});

test('getBackupModel: Anthropic-Mapping', () => {
  assert.strictEqual(Router.getBackupModel('fachurteil_entwurf'), 'claude-opus-4-7');
  assert.strictEqual(Router.getBackupModel('assist_inline'), 'claude-sonnet-4-6');
  assert.strictEqual(Router.getBackupModel('freitext'), 'claude-haiku-4-5-20251001');
});

test('getModelCost: gpt-5.4-mini 1000 in / 500 out', () => {
  // 1000 * 0.40/1M + 500 * 1.60/1M = 0.0004 + 0.0008 = 0.0012 USD * 0.92 = 0.001104 EUR
  const cost = Router.getModelCost('gpt-5.4-mini', 1000, 500, 0);
  assert.ok(cost > 0 && cost < 0.01, `expected 0..0.01, got ${cost}`);
});

test('getModelCost: gpt-5.5 10000 in / 5000 out', () => {
  // 10k * 5/1M + 5k * 30/1M = 0.05 + 0.15 = 0.20 USD * 0.92 = 0.184 EUR
  const cost = Router.getModelCost('gpt-5.5', 10000, 5000, 0);
  assert.ok(cost > 0.15 && cost < 0.20, `expected ~0.184, got ${cost}`);
});

test('getModelCost: cached_tokens_in reduziert Kosten', () => {
  // Mit caching: 8k uncached + 2k cached vs 10k uncached
  const withoutCache = Router.getModelCost('gpt-5.5', 10000, 5000, 0);
  const withCache = Router.getModelCost('gpt-5.5', 10000, 5000, 2000);
  assert.ok(withCache < withoutCache, 'Cached muss billiger sein');
});

test('getModelCost: unbekanntes Modell → 0', () => {
  assert.strictEqual(Router.getModelCost('unknown-model', 1000, 500, 0), 0);
});

test('MODEL_MAP enthält alle Vision-Funktionen', () => {
  ['fachurteil_entwurf', 'pruefe_fachurteil', 'qualitaetspruefung', 'konsistenz_check',
   'assist_inline', 'freitext', 'support_chat', 'normen_picker', 'foto_captioning', 'whisper'
  ].forEach(f => assert.ok(Router.MODEL_MAP[f], `MODEL_MAP[${f}] fehlt`));
});

test('BACKUP_MAP deckt 9 Funktionen', () => {
  const keys = Object.keys(Router.BACKUP_MAP);
  assert.ok(keys.length >= 9);
});

test('Health-Check: Mock-fetch + Cache-Verhalten', async () => {
  Router._resetHealthCache();
  const origFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async () => { fetchCount++; return { status: 200, ok: true }; };
  try {
    const r1 = await Router.checkProviderHealth('openai');
    assert.strictEqual(r1.ok, true);
    assert.strictEqual(r1.cached, false);
    const r2 = await Router.checkProviderHealth('openai');
    assert.strictEqual(r2.cached, true, 'zweiter Call sollte gecached sein');
    assert.strictEqual(fetchCount, 1, 'fetch nur 1× trotz 2 Calls');
  } finally { global.fetch = origFetch; }
});

test('Health-Check: unknown provider → ok=false', async () => {
  Router._resetHealthCache();
  const r = await Router.checkProviderHealth('grok');
  assert.strictEqual(r.ok, false);
});
