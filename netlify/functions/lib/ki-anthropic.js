/**
 * PROVA Anthropic-Wrapper (KI-Fallback)
 * MEGA¹² W12 (Tier 5a, 2026-05-05)
 *
 * OpenAI-kompatibler Wrapper um Anthropic Messages API.
 * Wird bei OpenAI-Outage (5xx, network, timeout) als Fallback aufgerufen.
 *
 * API-Spec:
 *   POST https://api.anthropic.com/v1/messages
 *   Headers: x-api-key, anthropic-version: '2023-06-01', content-type: application/json
 *   Body: { model, max_tokens, system?, messages: [{role, content}] }
 *
 * Differenzen zu OpenAI:
 *   - System-Prompt ist top-level Parameter (nicht in messages-Array als role:'system')
 *   - Response-Shape: { content: [{ type:'text', text:'...' }], usage: {...} }
 *   - Model-Names: claude-{family}-{version}
 *
 * Public API:
 *   callAnthropic(params, apiKey) → openai-kompatible response
 *   mapOpenAIModelToAnthropic(model)
 *   adaptAnthropicResponse(response, modelName)
 *   adaptOpenAIRequestToAnthropic(params)
 *
 * USAGE:
 *   const { callAnthropic } = require('./lib/ki-anthropic');
 *   const result = await callAnthropic({
 *     model: 'claude-sonnet-4-6',
 *     max_tokens: 1200,
 *     messages: [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]
 *   }, process.env.ANTHROPIC_API_KEY);
 *
 *   // result hat OpenAI-Shape:
 *   // { choices: [{ message: { content: '...' } }], model, usage: { prompt_tokens, completion_tokens } }
 */
'use strict';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Model-Mapping OpenAI → Anthropic
// Pflichtenheft: gpt-4o = "schwere" Aufgaben (Konjunktiv-II, Halluzinations-Check)
//                gpt-4o-mini = "leichte" Aufgaben (Rechtschreibung, Kurz-Texte)
// Anthropic-Aequivalente per CLAUDE.md (latest):
//                Claude Sonnet 4.6 fuer schwer
//                Claude Haiku 4.5 fuer leicht
const MODEL_MAP = {
  'gpt-4o': 'claude-sonnet-4-6',
  'gpt-4o-mini': 'claude-haiku-4-5-20251001',
  'gpt-4': 'claude-sonnet-4-6',
  'gpt-4-turbo': 'claude-sonnet-4-6',
  'gpt-3.5-turbo': 'claude-haiku-4-5-20251001'
};

function mapOpenAIModelToAnthropic(openaiModel) {
  const m = String(openaiModel || '').toLowerCase();
  return MODEL_MAP[m] || 'claude-sonnet-4-6';  // sicherer Default
}

/**
 * Konvertiert ein OpenAI-Request-Objekt in ein Anthropic-kompatibles.
 *
 * OpenAI: messages = [{ role: 'system', ... }, { role: 'user', ... }]
 * Anthropic: system = "...", messages = [{ role: 'user', ... }]
 */
function adaptOpenAIRequestToAnthropic(params) {
  const messages = Array.isArray(params.messages) ? params.messages : [];

  // Extract system prompt (kann mehrfach in OpenAI sein, wird concat'd)
  const systemMessages = messages.filter(m => m && m.role === 'system');
  const nonSystemMessages = messages.filter(m => m && m.role !== 'system');

  const systemContent = systemMessages
    .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
    .filter(Boolean)
    .join('\n\n');

  const result = {
    model: mapOpenAIModelToAnthropic(params.model),
    max_tokens: params.max_tokens || 1024,
    messages: nonSystemMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }))
  };

  if (systemContent) {
    result.system = systemContent;
  }

  if (typeof params.temperature === 'number') {
    result.temperature = params.temperature;
  }

  return result;
}

/**
 * Konvertiert Anthropic-Response in OpenAI-kompatibles Shape.
 *
 * Anthropic: { content: [{ type: 'text', text: '...' }], usage: { input_tokens, output_tokens } }
 * OpenAI:    { choices: [{ message: { role: 'assistant', content: '...' } }], usage: { prompt_tokens, completion_tokens } }
 */
function adaptAnthropicResponse(response, openaiModelName) {
  const content = Array.isArray(response.content) ? response.content : [];
  // Concat alle text-Blocks (Anthropic kann multi-block antworten, z.B. tool_use)
  const text = content
    .filter(b => b && b.type === 'text')
    .map(b => b.text || '')
    .join('');

  const usage = response.usage || {};

  return {
    id: response.id || 'anthropic-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: openaiModelName,  // Original-OpenAI-Model fuer downstream-Code-Kompat
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: text
      },
      finish_reason: response.stop_reason === 'end_turn' ? 'stop'
                   : response.stop_reason === 'max_tokens' ? 'length'
                   : 'stop'
    }],
    usage: {
      prompt_tokens: usage.input_tokens || 0,
      completion_tokens: usage.output_tokens || 0,
      total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
    },
    // Marker fuer downstream (User-Badge, Audit-Logging)
    _provider: 'anthropic',
    _anthropic_model: response.model
  };
}

/**
 * Aufruf der Anthropic-API mit OpenAI-kompatiblem Interface.
 *
 * @param {object} params - OpenAI-Style Request: { model, max_tokens, messages, temperature? }
 * @param {string} apiKey - ANTHROPIC_API_KEY
 * @returns {Promise<object>} OpenAI-kompatible Response
 */
async function callAnthropic(params, apiKey) {
  if (!apiKey) {
    throw new Error('Anthropic-API-Key fehlt (ANTHROPIC_API_KEY)');
  }

  const adapted = adaptOpenAIRequestToAnthropic(params);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify(adapted)
  });

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch (_) {}
    const detail = errBody?.error?.message || errBody?.message || 'Fehler';
    throw new Error('Anthropic ' + response.status + ': ' + detail);
  }

  const json = await response.json();
  return adaptAnthropicResponse(json, params.model);
}

/**
 * Detection ob ein OpenAI-Error ein Outage-Indicator ist (= Fallback aktivieren).
 *
 * 5xx = Server-Fehler bei OpenAI
 * Network/Timeout = Connection-Problem
 *
 * 4xx (z.B. 401, 429) = NICHT Outage — falsche API-Key oder Rate-Limit, kein Fallback!
 *
 * @param {Error|string} err
 * @returns {boolean}
 */
function isOutageError(err) {
  const msg = String((err && err.message) || err || '');
  // OpenAI 5xx
  if (/OpenAI 5\d\d/i.test(msg)) return true;
  // Network errors
  if (/network/i.test(msg)) return true;
  if (/timeout/i.test(msg)) return true;
  if (/ENOTFOUND/i.test(msg)) return true;
  if (/ETIMEDOUT/i.test(msg)) return true;
  if (/ECONNRESET/i.test(msg)) return true;
  if (/ECONNREFUSED/i.test(msg)) return true;
  if (/socket hang up/i.test(msg)) return true;
  // fetch-spezifische Fehler
  if (/fetch failed/i.test(msg)) return true;
  return false;
}

module.exports = {
  callAnthropic,
  mapOpenAIModelToAnthropic,
  adaptAnthropicResponse,
  adaptOpenAIRequestToAnthropic,
  isOutageError,
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  MODEL_MAP
};
