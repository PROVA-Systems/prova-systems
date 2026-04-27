/* ════════════════════════════════════════════════════════════════════
   PROVA — technische-stellungnahme-logic.js
   Sprint 04f Hotfix P5f.X2 — Block 6
   Eigenstaendige Auftragstyp-Page "Technische Stellungnahme"

   STATUS: SKELETON v1 — Backend-Anbindung TODO
   ─────────────────────────────────────────────────
   Was funktioniert:
   - Phase-Wechsel (1 -> 2 -> 3) mit Stepper-Update
   - Radio-Item-Highlight bei Selection
   - Frage-Zeichenzaehler
   - Local-Auto-Save in localStorage 'prova_ts_draft' alle 30s
   - Datum-Default heute
   - Aktenzeichen-Generator (lokal: TS-YYYY-NNN)

   Was TODO ist (vor Live-Schaltung):
   - Airtable-Schema TECH_STELLUNGNAHMEN anlegen
     (Schema-Spec siehe NACHT-PAUSE-2.md)
   - Tabellen-ID in airtable.js ALLOWED_TABLES whitelisten
   - airtable-Save-Funktion ueber provaFetch implementieren
     (provisorisch markiert: TODO_AT_SAVE)
   - PDFMonkey-Template-ID in PDFMONKEY_TEMPLATE_ID setzen
   - Kontakte-Dropdown-Integration in Phase 1
   - Diktat-Button in Phase 2 (whisper-diktat Function)
   - Normen-Multi-Select in Phase 2 (Normen-DB)
   - Datei-Upload in Phase 1 (foto-upload-Pattern adaptiert)
   - Rechnung-Erstellung-Integration (rechnung-pdf Function)
   - Email-Versand (smtp-senden Function)

   Warum SKELETON: Block 6 dieser Hotfix-Sprint hat 2h-Aufwand-
   Limit. Volle Backend-Anbindung waere 4-6h zusaetzlich.
   Marcel kann sofort die UI testen, Auto-Save sammelt Eingaben
   in localStorage. Backend-Migration in separatem Sprint.
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // TODO_AT_SAVE: Sobald Airtable-Tabelle live, hier ID setzen
  var TBL_TECH_STELLUNGNAHMEN = ''; // 'tblXXXXXXXXX' nach Marcel-Setup
  var PDFMONKEY_TEMPLATE_ID = '';   // nach Marcel-Setup

  var DRAFT_KEY = 'prova_ts_draft_v1';
  var AUTO_SAVE_MS = 30000;

  var _phase = 1;
  var _autoSaveTimer = null;

  /* ── Phasen-Navigation ──────────────────────────────────── */
  function updateStepper() {
    [1, 2, 3].forEach(function (n) {
      var el = document.getElementById('ts-step-' + n);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (n < _phase) el.classList.add('done');
      else if (n === _phase) el.classList.add('active');
    });
  }

  function showPhase(n) {
    [1, 2, 3].forEach(function (i) {
      var p = document.getElementById('ts-phase-' + i);
      if (p) p.classList.toggle('active', i === n);
    });
    var back = document.getElementById('ts-back-btn');
    var next = document.getElementById('ts-next-btn');
    if (back) back.style.display = (n > 1) ? '' : 'none';
    if (next) next.textContent = (n < 3) ? 'Weiter →' : 'Versenden →';
    _phase = n;
    updateStepper();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }

  window.tsGoTo = function (n) {
    if (n < 1 || n > 3) return;
    if (!validateUpTo(n - 1)) return;
    showPhase(n);
  };
  window.tsNext = function () {
    if (_phase >= 3) return tsVersenden();
    if (!validatePhase(_phase)) return;
    showPhase(_phase + 1);
  };
  window.tsBack = function () { if (_phase > 1) showPhase(_phase - 1); };

  function validatePhase(n) {
    if (n === 1) {
      var datum = document.getElementById('ts-datum');
      var frage = document.getElementById('ts-frage');
      var artChecked = document.querySelector('input[name="ts-art"]:checked');
      var missing = [];
      if (datum && !datum.value) missing.push('Datum');
      if (!artChecked) missing.push('Art der Anfrage');
      if (frage && !frage.value.trim()) missing.push('Konkrete Frage');
      if (missing.length) {
        alert('Bitte ausfuellen: ' + missing.join(', '));
        return false;
      }
    } else if (n === 2) {
      var antwort = document.getElementById('ts-antwort');
      if (antwort && !antwort.value.trim()) {
        alert('Antwort auf konkrete Frage ist Pflichtfeld.');
        return false;
      }
    }
    return true;
  }
  function validateUpTo(n) {
    for (var i = 1; i <= n; i++) {
      if (!validatePhase(i)) return false;
    }
    return true;
  }

  /* ── Aktenzeichen-Generator ─────────────────────────────── */
  function generateAz() {
    var year = new Date().getFullYear();
    var lastNum = parseInt(localStorage.getItem('prova_ts_last_num') || '0', 10);
    var next = lastNum + 1;
    localStorage.setItem('prova_ts_last_num', String(next));
    return 'TS-' + year + '-' + String(next).padStart(3, '0');
  }

  /* ── Auto-Save (localStorage only — TODO Backend) ───────── */
  function gatherDraft() {
    return {
      ts: Date.now(),
      phase: _phase,
      az: getVal('ts-az'),
      datum: getVal('ts-datum'),
      auftraggeber_name: getVal('ts-auftraggeber-name'),
      auftraggeber_email: getVal('ts-auftraggeber-email'),
      auftraggeber_adresse: getVal('ts-auftraggeber-adresse'),
      art: (document.querySelector('input[name="ts-art"]:checked') || {}).value || '',
      frage: getVal('ts-frage'),
      sachverhalt: getVal('ts-sachverhalt'),
      bewertung: getVal('ts-bewertung'),
      antwort: getVal('ts-antwort'),
      normen: getVal('ts-normen'),
      honorar: getVal('ts-honorar'),
      honorar_typ: getVal('ts-honorar-typ')
    };
  }
  function getVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, v) { var el = document.getElementById(id); if (el && v != null) el.value = v; }

  function autoSave() {
    var draft = gatherDraft();
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d) return;
      setVal('ts-az', d.az || '');
      setVal('ts-datum', d.datum || '');
      setVal('ts-auftraggeber-name', d.auftraggeber_name || '');
      setVal('ts-auftraggeber-email', d.auftraggeber_email || '');
      setVal('ts-auftraggeber-adresse', d.auftraggeber_adresse || '');
      if (d.art) {
        var radio = document.querySelector('input[name="ts-art"][value="' + d.art + '"]');
        if (radio) { radio.checked = true; updateRadioHighlight(); }
      }
      setVal('ts-frage', d.frage || '');
      setVal('ts-sachverhalt', d.sachverhalt || '');
      setVal('ts-bewertung', d.bewertung || '');
      setVal('ts-antwort', d.antwort || '');
      setVal('ts-normen', d.normen || '');
      setVal('ts-honorar', d.honorar || '');
      setVal('ts-honorar-typ', d.honorar_typ || 'pauschal');
      updateFrageCounter();
    } catch (e) {}
  }

  window.tsSpeichern = function () {
    autoSave();
    // TODO_AT_SAVE: Spaeter Airtable-Persistierung hier ergaenzen.
    var saved = document.getElementById('ts-saved-toast');
    if (!saved) {
      saved = document.createElement('div');
      saved.id = 'ts-saved-toast';
      saved.style.cssText = 'position:fixed;bottom:30px;right:30px;background:var(--success);color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(16,185,129,.4);';
      document.body.appendChild(saved);
    }
    saved.textContent = '💾 Entwurf gespeichert (lokal)';
    saved.style.display = 'block';
    setTimeout(function () { if (saved) saved.style.display = 'none'; }, 2400);
  };

  function tsVersenden() {
    if (!validatePhase(2)) return;
    // TODO_AT_SAVE: Airtable-Save + PDFMonkey-Trigger + Versand
    alert(
      '⚠ Versand-Backend noch nicht angebunden.\n\n' +
      'Marcel-TODO:\n' +
      '1. TECH_STELLUNGNAHMEN-Tabelle in Airtable anlegen (Schema in NACHT-PAUSE-2.md)\n' +
      '2. PDFMonkey-Template "TECHNISCHE_STELLUNGNAHME" anlegen\n' +
      '3. airtable.js ALLOWED_TABLES um die neue Tabelle erweitern\n' +
      '4. In technische-stellungnahme-logic.js die TODO_AT_SAVE-Markierungen befuellen\n\n' +
      'Entwurf liegt in localStorage — geht nicht verloren.'
    );
  }

  /* ── Radio-Item-Highlight ───────────────────────────────── */
  function updateRadioHighlight() {
    document.querySelectorAll('.ts-radio-item').forEach(function (el) {
      var inp = el.querySelector('input[type=radio]');
      el.classList.toggle('checked', !!(inp && inp.checked));
    });
  }

  /* ── Frage-Zeichenzaehler ───────────────────────────────── */
  function updateFrageCounter() {
    var inp = document.getElementById('ts-frage');
    var cnt = document.getElementById('ts-frage-count');
    if (inp && cnt) cnt.textContent = String(inp.value.length);
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    // Datum-Default heute
    var datum = document.getElementById('ts-datum');
    if (datum && !datum.value) datum.value = new Date().toISOString().slice(0, 10);

    // Aktenzeichen erstmalig generieren wenn leer
    var az = document.getElementById('ts-az');
    if (az && !az.value) az.value = generateAz();

    // Draft restore
    loadDraft();

    // Frage-Counter
    var frage = document.getElementById('ts-frage');
    if (frage) frage.addEventListener('input', updateFrageCounter);

    // Radio-Highlights
    document.querySelectorAll('input[name="ts-art"]').forEach(function (r) {
      r.addEventListener('change', updateRadioHighlight);
    });
    updateRadioHighlight();

    // Auto-Save Timer
    if (_autoSaveTimer) clearInterval(_autoSaveTimer);
    _autoSaveTimer = setInterval(autoSave, AUTO_SAVE_MS);
    window.addEventListener('beforeunload', autoSave);

    // Stepper init
    updateStepper();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
