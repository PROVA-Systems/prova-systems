/**
 * PROVA — ki-cost-calc.js (MEGA²⁸ W1-I4)
 *
 * Cost-Calculation für OpenAI/Anthropic-Calls. Pure-Function, testbar.
 *
 * Stand der Preise (10.05.2026):
 *   gpt-4o: $2.50 prompt / $10.00 completion per 1M tokens
 *   gpt-4o-mini: $0.15 prompt / $0.60 completion per 1M tokens
 *   claude-sonnet-4-6: $3.00 prompt / $15.00 completion per 1M tokens (Schätzung)
 *   whisper-1: $0.006 per Audio-Minute
 *
 * Tabelle: ki_protokoll (existiert live mit kosten_eur Spalte).
 * EUR-Conversion: USD * 0.92 (Approximation, sollte später via Live-Rate ersetzt werden)
 */
'use strict';

const PRICING = {
  'gpt-4o': { prompt: 2.50, completion: 10.00 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
  'claude-sonnet-4-6': { prompt: 3.00, completion: 15.00 },
  'claude-sonnet': { prompt: 3.00, completion: 15.00 }
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
  calculateWhisperUsdCost,
  buildProtokollPayload,
  PRICING,
  USD_TO_EUR
};
