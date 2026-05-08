/**
 * PROVA — document-save.js (MEGA⁴⁰ P1)
 *
 * POST { document_id?, auftrag_id?, weg, titel?, content_json, locked_sections?, notiz? }
 *
 * Workflow:
 *   - Wenn document_id: UPDATE + neue Version-Snapshot
 *   - Sonst: INSERT + Version 1
 *   - Auto-Increment current_version
 *   - Workspace-RLS via workspace_memberships
 *
 * Response: { document_id, version_nr, byte_size, updated_at }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  // Auto-Save = Hot-Path → höheres Rate-Limit (alle 5s + Tippen → max ~30/min)
  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'document-save' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.weg || !VALID_WEGE.includes(body.weg)) {
    return jsonResponse(event, 400, { error: 'weg ungültig', valid: VALID_WEGE });
  }
  if (!body.content_json || typeof body.content_json !== 'object') {
    return jsonResponse(event, 400, { error: 'content_json (object) pflicht' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // Workspace + User-ID resolven
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const contentJsonStr = JSON.stringify(body.content_json);
    const byteSize = new TextEncoder().encode(contentJsonStr).length;
    const now = new Date().toISOString();

    let documentRow;
    let versionNr;

    if (body.document_id) {
      // ── UPDATE existing ──
      const { data: existing, error: fetchErr } = await sb.from('documents')
        .select('id, current_version, workspace_id')
        .eq('id', body.document_id)
        .is('deleted_at', null)
        .maybeSingle();
      if (fetchErr) return jsonResponse(event, 500, { error: fetchErr.message });
      if (!existing) return jsonResponse(event, 404, { error: 'Document nicht gefunden' });
      if (existing.workspace_id !== ms.workspace_id) {
        return jsonResponse(event, 403, { error: 'Workspace-Zugriff verweigert' });
      }

      versionNr = (existing.current_version || 0) + 1;
      const updates = {
        content_json: body.content_json,
        current_version: versionNr,
        updated_at: now
      };
      if (typeof body.titel === 'string') updates.titel = body.titel;
      if (typeof body.weg === 'string') updates.weg = body.weg;
      if (Array.isArray(body.locked_sections)) updates.locked_sections = body.locked_sections;

      const { data: updated, error: upErr } = await sb.from('documents')
        .update(updates).eq('id', body.document_id).select().maybeSingle();
      if (upErr) return jsonResponse(event, 500, { error: upErr.message });
      documentRow = updated;
    } else {
      // ── INSERT new ──
      versionNr = 1;
      const insertRow = {
        workspace_id: ms.workspace_id,
        auftrag_id: body.auftrag_id || null,
        user_id: profile.id,
        titel: body.titel || 'Unbenanntes Dokument',
        weg: body.weg,
        content_json: body.content_json,
        locked_sections: Array.isArray(body.locked_sections) ? body.locked_sections : [],
        current_version: versionNr,
        status: 'draft'
      };
      const { data: inserted, error: insErr } = await sb.from('documents').insert(insertRow).select().maybeSingle();
      if (insErr) return jsonResponse(event, 500, { error: insErr.message });
      documentRow = inserted;
    }

    // Version-Snapshot
    const { error: vErr } = await sb.from('documents_versions').insert({
      document_id: documentRow.id,
      workspace_id: ms.workspace_id,
      version_nr: versionNr,
      content_json: body.content_json,
      saved_by_user_id: profile.id,
      byte_size: byteSize,
      notiz: body.notiz || null
    });
    if (vErr) {
      // Version-Insert-Fail ist nicht-blocking (document hat current_version+1)
      // Aber Marcel sollte das wissen — log via Audit
      console.warn('[document-save] version-insert failed:', vErr.message);
    }

    return jsonResponse(event, 200, {
      document_id: documentRow.id,
      version_nr: versionNr,
      byte_size: byteSize,
      updated_at: documentRow.updated_at,
      titel: documentRow.titel,
      weg: documentRow.weg
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'document-save' });

module.exports.__VALID_WEGE = VALID_WEGE;
