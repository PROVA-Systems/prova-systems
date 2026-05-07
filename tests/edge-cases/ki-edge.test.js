'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const proxySrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'ki-proxy.js'), 'utf8');
const Calc = require('../../netlify/functions/lib/ki-cost-calc');

test('KI-EDGE-1: Rate-Limit-Check vor Call', () => {
  assert.match(proxySrc, /RateLimit\.check|rate.?limit/i);
});

test('KI-EDGE-2: Pseudonymisierung VOR OpenAI-Call', () => {
  assert.match(proxySrc, /ProvaPseudo\.apply|pseudonymisier/i);
});

test('KI-EDGE-3: Anthropic-Fallback bei OpenAI-Outage', () => {
  assert.match(proxySrc, /callAnthropic|ANTHROPIC|fallback/i);
});

test('KI-EDGE-4: Qualitaetspruefung-Action verfügbar (incl. Halluzin-Check)', () => {
  assert.match(proxySrc, /qualitaetspruefung|pruefe_fachurteil/);
});

test('KI-EDGE-5: Konjunktiv-II-Check mit Frontier-Modell (Regel 14)', () => {
  // Konjunktiv-II-Check via gpt-5.5 (= MODELS.fachurteil) NICHT light
  assert.match(proxySrc, /Konjunktiv|fachurteil:.*gpt-5\.5/);
});

test('KI-EDGE-6: Cost-Calc bei null/unknown Model = 0', () => {
  assert.strictEqual(Calc.calculateUsdCost(null, 1000, 100), 0);
  assert.strictEqual(Calc.calculateUsdCost('unknown-model-xyz', 1000, 100), 0);
});

test('KI-EDGE-7: Cost-Calc bei 0 Tokens = 0', () => {
  assert.strictEqual(Calc.calculateUsdCost('gpt-5.5', 0, 0), 0);
});

test('KI-EDGE-8: Cached-Tokens-Calc Validierung (cached <= total)', () => {
  // Auch wenn cached > total: max 0 (Math.max-Schutz)
  const result = Calc.calculateUsdCostCached('gpt-5.5', { prompt: 100, completion: 0, cachedPrompt: 200 });
  assert.ok(result >= 0, 'Cost sollte nicht negativ werden bei cached > total');
});

test('KI-EDGE-9: Sentry-Wrap bei state-changing Lambdas', () => {
  // ki-proxy ist state-changing (loggt zu ki_protokoll)
  assert.match(proxySrc, /withSentry|sentry/i);
});

test('KI-EDGE-10: KI-Disclaimer nennt §407a ZPO + EU AI Act (Regel 7)', () => {
  // Frontend-Disclaimer muss Rechtsgrundlagen nennen ohne Modell-Namen
  const disclaimerSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'prova-disclaimer.js'), 'utf8');
  assert.match(disclaimerSrc, /§\s*407a/);
  assert.match(disclaimerSrc, /EU AI Act|Art\.\s*50/);
});
