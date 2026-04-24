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

   Dieses Skript ist der zentrale, pfad-unabhängige Sync-Mechanismus:
   läuft auf jeder Seite einmal, zieht Abo-Felder aus Airtable nach und
   dispatcht ein 'prova-status-loaded'-Event, sobald die Daten da sind.

   VERHALTEN
   - Keine Email erkennbar → still aussteigen (User nicht eingeloggt).
   - prova_subscription_status bereits gesetzt → nur Event dispatchen
     und aussteigen (idempotent, kein unnötiger Netzwerk-Call).
   - Sonst: POST /.netlify/functions/airtable, Felder speichern, Event
     dispatchen.
   - Fire-and-forget — alle Fehler landen nur in console.warn.

   EINBINDEN
   Nach prova-config.js (falls vorhanden) und prova-auth-api.js (falls
   vorhanden), VOR trial-guard.js und VOR page-spezifischen Logic-Scripts.

   NICHT IN SCOPE (separate Sprints)
   - Login-Flow-Konsolidierung (AUTH-PERFEKT 2.0)
   - DSGVO-Pseudonymisierung (S-SICHER Paket 2)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var AIRTABLE_BASE = (window.PROVA_CONFIG && window.PROVA_CONFIG.AIRTABLE_BASE)
                     || 'appJ7bLlAHZoxENWE';
  var SV_TABLE = 'tbladqEQT3tmx4DIB';

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

    // Airtable-Fetch (fire-and-forget, alle Fehler → warn)
    try {
      var filter = encodeURIComponent('{Email}="' + email.replace(/"/g, '\\"') + '"');
      var path = '/v0/' + AIRTABLE_BASE + '/' + SV_TABLE + '?filterByFormula=' + filter + '&maxRecords=1';

      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: path })
      }).then(function (r) {
        return r && r.ok ? r.json() : null;
      }).then(function (data) {
        if (!data || !data.records || !data.records.length) {
          console.warn('[StatusHydrate] Kein SV-Record fuer', email);
          return;
        }
        var rec = data.records[0];
        var f   = rec.fields || {};

        try {
          if (rec.id) localStorage.setItem('prova_at_sv_record_id', rec.id);

          var paket  = normalizePaket(f.Paket || f.paket);
          var status = normalizeStatus(f.Status);

          localStorage.setItem('prova_paket',  paket);
          localStorage.setItem('prova_status', status);

          if (f.subscription_status)  localStorage.setItem('prova_subscription_status', String(f.subscription_status).toLowerCase());
          if (f.trial_end)            localStorage.setItem('prova_trial_end', String(f.trial_end).slice(0, 10));
          if (f.current_period_end)   localStorage.setItem('prova_current_period_end', String(f.current_period_end).slice(0, 10));
          if (f.testpilot)            localStorage.setItem('prova_testpilot', '1');

          // Profil-Felder nur füllen wenn leer (nicht überschreiben)
          if (f.sv_vorname  && !localStorage.getItem('prova_sv_vorname'))  localStorage.setItem('prova_sv_vorname',  f.sv_vorname);
          if (f.sv_nachname && !localStorage.getItem('prova_sv_nachname')) localStorage.setItem('prova_sv_nachname', f.sv_nachname);

          console.log('[StatusHydrate] geladen:', paket, status, (f.subscription_status || '(kein sub-status)'));

          emit({
            cached: false,
            paket: paket,
            status: status,
            subscription_status: f.subscription_status || '',
            trial_end: f.trial_end || ''
          });
        } catch (e) {
          console.warn('[StatusHydrate] Parse-Fehler:', e && e.message);
        }
      }).catch(function (e) {
        console.warn('[StatusHydrate] Fetch fehlgeschlagen:', e && e.message);
      });
    } catch (e) {
      console.warn('[StatusHydrate] Sync-Fehler:', e && e.message);
    }
  }

  /* ── Trigger: direkt wenn DOM bereits bereit, sonst nach DOMContentLoaded ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
