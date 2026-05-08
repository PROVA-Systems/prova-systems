/**
 * PROVA — import-execute.js (MEGA⁴¹ P1)
 *
 * POST { source_format, target_entity, csv_data, mapping, idempotency_key, filename? }
 * → 200 { import_id, status, inserted_count, failed_count, rollback_token, errors[] }
 *
 * Atomic-Transaction-Pattern:
 *   1. Pre-Validate (alle Rows auf Pflichtfelder)
 *   2. Bei Errors: 422 mit Error-Liste (NICHTS inserted)
 *   3. Sonst: Bulk-Insert in Multi-Pass (Kontakte → Aufträge → Rechnungen)
 *   4. inserted_ids JSONB[] sammeln für Rollback
 *   5. import_logs-Eintrag mit rollback_token (24h-TTL)
 *
 * Auth: requireAuth + Workspace-Resolve.
 * RateLimit: 10/h (Mass-Imports sind teuer).
 */
'use strict';

const crypto = require('crypto');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');
const Detector = require('../../lib/import-format-detector');
const AzNorm = require('../../lib/aktenzeichen-normalizer');

const VALID_TARGETS = ['kontakte', 'auftraege', 'rechnungen', 'mixed'];
const MAX_ROWS = 1000;
const ROLLBACK_TTL_HOURS = 24;

function _applyMapping(row, mapping) {
  const out = {};
  Object.keys(row).forEach(srcKey => {
    const provaKey = mapping[srcKey] || srcKey;
    if (provaKey && !provaKey.startsWith('_')) out[provaKey] = row[srcKey];
  });
  // Lookup-Felder erhalten (für Foreign-Key-Resolution)
  Object.keys(mapping).forEach(srcKey => {
    const tgt = mapping[srcKey];
    if (tgt && tgt.startsWith('_')) out[tgt] = row[srcKey];
  });
  return out;
}

function _validateRequired(mapped, target) {
  if (target === 'kontakte') {
    if (!mapped.name || String(mapped.name).trim() === '') return 'name pflicht';
  } else if (target === 'auftraege') {
    if (!mapped.aktenzeichen || String(mapped.aktenzeichen).trim() === '') return 'aktenzeichen pflicht';
  } else if (target === 'rechnungen') {
    if (!mapped.rechnungsnr || String(mapped.rechnungsnr).trim() === '') return 'rechnungsnr pflicht';
  }
  return null;
}

