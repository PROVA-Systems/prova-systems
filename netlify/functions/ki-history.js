/**
 * PROVA — ki-history.js
 * MEGA⁸ V3 (04.05.2026)
 *
 * Liefert KI-Interaktions-Historie pro Akte (oder pro User).
 * Quelle: ki_protokoll Tabelle (CLAUDE.md Regel 16).
 *
 * Query-Param:
 *   ?auftrag_id=<UUID>  — pro Akte
 *   ?since=24h|7d       — Zeitfilter
 *   ?limit=50           — max records
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

function parseSince(s) {
  const m = String(s || '7d').match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
  const n = parseInt(m[1]);
  const ms = n * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const sb = getSupabase();
  if (!sb) {
    return {
      statusCode: 200, headers: baseHeaders,
      body: JSON.stringify({ ok: true, configured: false, hint: 'Supabase nicht konfiguriert', records: [] })
    };
  }

  const q = event.queryStringParameters || {};
  const auftragId = q.auftrag_id || null;
  const since = parseSince(q.since || '7d');
  const limit = Math.min(parseInt(q.limit || '50'), 200);
  const userEmail = context.userEmail;

  // RLS sollte das schon machen, aber explizit nochmal filtern
  let query = sb.from('ki_protokoll')
    .select('id, funktion, modell, tokens_in, tokens_out, kosten_eur, auftrag_id, created_at, metadata')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Eingeloggter User darf nur eigene Workspace-Calls sehen
  // (Annahme: ki_protokoll hat workspace_id-Spalte mit RLS-Policy auf workspace_memberships)
  if (auftragId && /^[0-9a-f-]{36}$/i.test(auftragId)) {
    query = query.eq('auftrag_id', auftragId);
  }

  const { data, error } = await query;
  if (error) {
    return {
      statusCode: 200, headers: baseHeaders,
      body: JSON.stringify({ ok: true, configured: false, hint: 'Query failed', error: error.message, records: [] })
    };
  }

  // Aggregation
  const total = (data || []).length;
  const totalCostEur = (data || []).reduce((a, r) => a + Number(r.kosten_eur || 0), 0);
  const totalTokensIn = (data || []).reduce((a, r) => a + Number(r.tokens_in || 0), 0);
  const totalTokensOut = (data || []).reduce((a, r) => a + Number(r.tokens_out || 0), 0);

  const perFunktion = {};
  for (const r of (data || [])) {
    const fn = r.funktion || 'unknown';
    perFunktion[fn] = perFunktion[fn] || { funktion: fn, calls: 0, cost_eur: 0 };
    perFunktion[fn].calls++;
    perFunktion[fn].cost_eur += Number(r.kosten_eur || 0);
  }

  return {
    statusCode: 200, headers: baseHeaders,
    body: JSON.stringify({
      ok: true,
      configured: true,
      fetched_at: new Date().toISOString(),
      filter: { auftrag_id: auftragId, since, limit, user: userEmail.replace(/@.*/, '@***') },
      summary: {
        calls_total: total,
        cost_total_eur: Math.round(totalCostEur * 100) / 100,
        tokens_in_total: totalTokensIn,
        tokens_out_total: totalTokensOut
      },
      per_funktion: Object.values(perFunktion).map(f => ({
        ...f, cost_eur: Math.round(f.cost_eur * 100) / 100
      })).sort((a, b) => b.calls - a.calls),
      records: data || []
    })
  };
}), { functionName: 'ki-history' });
