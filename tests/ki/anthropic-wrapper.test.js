/**
 * PROVA — Anthropic-Wrapper Tests
 * MEGA¹² W12 (2026-05-05)
 *
 * Testet:
 *   - mapOpenAIModelToAnthropic (Model-Mapping)
 *   - adaptOpenAIRequestToAnthropic (System-Prompt-Extraction, Message-Mapping)
 *   - adaptAnthropicResponse (Response-Shape-Conversion)
 *   - isOutageError (Detection-Logic)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  mapOpenAIModelToAnthropic,
  adaptOpenAIRequestToAnthropic,
  adaptAnthropicResponse,
  isOutageError,
  MODEL_MAP,
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION
} = require('../../netlify/functions/lib/ki-anthropic');

describe('mapOpenAIModelToAnthropic — Model-Mapping', () => {

  test('gpt-4o → claude-sonnet-4-6 (schwere Aufgaben)', () => {
    assert.equal(mapOpenAIModelToAnthropic('gpt-4o'), 'claude-sonnet-4-6');
  });

  test('gpt-4o-mini → claude-haiku (leichte Aufgaben)', () => {
    assert.match(mapOpenAIModelToAnthropic('gpt-4o-mini'), /^claude-haiku-/);
  });

  test('gpt-4 → claude-sonnet (Legacy-Mapping)', () => {
    assert.equal(mapOpenAIModelToAnthropic('gpt-4'), 'claude-sonnet-4-6');
  });

  test('Unbekanntes Model → claude-sonnet-Default', () => {
    assert.equal(mapOpenAIModelToAnthropic('unknown-model'), 'claude-sonnet-4-6');
    assert.equal(mapOpenAIModelToAnthropic(''), 'claude-sonnet-4-6');
    assert.equal(mapOpenAIModelToAnthropic(null), 'claude-sonnet-4-6');
    assert.equal(mapOpenAIModelToAnthropic(undefined), 'claude-sonnet-4-6');
  });

  test('Case-Insensitive Mapping', () => {
    assert.equal(mapOpenAIModelToAnthropic('GPT-4o'), 'claude-sonnet-4-6');
    assert.equal(mapOpenAIModelToAnthropic('GPT-4O'), 'claude-sonnet-4-6');
  });
});

describe('adaptOpenAIRequestToAnthropic — Request-Conversion', () => {

  test('System-Prompt extracted und top-level placiert', () => {
    const req = adaptOpenAIRequestToAnthropic({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: 'Du bist ein SV.' },
        { role: 'user', content: 'Was ist DIN 4108?' }
      ]
    });
    assert.equal(req.system, 'Du bist ein SV.');
    assert.equal(req.messages.length, 1);
    assert.equal(req.messages[0].role, 'user');
    assert.equal(req.messages[0].content, 'Was ist DIN 4108?');
  });

  test('Mehrere System-Messages werden konkateniert', () => {
    const req = adaptOpenAIRequestToAnthropic({
      messages: [
        { role: 'system', content: 'Sys 1' },
        { role: 'system', content: 'Sys 2' },
        { role: 'user', content: 'Hi' }
      ]
    });
    assert.match(req.system, /Sys 1[\s\S]*Sys 2/);
  });

  test('Kein System-Prompt = system-Feld undefined', () => {
    const req = adaptOpenAIRequestToAnthropic({
      messages: [{ role: 'user', content: 'Hi' }]
    });
    assert.equal(req.system, undefined);
    assert.equal(req.messages.length, 1);
  });

  test('Default max_tokens = 1024', () => {
    const req = adaptOpenAIRequestToAnthropic({
      messages: [{ role: 'user', content: 'Hi' }]
    });
    assert.equal(req.max_tokens, 1024);
  });

  test('Explizite max_tokens werden uebernommen', () => {
    const req = adaptOpenAIRequestToAnthropic({
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    assert.equal(req.max_tokens, 4096);
  });

  test('Temperature wird durchgereicht', () => {
    const req = adaptOpenAIRequestToAnthropic({
      temperature: 0.3,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    assert.equal(req.temperature, 0.3);
  });

  test('Assistant-Role bleibt erhalten', () => {
    const req = adaptOpenAIRequestToAnthropic({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hallo!' },
        { role: 'user', content: 'Wie geht es?' }
      ]
    });
    assert.equal(req.messages[1].role, 'assistant');
  });

  test('Nicht-String-Content wird zu JSON serialisiert', () => {
    const req = adaptOpenAIRequestToAnthropic({
      messages: [{ role: 'user', content: { text: 'foo' } }]
    });
    assert.equal(typeof req.messages[0].content, 'string');
    assert.ok(req.messages[0].content.includes('foo'));
  });
});

describe('adaptAnthropicResponse — Response-Conversion', () => {

  test('Basic Anthropic-Response → OpenAI-kompatibel', () => {
    const anthropic = {
      id: 'msg_123',
      content: [{ type: 'text', text: 'Hallo!' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
      model: 'claude-sonnet-4-6'
    };
    const result = adaptAnthropicResponse(anthropic, 'gpt-4o');
    assert.equal(result.choices[0].message.content, 'Hallo!');
    assert.equal(result.choices[0].message.role, 'assistant');
    assert.equal(result.choices[0].finish_reason, 'stop');
    assert.equal(result.usage.prompt_tokens, 10);
    assert.equal(result.usage.completion_tokens, 5);
    assert.equal(result.usage.total_tokens, 15);
    assert.equal(result.model, 'gpt-4o');  // Original-Name preserved
    assert.equal(result._provider, 'anthropic');
    assert.equal(result._anthropic_model, 'claude-sonnet-4-6');
  });

  test('Multi-Block-Response (text-only blocks concatenated)', () => {
    const anthropic = {
      content: [
        { type: 'text', text: 'Teil 1. ' },
        { type: 'text', text: 'Teil 2.' }
      ],
      usage: { input_tokens: 5, output_tokens: 3 }
    };
    const result = adaptAnthropicResponse(anthropic, 'gpt-4o-mini');
    assert.equal(result.choices[0].message.content, 'Teil 1. Teil 2.');
  });

  test('stop_reason "max_tokens" → finish_reason "length"', () => {
    const anthropic = {
      content: [{ type: 'text', text: 'truncated...' }],
      stop_reason: 'max_tokens',
      usage: {}
    };
    const result = adaptAnthropicResponse(anthropic, 'gpt-4o');
    assert.equal(result.choices[0].finish_reason, 'length');
  });

  test('Fehlende usage = 0 tokens', () => {
    const result = adaptAnthropicResponse({ content: [{ type: 'text', text: 'x' }] }, 'gpt-4o');
    assert.equal(result.usage.prompt_tokens, 0);
    assert.equal(result.usage.completion_tokens, 0);
    assert.equal(result.usage.total_tokens, 0);
  });

  test('Fehlende content = leerer String', () => {
    const result = adaptAnthropicResponse({}, 'gpt-4o');
    assert.equal(result.choices[0].message.content, '');
  });
});

describe('isOutageError — Outage-Detection', () => {

  test('OpenAI 5xx = Outage', () => {
    assert.equal(isOutageError(new Error('OpenAI 500: Internal Server Error')), true);
    assert.equal(isOutageError(new Error('OpenAI 502: Bad Gateway')), true);
    assert.equal(isOutageError(new Error('OpenAI 503: Service Unavailable')), true);
    assert.equal(isOutageError(new Error('OpenAI 504: Gateway Timeout')), true);
  });

  test('OpenAI 4xx = NICHT Outage (Auth/Rate-Limit/Bad-Request)', () => {
    assert.equal(isOutageError(new Error('OpenAI 401: Invalid API key')), false);
    assert.equal(isOutageError(new Error('OpenAI 403: Forbidden')), false);
    assert.equal(isOutageError(new Error('OpenAI 429: Rate limit')), false);
    assert.equal(isOutageError(new Error('OpenAI 400: Bad Request')), false);
  });

  test('Network-Errors = Outage', () => {
    assert.equal(isOutageError(new Error('network timeout')), true);
    assert.equal(isOutageError(new Error('ENOTFOUND api.openai.com')), true);
    assert.equal(isOutageError(new Error('ETIMEDOUT')), true);
    assert.equal(isOutageError(new Error('ECONNRESET')), true);
    assert.equal(isOutageError(new Error('ECONNREFUSED')), true);
    assert.equal(isOutageError(new Error('socket hang up')), true);
    assert.equal(isOutageError(new Error('fetch failed')), true);
  });

  test('Generische Errors = NICHT Outage', () => {
    assert.equal(isOutageError(new Error('Some unrelated error')), false);
    assert.equal(isOutageError(new Error('Validation failed')), false);
    assert.equal(isOutageError(new Error('JSON parse error')), false);
  });

  test('Edge: null/undefined/empty', () => {
    assert.equal(isOutageError(null), false);
    assert.equal(isOutageError(undefined), false);
    assert.equal(isOutageError(''), false);
    assert.equal(isOutageError({}), false);
  });

  test('String-Error (not Error-object) wird auch akzeptiert', () => {
    assert.equal(isOutageError('OpenAI 503'), true);
    assert.equal(isOutageError('network unreachable'), true);
  });
});

describe('MODEL_MAP — Refactor-Drift-Schutz', () => {

  test('MODEL_MAP enthaelt alle erwarteten OpenAI-Modelle', () => {
    assert.ok(MODEL_MAP['gpt-4o']);
    assert.ok(MODEL_MAP['gpt-4o-mini']);
    assert.ok(MODEL_MAP['gpt-4']);
    assert.ok(MODEL_MAP['gpt-3.5-turbo']);
  });

  test('Anthropic-Models folgen Claude-{family}-{version}-Pattern', () => {
    for (const target of Object.values(MODEL_MAP)) {
      assert.match(target, /^claude-(sonnet|haiku|opus)-/);
    }
  });

  test('Konstanten exposed fuer Test-Verifikation', () => {
    assert.equal(ANTHROPIC_API_URL, 'https://api.anthropic.com/v1/messages');
    assert.equal(ANTHROPIC_VERSION, '2023-06-01');
  });
});
