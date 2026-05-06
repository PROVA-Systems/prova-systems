/**
 * PROVA — Anthropic-Helper Tests (MEGA²⁸ W3-I0)
 *
 * Verifiziert lib/ki-anthropic.js Drop-In-Replacement-Verhalten:
 * - mapOpenAIModelToAnthropic gibt korrekte Anthropic-Modelle zurück
 * - MODEL_MAP enthält aktuelle GPT-5.x → Claude 4.x Mappings
 * - adaptOpenAIRequestToAnthropic transformiert messages korrekt
 * - adaptAnthropicResponse hat OpenAI-kompatible Shape
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Anthropic = require(path.join(ROOT, 'netlify/functions/lib/ki-anthropic.js'));

describe('Anthropic-Helper — MODEL_MAP (W3-I0)', () => {
  test('GPT-5.5 → claude-opus-4-7 (Frontier → Frontier)', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-5.5'], 'claude-opus-4-7');
  });

  test('GPT-5.5 Pro → claude-opus-4-7', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-5.5-pro'], 'claude-opus-4-7');
  });

  test('GPT-5.4 → claude-sonnet-4-6 (Mid → Mid)', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-5.4'], 'claude-sonnet-4-6');
  });

  test('GPT-5.4-mini → claude-haiku-4-5-20251001 (Light → Light)', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-5.4-mini'], 'claude-haiku-4-5-20251001');
  });

  test('GPT-5.4-nano → claude-haiku-4-5-20251001', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-5.4-nano'], 'claude-haiku-4-5-20251001');
  });

  test('Backwards-Compat: deprecated gpt-4o → claude-sonnet-4-6', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-4o'], 'claude-sonnet-4-6');
  });

  test('Backwards-Compat: deprecated gpt-4o-mini → claude-haiku-4-5', () => {
    assert.equal(Anthropic.MODEL_MAP['gpt-4o-mini'], 'claude-haiku-4-5-20251001');
  });
});

describe('Anthropic-Helper — mapOpenAIModelToAnthropic', () => {
  test('Mapping case-insensitive', () => {
    assert.equal(Anthropic.mapOpenAIModelToAnthropic('GPT-5.5'), 'claude-opus-4-7');
    assert.equal(Anthropic.mapOpenAIModelToAnthropic('gpt-5.5'), 'claude-opus-4-7');
  });

  test('Unbekanntes Modell → sicherer Default claude-sonnet-4-6', () => {
    assert.equal(Anthropic.mapOpenAIModelToAnthropic('llama-99'), 'claude-sonnet-4-6');
    assert.equal(Anthropic.mapOpenAIModelToAnthropic(''), 'claude-sonnet-4-6');
    assert.equal(Anthropic.mapOpenAIModelToAnthropic(null), 'claude-sonnet-4-6');
  });
});

describe('Anthropic-Helper — adaptOpenAIRequestToAnthropic', () => {
  test('extrahiert system-Prompt aus messages-Array', () => {
    const params = {
      model: 'gpt-5.4',
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'Du bist Bauschaden-SV.' },
        { role: 'user', content: 'Gibt es Schimmel?' }
      ]
    };
    const adapted = Anthropic.adaptOpenAIRequestToAnthropic(params);
    assert.ok(adapted.system, 'system-Prompt fehlt im Anthropic-Request');
    assert.match(adapted.system, /Bauschaden-SV/);
    // user-Messages bleiben in messages-Array
    assert.equal(adapted.messages.length, 1);
    assert.equal(adapted.messages[0].role, 'user');
  });

  test('OpenAI-Modell-String wird via MODEL_MAP übersetzt', () => {
    const params = {
      model: 'gpt-5.5',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Test' }]
    };
    const adapted = Anthropic.adaptOpenAIRequestToAnthropic(params);
    assert.equal(adapted.model, 'claude-opus-4-7');
  });

  test('explicit Claude-Modell wird DURCHgereicht', () => {
    const params = {
      model: 'claude-opus-4-7',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Test' }]
    };
    const adapted = Anthropic.adaptOpenAIRequestToAnthropic(params);
    assert.equal(adapted.model, 'claude-opus-4-7');
  });
});

describe('Anthropic-Helper — adaptAnthropicResponse', () => {
  test('Anthropic-Response wird in OpenAI-Shape umgewandelt', () => {
    const anthropicRes = {
      content: [{ type: 'text', text: 'Es liegt nahe, dass Schimmel vorliegt.' }],
      usage: { input_tokens: 50, output_tokens: 25 },
      stop_reason: 'end_turn'
    };
    const adapted = Anthropic.adaptAnthropicResponse(anthropicRes, 'claude-opus-4-7');
    assert.ok(adapted.choices, 'choices-Array fehlt');
    assert.equal(adapted.choices.length, 1);
    assert.equal(adapted.choices[0].message.role, 'assistant');
    assert.match(adapted.choices[0].message.content, /Schimmel/);
    // Usage in OpenAI-Format
    assert.equal(adapted.usage.prompt_tokens, 50);
    assert.equal(adapted.usage.completion_tokens, 25);
    assert.equal(adapted.model, 'claude-opus-4-7');
  });
});
