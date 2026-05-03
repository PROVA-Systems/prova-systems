/**
 * PROVA — Storage-Router (Backend Migration-Helper)
 * MEGA⁴-EXT Q3 (04.05.2026) — AIRTABLE-DRIFT Bundle A Migration
 *
 * Vereint Airtable + Supabase mit graduellem Migrations-Pfad.
 *
 * Feature-Flag: PROVA_MIGRATION_PATH (ENV)
 *  - 'airtable' (default) — Status-Quo, nur Airtable lesen/schreiben
 *  - 'dual'    — Supabase primary, Airtable fallback bei Empty/Error
 *  - 'supabase' — nur Supabase
 *
 * Pro Function override-bar via opts.path bei jedem Call.
 *
 * AUDIT_TRAIL: bei jeder Path-Wahl ein Eintrag (typ='storage.path_chosen')
 * fuer Sprint-K-2 Migration-Verifikation.
 *
 * Schema-Mapping siehe `docs/diagnose/AIRTABLE-DRIFT-SCHEMA-MAPPING.md`.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

let _supabaseClient = null;
function getSupabase() {
  if (_supabaseClient) return _supabaseClient;
  const url = process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabaseClient;
}

function getMigrationPath(opts) {
  const override = opts && opts.path;
  if (override) return override;
  const envPath = String(process.env.PROVA_MIGRATION_PATH || 'airtable').toLowerCase();
  if (['airtable', 'dual', 'supabase'].includes(envPath)) return envPath;
  return 'airtable';
}

/**
 * Loggt die Path-Wahl in audit_trail (best-effort, blockt nie den Call).
 */
async function logPathChoice(functionName, path, meta) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('audit_trail').insert({
      typ: 'storage.path_chosen',
      sv_email: '[system]',
      details: JSON.stringify(Object.assign({
        function: functionName,
        path: path,
        ts: new Date().toISOString()
      }, meta || {}))
    });
  } catch (e) {
    // never block on audit
  }
}

/**
 * Generic read-router. Liest aus dem konfigurierten Backend.
 *
 * @param {object} cfg
 * @param {string} cfg.functionName — Caller-Identifier fuer Audit-Trail
 * @param {function} cfg.airtable — async () => Array (Airtable-Read)
 * @param {function} cfg.supabase — async () => Array (Supabase-Read)
 * @param {object} [opts]
 * @param {string} [opts.path] — Override 'airtable'|'dual'|'supabase'
 * @returns {Promise<Array>}
 */
async function readDual(cfg, opts) {
  const path = getMigrationPath(opts);
  const fn = cfg.functionName || 'unknown';

  if (path === 'airtable') {
    return cfg.airtable();
  }

  if (path === 'supabase') {
    const r = await cfg.supabase();
    await logPathChoice(fn, 'supabase', { count: Array.isArray(r) ? r.length : null });
    return r;
  }

  // dual: Supabase primary, Airtable fallback
  try {
    const r = await cfg.supabase();
    if (Array.isArray(r) && r.length > 0) {
      await logPathChoice(fn, 'dual-supabase-hit', { count: r.length });
      return r;
    }
    // Empty → fallback Airtable (waehrend Migration noch nicht alles drin)
    const fallback = await cfg.airtable();
    await logPathChoice(fn, 'dual-airtable-fallback', { sb_count: 0, ab_count: Array.isArray(fallback) ? fallback.length : null });
    return fallback;
  } catch (e) {
    // Supabase Error → fallback Airtable
    const fallback = await cfg.airtable();
    await logPathChoice(fn, 'dual-error-fallback', { error: e.message, ab_count: Array.isArray(fallback) ? fallback.length : null });
    return fallback;
  }
}

/**
 * Generic write-router. Schreibt in das konfigurierte Backend.
 * Bei 'dual': schreibt in BEIDE (idempotent), so dass Reader unabhaengig sind.
 *
 * @param {object} cfg
 * @param {string} cfg.functionName
 * @param {function} cfg.airtable — async () => result (Airtable-Write)
 * @param {function} cfg.supabase — async () => result (Supabase-Write)
 * @param {object} [opts]
 * @param {string} [opts.path]
 * @returns {Promise<{airtable?, supabase?}>}
 */
async function writeDual(cfg, opts) {
  const path = getMigrationPath(opts);
  const fn = cfg.functionName || 'unknown';

  if (path === 'airtable') {
    return { airtable: await cfg.airtable() };
  }

  if (path === 'supabase') {
    const r = await cfg.supabase();
    await logPathChoice(fn, 'supabase-write', {});
    return { supabase: r };
  }

  // dual: schreibt in beide (best-effort), Supabase ist der "Source of Truth"
  let sbResult, abResult, sbErr, abErr;
  try { sbResult = await cfg.supabase(); }
  catch (e) { sbErr = e.message; }
  try { abResult = await cfg.airtable(); }
  catch (e) { abErr = e.message; }

  await logPathChoice(fn, 'dual-write', { sb_ok: !sbErr, ab_ok: !abErr, sb_err: sbErr, ab_err: abErr });

  if (sbErr && abErr) {
    throw new Error('Both backends failed: SB="' + sbErr + '" AB="' + abErr + '"');
  }
  return { airtable: abResult, supabase: sbResult, sb_err: sbErr, ab_err: abErr };
}

module.exports = {
  getMigrationPath,
  readDual,
  writeDual,
  logPathChoice,
  getSupabase
};
