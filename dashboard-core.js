/**
 * PROVA Systems — dashboard-core.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 3 Performance Fix — Dashboard Modularisierung (1/4)
 *
 * Shared-Kern: Konstanten, atFetch, Skeleton, Onboarding
 * Wird von allen Dashboard-Modulen importiert/benötigt.
 *
 * Module-Struktur:
 *   dashboard-core.js       ← Dieser File (Basis, ~80 Zeilen)
 *   dashboard-kpis.js       ← KPI-Karten + Feed-Render (~220 Zeilen)
 *   dashboard-aufgaben.js   ← Aufgaben + Fristen (~200 Zeilen)
 *   dashboard-kalender.js   ← Kalender-Widget (~120 Zeilen)
 *   dashboard-init.js       ← DOMContentLoaded + ladeAlleDaten (~100 Zeilen)
 *
 * Vorher: 1 Datei × 1127 Zeilen — alle Sektionen blockieren sich gegenseitig
 * Nachher: 5 Dateien × ~150 Zeilen — jede Sektion unabhängig und testbar
 * ══════════════════════════════════════════════════════════════════════
 */

'use strict';

/* ══ Konfiguration (Single Source of Truth) ══════════════════════════ */
var DASH = window.DASH = window.DASH || {};

DASH.AT_BASE       = (window.PROVA_CONFIG && window.PROVA_CONFIG.AIRTABLE_BASE) || 'appJ7bLlAHZoxENWE';
DASH.AT_FAELLE     = 'tblSxV8bsXwd1pwa0';
DASH.AT_TERMINE    = 'tblyMTTdtfGQjjmc2';
DASH.AT_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';

DASH.paket       = localStorage.getItem('prova_paket') || 'Solo';
DASH.vorname     = localStorage.getItem('prova_sv_vorname') || '';
DASH.svEmail     = localStorage.getItem('prova_sv_email') || '';

DASH.paketColors = {Solo:'#4f8ef7',Team:'#a78bfa',Starter:'#4f8ef7',Pro:'#4f8ef7',Enterprise:'#a78bfa'};
DASH.pc          = DASH.paketColors[DASH.paket] || DASH.paketColors.Solo;
DASH.maxKontingent = DASH.paket==='Solo' ? 25 : DASH.paket==='Team' ? 75 : 5;

/* ── Paket Badge ──────────────────────────────────────────────────── */
(function(){
  var badge = document.getElementById('topbarPaket');
  if(badge){
    var c = DASH.pc;
    badge.textContent = DASH.paket;
    badge.style.cssText = 'background:'+c+'18;color:'+c+';border:1px solid '+c+'33;';
  }
})();

/* ══ Airtable Fetch (shared utility) ════════════════════════════════ */
DASH.atFetch = async function(table, formula, maxRecords, fields) {
  try {
    var path = '/v0/' + DASH.AT_BASE + '/' + table
      + '?filterByFormula=' + encodeURIComponent(formula)
      + '&maxRecords=' + (maxRecords || 50)
      + '&sort[0][field]=Timestamp&sort[0][direction]=desc';

    if (fields && fields.length) {
      fields.forEach(function(f){ path += '&fields[]=' + encodeURIComponent(f); });
    }

    var headers = Object.assign(
      {'Content-Type': 'application/json'},
      window.provaAuthHeaders ? window.provaAuthHeaders() : {}
    );

    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: headers,
      payload: JSON.stringify({ method: 'GET', path: path })
    });

    if (!res.ok) return [];
    var data = await res.json();
    return data.records || [];
  } catch(e) {
    console.warn('[DashCore] atFetch Fehler:', e.message);
    return [];
  }
};

/* ══ Skeleton Loading ════════════════════════════════════════════════ */
DASH.zeigSkeleton = function() {
  document.querySelectorAll('.skeleton-card').forEach(function(el) {
    el.style.display = 'block';
  });
};

/* ══ Empty Dashboard ════════════════════════════════════════════════ */
DASH.zeigEmptyDashboard = function() {
  var el = document.getElementById('empty-dashboard');
  if (el) el.style.display = 'flex';
};

/* ══ HTML Escape (shared utility) ═══════════════════════════════════ */
DASH.esc = function(s) {
  return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
};

/* ══ Profil-Badge Begrüssung ════════════════════════════════════════ */
DASH.zeigBegruessing = function() {
  var h = new Date().getHours();
  var greet = h < 5  ? 'Guten Abend'  :
              h < 12 ? 'Guten Morgen' :
              h < 18 ? 'Guten Tag'    : 'Guten Abend';
  var svName = DASH.vorname ? ', ' + DASH.vorname : '';
  var gt = document.getElementById('greeting-title');
  if (gt) gt.textContent = greet + svName + ' 👋';
  var gs = document.getElementById('greeting-sub');
  if (gs) {
    var tagesInfo = h < 12 ? 'Starten Sie gut in den Tag.' :
                   h < 18 ? 'Hier Ihr aktueller Überblick.' :
                             'Hier Ihr Abend-Überblick.';
    gs.textContent = tagesInfo;
  }
};

console.log('[DashCore] Geladen ✓');