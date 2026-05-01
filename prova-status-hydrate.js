/* ════════════════════════════════════════════════════════════════════
   PROVA — prova-status-hydrate.js
   MOBILE-RESCUE Phase 0 RESTART (25.04.2026)

   ZWECK
   PROVA hat drei Login-Pfade (app-login-logic.js Normal-Login,
   auth-guard.js Legacy-Migration, Netlify-Identity-Direct-Session).
   Frühere Fix-Versuche (P0.1-P0.6) haben in einzelnen Pfaden gepatcht,
   aber nicht alle Session-Entstehungen erreicht — deshalb fehlten
   prova_paket / prova_status / prova_subscription_status / prova_trial_end
   im localStorage, trial-guard.js feuerte das Overlay fälschlich.

   Dieses Skript war der zentrale, pfad-unabhängige Sync-Mechanismus:
   zog Abo-Felder aus Legacy-Quelle nach und dispatchte ein
   'prova-status-loaded'-Event.

   STATUS NACH VOLL-CLEANUP-SPRINT 02.05.2026:
   Legacy-Datenquelle deaktiviert (siehe docs/diagnose/AIRTABLE-DRIFT-AUDIT.md).
   Sprint 11+ baut Status-Hydration auf Supabase-Direktzugriff via
   data-store.js (users + workspace_memberships + subscriptions).
   Bis dahin: nur Cache-Read + Event-Dispatch.

   VERHALTEN aktuell
   - Cached Werte aus localStorage emittieren
   - Keine Server-Calls
   - Event 'prova-status-loaded' bleibt für Konsumenten kompatibel

   EINBINDEN
   Nach prova-config.js (falls vorhanden) und prova-auth-api.js (falls
   vorhanden), VOR trial-guard.js und VOR page-spezifischen Logic-Scripts.

   NICHT IN SCOPE (separate Sprints)
   - Login-Flow-Konsolidierung (AUTH-PERFEKT 2.0)
   - DSGVO-Pseudonymisierung (S-SICHER Paket 2)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Legacy-Konstanten entfernt im Voll-Cleanup-Sprint 02.05.2026.

  /* ── Email aus allen bekannten Quellen ermitteln ── */
  function resolveEmail() {
    var e = (localStorage.getItem('prova_sv_email') || '').trim().toLowerCase();
    if (e && e.indexOf('@') !== -1) return e;
    try {
      var raw = localStorage.getItem('prova_user');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && typeof u === 'object' && u.email) {
          return String(u.email).trim().toLowerCase();
        }
      }
    } catch (e2) {}
    return '';
  }

  /* ── Event-Dispatcher (idempotent safe) ── */
  function emit(detail) {
    try {
      document.dispatchEvent(new CustomEvent('prova-status-loaded', { detail: detail || {} }));
    } catch (e) {}
  }

  /* ── Paket-Name normalisieren (Legacy-Mapping + Validierung) ── */
  function normalizePaket(raw) {
    var paket = (raw && raw.name) ? raw.name : (raw || 'Solo');
    var map = {
      Starter: 'Solo', starter: 'Solo', STARTER: 'Solo',
      Pro: 'Solo', pro: 'Solo', PRO: 'Solo',
      Enterprise: 'Team', enterprise: 'Team', ENTERPRISE: 'Team'
    };
    paket = map[paket] || paket;
    if (paket !== 'Solo' && paket !== 'Team') paket = 'Solo';
    return paket;
  }

  /* ── Status-Wert normalisieren (SingleSelect kommt als {name}-Objekt) ── */
  function normalizeStatus(raw) {
    if (raw && typeof raw === 'object' && raw.name) return raw.name;
    if (typeof raw === 'string') return raw;
    return 'Aktiv';
  }

  /* ── Hauptlauf ── */
  function run() {
    var email = resolveEmail();
    if (!email) return; // nicht eingeloggt — still aussteigen

    // Bereits synchronisiert? — idempotent, nur Event nachreichen.
    if (localStorage.getItem('prova_subscription_status')) {
      emit({
        cached: true,
        paket: localStorage.getItem('prova_paket'),
        status: localStorage.getItem('prova_status'),
        subscription_status: localStorage.getItem('prova_subscription_status')
      });
      return;
    }

    // Voll-Cleanup-Sprint 02.05.2026 (Block 2A):
    // SV-Status-Hydration aus Legacy-Quelle deaktiviert. Sprint 11+ baut
    // den Status-Lookup auf Supabase-Direktzugriff
    // (users + workspace_memberships + subscriptions). Bis dahin: Cache-only.
    // Doc: docs/diagnose/AIRTABLE-DRIFT-AUDIT.md
    emit({
      cached: !!localStorage.getItem('prova_subscription_status'),
      paket: localStorage.getItem('prova_paket') || '',
      status: localStorage.getItem('prova_status') || '',
      subscription_status: localStorage.getItem('prova_subscription_status') || ''
    });
  }

  /* ── Trigger: direkt wenn DOM bereits bereit, sonst nach DOMContentLoaded ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
