/**
 * PROVA — KI-Service Adapter: OpenAI (GPT-4o + GPT-4o-mini)
 * MEGA²¹+²² W109 (2026-05-08)
 * Marcel-Decision G2: gpt-4o + gpt-4o-mini behalten (KEIN GPT-5.4!)
 *
 * ENV:
 *   OPENAI_API_KEY  — existing in Netlify
 *
 * Bestehende ki-proxy.js Logic ist umfangreicher (Pseudonymisierung,
 * Fachwissen-Injection, Aufgaben-Router). Dieser Adapter ist eine
 * thin layer fuer das KI-Service-Interface — bestehende ki-proxy.js
 * bleibt aktiv fuer komplexe Aufgaben.
 */
'use strict';

const Interface = require('./ki-service-interface.js');

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
// MEGA²⁸ W3-I0 (10.05.2026): GPT-4o + GPT-4o-mini sind deprecated.
const DEFAULT_VISION_MODEL = 'gpt-5.4-mini'; // Vision-Captioning, mechanisch
const DEFAULT_TEXT_MODEL = 'gpt-5.4-mini';   // Light-Tier Default
const SERVICE_NAME = 'openai';

function isAvailable() {
  const key = process.env.OPENAI_API_KEY;
  return !!(key && typeof key === 'string' && key.length > 10);
}

/**
 * Vision-Analyse via GPT-4o.
 *
 * @param {string} imageBase64
 * @param {object} options
 * @returns {Promise<{ok, content, model, tokens, cost_eur, error?}>}
 */
async function analyzeImage(imageBase64, options) {
  options = options || {};
  if (!isAvailable()) {
    return Interface.errorResult('OPENAI_API_KEY fehlt', 'CONFIG_MISSING');
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return Interface.errorResult('imageBase64 required', 'BAD_INPUT');
  }

  const model = options.model || DEFAULT_VISION_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  const mediaType = options.media_type || 'image/jpeg';
  const userPrompt = options.prompt || 'Beschreibe die sichtbaren Schaeden auf diesem Bild im Konjunktiv II. Halte dich strikt an Beobachtungen — keine Bewertungen.';

  const systemPrompt = options.system || 'Du bist Sachverstaendigen-Assistent. Strukturierungs-Hilfe, KEINE Bewertungen.';

  try {
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options.max_tokens || 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
            { type: 'text', text: userPrompt }
          ]}
        ]
      })
    });

    if (!res.ok) {
      const detail = await _safeText(res);
      return Interface.errorResult(
        `OpenAI ${res.status}: ${detail.slice(0, 200)}`,
        'API_FAILED'
      );
    }
    const data = await res.json();
    const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const usage = data.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;

    return Interface.successResult(content.trim(), {
      model: data.model || model,
      tokens: { input: tokensIn, output: tokensOut },
      cost_eur: Interface.calculateCostEur('openai', model, tokensIn, tokensOut),
      service: SERVICE_NAME
    });
  } catch (e) {
    return Interface.errorResult('Network: ' + e.message, 'NETWORK');
  }
}

/**
 * Text-Generation via GPT-4o / GPT-4o-mini.
 *
 * @param {Array} messages — [{role, content}, ...]
 * @param {object} options
 *   options.model — default GPT-4o-mini fuer schnell, GPT-4o fuer praezise
 * @returns {Promise<{ok, content, model, tokens, cost_eur, error?}>}
 */
async function generateText(messages, options) {
  options = options || {};
  if (!isAvailable()) {
    return Interface.errorResult('OPENAI_API_KEY fehlt', 'CONFIG_MISSING');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Interface.errorResult('messages[] required', 'BAD_INPUT');
  }

  const model = options.model || DEFAULT_TEXT_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature != null ? options.temperature : 0.3,
        messages: messages
      })
    });

    if (!res.ok) {
      const detail = await _safeText(res);
      return Interface.errorResult(
        `OpenAI ${res.status}: ${detail.slice(0, 200)}`,
        'API_FAILED'
      );
    }
    const data = await res.json();
    const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const usage = data.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;

    return Interface.successResult(content.trim(), {
      model: data.model || model,
      tokens: { input: tokensIn, output: tokensOut },
      cost_eur: Interface.calculateCostEur('openai', model, tokensIn, tokensOut),
      service: SERVICE_NAME
    });
  } catch (e) {
    return Interface.errorResult('Network: ' + e.message, 'NETWORK');
  }
}

async function _safeText(res) {
  try { return (await res.text()) || ''; } catch (_) { return ''; }
}

module.exports = {
  serviceName: SERVICE_NAME,
  isAvailable: isAvailable,
  analyzeImage: analyzeImage,
  generateText: generateText,
  _config: {
    OPENAI_API: OPENAI_API,
    DEFAULT_VISION_MODEL: DEFAULT_VISION_MODEL,
    DEFAULT_TEXT_MODEL: DEFAULT_TEXT_MODEL
  }
};
