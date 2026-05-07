/**
 * PROVA — ki-cost-calc.js (MEGA²⁸ W3-I0, 10.05.2026)
 *
 * Cost-Calculation für OpenAI/Anthropic-Calls. Pure-Function, testbar.
 *
 * Stand der Preise (10.05.2026, USD per 1M tokens):
 *   GPT-5.5         $5.00 prompt / $30.00 completion (Frontier, 24.04.2026)
 *   GPT-5.5 Pro     $30.00 / $180.00 (ultra-kritisch)
 *   GPT-5.4         $2.50 / $15.00 (Mid-Tier, gute Qualität)
 *   GPT-5.4-mini    $0.40 / $1.60 (Latency-Class)
 *   GPT-5.4-nano    $0.10 / $0.40 (Schätzung — günstigste Stufe)
 *   Claude Opus 4.7    $15.00 / $75.00 (Frontier-Backup, Schätzung)
 *   Claude Sonnet 4.6  $3.00 / $15.00 (Mid-Tier-Backup)
 *   Claude Haiku 4.5   $0.80 / $4.00 (Latency-Backup, Schätzung)
 *   Whisper-1          $0.006 per Audio-Minute
 *
 * DEPRECATED (Feb 2026, Backwards-Compat behalten für Übergang):
 *   gpt-4o, gpt-4o-mini, gpt-3.5-turbo, claude-3-5-sonnet, claude-3-haiku
 *
 * EUR-Conversion: USD * 0.92 (Approximation)
 * Tabelle: ki_protokoll (existiert live mit kosten_eur Spalte).
 */
'use strict';

const PRICING = {
  // OpenAI — Aktuell (10.05.2026)
  'gpt-5.5':       { prompt: 5.00,  completion: 30.00 },
  'gpt-5.5-pro':   { prompt: 30.00, completion: 180.00 },
  'gpt-5.4':       { prompt: 2.50,  completion: 15.00 },
  'gpt-5.4-mini':  { prompt: 0.40,  completion: 1.60 },
  'gpt-5.4-nano':  { prompt: 0.10,  completion: 0.40 },

  // Anthropic — Aktuell (10.05.2026, Schätzungen — vor Live-Verifikation)
  'claude-opus-4-7':           { prompt: 15.00, completion: 75.00 },
  'claude-sonnet-4-6':         { prompt: 3.00,  completion: 15.00 },
  'claude-haiku-4-5-20251001': { prompt: 0.80,  completion: 4.00 },
  'claude-sonnet':             { prompt: 3.00,  completion: 15.00 },

  // DEPRECATED — Backwards-Compat (Feb 2026 abgekündigt)
  'gpt-4o':        { prompt: 2.50,  completion: 10.00 },
  'gpt-4o-mini':   { prompt: 0.15,  completion: 0.60 },
  'gpt-3.5-turbo': { prompt: 0.50,  completion: 1.50 }
};

const USD_TO_EUR = 0.92;

/**
 * Berechne Kosten in USD für Text-Modelle.
 * @param {string} model
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number} USD
 */
function calculateUsdCost(model, promptTokens, completionTokens) {
  const cleanModel = String(model || '').toLowerCase().replace(/[\s_]/g, '-');
  const rate = PRICING[cleanModel];
  if (!rate) return 0;
  const pt = Number(promptTokens) || 0;
  const ct = Number(completionTokens) || 0;
  const cost = (pt * rate.prompt + ct * rate.completion) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimals
}

/**
 * MEGA³³ B2 — Berechne Kosten in USD MIT Prompt-Caching-Discount.
 * Cached Input-Tokens kosten 10% (OpenAI: $0.50/1M statt $5.00/1M für gpt-5.5).
 * @param {string} model
 * @param {object} tokens — { prompt, completion, cachedPrompt, cachedCompletion }
 * @returns {number} USD
 */
function calculateUsdCostCached(model, tokens) {
  const cleanModel = String(model || '').toLowerCase().replace(/[\s_]/g, '-');
  const rate = PRICING[cleanModel];
  if (!rate) return 0;
  const t = tokens || {};
  const pt = Number(t.prompt) || 0;             // gesamt (incl. cached)
  const ct = Number(t.completion) || 0;
  const cpt = Number(t.cachedPrompt) || 0;       // davon cached
  const cct = Number(t.cachedCompletion) || 0;
  const uncachedPrompt = Math.max(0, pt - cpt);
  const uncachedCompletion = Math.max(0, ct - cct);
  // Cached: 10% des Standard-Preises (OpenAI Pricing-Page Stand 2026)
  const CACHED_FACTOR = 0.10;
  const cost = (
    uncachedPrompt * rate.prompt
    + cpt * rate.prompt * CACHED_FACTOR
    + uncachedCompletion * rate.completion
    + cct * rate.completion * CACHED_FACTOR
  ) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function calculateEurCostCached(model, tokens) {
  const usd = calculateUsdCostCached(model, tokens);
  return Math.round(usd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

/**
 * Berechne Kosten in EUR.
 */
function calculateEurCost(model, promptTokens, completionTokens) {
  const usd = calculateUsdCost(model, promptTokens, completionTokens);
  return Math.round(usd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

/**
 * Whisper-Audio-Cost (per Minute).
 */
function calculateWhisperUsdCost(audioMinutes) {
  const m = Number(audioMinutes) || 0;
  return Math.round(m * 0.006 * 1_000_000) / 1_000_000;
}

/**
 * Build ki_protokoll-Insert-Payload.
 */
function buildProtokollPayload(opts) {
  opts = opts || {};
  const cost_eur = calculateEurCost(opts.model, opts.prompt_tokens, opts.completion_tokens);
  return {
    user_id: opts.user_id,
    workspace_id: opts.workspace_id,
    auftrag_id: opts.auftrag_id || null,
    purpose: opts.purpose || 'sonstiges',
    modell: opts.model_enum || 'gpt_4o', // ENUM-Wert (nicht Display-Name)
    modell_version: opts.model || null,
    provider: opts.provider || 'openai',
    token_input: opts.prompt_tokens || 0,
    token_output: opts.completion_tokens || 0,
    token_total: (opts.prompt_tokens || 0) + (opts.completion_tokens || 0),
    kosten_eur: cost_eur,
    dauer_ms: opts.dauer_ms || null,
    status: opts.status || 'erfolg',
    input_pseudonymisiert: !!opts.input_pseudonymisiert,
    konjunktiv_check_passed: opts.konjunktiv_check_passed ?? null,
    halluzinations_check_passed: opts.halluzinations_check_passed ?? null,
    started_at: opts.started_at || new Date().toISOString(),
    completed_at: opts.completed_at || new Date().toISOString()
  };
}

module.exports = {
  calculateUsdCost,
  calculateEurCost,
  calculateUsdCostCached,
  calculateEurCostCached,
  calculateWhisperUsdCost,
  buildProtokollPayload,
  PRICING,
  USD_TO_EUR
};