function _stripLookupFields(obj) {
  const out = {};
  Object.keys(obj).forEach(k => { if (!k.startsWith('_')) out[k] = obj[k]; });
  return out;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  // Rate-Limit STRENG: 10/h (Mass-Imports)
  const rl = RateLimit.check(context.userEmail, 10, 3600, { event, functionName: 'import-execute' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht (10/Stunde für Mass-Imports)' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.target_entity || VALID_TARGETS.indexOf(body.target_entity) < 0) {
    return jsonResponse(event, 400, { error: 'target_entity invalid', valid: VALID_TARGETS });
  }
  if (!body.csv_data && !body.json_data) {
    return jsonResponse(event, 400, { error: 'csv_data oder json_data pflicht' });
  }
  if (!body.mapping || typeof body.mapping !== 'object') {
    return jsonResponse(event, 400, { error: 'mapping (object) pflicht' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const t0 = Date.now();
  try {
    // Workspace + User
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // Parse
    let parsed;
    if (body.csv_data) {
      parsed = Detector.parseCsv(body.csv_data);
    } else {
      parsed = Detector.parseJson(body.json_data);
    }
    if (parsed.rows.length === 0) return jsonResponse(event, 400, { error: 'Keine Daten' });
    if (parsed.rows.length > MAX_ROWS) return jsonResponse(event, 413, { error: 'Zu viele Zeilen (max ' + MAX_ROWS + ')' });

    // Pre-Validate ALL rows
    const validationErrors = [];
    const mappedRows = [];
    parsed.rows.forEach((row, idx) => {
      const mapped = _applyMapping(row, body.mapping);
      const err = _validateRequired(mapped, body.target_entity);
      if (err) validationErrors.push({ row: idx + 1, msg: err });
      mappedRows.push(mapped);
    });

    if (validationErrors.length > 0) {
      // Atomic — bei JEDEM Validation-Fehler: NICHTS importieren
      return jsonResponse(event, 422, {
        error: 'Validation-Fehler — kein Import durchgeführt',
        errors: validationErrors.slice(0, 100),
        total_errors: validationErrors.length,
        atomic_rollback: true
      });
    }

    // Generate Rollback-Token + import_log skeleton
    const rollbackToken = crypto.randomUUID();
    const rollbackExpiresAt = new Date(Date.now() + ROLLBACK_TTL_HOURS * 3600 * 1000).toISOString();
    const insertedIds = [];

    // ── Insert je nach target_entity ──
    if (body.target_entity === 'kontakte') {
      const inserts = mappedRows.map(r => ({
        ..._stripLookupFields(r),
        workspace_id: ms.workspace_id,
        user_id: profile.id
      }));
      // Bulk-Insert in Batches à 100
      for (let i = 0; i < inserts.length; i += 100) {
        const batch = inserts.slice(i, i + 100);
        const { data, error } = await sb.from('kontakte').insert(batch).select('id');
        if (error) {
          // Rollback bisheriger Inserts
          if (insertedIds.length > 0) {
            await sb.from('kontakte').delete().in('id', insertedIds.map(x => x.id));
          }
          return jsonResponse(event, 500, { error: 'Insert-Fehler', detail: error.message, rolled_back: insertedIds.length });
        }
        (data || []).forEach(d => insertedIds.push({ entity: 'kontakte', id: d.id }));
      }
    } else if (body.target_entity === 'auftraege') {
      // Multi-Pass: Kontakt-Lookup wenn _kontakt_email_lookup gesetzt
      const inserts = [];
      const emailToKontaktId = {};
      // Sammle alle benötigten Kontakt-Emails
      const lookupEmails = mappedRows.map(r => r._kontakt_email_lookup).filter(Boolean);
      if (lookupEmails.length > 0) {
        const { data: existingKontakte } = await sb.from('kontakte')
          .select('id, email').eq('workspace_id', ms.workspace_id).in('email', lookupEmails);
        (existingKontakte || []).forEach(k => { emailToKontaktId[k.email] = k.id; });
      }

      mappedRows.forEach((r, idx) => {
        const insert = {
          ..._stripLookupFields(r),
          workspace_id: ms.workspace_id,
          user_id: profile.id
        };
        if (r._kontakt_email_lookup && emailToKontaktId[r._kontakt_email_lookup]) {
          insert.kontakt_id = emailToKontaktId[r._kontakt_email_lookup];
        }
        // AZ-Normalisierung für Duplicate-Detection
        if (insert.aktenzeichen) {
          insert.aktenzeichen_norm = AzNorm.normalize(insert.aktenzeichen);
        }
        inserts.push(insert);
      });

      for (let i = 0; i < inserts.length; i += 100) {
        const batch = inserts.slice(i, i + 100);
        const { data, error } = await sb.from('auftraege').insert(batch).select('id');
        if (error) {
          if (insertedIds.length > 0) {
            await sb.from('auftraege').delete().in('id', insertedIds.map(x => x.id));
          }
          return jsonResponse(event, 500, { error: 'Insert-Fehler', detail: error.message, rolled_back: insertedIds.length });
        }
        (data || []).forEach(d => insertedIds.push({ entity: 'auftraege', id: d.id }));
      }
    } else if (body.target_entity === 'rechnungen') {
      const inserts = mappedRows.map(r => ({
        ..._stripLookupFields(r),
        workspace_id: ms.workspace_id,
        user_id: profile.id
      }));
      for (let i = 0; i < inserts.length; i += 100) {
        const batch = inserts.slice(i, i + 100);
        const { data, error } = await sb.from('rechnungen').insert(batch).select('id');
        if (error) {
          if (insertedIds.length > 0) {
            await sb.from('rechnungen').delete().in('id', insertedIds.map(x => x.id));
          }
          return jsonResponse(event, 500, { error: 'Insert-Fehler', detail: error.message, rolled_back: insertedIds.length });
        }
        (data || []).forEach(d => insertedIds.push({ entity: 'rechnungen', id: d.id }));
      }
    } else {
      return jsonResponse(event, 400, { error: "target_entity 'mixed' noch nicht unterstützt" });
    }

    // ── import_logs-Eintrag (Audit + Rollback) ──
    const { data: logRow, error: logErr } = await sb.from('import_logs').insert({
      workspace_id: ms.workspace_id,
      user_id: profile.id,
      source_format: body.source_format || 'generic_csv',
      target_entity: body.target_entity,
      filename: body.filename || null,
      total_rows: mappedRows.length,
      inserted_count: insertedIds.length,
      failed_count: 0,
      status: 'success',
      rollback_token: rollbackToken,
      rollback_expires_at: rollbackExpiresAt,
      inserted_ids: insertedIds,
      mapping: body.mapping,
      duration_ms: Date.now() - t0
    }).select('id').maybeSingle();

    if (logErr) {
      console.warn('[import-execute] import_logs insert failed:', logErr.message);
    }

    return jsonResponse(event, 200, {
      import_id: logRow ? logRow.id : null,
      status: 'success',
      inserted_count: insertedIds.length,
      failed_count: 0,
      rollback_token: rollbackToken,
      rollback_expires_at: rollbackExpiresAt,
      duration_ms: Date.now() - t0
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'import-execute' });

module.exports.__internals = {
  _applyMapping,
  _validateRequired,
  _stripLookupFields,
  VALID_TARGETS,
  MAX_ROWS,
  ROLLBACK_TTL_HOURS
};
