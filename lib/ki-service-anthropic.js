/**
 * PROVA — KI-Service Adapter: Anthropic (Claude Sonnet 4.6)
 * MEGA²¹+²² W109 (2026-05-08)
 * Marcel-Direktive: Claude Sonnet 4.6 fuer Vision (Foto-KI)
 *
 * ENV:
 *   ANTHROPIC_API_KEY  — Marcel: bereits in Netlify gesetzt ($50 Credit)
 *
 * Marcel-Decision A3: Feature-Flag steuert Aktivierung
 *   KI_VISION_PROVIDER=anthropic → dieser Adapter
 *   KI_VISION_PROVIDER=openai    → ki-service-openai
 *
 * IMPLEMENTATION-Anmerkung:
 * Anthropic SDK (@anthropic-ai/sdk) wird via fetch() aufgerufen statt
 * npm-Package — Lambda-Bundle-Size-Optimization. fetch ist nativ in Node 18+.
 *
 * Bei Marcel-Wunsch: npm install @anthropic-ai/sdk + Direct-SDK-Use moeglich.
 */
'use strict';

const Interface = require('./ki-service-interface.js');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_VISION_MODEL = 'claude-sonnet-4-6';
const DEFAULT_TEXT_MODEL = 'claude-sonnet-4-6';
const SERVICE_NAME = 'anthropic';

function isAvailable() {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!(key && typeof key === 'string' && key.length > 10);
}

/**
 * Vision-Analyse via Claude Sonnet 4.6.
 *
 * @param {string} imageBase64 — base64-encoded image (without data:URI prefix)
 * @param {object} options
 * @param {string} [options.prompt] — User-prompt (default: Schadens-Erkennung)
 * @param {string} [options.media_type] — 'image/jpeg' | 'image/png'
 * @param {string} [options.model] — default DEFAULT_VISION_MODEL
 * @param {number} [options.max_tokens] — default 1024
 * @param {string} [options.system] — System-Prompt
 * @returns {Promise<{ok, content, model, tokens, cost_eur, error?}>}
 */
async function analyzeImage(imageBase64, options) {
  options = options || {};
  if (!isAvailable()) {
    return Interface.errorResult('ANTHROPIC_API_KEY fehlt', 'CONFIG_MISSING');
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return Interface.errorResult('imageBase64 required', 'BAD_INPUT');
  }

  const model = options.model || DEFAULT_VISION_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mediaType = options.media_type || 'image/jpeg';
  const userPrompt = options.prompt || 'Beschreibe die sichtbaren Schaeden auf diesem Bild im Konjunktiv II. Halte dich strikt an Beobachtungen — keine Bewertungen.';

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options.max_tokens || 1024,
        system: options.system || 'Du bist Sachverstaendigen-Assistent. Strukturierungs-Hilfe, KEINE Bewertungen.',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: userPrompt }
          ]
        }]
      })
    });

    if (!res.ok) {
      const detail = await _safeText(res);
      return Interface.errorResult(
        `Anthropic ${res.status}: ${detail.slice(0, 200)}`,
        'API_FAILED'
      );
    }
    const data = await res.json();
    const content = (data.content || []).map(c => c.text || '').join('\n').trim();
    const usage = data.usage || {};
    const tokensIn = usage.input_tokens || 0;
    const tokensOut = usage.output_tokens || 0;

    return Interface.successResult(content, {
      model: data.model || model,
      tokens: { input: tokensIn, output: tokensOut },
      cost_eur: Interface.calculateCostEur('anthropic', model, tokensIn, tokensOut),
      service: SERVICE_NAME
    });
  } catch (e) {
    return Interface.errorResult('Network: ' + e.message, 'NETWORK');
  }
}

/**
 * Text-Generation via Claude Sonnet 4.6.
 * (Marcel-Direktive G2 sagt OpenAI fuer Text — dieser Adapter ist optional Fallback.)
 *
 * @param {Array} messages — [{role: 'user', content: '...'}, ...]
 * @param {object} options
 * @returns {Promise<{ok, content, model, tokens, cost_eur, error?}>}
 */
async function generateText(messages, options) {
  options = options || {};
  if (!isAvailable()) {
    return Interface.errorResult('ANTHROPIC_API_KEY fehlt', 'CONFIG_MISSING');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Interface.errorResult('messages[] required', 'BAD_INPUT');
  }

  const model = options.model || DEFAULT_TEXT_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Anthropic erwartet system separately, nicht als message-role
  let systemPrompt = options.system || '';
  const filteredMessages = messages.filter(m => m.role !== 'system');
  const systemFromMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  if (systemFromMessages) {
    systemPrompt = systemPrompt ? systemPrompt + '\n' + systemFromMessages : systemFromMessages;
  }

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options.max_tokens || 1024,
        system: systemPrompt || undefined,
        messages: filteredMessages
      })
    });

    if (!res.ok) {
      const detail = await _safeText(res);
      return Interface.errorResult(
        `Anthropic ${res.status}: ${detail.slice(0, 200)}`,
        'API_FAILED'
      );
    }
    const data = await res.json();
    const content = (data.content || []).map(c => c.text || '').join('\n').trim();
    const usage = data.usage || {};
    const tokensIn = usage.input_tokens || 0;
    const tokensOut = usage.output_tokens || 0;

    return Interface.successResult(content, {
      model: data.model || model,
      tokens: { input: tokensIn, output: tokensOut },
      cost_eur: Interface.calculateCostEur('anthropic', model, tokensIn, tokensOut),
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
    ANTHROPIC_API: ANTHROPIC_API,
    DEFAULT_VISION_MODEL: DEFAULT_VISION_MODEL,
    DEFAULT_TEXT_MODEL: DEFAULT_TEXT_MODEL
  }
};
