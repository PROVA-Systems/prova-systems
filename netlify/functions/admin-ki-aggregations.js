/**
 * netlify/functions/admin-ki-aggregations.js — MEGA³⁶ W2.2
 * Admin-Cockpit KI-Cost-Aggregation mit Range-Pivot.
 * GET ?range=7d|30d|90d&group_by=user|model|day
 * Returns: { rows, totals, range, group_by }
 *
 * Ergänzt admin-ki-costs.js (Single-Sum) um Range-Pivot über ki_protokoll.
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

const ALLOWED_RANGES = { '7d': 7, '30d': 30, '90d': 90 };
const ALLOWED_GROUPS = ['user', 'model', 'day'];

function aggregateRows(rawRows, groupBy) {
  const buckets = new Map();
  (rawRows || []).forEach(r => {
    let key;
    if (groupBy === 'user') key = r.user_id || 'unknown';
    else if (groupBy === 'model') key = r.modell_version || r.modell || 'unknown';
    else key = (r.created_at || '').slice(0, 10); // 'day'
    const b = buckets.get(key) || { key, count: 0, token_input: 0, token_output: 0, kosten_eur: 0 };
    b.count += 1;
    b.token_input += r.token_input || 0;
    b.token_output += r.token_output || 0;
    b.kosten_eur += r.kosten_eur || 0;
    buckets.set(key, b);
  });
  return Array.from(buckets.values()).sort((a, b) => b.kosten_eur - a.kosten_eur);
}

async function isAdmin(sb, email) {
  const { data } = await sb.from('users')
    .select('workspace_memberships!inner(rolle)').eq('email', email).maybeSingle();
  if (!data) return false;
  return (data.workspace_memberships || []).some(x => x.rolle === 'owner' || x.rolle === 'admin');
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'admin-ki-aggregations' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  if (!(await isAdmin(sb, context.userEmail))) {
    return jsonResponse(event, 403, { error: 'Admin-Rolle erforderlich' });
  }

  const qp = event.queryStringParameters || {};
  const range = qp.range && ALLOWED_RANGES[qp.range] ? qp.range : '30d';
  const groupBy = qp.group_by && ALLOWED_GROUPS.includes(qp.group_by) ? qp.group_by : 'user';
  const days = ALLOWED_RANGES[range];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb.from('ki_protokoll')
    .select('user_id, modell, modell_version, token_input, token_output, kosten_eur, created_at')
    .gte('created_at', since)
    .limit(10000);
  if (error) return jsonResponse(event, 500, { error: error.message });

  const rows = aggregateRows(data || [], groupBy);
  const totals = rows.reduce((acc, r) => ({
    count: acc.count + r.count,
    token_input: acc.token_input + r.token_input,
    token_output: acc.token_output + r.token_output,
    kosten_eur: Math.round((acc.kosten_eur + r.kosten_eur) * 1_000_000) / 1_000_000
  }), { count: 0, token_input: 0, token_output: 0, kosten_eur: 0 });

  return jsonResponse(event, 200, { rows, totals, range, group_by: groupBy });
});

module.exports.__aggregateRows = aggregateRows;
module.exports.__ALLOWED_RANGES = ALLOWED_RANGES;
module.exports.__ALLOWED_GROUPS = ALLOWED_GROUPS;
