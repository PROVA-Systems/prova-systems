/**
 * PROVA Systems — dashboard-init.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 3 Performance Fix — Dashboard Orchestrator (5/5)
 *
 * Lädt alle Daten parallel (Promise.all) und koordiniert die Module.
 * Reihenfolge der Script-Tags in dashboard.html:
 *
 *   <script src="dashboard-core.js"     defer></script>
 *   <script src="dashboard-kpis.js"     defer></script>
 *   <script src="dashboard-aufgaben.js" defer></script>
 *   <script src="dashboard-kalender.js" defer></script>
 *   <script src="dashboard-init.js"     defer></script>
 *
 * ODER als Einzel-Bundle via dashboard-bundle.js (concat obiger Dateien)
 * ══════════════════════════════════════════════════════════════════════
 */
'use strict';

var DASH = window.DASH = window.DASH || {};

/* ══ Onboarding zeigen ══════════════════════════════════════════════ */
DASH.zeigOnboarding = function() {
  var feed = document.getElementById('aufgaben-feed');
  if (!feed) return;
  feed.innerHTML = '<div style="background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.2);border-radius:16px;padding:28px 24px;text-align:center;">'
    + '<div style="font-size:36px;margin-bottom:16px;">🚀</div>'
    + '<div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:10px;">Willkommen bei PROVA!</div>'
    + '<div style="font-size:13px;color:var(--text3);margin-bottom:24px;max-width:340px;margin-left:auto;margin-right:auto;">Legen Sie Ihren ersten Schadenfall an und PROVA führt Sie durch den gesamten Gutachten-Workflow.</div>'
    + '<button onclick="window.location.href=\'app.html\'" style="padding:12px 24px;border-radius:10px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);">+ Ersten Fall anlegen</button>'
    + '</div>';
};

/* ══ Haupt-Daten-Laden (Airtable, parallel) ══════════════════════════ */
DASH.ladeAlleDaten = async function() {
  var svEmail = DASH.svEmail || localStorage.getItem('prova_sv_email') || '';

  /* BUG #006 FIX: Kein svEmail = keine Daten laden (verhindert Datenleck) */
  if (!svEmail) {
    console.warn('[DashInit] Kein SV-Email — leere Ansicht');
    DASH.zeigEmptyDashboard && DASH.zeigEmptyDashboard();
    return;
  }

  try {
    var filterFaelle     = 'AND(NOT({Status}=""),{sv_email}="' + svEmail + '")';
    var filterTermine    = '{sv_email}="' + svEmail + '"';
    var filterRechnungen = 'AND(OR({Status}="Offen",{Status}="Überfällig"),{sv_email}="' + svEmail + '")';

    var faelleFelder = ['Aktenzeichen','Status','Schadensart','Auftraggeber_Name','Adresse_Schadensort','Fristdatum','sv_email','erstellt_am','Phase'];

    /* Parallel laden — Promise.all statt sequenziell */
    var results = await Promise.all([
      DASH.atFetch(DASH.AT_FAELLE,     filterFaelle,     100, faelleFelder),
      DASH.atFetch(DASH.AT_TERMINE,    filterTermine,    50,  ['Aktenzeichen','termin_datum','termin_uhrzeit','betreff','typ','sv_email']),
      DASH.atFetch(DASH.AT_RECHNUNGEN, filterRechnungen, 50,  [])
    ]);

    var faelle     = results[0] || [];
    var termine    = results[1] || [];
    var rechnungen = results[2] || [];

    window._lastTermine = termine;

    /* Fallback: localStorage wenn Airtable leer */
    if (faelle.length === 0) {
      var ls = [];
      try { ls = JSON.parse(localStorage.getItem('prova_faelle_cache') || '[]'); } catch(e) {}
      if (ls.length === 0) {
        DASH.zeigOnboarding();
        DASH.renderKPIs && DASH.renderKPIs([], [], []);
        DASH.renderCal  && DASH.renderCal([]);
        return;
      }
      faelle = ls.map(function(a) {
        return {fields: {Aktenzeichen:a.aktenzeichen, Status:a.status||'In Bearbeitung', Schadensart:a.schadenart, Schaden_Strasse:a.adresse, Ort:a.ort, Timestamp:a.datum}};
      });
    }

    /* Module rendern */
    var stats = DASH.renderKPIs    ? DASH.renderKPIs(faelle, termine, rechnungen)  : {};
    DASH.renderFeed && DASH.renderFeed(faelle, termine, rechnungen, stats);
    DASH.renderRecent && DASH.renderRecent(faelle);

    /* Caches für sofort-Render aktualisieren */
    try {
      localStorage.setItem('prova_archiv_cache_v2', JSON.stringify({data: faelle, ts: Date.now()}));
      DASH.renderAufgabenSofort && DASH.renderAufgabenSofort();
    } catch(e) {}

    try {
      localStorage.setItem('prova_termine_cache', JSON.stringify(termine));
      DASH.renderFristenMini && DASH.renderFristenMini();
    } catch(e) {}

    DASH.renderCal && DASH.renderCal(termine);

  } catch(err) {
    console.warn('[DashInit] Ladefehler:', err.message);
    /* Graceful degradation — zeige localStorage-Daten */
    var ls = [];
    try { ls = JSON.parse(localStorage.getItem('prova_faelle_cache') || '[]'); } catch(e) {}
    if (ls.length === 0) {
      DASH.zeigOnboarding();
      DASH.renderKPIs && DASH.renderKPIs([], [], []);
    } else {
      var faelleLS = ls.map(function(a) {
        return {fields: {Aktenzeichen:a.aktenzeichen, Status:a.status||'In Bearbeitung', Schadensart:a.schadenart, Timestamp:a.datum}};
      });
      DASH.renderKPIs   && DASH.renderKPIs(faelleLS, [], []);
      DASH.renderRecent && DASH.renderRecent(faelleLS);
    }
    DASH.renderCal && DASH.renderCal([]);
  }
};

