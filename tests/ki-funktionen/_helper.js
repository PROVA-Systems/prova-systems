'use strict';

// MEGA³¹ B1 — Test-Helper für 5-Test-Suite (Funktionalität, Edge-Case, Präzision, Konsistenz, Performance)

function mockOpenAIResponse(text, opts) {
  opts = opts || {};
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: text || 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: opts.in || 100, completion_tokens: opts.out || 50, total_tokens: (opts.in || 100) + (opts.out || 50) },
      model: opts.model || 'gpt-5.4-mini'
    })
  };
}

function mockAnthropicResponse(text, opts) {
  opts = opts || {};
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: 'text', text: text || 'OK' }],
      usage: { input_tokens: opts.in || 100, output_tokens: opts.out || 50 },
      model: opts.model || 'claude-haiku-4-5-20251001',
      stop_reason: 'end_turn'
    })
  };
}

function withMockFetch(handler, fn) {
  const orig = global.fetch;
  global.fetch = handler;
  return Promise.resolve(fn()).finally(() => { global.fetch = orig; });
}

function timeIt(fn) {
  const t0 = Date.now();
  return Promise.resolve(fn()).then(r => ({ result: r, ms: Date.now() - t0 }));
}

function makeEvent(body, headers) {
  return {
    httpMethod: 'POST',
    headers: headers || { 'authorization': 'Bearer test' },
    body: JSON.stringify(body || {})
  };
}

module.exports = {
  mockOpenAIResponse,
  mockAnthropicResponse,
  withMockFetch,
  timeIt,
  makeEvent
};
