/**
 * PROVA — admin-feature-heatmap.js
 * MEGA⁶ S1 — Cockpit-Sektion 2/6 (Feature-Heatmap)
 *
 * Aggregation: welche Features wie haeufig pro Workspace + Tag.
 * Datenquelle: audit_trail (alle 'feature.*' + 'ki.*' Events) +
 *              ki_protokoll (KI-Calls).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  // Audit-Trail: feature/ki/auftrag-Events
  const { data: at } = await sb.from('audit_trail')
    .select('typ, workspace_id, sv_email, created_at')
    .or('typ.like.feature.%,typ.like.ki.%,typ.like.auftrag.%,typ.like.pdf.%')
    .gte('created_at', since)
    .limit(5000);

  // Aggregation
  const heatmap = {};
  const featureTotals = {};
  const userTotals = {};
  for (const e of (at || [])) {
    const fn = e.typ;
    const user = e.sv_email || '[anon]';
    heatmap[fn + '|' + user] = (heatmap[fn + '|' + user] || 0) + 1;
    featureTotals[fn] = (featureTotals[fn] || 0) + 1;
    userTotals[user] = (userTotals[user] || 0) + 1;
  }

  const features = Object.entries(featureTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([feature, count]) => ({ feature, count }));

  const users = Object.entries(userTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([user, count]) => ({ user, count }));

  // Cell-Matrix: feature x user
  const matrix = [];
  for (const f of features) {
    const row = { feature: f.feature, total: f.count, cells: {} };
    for (const u of users) {
      row.cells[u.user] = heatmap[f.feature + '|' + u.user] || 0;
    }
    matrix.push(row);
  }

  return jsonResponse(event, 200, {
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    total_events: (at || []).length,
    top_features: features,
    top_users: users,
    matrix: matrix
  });
}, { functionName: 'admin-feature-heatmap', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-feature-heatmap' });