/* ══ DOMContentLoaded ════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {

  /* 1. Begrüssung sofort */
  DASH.zeigBegruessing && DASH.zeigBegruessing();

  /* 2. Profil-Check */
  DASH.checkProfil && DASH.checkProfil();

  /* 3. Sofort aus Cache rendern (0ms) */
  DASH.renderAufgabenSofort && DASH.renderAufgabenSofort();
  DASH.renderFristenMini    && DASH.renderFristenMini();

  /* 4. Airtable nachladen (async, ~1-2s) */
  DASH.ladeAlleDaten().catch(function(e) {
    console.warn('[DashInit] Async-Fehler:', e);
  });
});

/* ══ Rückwärtskompatibilität ════════════════════════════════════════ */
// Alte direkte Aufrufe von dashboard.html bleiben funktionsfähig
window.renderAufgaben      = function(f,t)     { DASH.renderAufgabenSofort && DASH.renderAufgabenSofort(); };
window.renderKPIs          = function(f,t,r)   { return DASH.renderKPIs    ? DASH.renderKPIs(f,t,r) : {}; };
window.renderFeed          = function(f,t,r,s) { DASH.renderFeed          && DASH.renderFeed(f,t,r,s); };
window.renderRecent        = function(f)       { DASH.renderRecent        && DASH.renderRecent(f); };
window.renderCal           = function(t)       { DASH.renderCal           && DASH.renderCal(t); };
window.renderAufgabenSofort= function()        { DASH.renderAufgabenSofort && DASH.renderAufgabenSofort(); };
window.renderFristenMini   = function()        { DASH.renderFristenMini   && DASH.renderFristenMini(); };
window.checkProfil         = function()        { DASH.checkProfil         && DASH.checkProfil(); };
window.ladeAlleDaten       = function()        { return DASH.ladeAlleDaten(); };
window.zeigOnboarding      = function()        { DASH.zeigOnboarding      && DASH.zeigOnboarding(); };

console.log('[DashInit] Geladen ✓ — alle Module bereit');