/**
 * PROVA Workflow-Mode-Router (Triple-Mode-Foundation)
 * MEGA¹⁴ W28 (2026-05-06)
 *
 * Frontend-Library fuer Mode-Resolution + Routing:
 *   Mode A = PROVA-Standard (Templates) — existing
 *   Mode B = PROVA+Editor (TipTap) — MEGA¹⁵
 *   Mode C = Eigene Vorlagen (Word) — MEGA¹⁶
 *
 * STATUS: Foundation-Skelett. Implementation der Mode-spezifischen UIs
 *         folgt in MEGA¹⁵ + MEGA¹⁶.
 *
 * Public API:
 *   ProvaWorkflowMode.resolve({ auftragOverride, userDefault })  → 'A'|'B'|'C'
 *   ProvaWorkflowMode.openForAuftrag(auftragId)                   → lazy-load Mode-UI
 *   ProvaWorkflowMode.fetchSettings()                             → User-Settings
 *   ProvaWorkflowMode.updateDefault(mode)                         → setze Default
 *
 * Anti-Pattern vermieden:
 *   - Kein Hard-Switch (Daten-Verlust)
 *   - Kein Mode-Lock-In (User kann zurueck)
 *   - Defaults sicher: Fallback immer 'A' (existing Behaviour)
 *   - Mode-spezifische UIs werden lazy geladen (kein eager Load von TipTap)
 */
'use strict';

(function () {

  const VALID_MODES = ['A', 'B', 'C'];
  const DEFAULT_FALLBACK = 'A';

  /**
   * Resolved den effektiven Mode fuer eine Akte.
   *
   * Reihenfolge der Aufloesung:
   *   1. auftragOverride (pro-Akte gespeichert)
   *   2. userDefault (User-Setting)
   *   3. Fallback 'A'
   *
   * @param {object} params { auftragOverride, userDefault }
   * @returns {object} { mode: 'A'|'B'|'C', source: 'override'|'default'|'fallback' }
   */
  function resolve(params) {
    params = params || {};

    if (params.auftragOverride && VALID_MODES.indexOf(params.auftragOverride) !== -1) {
      return { mode: params.auftragOverride, source: 'override' };
    }

    if (params.userDefault && VALID_MODES.indexOf(params.userDefault) !== -1) {
      return { mode: params.userDefault, source: 'default' };
    }

    return { mode: DEFAULT_FALLBACK, source: 'fallback' };
  }

  /**
   * Fetcht User-Workflow-Settings vom Backend.
   * Backend-Endpoint: /netlify/functions/user-workflow-settings (MEGA¹⁵)
   *
   * @returns {Promise<{default_mode, mode_a_template_pref, ...}>}
   */
  async function fetchSettings() {
    const fetcher = window.provaFetch || window.fetch;
    try {
      const res = await fetcher('/.netlify/functions/user-workflow-settings');
      if (!res.ok) {
        // Endpoint existiert noch nicht (MEGA¹⁵-Foundation) → Fallback
        return { default_mode: DEFAULT_FALLBACK, _fallback: true };
      }
      return await res.json();
    } catch (e) {
      console.warn('[ProvaWorkflowMode] fetchSettings failed, fallback:', e.message);
      return { default_mode: DEFAULT_FALLBACK, _fallback: true, _error: e.message };
    }
  }

  /**
   * Updated den Default-Mode des Users.
   * Backend-Endpoint: PATCH /netlify/functions/user-workflow-settings (MEGA¹⁵)
   *
   * @param {string} mode 'A'|'B'|'C'
   * @returns {Promise<boolean>} true if successful
   */
  async function updateDefault(mode) {
    if (VALID_MODES.indexOf(mode) === -1) {
      console.warn('[ProvaWorkflowMode] invalid mode:', mode);
      return false;
    }
    const fetcher = window.provaFetch || window.fetch;
    try {
      const res = await fetcher('/.netlify/functions/user-workflow-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_mode: mode })
      });
      return res.ok;
    } catch (e) {
      console.warn('[ProvaWorkflowMode] updateDefault failed:', e.message);
      return false;
    }
  }

  /**
   * Oeffnet die Mode-spezifische UI fuer eine Akte.
   * Lazy-loads je nach Mode:
   *   A → existing auftragstyp-Pages
   *   B → editor.html (MEGA¹⁵)
   *   C → vorlagen-picker.html (MEGA¹⁶)
   *
   * @param {string} auftragId
   * @returns {Promise<void>}
   */
  async function openForAuftrag(auftragId) {
    if (!auftragId) {
      console.warn('[ProvaWorkflowMode] openForAuftrag: auftragId required');
      return;
    }

    // 1. Resolve den Mode
    const settings = await fetchSettings();
    const auftragOverride = await _fetchAuftragOverride(auftragId);

    const result = resolve({
      auftragOverride: auftragOverride,
      userDefault: settings.default_mode
    });

    // 2. Mode-spezifische Navigation
    switch (result.mode) {
      case 'A':
        // Mode A: existing — Auftragstyp-Routing via existing logic
        if (typeof window.oeffneAuftrag === 'function') {
          window.oeffneAuftrag(auftragId);
        } else {
          window.location.href = '/akte.html?id=' + encodeURIComponent(auftragId);
        }
        break;

      case 'B':
        // Mode B: TipTap-Editor (MEGA¹⁵ — noch nicht implementiert)
        console.info('[ProvaWorkflowMode] Mode B — Editor not yet implemented (MEGA¹⁵)');
        if (window.provaAlert) window.provaAlert('Editor-Modus ist noch in Entwicklung. Verwende Standard-Modus.', 'info');
        // Fallback: oeffne Mode A
        window.location.href = '/akte.html?id=' + encodeURIComponent(auftragId);
        break;

      case 'C':
        // Mode C: Eigene Vorlagen (MEGA¹⁶ — noch nicht implementiert)
        console.info('[ProvaWorkflowMode] Mode C — Eigene Vorlagen not yet implemented (MEGA¹⁶)');
        if (window.provaAlert) window.provaAlert('Vorlagen-Modus ist noch in Entwicklung.', 'info');
        window.location.href = '/akte.html?id=' + encodeURIComponent(auftragId);
        break;

      default:
        console.warn('[ProvaWorkflowMode] unknown mode:', result.mode);
    }
  }

  // Internal: Fetcht Auftrag-Override (kann null sein)
  async function _fetchAuftragOverride(auftragId) {
    const fetcher = window.provaFetch || window.fetch;
    try {
      const res = await fetcher('/.netlify/functions/auftrag-mode-override?auftrag_id=' + encodeURIComponent(auftragId));
      if (!res.ok) return null;
      const data = await res.json();
      return data.workflow_mode_override || null;
    } catch (_) {
      return null;
    }
  }

  // Public API
  window.ProvaWorkflowMode = {
    resolve: resolve,
    fetchSettings: fetchSettings,
    updateDefault: updateDefault,
    openForAuftrag: openForAuftrag,
    VALID_MODES: VALID_MODES,
    DEFAULT_FALLBACK: DEFAULT_FALLBACK
  };

  // Test-Exports
  window.ProvaWorkflowMode._test = {
    _fetchAuftragOverride: _fetchAuftragOverride
  };
})();
