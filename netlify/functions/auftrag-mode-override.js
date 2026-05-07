/**
 * netlify/functions/auftrag-mode-override.js — MEGA³⁶ W2.5
 * Triple-Mode-Router Override pro Auftrag (M¹⁴-Ext-Foundation).
 * POST { auftrag_id, override_mode: 'A'|'B'|'C' }
 * Returns: { auftrag_id, override_mode, applied_at }
 *
 * GET ?auftrag_id=... — current Override-State
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

const VALID_MODES = ['A', 'B', 'C'];

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'auftrag-mode-override' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const { data: user } = await sb.from('users')
    .select('id, workspace_memberships!inner(workspace_id)').eq('email', context.userEmail).maybeSingle();
  if (!user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });
  const workspaceId = user.workspace_memberships && user.workspace_memberships[0] && user.workspace_memberships[0].workspace_id;
  if (!workspaceId) return jsonResponse(event, 403, { error: 'Workspace nicht ermittelbar' });

  // GET — current Override-State
  if (event.httpMethod === 'GET') {
    const auftragId = (event.queryStringParameters || {}).auftrag_id;
    if (!auftragId) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
    const { data: a } = await sb.from('auftraege')
      .select('id, mode_override').eq('id', auftragId).eq('workspace_id', workspaceId).maybeSingle();
    if (!a) return jsonResponse(event, 404, { error: 'Auftrag nicht gefunden' });
    return jsonResponse(event, 200, { auftrag_id: a.id, override_mode: a.mode_override || null });
  }

  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const { auftrag_id, override_mode } = body;
  if (!auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
  if (override_mode !== null && !VALID_MODES.includes(override_mode)) {
    return jsonResponse(event, 400, { error: 'override_mode ungültig — A|B|C oder null' });
  }

  // Verify auftrag in workspace
  const { data: a, error: aErr } = await sb.from('auftraege')
    .select('id').eq('id', auftrag_id).eq('workspace_id', workspaceId).maybeSingle();
  if (aErr || !a) return jsonResponse(event, 404, { error: 'Auftrag nicht in Workspace' });

  // Versuche mode_override-Update; wenn Spalte fehlt, fail-soft
  const { error: updErr } = await sb.from('auftraege')
    .update({ mode_override: override_mode })
    .eq('id', auftrag_id);
  if (updErr) {
    // Spalte existiert nicht — Audit-Trail-only-Fallback (Marcel-Manual fix Schema)
    await sb.from('audit_trail').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'auftrag_mode_override_attempt',
      entity_typ: 'auftrag',
      entity_id: auftrag_id,
      payload: { override_mode, schema_missing: 'auftraege.mode_override', error: updErr.message }
    });
    return jsonResponse(event, 501, { error: 'Schema fehlt: auftraege.mode_override (Migration nötig)', logged: true });
  }

  // Audit-Trail
  try {
    await sb.from('audit_trail').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'auftrag_mode_override',
      entity_typ: 'auftrag',
      entity_id: auftrag_id,
      payload: { override_mode }
    });
  } catch (_) { /* defensive */ }

  return jsonResponse(event, 200, {
    auftrag_id,
    override_mode,
    applied_at: new Date().toISOString()
  });
});

module.exports.__VALID_MODES = VALID_MODES;
