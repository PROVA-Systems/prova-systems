'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Helper = require('../ki-funktionen-live/_helper');
const liveTestSrc = fs.readFileSync(path.join(__dirname, '..', 'ki-funktionen-live', '10-ki-functions.live.test.js'), 'utf8');
const helperSrc = fs.readFileSync(path.join(__dirname, '..', 'ki-funktionen-live', '_helper.js'), 'utf8');

test('C1-META-1: Helper exportiert callOpenAI + estimateCostEur + skipIfNoKey', () => {
  ['callOpenAI', 'estimateCostEur', 'skipIfNoKey', 'getApiKey'].forEach(fn => {
    assert.strictEqual(typeof Helper[fn], 'function');
  });
  assert.strictEqual(typeof Helper.SKIP_REASON, 'string');
});

test('C1-META-2: skipIfNoKey true wenn ENV leer', () => {
  delete process.env.OPENAI_API_KEY;
  assert.strictEqual(Helper.skipIfNoKey(), true);
  process.env.OPENAI_API_KEY = 'sk-test';
  assert.strictEqual(Helper.skipIfNoKey(), false);
  delete process.env.OPENAI_API_KEY;
});

test('C1-META-3: estimateCostEur mit Standard-Tokens < 0.001€', () => {
  const cost = Helper.estimateCostEur({ prompt_tokens: 200, completion_tokens: 100 }, 'gpt-5.4-mini');
  assert.ok(cost < 0.001, 'Cost ' + cost + '€ sollte < 0.001€ sein');
  assert.ok(cost > 0, 'Cost sollte > 0 sein');
});

test('C1-META-4: 10 KI-Funktionen + 2 Spezial-Tests in Live-Suite', () => {
  // 10 KI_FUNCTIONS-Items + 1 Konjunktiv + 1 Halluzin
  const matches = liveTestSrc.match(/test\('KI-Live/g) || [];
  // Eigentliche Test-Calls: 10 forEach-generierte + 2 spezifische
  assert.ok(matches.length >= 2, 'KI-Live-Tests sollten >=2 sein');
  // KI-Funktionen-Array hat 10 Einträge
  const fnMatches = liveTestSrc.match(/{ id: '/g) || [];
  assert.strictEqual(fnMatches.length, 10);
});

test('C1-META-5: Konjunktiv-Verify nutzt GPT-5.5 (Regel 14)', () => {
  assert.match(liveTestSrc, /Konjunktiv-II-Verify mit GPT-5\.5/);
  assert.match(liveTestSrc, /model:\s*'gpt-5\.5'[^}]*Konjunktiv|Konjunktiv[\s\S]*?model:\s*'gpt-5\.5'/);
});

test('C1-META-6: Helper hat Cost-Estimation pro Modell (3 Modelle)', () => {
  assert.match(helperSrc, /'gpt-5\.4-mini':/);
  assert.match(helperSrc, /'gpt-5\.4':/);
  assert.match(helperSrc, /'gpt-5\.5':/);
});
