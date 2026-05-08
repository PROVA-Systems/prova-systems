/**
 * PROVA Import-Assistent Supabase-Wiring (MEGA⁴¹ P1)
 *
 * Bridge zwischen import-assistent.html (Legacy-UI mit Airtable+localStorage)
 * und neuen Supabase-Backend-Lambdas (validate/execute/rollback).
 *
 * Public API (window.ProvaImportSupabase):
 *   validateData({source_format, target_entity, csv_data, mapping?}) → Promise<validateResp>
 *   executeImport({source_format, target_entity, csv_data, mapping, filename?}) → Promise<executeResp>
 *   rollback(token) → Promise<rollbackResp>
 *   getRecentImports() → Promise<importLog[]>
 *
 * Hinweis: import-assistent-logic.js (Legacy) bleibt für Backward-Compat. Marcel
 * kann später entscheiden ob er Legacy-Pfad entfernt oder beide parallel nutzt.
 */
'use strict';

(function () {

  const VALIDATE_ENDPOINT = '/.netlify/functions/import-validate';
  const EXECUTE_ENDPOINT = '/.netlify/functions/import-execute';
  const ROLLBACK_ENDPOINT = '/.netlify/functions/import-rollback';

  function _getAuthToken() {
    try {
      if (window.netlifyIdentity && window.netlifyIdentity.currentUser) {
        const u = window.netlifyIdentity.currentUser();
        if (u && u.token && u.token.access_token) return u.token.access_token;
      }
    } catch (_) {}
    try {
      const t = localStorage.getItem('sb-access-token') || localStorage.getItem('supabase.auth.token');
      if (t) return t;
    } catch (_) {}
    return null;
  }

  async function _post(url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = _getAuthToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }
    if (!res.ok) {
      const err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  /**
   * Pre-Validate vor Mass-Import.
   *
   * @param {Object} opts - { source_format?, target_entity, csv_data?, json_data?, mapping? }
   * @returns {Promise<{valid, errors, preview, total_rows, detected_format, suggested_mapping}>}
   */
  async function validateData(opts) {
    if (!opts || !opts.target_entity) throw new Error('target_entity pflicht');
    if (!opts.csv_data && !opts.json_data) throw new Error('csv_data oder json_data pflicht');
    return _post(VALIDATE_ENDPOINT, opts);
  }

  /**
   * Mass-Import ausführen (Atomic).
   *
   * @param {Object} opts - { source_format, target_entity, csv_data, mapping, filename? }
   * @returns {Promise<{import_id, status, inserted_count, rollback_token, rollback_expires_at}>}
   */
  async function executeImport(opts) {
    if (!opts || !opts.target_entity) throw new Error('target_entity pflicht');
    if (!opts.mapping) throw new Error('mapping pflicht');
    if (!opts.csv_data && !opts.json_data) throw new Error('csv_data oder json_data pflicht');
    return _post(EXECUTE_ENDPOINT, opts);
  }

  /**
   * Rollback eines Imports (innerhalb 24h).
   *
   * @param {string} rollbackToken
   * @returns {Promise<{rolled_back_count, status}>}
   */
  async function rollback(rollbackToken) {
    if (!rollbackToken) throw new Error('rollbackToken pflicht');
    return _post(ROLLBACK_ENDPOINT, { rollback_token: rollbackToken });
  }

  /**
   * Lade Recent-Imports via Supabase-Direct-Query (für Audit-Anzeige).
   * Optional — nutzt window.ProvaSupabase wenn da.
   */
  async function getRecentImports() {
    if (!window.ProvaSupabase || typeof window.ProvaSupabase.from !== 'function') {
      return [];
    }
    try {
      const { data, error } = await window.ProvaSupabase
        .from('import_logs')
        .select('id, source_format, target_entity, total_rows, inserted_count, status, rollback_token, rollback_expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    } catch (_) {
      return [];
    }
  }

  // Public API
  const api = {
    validateData: validateData,
    executeImport: executeImport,
    rollback: rollback,
    getRecentImports: getRecentImports,
    VALIDATE_ENDPOINT: VALIDATE_ENDPOINT,
    EXECUTE_ENDPOINT: EXECUTE_ENDPOINT,
    ROLLBACK_ENDPOINT: ROLLBACK_ENDPOINT
  };

  if (typeof window !== 'undefined') {
    window.ProvaImportSupabase = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
