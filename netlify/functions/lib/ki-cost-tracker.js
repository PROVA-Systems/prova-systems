/**
 * PROVA — KI-Cost-Tracker Helper (MEGA³⁰ B3)
 *
 * Logger für ki_protokoll-Inserts (DSGVO Art. 30 + Regel 16 Pflicht-Logging).
 *
 * Defensive-Pattern: Insert-Failure blockiert NIE den KI-Call-Workflow.
 *
 * Schema (W12-I0): public.ki_protokoll mit 32 Spalten — vollständiges KI-Audit-Log.
 *
 * Usage:
 *   const Tracker = require('./lib/ki-cost-tracker');
 *   const start = Tracker.start({ purpose, modell, provider, ... });
 *   ... ki-call ...
 *   await Tracker.finish(start, { token_input, token_output, status, output });
 */
'use strict';

const Router = require('./ai-router');

function startTrack(opts) {
  return {
    started_at: new Date().toISOString(),
    workspace_id: opts.workspace_id || null,
    user_id: opts.user_id || null,
    auftrag_id: opts.auftrag_id || null,
    eintrag_id: opts.eintrag_id || null,
    audio_id: opts.audio_id || null,
    prompt_template_id: opts.prompt_template_id || null,
    purpose: opts.purpose || 'sonstiges',
    feature_kontext: opts.feature_kontext || null,
    page_url: opts.page_url || null,
    modell: opts.modell || null,
    modell_version: opts.modell_version || null,
    provider: opts.provider || 'openai',
    input_pseudonymisiert: opts.input_pseudonymisiert !== false,
    pseudonymisierung_token_count: opts.pseudonymisierung_token_count || 0,
    input_hash: opts.input_hash || null
  };
}

async function finishTrack(sb, track, result) {
  if (!sb || !track) return { logged: false, reason: 'no-supabase-or-track' };
  const completed_at = new Date().toISOString();
  const dauer_ms = new Date(completed_at) - new Date(track.started_at);
  const tokens_in = parseInt(result.token_input || 0, 10);
  const tokens_out = parseInt(result.token_output || 0, 10);
  const cached_in = parseInt(result.cached_tokens_in || 0, 10);
  const kosten_eur = Router.getModelCost(track.modell, tokens_in, tokens_out, cached_in);

  const insert = Object.assign({}, track, {
    completed_at: completed_at,
    dauer_ms: dauer_ms,
    token_input: tokens_in,
    token_output: tokens_out,
    token_total: tokens_in + tokens_out,
    kosten_eur: kosten_eur,
    status: result.status || 'erfolg',
    fehler_message: result.fehler_message || null,
    output_repseudonymisiert: result.output_repseudonymisiert !== false,
    konjunktiv_check_passed: result.konjunktiv_check_passed !== false,
    halluzinations_check_passed: result.halluzinations_check_passed !== false,
    output_hash: result.output_hash || null,
    output_laenge_chars: result.output ? String(result.output).length : null,
    output_preview: result.output ? String(result.output).slice(0, 500) : null
  });

  try {
    const { error } = await sb.from('ki_protokoll').insert(insert);
    if (error) return { logged: false, reason: error.message };
    return { logged: true, kosten_eur };
  } catch (e) {
    return { logged: false, reason: e.message };
  }
}

module.exports = {
  start: startTrack,
  finish: finishTrack
};
