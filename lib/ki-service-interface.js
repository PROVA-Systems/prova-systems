/**
 * PROVA — KI-Service-Interface (Service-Abstraction-Layer)
 * MEGA²¹+²² W109 (2026-05-08)
 * Marcel-Decision H1: analog MEGA¹⁸ pdf-service-interface Pattern
 *
 * Zweck: Multi-Provider-Routing fuer KI-Calls (Vision + Text + Audio).
 * Ermoeglicht Marcel-Decision A3 (Feature-Flag): Provider switchen via ENV
 * ohne Frontend-Refactor.
 *
 * Adapter-Implementations:
 *   - lib/ki-service-anthropic.js  — Claude Sonnet 4.6 (Vision-Primary, Marcel-Direktive)
 *   - lib/ki-service-openai.js     — GPT-4o + GPT-4o-mini (Marcel-G2: KEIN GPT-5.4)
 *
 * Jeder Adapter MUSS implementieren:
 *   async analyzeImage(imageBase64, options) → { ok, content, model, tokens, cost_eur, error? }
 *   async generateText(messages, options)    → { ok, content, model, tokens, cost_eur, error? }
 *   isAvailable() → boolean
 *   serviceName: string
 *
 * ENV-Switch (Marcel-A3 Feature-Flag):
 *   KI_VISION_PROVIDER  = 'anthropic' (default) | 'openai'
 *   KI_TEXT_PROVIDER    = 'openai' (default) | 'anthropic'
 *
 * Anti-Patterns vermieden:
 *   - Service-Lock-In zu OpenAI (MEGA²² Konflikt 2)
 *   - Kein Routing ohne Audit (logKiCall pflicht in jedem Adapter)
 *   - Cost-Tracking-Hidden (cost_eur explizit returned)
 */
'use strict';

const SERVICE_NAMES = ['anthropic', 'openai'];
const DEFAULTS = {
  vision: 'anthropic',  // Marcel-Direktive: Claude Sonnet 4.6 fuer Vision
  text: 'openai'        // Marcel-G2: gpt-4o + gpt-4o-mini behalten
};

let _cachedServices = {};

function resolveProvider(useCase) {
  const envKey = 'KI_' + (useCase || 'TEXT').toUpperCase() + '_PROVIDER';
  const env = (process.env[envKey] || '').toLowerCase().trim();
  if (env && SERVICE_NAMES.indexOf(env) !== -1) {
    return env;
  }
  return DEFAULTS[useCase] || DEFAULTS.text;
}

function getService(useCase) {
  const wantedName = resolveProvider(useCase);
  const cacheKey = wantedName;
  if (_cachedServices[cacheKey]) {
    return _cachedServices[cacheKey];
  }
  let svc;
  switch (wantedName) {
    case 'anthropic':
      svc = require('./ki-service-anthropic.js');
      break;
    case 'openai':
      svc = require('./ki-service-openai.js');
      break;
    default:
      throw new Error('Unknown KI provider: ' + wantedName);
  }
  _cachedServices[cacheKey] = svc;
  return svc;
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') return false;
  if (typeof adapter.serviceName !== 'string') return false;
  if (typeof adapter.isAvailable !== 'function') return false;
  if (typeof adapter.analyzeImage !== 'function') return false;
  if (typeof adapter.generateText !== 'function') return false;
  return true;
}

function errorResult(message, code) {
  return {
    ok: false,
    content: null,
    model: null,
    tokens: { input: 0, output: 0 },
    cost_eur: 0,
    error: String(message || 'unknown error'),
    code: code || 'UNKNOWN'
  };
}

function successResult(content, extras) {
  return Object.assign({
    ok: true,
    content: content,
    error: null
  }, extras || {});
}

/**
 * Cost-Calculation Helper (Marcel-Decision I1: kosten_eur fuer ki_protokoll).
 * @param {string} provider 'anthropic' | 'openai'
 * @param {string} model
 * @param {number} tokensIn
 * @param {number} tokensOut
 * @returns {number} cost in EUR (6 decimals like ki_protokoll.kosten_eur)
 */
function calculateCostEur(provider, model, tokensIn, tokensOut) {
  // Stand 2026 — Preise sind grobe Schaetzung, Marcel kann nachjustieren
  const PRICES_USD_PER_1M = {
    'claude-sonnet-4-6':       { input: 3.00,  output: 15.00 },  // Anthropic Sonnet
    'claude-3-5-sonnet':       { input: 3.00,  output: 15.00 },
    'gpt-4o':                  { input: 2.50,  output: 10.00 },
    'gpt-4o-mini':             { input: 0.15,  output: 0.60 },
    'whisper-1':               { input: 0.006, output: 0 }       // pro Minute, hier Token-Fake
  };
  const USD_TO_EUR = 0.92;  // grobe Konversion
  const p = PRICES_USD_PER_1M[model] || PRICES_USD_PER_1M['gpt-4o-mini'];
  const usd = (tokensIn / 1e6) * p.input + (tokensOut / 1e6) * p.output;
  return Number((usd * USD_TO_EUR).toFixed(6));
}

function _resetCache() {
  _cachedServices = {};
}

module.exports = {
  getService: getService,
  resolveProvider: resolveProvider,
  validateAdapter: validateAdapter,
  errorResult: errorResult,
  successResult: successResult,
  calculateCostEur: calculateCostEur,
  SERVICE_NAMES: SERVICE_NAMES,
  DEFAULTS: DEFAULTS,
  _resetCache: _resetCache
};
