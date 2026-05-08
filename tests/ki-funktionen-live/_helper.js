/**
 * tests/ki-funktionen-live/_helper.js — MEGA³⁴ C1
 * Live-Test-Helper für echte OpenAI-API-Calls.
 *
 * SKIP-Logic: wenn OPENAI_API_KEY fehlt, wird der Test übersprungen.
 * Cost-Cap: pro Test < 0.001€ (gpt-5.4-mini, 200 input + 100 output tokens).
 */
'use strict';

const SKIP_REASON = 'OPENAI_API_KEY fehlt — Live-Tests übersprungen (CI-friendly)';

function skipIfNoKey() {
  return !process.env.OPENAI_API_KEY;
}

function getApiKey() {
  return process.env.OPENAI_API_KEY;
}

async function callOpenAI({ model, messages, max_tokens = 100 }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('no-api-key');

  const start = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model || 'gpt-5.4-mini',
      messages: messages,
      max_tokens: max_tokens,
      temperature: 0.1
    })
  });
  const latency = Date.now() - start;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('OpenAI ' + res.status + ': ' + (err.error?.message || ''));
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage || {},
    latency_ms: latency,
    model: data.model || model
  };
}

function estimateCostEur(usage, model) {
  // Stand 2026-05: gpt-5.4-mini = $0.40/1M input, $1.60/1M output
  const rates = {
    'gpt-5.4-mini': { in: 0.40, out: 1.60 },
    'gpt-5.4': { in: 2.50, out: 15.00 },
    'gpt-5.5': { in: 5.00, out: 30.00 }
  };
  const r = rates[model] || rates['gpt-5.4-mini'];
  const inTok = usage.prompt_tokens || 0;
  const outTok = usage.completion_tokens || 0;
  const usd = (inTok * r.in + outTok * r.out) / 1_000_000;
  return Math.round(usd * 0.92 * 1_000_000) / 1_000_000; // EUR
}

module.exports = {
  SKIP_REASON,
  skipIfNoKey,
  getApiKey,
  callOpenAI,
  estimateCostEur
};
