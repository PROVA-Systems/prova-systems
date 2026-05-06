/**
 * PROVA — workflow-settings.js
 * MEGA¹⁵ W33 (Triple-Mode-Backend, 2026-05-06/07)
 *
 * GET   /netlify/functions/workflow-settings
 *   → returns { default_mode, mode_a_template_pref, mode_b_editor_config, mode_c_vorlagen_ids, onboarding_completed }
 *   → fallback wenn Tabelle leer: { default_mode: 'A', _fallback: true }
 *
 * PATCH /netlify/functions/workflow-settings
 *   Body: { default_mode?, mode_a_template_pref?, mode_b_editor_config?, mode_c_vorlagen_ids?, onboarding_completed? }
 *   → Upsert in user_workflow_settings
 *   → returns aktualisierte Settings
 *
 * Anti-Pattern vermieden:
 *   - Kein Service-Role-Bypass im Frontend (RLS schuetzt)
 *   - Validation der Input-Felder server-side
 *   - Audit-Log fuer onboarding_completed Aenderung
 *   - CORS-Headers aus zentraler Helper
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_MODES = ['A', 'B', 'C'];

function _validateBody(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };

  const updates = {};
  const errors = [];

  if (body.default_mode !== undefined) {
    if (VALID_MODES.indexOf(body.default_mode) === -1) {
      errors.push('default_mode must be A|B|C');
    } else {
      updates.default_mode = body.default_mode;
    }
  }

  if (body.mode_a_template_pref !== undefined) {
    if (typeof body.mode_a_template_pref !== 'string' && body.mode_a_template_pref !== null) {
      errors.push('mode_a_template_pref must be string or null');
    } else {
      updates.mode_a_template_pref = body.mode_a_template_pref;
    }
  }

  if (body.mode_b_editor_config !== undefined) {
    if (typeof body.mode_b_editor_config !== 'object') {
      errors.push('mode_b_editor_config must be object');
    } else {
      updates.mode_b_editor_config = body.mode_b_editor_config;
    }
  }

  if (body.mode_c_vorlagen_ids !== undefined) {
    if (!Array.isArray(body.mode_c_vorlagen_ids)) {
      errors.push('mode_c_vorlagen_ids must be array');
    } else {
      // String-IDs (UUIDs) only
      const allValid = body.mode_c_vorlagen_ids.every(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id));
      if (!allValid) {
        errors.push('mode_c_vorlagen_ids must contain valid UUIDs');
      } else {
        updates.mode_c_vorlagen_ids = body.mode_c_vorlagen_ids;
      }
    }
  }

  if (body.onboarding_completed !== undefined) {
    if (typeof body.onboarding_completed !== 'boolean') {
      errors.push('onboarding_completed must be boolean');
    } else {
      updates.onboarding_completed = body.onboarding_completed;
    }
  }

  if (errors.length > 0) return { ok: false, error: errors.join('; ') };
  if (Object.keys(updates).length === 0) return { ok: false, error: 'no valid fields to update' };

  return { ok: true, updates };
}

function _defaultSettings() {
  return {
    default_mode: 'A',
    mode_a_template_pref: null,
    mode_b_editor_config: null,
    mode_c_vorlagen_ids: [],
    onboarding_completed: false,
    _fallback: true
  };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  const userId = context.userId || context.user_id || null;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }

  if (!userId) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'no user_id from auth' }) };
  }

  const sb = getSupabase();
  if (!sb) {
    // Supabase nicht konfiguriert → Defaults zurueckgeben
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify(_defaultSettings())
    };
  }

  // ─── GET ──────────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await sb
        .from('user_workflow_settings')
        .select('default_mode, mode_a_template_pref, mode_b_editor_config, mode_c_vorlagen_ids, onboarding_completed, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // Tabelle existiert nicht (Migration noch nicht applied)
        if (/does not exist/i.test(error.message || '')) {
          return {
            statusCode: 200,
            headers: baseHeaders,
            body: JSON.stringify(_defaultSettings())
          };
        }
        return {
          statusCode: 500,
          headers: baseHeaders,
          body: JSON.stringify({ error: 'db query failed', detail: error.message })
        };
      }

      if (!data) {
        // Noch keine Settings → Defaults
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(_defaultSettings())
        };
      }

      return {
        statusCode: 200,
        headers: baseHeaders,
        body: JSON.stringify({ ...data, _fallback: false })
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'unexpected', detail: e.message })
      };
    }
  }

  // ─── PATCH ────────────────────────────────────────────────────
  if (event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid JSON' }) };
    }

    const validation = _validateBody(body);
    if (!validation.ok) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: validation.error }) };
    }

    try {
      // Upsert (insert if not exists, update if exists)
      const upsertData = {
        user_id: userId,
        ...validation.updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from('user_workflow_settings')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .maybeSingle();

      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          return {
            statusCode: 503,
            headers: baseHeaders,
            body: JSON.stringify({ error: 'workflow-settings-table not yet migrated', migration: '07_user_workflow_settings.sql' })
          };
        }
        return {
          statusCode: 500,
          headers: baseHeaders,
          body: JSON.stringify({ error: 'upsert failed', detail: error.message })
        };
      }

      // Audit-Log nur fuer onboarding_completed (relevant fuer Pilot-Tracking)
      if (validation.updates.onboarding_completed === true) {
        try {
          await sb.from('audit_trail').insert({
            function_name: 'workflow-settings',
            action: 'onboarding.completed',
            payload: { user_id: userId, default_mode: data.default_mode },
            result: 'ok'
          });
        } catch (_) { /* fire-and-forget */ }
      }

      return {
        statusCode: 200,
        headers: baseHeaders,
        body: JSON.stringify({ ...data, _fallback: false })
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'unexpected', detail: e.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: baseHeaders,
    body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['GET', 'PATCH'] })
  };
}), { functionName: 'workflow-settings' });

// Test-Exports
exports._test = {
  _validateBody,
  _defaultSettings,
  VALID_MODES
};
