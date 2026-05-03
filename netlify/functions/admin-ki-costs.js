/**
 * PROVA — admin-ki-costs.js
 * MEGA⁴ Q6 (04.05.2026) — AUTH-COCKPIT Voll-Sektion 2
 *
 * KI-Token-Cost per Workspace + per Funktion.
 * Datenquelle: ki_protokoll Tabelle (CLAUDE.md Regel 16).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

function parseSince(s) {
  const m = String(s || '7d').match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
  const n = parseInt(m[1]);
  const ms = n * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  const since = parseSince(q.since || '7d');

  // Aggregate via SQL ist effizienter, aber via JS-API auch OK
  const { data: rows, error } = await sb.from('ki_protokoll')
    .select('workspace_id, funktion, modell, tokens_in, tokens_out, kosten_eur, created_at')
    .gte('created_at', since)
    .limit(10000);

  if (error) {
    // Tabelle existiert ggf. noch nicht (Schema-Pending)
    return jsonResponse(event, 200, {
      ok: true,
      configured: false,
      hint: 'ki_protokoll Tabelle nicht vorhanden — pending Schema-Migration',
      error: error.message
    });
  }

  // Aggregation
  const perWorkspace = {};
  const perFunktion = {};
  const perModell = {};
  let totalCost = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (const r of (rows || [])) {
    const cost = Number(r.kosten_eur || 0);
    const tin = Number(r.tokens_in || 0);
    const tout = Number(r.tokens_out || 0);
    totalCost += cost;
    totalTokensIn += tin;
    totalTokensOut += tout;

    const ws = r.workspace_id || 'system';
    perWorkspace[ws] = perWorkspace[ws] || { workspace_id: ws, calls: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
    perWorkspace[ws].calls++;
    perWorkspace[ws].cost_eur += cost;
    perWorkspace[ws].tokens_in += tin;
    perWorkspace[ws].tokens_out += tout;

    const fn = r.funktion || 'unknown';
    perFunktion[fn] = perFunktion[fn] || { funktion: fn, calls: 0, cost_eur: 0 };
    perFunktion[fn].calls++;
    perFunktion[fn].cost_eur += cost;

    const m = r.modell || 'unknown';
    perModell[m] = perModell[m] || { modell: m, calls: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
    perModell[m].calls++;
    perModell[m].cost_eur += cost;
    perModell[m].tokens_in += tin;
    perModell[m].tokens_out += tout;
  }

  // Top-Sortierung
  const topWorkspaces = Object.values(perWorkspace).sort((a, b) => b.cost_eur - a.cost_eur).slice(0, 20);
  const topFunktionen = Object.values(perFunktion).sort((a, b) => b.cost_eur - a.cost_eur);
  const modelle = Object.values(perModell).sort((a, b) => b.cost_eur - a.cost_eur);

  return jsonResponse(event, 200, {
    ok: true,
    configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    summary: {
      calls_total: (rows || []).length,
      cost_total_eur: Math.round(totalCost * 100) / 100,
      tokens_in_total: totalTokensIn,
      tokens_out_total: totalTokensOut
    },
    top_workspaces: topWorkspaces.map(w => ({ ...w, cost_eur: Math.round(w.cost_eur * 100) / 100 })),
    top_funktionen: topFunktionen.map(f => ({ ...f, cost_eur: Math.round(f.cost_eur * 100) / 100 })),
    modelle: modelle.map(m => ({ ...m, cost_eur: Math.round(m.cost_eur * 100) / 100 }))
  });
}, { functionName: 'admin-ki-costs', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-ki-costs' });
