/* ════════════════════════════════════════════════════════════════
   PROVA — Mahnung Stufe 1 (mahnung-check.js)
   Hintergrund-Check offener Rechnungen beim Dashboard-Login.
   Schlägt dem SV automatisch Mahnungen vor — sendet NIE selbst.
   
   Ablauf:
   1. Beim Laden: prüfe ob heute schon gecheckt wurde
   2. Lade offene Rechnungen aus Airtable (mit Timeout-Fallback)
   3. Ermittle überfällige nach prova_vl_mahnung Tagen
   4. Zeige Dialog: "X Rechnungen überfällig — Mahnungen vorschlagen?"
   5. SV wählt welche, klickt → öffnet Mahnwesen-Seite mit Vorauswahl
════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var MAHN_CHECK_KEY  = 'prova_mahnung_check_datum';
  var MAHN_CACHE_KEY  = 'prova_mahnung_cache';
  var AT_BASE         = 'appJ7bLlAHZoxENWE';
  var AT_RECHNUNGEN   = 'tblF6MS7uiFAJDjiT';

  /* ─── Nur einmal pro Tag prüfen ──────────────────────────── */
  function heuteGecheckt() {
    var letzter = localStorage.getItem(MAHN_CHECK_KEY);
    var heute   = new Date().toISOString().slice(0, 10);
    return letzter === heute;
  }

  function markiereGecheckt() {
    localStorage.setItem(MAHN_CHECK_KEY, new Date().toISOString().slice(0, 10));
  }

  /* ─── Schwellwert aus Einstellungen ──────────────────────── */
  function getSchwellwert() {
    return parseInt(localStorage.getItem('prova_vl_mahnung') || '14', 10);
  }

  /* ─── Rechnungen laden ───────────────────────────────────── */
  async function ladeOffeneRechnungen() {
    var svEmail = localStorage.getItem('prova_sv_email') || '';
    if (!svEmail) return [];

    // Zuerst Cache nutzen
    var cache = [];
    try {
      cache = JSON.parse(localStorage.getItem(MAHN_CACHE_KEY) || '[]');
    } catch(e) {}

    // Airtable im Hintergrund
    try {
      var controller = new AbortController();
      var tout = setTimeout(function() { controller.abort(); }, 6000);
      var filter = 'AND({sv_email}="' + svEmail + '",OR({Status}="Offen",{Status}="1. Mahnung",{Status}="2. Mahnung",{Status}="Überfällig"))';
      var path   = '/v0/' + AT_BASE + '/' + AT_RECHNUNGEN +
                   '?filterByFormula=' + encodeURIComponent(filter) +
                   '&maxRecords=100' +
                   '&fields[]=Rechnungsnummer&fields[]=Auftraggeber_Name&fields[]=empfaenger_name' +
                   '&fields[]=brutto_betrag_eur&fields[]=Betrag_Brutto' +
                   '&fields[]=Rechnungsdatum&fields[]=rechnungsdatum' +
                   '&fields[]=faellig_am&fields[]=Status';

      var hdrs = Object.assign(
        {'Content-Type': 'application/json'},
        window.provaAuthHeaders ? window.provaAuthHeaders() : {}
      );
      var res  = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST', headers: hdrs, signal: controller.signal,
        body: JSON.stringify({ method: 'GET', path: path })
      });
      clearTimeout(tout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var records = (data.records || []).map(function(r) {
        var f = r.fields;
        return {
          id:           r.id,
          re_nr:        f.Rechnungsnummer || f.re_nr || '—',
          auftraggeber: f.Auftraggeber_Name || f.empfaenger_name || '—',
          betrag:       parseFloat(f.Betrag_Brutto || f.brutto_betrag_eur || 0),
          datum:        f.Rechnungsdatum || f.rechnungsdatum || '',
          faellig_am:   f.faellig_am || '',
          status:       f.Status || 'Offen'
        };
      });
      localStorage.setItem(MAHN_CACHE_KEY, JSON.stringify(records));
      return records;
    } catch(e) {
      return cache; // Fallback auf Cache
    }
  }

  /* ─── Überfällige ermitteln ──────────────────────────────── */
  function ermittleUeberfaellige(rechnungen, schwellwert) {
    var heute = Date.now();
    return rechnungen.filter(function(r) {
      if (r.status === 'Bezahlt') return false;
      var zahlungsziel = 30; // Standard 30 Tage
      var datumMs = r.datum ? new Date(r.datum).getTime() : 0;
      if (!datumMs) return false;
      var tageOffen = Math.floor((heute - datumMs) / 86400000);
      var tageUeber = tageOffen - zahlungsziel;
      r._tageOffen  = tageOffen;
      r._tageUeber  = tageUeber;
      r._mahnStufe  = tageUeber > 60 ? 3 : tageUeber > 30 ? 2 : tageUeber > 0 ? 1 : 0;
      return tageOffen >= schwellwert && tageUeber >= 0;
    });
  }

  /* ─── Dialog aufbauen ────────────────────────────────────── */
  function zeigeDialog(ueberfaellige) {
    if (!ueberfaellige.length) return;
    if (document.getElementById('mahn-dialog-overlay')) return;

    var n = ueberfaellige.length;
    var gesamtBetrag = ueberfaellige.reduce(function(s, r) { return s + r.betrag; }, 0);

    // Overlay
    var ov = document.createElement('div');
    ov.id = 'mahn-dialog-overlay';
    ov.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(3px)',
      'z-index:8500;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box'
    ].join(';');

    // Rechnungs-Liste HTML
    var listeHTML = ueberfaellige.map(function(r, i) {
      var stufeLabel = r._mahnStufe === 1 ? '1. Mahnung fällig' :
                       r._mahnStufe === 2 ? '2. Mahnung fällig' :
                       r._mahnStufe === 3 ? '3. Mahnung fällig' : 'Überfällig';
      var stufeColor = r._mahnStufe >= 3 ? '#ef4444' : r._mahnStufe === 2 ? '#f59e0b' : '#6b7280';
      return '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;' +
             'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);' +
             'border-radius:8px;cursor:pointer;transition:background .12s;" ' +
             'onmouseover="this.style.background=\'rgba(255,255,255,.06)\'" ' +
             'onmouseout="this.style.background=\'rgba(255,255,255,.03)\'">' +
               '<input type="checkbox" id="mahn-cb-' + i + '" checked ' +
               'style="margin-top:2px;accent-color:#4f8ef7;width:15px;height:15px;flex-shrink:0;">' +
               '<div style="flex:1;min-width:0;">' +
                 '<div style="font-size:13px;font-weight:600;color:#e8eaf0;">' +
                   r.re_nr + ' · ' + (r.auftraggeber.length > 30 ? r.auftraggeber.slice(0,30)+'…' : r.auftraggeber) +
                 '</div>' +
                 '<div style="font-size:11px;color:#6b7280;margin-top:2px;">' +
                   r._tageOffen + ' Tage offen · ' +
                   r.betrag.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €' +
                 '</div>' +
               '</div>' +
               '<span style="font-size:10px;padding:2px 7px;border-radius:99px;font-weight:700;' +
               'background:rgba(239,68,68,.1);color:' + stufeColor + ';white-space:nowrap;">' +
               stufeLabel + '</span>' +
             '</label>';
    }).join('');

    ov.innerHTML = '<div style="' +
      'background:#131620;border:1px solid rgba(255,255,255,.1);border-radius:16px;' +
      'padding:28px 24px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;' +
      'box-shadow:0 24px 80px rgba(0,0,0,.7);font-family:inherit;">' +

      // Header
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
        '<span style="font-size:22px;">💶</span>' +
        '<div style="font-size:17px;font-weight:800;color:#e8eaf0;">Offene Rechnungen</div>' +
      '</div>' +
      '<div style="font-size:13px;color:#6b7280;margin-bottom:20px;">' +
        n + ' Rechnung' + (n!==1?'en':'') + ' seit mindestens ' + getSchwellwert() + ' Tagen offen · ' +
        'Gesamt ' + gesamtBetrag.toLocaleString('de-DE',{minimumFractionDigits:2}) + ' €' +
      '</div>' +

      // Rechnungsliste
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">' +
        listeHTML +
      '</div>' +

      // Alle/Keine Buttons
      '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
        '<button onclick="document.querySelectorAll(\'[id^=mahn-cb-]\').forEach(function(cb){cb.checked=true;})" ' +
        'style="flex:1;padding:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);' +
        'border-radius:7px;color:#9da3b4;font-size:11px;cursor:pointer;font-family:inherit;">Alle wählen</button>' +
        '<button onclick="document.querySelectorAll(\'[id^=mahn-cb-]\').forEach(function(cb){cb.checked=false;})" ' +
        'style="flex:1;padding:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);' +
        'border-radius:7px;color:#9da3b4;font-size:11px;cursor:pointer;font-family:inherit;">Keine</button>' +
      '</div>' +

      // Haupt-Buttons
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<button id="mahn-btn-weiter" style="padding:14px;background:#4f8ef7;border:none;border-radius:10px;' +
        'color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">' +
        'Mahnungen vorbereiten →</button>' +
        '<button id="mahn-btn-spaeter" style="padding:12px;background:transparent;' +
        'border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#6b7280;' +
        'font-size:13px;cursor:pointer;font-family:inherit;">Später erinnern</button>' +
      '</div>' +

      // Einstellungen-Link
      '<div style="text-align:center;margin-top:12px;">' +
        '<a href="einstellungen.html" onclick="document.getElementById(\'mahn-dialog-overlay\').remove();" ' +
        'style="font-size:11px;color:#4b5563;text-decoration:none;">⚙️ Mahnungs-Einstellungen</a>' +
      '</div>' +
    '</div>';

    document.body.appendChild(ov);

    // Overlay-Click schließt nicht (wichtig: SV soll bewusst entscheiden)

    // Weiter-Button
    document.getElementById('mahn-btn-weiter').addEventListener('click', function() {
      // Ausgewählte Rechnungen sammeln
      var ausgewaehlt = [];
      ueberfaellige.forEach(function(r, i) {
        var cb = document.getElementById('mahn-cb-' + i);
        if (cb && cb.checked) ausgewaehlt.push(r.id);
      });
      // IDs in sessionStorage für Mahnwesen-Seite
      sessionStorage.setItem('prova_mahnung_vorauswahl', JSON.stringify(ausgewaehlt));
      window.location.href = 'mahnwesen.html';
    });

    // Später-Button
    document.getElementById('mahn-btn-spaeter').addEventListener('click', function() {
      ov.remove();
      // Morgen wieder erinnern (nicht heute nochmal)
      markiereGecheckt();
    });
  }

  /* ─── Hauptfunktion ──────────────────────────────────────── */
  async function mahnungCheck() {
    // Nur auf Dashboard, nur einmal pro Tag
    var page = window.location.pathname.split('/').pop() || 'dashboard.html';
    if (page !== 'dashboard.html' && page !== '') return;
    if (heuteGecheckt()) return;

    // Kurz warten bis Dashboard geladen ist
    await new Promise(function(r) { setTimeout(r, 2500); });

    markiereGecheckt();

    var schwellwert   = getSchwellwert();
    var rechnungen    = await ladeOffeneRechnungen();
    var ueberfaellige = ermittleUeberfaellige(rechnungen, schwellwert);

    if (ueberfaellige.length > 0) {
      zeigeDialog(ueberfaellige);
    }
  }

  // Starten wenn DOM bereit
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mahnungCheck);
  } else {
    mahnungCheck();
  }

  // Öffentlich exportieren für manuelle Trigger (z.B. aus Einstellungen)
  window.PROVAMahnungCheck = { run: mahnungCheck };

})();
