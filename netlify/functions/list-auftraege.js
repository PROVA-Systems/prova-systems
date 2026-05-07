/**
 * netlify/functions/list-auftraege.js — MEGA³⁵ C4
 *
 * Liefert Aufträge (mit RLS-Filter für aktuellen User-Workspace).
 *
 * GET /.netlify/functions/list-auftraege?typen=schadensgutachten,wertgutachten&page=1&limit=50
 *
 * Returns: { items, total, page, total_pages, limit }
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

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'list-auftraege' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const qp = event.queryStringParameters || {};
  const typenRaw = (qp.typen || '').trim();
  const typen = typenRaw ? typenRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const page = Math.max(1, parseInt(qp.page || '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(qp.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Workspace-Resolve via JWT-Email
  const { data: u, error: uErr } = await sb.from('users')
    .select('id, workspace_memberships!inner(workspace_id)')
    .eq('email', context.userEmail)
    .maybeSingle();
  if (uErr || !u) return jsonResponse(event, 404, { error: 'User nicht gefunden' });
  const workspaceId = u.workspace_memberships && u.workspace_memberships[0] && u.workspace_memberships[0].workspace_id;
  if (!workspaceId) return jsonResponse(event, 403, { error: 'Workspace nicht ermittelbar' });

  let q = sb.from('auftraege')
    .select('id, az, auftrag_typ, auftraggeber, phase, status, created_at, frist_ist', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (typen.length) q = q.in('auftrag_typ', typen);

  const { data, error, count } = await q;
  if (error) return jsonResponse(event, 500, { error: error.message });

  const total = count || 0;
  return jsonResponse(event, 200, {
    items: data || [],
    total: total,
    page: page,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    limit: limit
  });
});

module.exports.__MAX_LIMIT = MAX_LIMIT;
module.exports.__DEFAULT_LIMIT = DEFAULT_LIMIT;
