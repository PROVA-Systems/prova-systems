/**
 * PROVA — KI-Stats-Library (Supabase ki_protokoll-Logging)
 * MEGA²¹+²² W112 (2026-05-05)
 * Marcel-Decision I1: Supabase ki_protokoll (KEIN Airtable, Cleanup-Direction).
 *
 * Existing prova-audit.js bleibt rueckwaerts-compat (Airtable-Logging).
 * Diese Lib ist die NEUE Single-Source-of-Truth fuer KI-Cost-Tracking.
 *
 * Public API (Lambda-Side, CommonJS):
 *   logKiCall({ purpose, modell, tokens_in, tokens_out, cost_eur, dauer_ms,
 *               status, auftrag_id?, feature_kontext?, page_url?, ... })
 *     → schreibt zu Supabase ki_protokoll
 *     → fire-and-forget (kein Block, kein Throw)
 *     → returns Promise<{ ok, ki_protokoll_id?, error? }>
 *
 *   getCostsForUser(userId, { from?, to? })
 *     → Aggregation fuer Admin-Cockpit (MEGA²¹ K1: Frontend separater Sprint)
 *
 * Anti-Patterns vermieden:
 *   - Klartext-Tokens in Logs (prova-audit-Pattern)
 *   - Sync-Calls die Frontend blocken
 *   - Doppel-Logging (Airtable + Supabase)
 *
 * Marcel-K1: Logging in MEGA²², Aggregation-Frontend MEGA²¹+ (Admin-Cockpit).
 */
'use strict';

const VALID_PURPOSES = [
  'fachurteil_entwurf', 'kurzstellungnahme', 'diktat_strukturierung',
  'foto_analyse', 'norm_vorschlag', 'konjunktiv_check',
  'plausibilitaet', 'beweisbeschluss_extraktion',
  'mode_c_interpolation', 'sonstiges'
];

const VALID_PROVIDERS = ['openai', 'anthropic', 'whisper', 'sonstiges'];

/**
 * Hauptlog-Function fuer KI-Calls.
 *
 * @param {object} sb — Supabase-Client (von Lambda via getSupabase())
 * @param {object} entry
 * @param {string} entry.user_id
 * @param {string} entry.purpose — z.B. 'foto_analyse'
 * @param {string} entry.modell — z.B. 'claude_sonnet' (ENUM-Wert!)
 * @param {string} [entry.modell_version] — z.B. 'claude-sonnet-4-6'
 * @param {string} [entry.provider] — 'anthropic' | 'openai' | ...
 * @param {number} [entry.tokens_in]
 * @param {number} [entry.tokens_out]
 * @param {number} [entry.cost_eur]
 * @param {number} [entry.dauer_ms]
 * @param {string} [entry.status] — 'erfolg' (default) | 'fehler' | 'timeout' | ...
 * @param {string} [entry.fehler_message]
 * @param {string} [entry.auftrag_id]
 * @param {string} [entry.feature_kontext]
 * @param {string} [entry.page_url]
 * @param {boolean} [entry.input_pseudonymisiert]
 * @returns {Promise<{ok, ki_protokoll_id?, error?}>}
 */
async function logKiCall(sb, entry) {
  if (!sb || typeof sb.from !== 'function') {
    return { ok: false, error: 'no supabase client' };
  }
  if (!entry || !entry.user_id || !entry.purpose || !entry.modell) {
    return { ok: false, error: 'user_id + purpose + modell required' };
  }

  // Workspace via memberships-Lookup (best-effort)
  let workspaceId = entry.workspace_id;
  if (!workspaceId) {
    try {
      const { data: ms } = await sb.from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', entry.user_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      workspaceId = ms ? ms.workspace_id : null;
    } catch (_) { /* graceful */ }
  }
  if (!workspaceId) {
    return { ok: false, error: 'no workspace for user' };
  }

  const insertData = {
    workspace_id: workspaceId,
    user_id: entry.user_id,
    purpose: entry.purpose,
    feature_kontext: entry.feature_kontext || null,
    page_url: entry.page_url || null,
    modell: entry.modell,
    modell_version: entry.modell_version || null,
    provider: entry.provider || 'openai',
    token_input: entry.tokens_in || 0,
    token_output: entry.tokens_out || 0,
    kosten_eur: entry.cost_eur || 0,
    dauer_ms: entry.dauer_ms || null,
    status: entry.status || 'erfolg',
    fehler_message: entry.fehler_message || null,
    auftrag_id: entry.auftrag_id || null,
    input_pseudonymisiert: !!entry.input_pseudonymisiert,
    output_preview: entry.output_preview ? String(entry.output_preview).slice(0, 200) : null,
    completed_at: new Date().toISOString()
  };

  try {
    const { data, error } = await sb.from('ki_protokoll')
      .insert(insertData)
      .select('id')
      .single();
    if (error) {
      // Migration-Pending detection
      if (/does not exist/i.test(error.message)) {
        return { ok: false, error: 'ki_protokoll-table not migrated', code: 'MIGRATION_PENDING' };
      }
      return { ok: false, error: error.message, code: 'INSERT_FAILED' };
    }
    return { ok: true, ki_protokoll_id: data.id };
  } catch (e) {
    return { ok: false, error: e.message, code: 'UNEXPECTED' };
  }
}

/**
 * Aggregation: Kosten pro User in Zeitraum (Admin-Cockpit).
 *
 * @param {object} sb
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.from] — ISO-Date
 * @param {string} [opts.to] — ISO-Date
 * @returns {Promise<{ok, total_cost_eur, total_tokens, calls_count, by_modell, error?}>}
 */
async function getCostsForUser(sb, userId, opts) {
  opts = opts || {};
  if (!sb || !userId) return { ok: false, error: 'sb + userId required' };

  let q = sb.from('ki_protokoll')
    .select('modell, token_input, token_output, kosten_eur')
    .eq('user_id', userId);
  if (opts.from) q = q.gte('started_at', opts.from);
  if (opts.to) q = q.lte('started_at', opts.to);

  try {
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    const byModell = {};
    let totalCost = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    (data || []).forEach(row => {
      const m = row.modell || 'unknown';
      if (!byModell[m]) byModell[m] = { count: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
      byModell[m].count++;
      byModell[m].cost_eur += Number(row.kosten_eur || 0);
      byModell[m].tokens_in += Number(row.token_input || 0);
      byModell[m].tokens_out += Number(row.token_output || 0);
      totalCost += Number(row.kosten_eur || 0);
      totalTokensIn += Number(row.token_input || 0);
      totalTokensOut += Number(row.token_output || 0);
    });

    return {
      ok: true,
      total_cost_eur: Number(totalCost.toFixed(4)),
      total_tokens: { input: totalTokensIn, output: totalTokensOut },
      calls_count: (data || []).length,
      by_modell: byModell
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  logKiCall: logKiCall,
  getCostsForUser: getCostsForUser,
  VALID_PURPOSES: VALID_PURPOSES,
  VALID_PROVIDERS: VALID_PROVIDERS
};
