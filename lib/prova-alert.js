/**
 * PROVA Alert-Helper (DRY-Refactor)
 * MEGA¹¹ W8 (Tier 12, 2026-05-04)
 *
 * Konsolidiert das in MEGA⁹+MEGA¹⁰ etablierte Defense-in-Depth-Pattern:
 *
 *   if (window.ProvaUI && window.ProvaUI.toast) {
 *     window.ProvaUI.toast(msg, severity);
 *   } else {
 *     alert(msg);
 *   }
 *
 * In einem Helper. Migration aller bisherigen Stellen wird dramatisch
 * kuerzer + einheitlicher.
 *
 * Public API:
 *   provaAlert(msg)                — info-toast (default)
 *   provaAlert(msg, 'error')       — error-toast (rot)
 *   provaAlert(msg, 'success')     — success-toast (gruen)
 *   provaAlert(msg, 'info')        — info-toast (neutral)
 *
 * USAGE:
 *   <script src="/lib/prova-alert.js" defer></script>
 *
 *   provaAlert('Speichern fehlgeschlagen', 'error');
 *   provaAlert('PDF erfolgreich erzeugt', 'success');
 *   provaAlert('Bitte Eingaben pruefen');
 *
 * Anti-Pattern vermieden:
 *   - Keine Async-Wartezeit (Toast ist non-blocking)
 *   - Kein Overwrite von ProvaUI.toast (eingenstaendige Funktion)
 *   - Fallback auf alert() bleibt — Defense-in-Depth wenn Library nicht geladen
 */
'use strict';

(function () {

  /**
   * Show a toast notification with alert() as fallback.
   *
   * @param {string} msg     - The message to display
   * @param {string} [severity='info'] - 'error' | 'success' | 'info'
   */
  function provaAlert(msg, severity) {
    const text = String(msg == null ? '' : msg);
    const sev = (severity === 'error' || severity === 'success') ? severity : 'info';

    if (window.ProvaUI && typeof window.ProvaUI.toast === 'function') {
      try {
        window.ProvaUI.toast(text, sev);
        return;
      } catch (e) {
        console.warn('[provaAlert] toast failed, falling back to alert:', e.message);
        // fall through to alert
      }
    }

    // Fallback: blocking-alert (immer noch besser als silent-fail)
    try { alert(text); } catch (_) {}
  }

  /**
   * Show a confirm dialog. Native confirm is blocking — kein Toast-Equivalent
   * existiert (Confirm braucht User-Action, Toast nicht).
   *
   * Wenn ein Modal-Confirm-Dialog (lib/prova-modal.js o.ae.) zukuenftig
   * existiert, ist hier der Single-Point-of-Migration.
   *
   * @param {string} msg
   * @returns {boolean}
   */
  function provaConfirm(msg) {
    const text = String(msg == null ? '' : msg);
    return confirm(text);
  }

  // Public API
  window.provaAlert = provaAlert;
  window.provaConfirm = provaConfirm;

  // Test-Exports
  window.provaAlert._test = {
    // Helper fuer Test-Mocks
  };
})();
