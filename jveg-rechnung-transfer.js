// ═══════════════════════════════════════════════════════════════════════════
// PROVA Systems — JVEG → Rechnung Transfer Enhancement
// File: jveg-rechnung-transfer.js  (Client-side, load in jveg.html)
//
// Was fehlt in v98 (alsRechnungUebernehmen in jveg-logic.js):
//   1. Gericht / Auftraggeber werden NUR aus localStorage geladen
//      → oft leer wenn User direkt zu jveg.html navigiert
//   2. Rechnungsdatum wird nicht übergeben (rechnungen-logic.js muss es manuell setzen)
//   3. Gericht-Adresse, Aktenzeichen des Gerichts (≠ PROVA-AZ) fehlt komplett
//   4. Steuernummer / USt-ID des SV fehlt im Prefill
//   5. JVEG-Bemerkung / Verwendungszweck für die Rechnung fehlt
//   6. Kein visuelles Feedback welche Felder aus Airtable geladen wurden
//
// Diese Datei ergänzt:
//   • Airtable-Lookup: wenn AZ eingegeben → Akte laden → Gericht + Auftraggeber befüllen
//   • Auto-Lookup beim Verlassen des AZ-Feldes (blur) und beim Klick auf btn-rechnung
//   • Erweitertes Prefill-Objekt mit: rechnungsdatum, gericht_name, gericht_adresse,
//     gericht_aktenzeichen, auftraggeber_name, auftraggeber_email, auftraggeber_anschrift,
//     sv_steuernummer, sv_ustid, jveg_bemerkung, schadenart, fahrt_von, fahrt_nach
//   • Live-Badge unter dem AZ-Feld (zeigt Ladestatus + geladene Gericht-Info)
//   • "Prefill komplett"-Indikator: grüner Check wenn alle relevanten Felder befüllt
//   • Rechnungsdatum = heute (DE-Format) immer gesetzt
//   • rechnungen-logic.js Empfänger: liest die neuen Felder aus prova_rechnung_prefill
//     und befüllt: #r-gericht, #r-gericht-adresse, #r-rechnungsdatum, #r-steuernummer, #r-bemerkung
//
// Integration in jveg.html:
//   <script src="jveg-rechnung-transfer.js" defer></script>   (nach jveg-logic.js)
//
// Integration in rechnungen-logic.js / rechnungen.html:
//   Neue Felder aus prefill lesen — Patch-Snippet am Ende dieser Datei
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Airtable Konfiguration (aus vorhandenem PROVA-Code) ─────────────────
  const AT_BASE   = 'appJ7bLlAHZoxENWE';
  const AT_FAELLE = 'tblSxV8bsXwd1pwa0';

  // Felder die wir aus der Akte laden wollen
  const AT_FIELDS = [
    'az',
    'Auftraggeber_Name',
    'Auftraggeber_Email',
    'Auftraggeber_Anschrift',
    'Gericht',
    'Gericht_Adresse',
    'Gericht_AZ',             // Aktenzeichen des Gerichts (≠ PROVA-AZ)
    'Schadenart',
    'Objekt_Adresse',
    'sv_email',
  ];

  // ── Modul-State ─────────────────────────────────────────────────────────
  let _lastLoadedAz  = '';
  let _akteCache     = {};   // az → Airtable-Felder
  let _lookupTimeout = null;

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const azInput = document.getElementById('aktenzeichen');
    if (!azInput) return;

    // Lookup-Badge unter dem AZ-Feld einfügen
    _insertAzBadge(azInput);

    // Lookup beim Verlassen des Feldes
    azInput.addEventListener('blur', function () {
      const az = azInput.value.trim();
      if (az && az !== _lastLoadedAz) _triggerLookup(az);
    });

    // Lookup mit Debounce beim Tippen (500ms)
    azInput.addEventListener('input', function () {
      clearTimeout(_lookupTimeout);
      const az = azInput.value.trim();
      if (az.length >= 8) {  // PROVA-AZ hat mind. 8 Zeichen
        _lookupTimeout = setTimeout(() => {
          if (az !== _lastLoadedAz) _triggerLookup(az);
        }, 500);
      } else {
        _setAzBadge('empty');
      }
    });

    // Patch: alsRechnungUebernehmen überschreiben um erweiterte Daten mitzugeben
    _patchAlsRechnungUebernehmen();

    // Patch: rechnungen-logic.js Empfänger-Seite (wird bei rechnungen.html benötigt)
    _maybePatchRechnungenReceiver();

    // Falls AZ bereits gesetzt (z.B. durch URL-Parameter)
    const azVal = azInput.value.trim();
    if (azVal) {
      setTimeout(() => _triggerLookup(azVal), 200);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Airtable-Lookup für AZ
  // ─────────────────────────────────────────────────────────────────────────
  async function _triggerLookup(az) {
    if (!az) return;

    // Cache prüfen
    if (_akteCache[az]) {
      _onAkteLoaded(az, _akteCache[az]);
      return;
    }

    _setAzBadge('loading');

    try {
      const pat    = _getPat();
      const fields = AT_FIELDS.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
      const formel = encodeURIComponent(`{az}="${az}"`);
      const url    = `https://api.airtable.com/v0/${AT_BASE}/${AT_FAELLE}?filterByFormula=${formel}&maxRecords=1&${fields}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${pat}` },
      });

      if (!res.ok) {
        _setAzBadge('error', `HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      if (!data.records || data.records.length === 0) {
        _setAzBadge('notfound', az);
        return;
      }

      const f = data.records[0].fields;
      _akteCache[az] = f;
      _lastLoadedAz  = az;
      _onAkteLoaded(az, f);

    } catch (e) {
      console.error('[JVEG-Transfer] Lookup-Fehler:', e);
      _setAzBadge('error', e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Akte geladen → UI befüllen
  // ─────────────────────────────────────────────────────────────────────────
  function _onAkteLoaded(az, f) {
    // Gericht-Infos in Info-Badge anzeigen
    const gerichtName = f.Gericht || '';
    const agName      = f.Auftraggeber_Name || '';
    const schadenart  = f.Schadenart || '';
    const infoText    = [gerichtName, agName, schadenart].filter(Boolean).join(' · ');
    _setAzBadge('found', infoText || az);

    // Lokale Context-Keys für alsRechnungUebernehmen aktualisieren
    // (überschreiben ggf. ältere/leere localStorage-Werte für diese Session)
    if (f.Auftraggeber_Name)    sessionStorage.setItem('prova_jveg_ag_name',    f.Auftraggeber_Name);
    if (f.Auftraggeber_Email)   sessionStorage.setItem('prova_jveg_ag_email',   f.Auftraggeber_Email);
    if (f.Auftraggeber_Anschrift) sessionStorage.setItem('prova_jveg_ag_anschrift', f.Auftraggeber_Anschrift);
    if (f.Gericht)              sessionStorage.setItem('prova_jveg_gericht',    f.Gericht);
    if (f.Gericht_Adresse)      sessionStorage.setItem('prova_jveg_gericht_adresse', f.Gericht_Adresse);
    if (f.Gericht_AZ)           sessionStorage.setItem('prova_jveg_gericht_az', f.Gericht_AZ);
    if (f.Schadenart)           sessionStorage.setItem('prova_jveg_schadenart', f.Schadenart);
    if (f.Objekt_Adresse)       sessionStorage.setItem('prova_jveg_objekt',     f.Objekt_Adresse);

    // Prefill-Vollständigkeits-Indikator aktualisieren
    _updatePrefillIndicator();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // alsRechnungUebernehmen patchen: erweitertes Prefill-Objekt schreiben
  // ─────────────────────────────────────────────────────────────────────────
  function _patchAlsRechnungUebernehmen() {
    // Warten bis jveg-logic.js das Original gesetzt hat
    const _waitAndPatch = () => {
      if (typeof window.alsRechnungUebernehmen !== 'function') {
        setTimeout(_waitAndPatch, 50);
        return;
      }

      const _origFn = window.alsRechnungUebernehmen.bind(window);

      window.alsRechnungUebernehmen = async function () {
        // Ggf. Airtable-Lookup nachholen falls noch nicht geschehen
        const azInput = document.getElementById('aktenzeichen');
        const az      = azInput ? azInput.value.trim() : '';
        if (az && az !== _lastLoadedAz && !_akteCache[az]) {
          await _triggerLookup(az);
        }

        // Original-Funktion aufrufen (schreibt prova_jveg_data + leitet weiter)
        // Wir hängen DANACH ins sessionStorage rein — SOFORT bevor navigate
        _origFn();

        // Extended prefill mit Airtable-Daten hinzufügen
        _enrichPrefill(az);
      };
    };
    _waitAndPatch();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Prefill-Objekt mit Airtable-Daten anreichern
  // ─────────────────────────────────────────────────────────────────────────
  function _enrichPrefill(az) {
    let prefill = {};
    try {
      prefill = JSON.parse(sessionStorage.getItem('prova_rechnung_prefill') || '{}');
    } catch (e) {}

    // Datum (immer heute, DE-Format dd.mm.yyyy)
    prefill.rechnungsdatum = _heuteDE();

    // Gericht (aus Session-Cache von Airtable-Lookup oder localStorage)
    prefill.gericht_name     = sessionStorage.getItem('prova_jveg_gericht')
                             || localStorage.getItem('prova_gericht_name')
                             || '';
    prefill.gericht_adresse  = sessionStorage.getItem('prova_jveg_gericht_adresse')
                             || localStorage.getItem('prova_gericht_adresse')
                             || '';
    prefill.gericht_az       = sessionStorage.getItem('prova_jveg_gericht_az')
                             || localStorage.getItem('prova_gericht_az')
                             || '';

    // Auftraggeber (bevorzuge Airtable-Daten über localStorage)
    prefill.auftraggeber_name    = sessionStorage.getItem('prova_jveg_ag_name')
                                 || localStorage.getItem('prova_auftraggeber_name')
                                 || prefill.auftraggeber_name
                                 || '';
    prefill.auftraggeber_email   = sessionStorage.getItem('prova_jveg_ag_email')
                                 || localStorage.getItem('prova_auftraggeber_email')
                                 || prefill.auftraggeber_email
                                 || '';
    prefill.auftraggeber_anschrift = sessionStorage.getItem('prova_jveg_ag_anschrift')
                                   || '';

    // Schadenart / Objekt
    prefill.schadenart     = sessionStorage.getItem('prova_jveg_schadenart')
                           || localStorage.getItem('prova_schadenart')
                           || '';
    prefill.objekt_adresse = sessionStorage.getItem('prova_jveg_objekt')
                           || localStorage.getItem('prova_current_objekt')
                           || '';

    // SV-Steuerdaten (für Rechnungskopf)
    prefill.sv_steuernummer = localStorage.getItem('prova_sv_steuernummer') || '';
    prefill.sv_ustid        = localStorage.getItem('prova_sv_ustid')        || '';
    prefill.sv_iban         = localStorage.getItem('prova_sv_iban')         || '';
    prefill.sv_bic          = localStorage.getItem('prova_sv_bic')          || '';
    prefill.sv_bank         = localStorage.getItem('prova_sv_bank')         || '';

    // JVEG-Bemerkung / Verwendungszweck für die Rechnung
    prefill.jveg_bemerkung = _buildJvegBemerkung(prefill);

    // Zurückschreiben (updaten, nicht überschreiben — rechnungen-logic.js hat es
    // evtl. bereits geschrieben; wir ergänzen nur die neuen Felder)
    try {
      sessionStorage.setItem('prova_rechnung_prefill', JSON.stringify(prefill));
      // Backup-Key: rechnungen-logic.js löscht prova_rechnung_prefill sehr früh.
      // prova_rechnung_prefill_extended bleibt erhalten für den zweiten Patch.
      sessionStorage.setItem('prova_rechnung_prefill_extended', JSON.stringify(prefill));
    } catch (e) {
      console.error('[JVEG-Transfer] enrichPrefill Fehler:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // JVEG-Bemerkung bauen (Verwendungszweck / Betreff für Rechnung)
  // ─────────────────────────────────────────────────────────────────────────
  function _buildJvegBemerkung(prefill) {
    const az      = prefill.aktenzeichen || '';
    const gericht = prefill.gericht_name || '';
    const gaz     = prefill.gericht_az   || '';
    const datum   = prefill.rechnungsdatum || _heuteDE();

    let text = 'Vergütung gem. JVEG';
    if (gericht) text += ` für ${gericht}`;
    if (gaz)     text += `, Az. ${gaz}`;
    if (az)      text += ` (PROVA: ${az})`;
    text += ` — ${datum}`;
    return text;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // rechnungen.html Empfänger-Seite patchen (falls dieser Code dort läuft)
  // ─────────────────────────────────────────────────────────────────────────
  function _maybePatchRechnungenReceiver() {
    // Nur auf rechnungen.html ausführen
    if (!window.location.pathname.includes('rechnungen')) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'jveg') return;

    // Warten bis rechnungen-logic.js das Prefill schon verarbeitet hat
    // Dann zusätzliche Felder aus dem erweiterten Prefill befüllen
    setTimeout(function () {
      let prefill = {};
      try {
        // Prefill wurde von rechnungen-logic.js bereits gelöscht, daher aus
        // unserem eigenen Backup lesen falls vorhanden, sonst Original
        const raw = sessionStorage.getItem('prova_rechnung_prefill_extended')
                  || sessionStorage.getItem('prova_rechnung_prefill');
        prefill = JSON.parse(raw || '{}');
      } catch (e) {}

      if (!prefill.typ || prefill.typ !== 'JVEG') return;

      _applyExtendedPrefillToRechnungen(prefill);

    }, 300);  // nach rechnungen-logic.js DOMContentLoaded (der ≈0ms hat)
  }

  function _applyExtendedPrefillToRechnungen(p) {
    // Rechnungsdatum
    const datumEl = document.getElementById('r-datum') || document.getElementById('rechnungsdatum');
    if (datumEl && p.rechnungsdatum && !datumEl.value) {
      datumEl.value = p.rechnungsdatum;
      datumEl.classList.add('prefilled');
    }

    // Gericht
    const gerichtEl = document.getElementById('r-gericht') || document.getElementById('r-auftraggeber');
    if (gerichtEl && p.gericht_name && !gerichtEl.value) {
      gerichtEl.value = p.gericht_name;
      gerichtEl.classList.add('prefilled');
    }

    // Gericht-Adresse
    const gerichtAdrEl = document.getElementById('r-gericht-adresse') || document.getElementById('r-auftraggeber-anschrift');
    if (gerichtAdrEl && p.gericht_adresse) {
      gerichtAdrEl.value = p.gericht_adresse;
      gerichtAdrEl.classList.add('prefilled');
    }

    // Gericht-AZ (Gerichtsaktenzeichen)
    const gazEl = document.getElementById('r-gericht-az') || document.getElementById('r-fremd-az');
    if (gazEl && p.gericht_az) {
      gazEl.value = p.gericht_az;
      gazEl.classList.add('prefilled');
    }

    // Auftraggeber-Anschrift
    const agAdrEl = document.getElementById('r-auftraggeber-anschrift') || document.getElementById('r-adresse');
    if (agAdrEl && p.auftraggeber_anschrift && !agAdrEl.value) {
      agAdrEl.value = p.auftraggeber_anschrift;
      agAdrEl.classList.add('prefilled');
    }

    // Bemerkung / Verwendungszweck
    const bemEl = document.getElementById('r-bemerkung') || document.getElementById('r-notiz') || document.getElementById('r-verwendungszweck');
    if (bemEl && p.jveg_bemerkung && !bemEl.value) {
      bemEl.value = p.jveg_bemerkung;
      bemEl.classList.add('prefilled');
    }

    // Steuernummer
    const stNrEl = document.getElementById('r-steuernummer') || document.getElementById('sv-steuernummer');
    if (stNrEl && p.sv_steuernummer && !stNrEl.value) {
      stNrEl.value = p.sv_steuernummer;
      stNrEl.classList.add('prefilled');
    }

    // IBAN
    const ibanEl = document.getElementById('r-iban') || document.getElementById('sv-iban');
    if (ibanEl && p.sv_iban && !ibanEl.value) {
      ibanEl.value = p.sv_iban;
      ibanEl.classList.add('prefilled');
    }

    // Schadenart als Rechnungsnotiz eintragen (wenn kein Bemerkungsfeld)
    // In rechnungen-banner eintragen
    const jvegBanner = document.getElementById('jveg-banner');
    const jvegInfo   = document.getElementById('jveg-banner-info');
    if (jvegBanner && jvegInfo && p.gericht_name) {
      const extraText = p.gericht_name ? ` · ${p.gericht_name}` : '';
      if (extraText && !jvegInfo.textContent.includes(p.gericht_name)) {
        jvegInfo.textContent += extraText;
      }
    }

    // Berechnung neu triggern
    if (typeof berechneBrutto === 'function') {
      try { berechneBrutto(); } catch (e) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AZ-Badge UI
  // ─────────────────────────────────────────────────────────────────────────
  function _insertAzBadge(azInput) {
    if (document.getElementById('jveg-az-badge')) return;

    const badge = document.createElement('div');
    badge.id    = 'jveg-az-badge';
    badge.style.cssText = `
      display:none;
      margin-top:6px;
      padding:5px 10px;
      border-radius:6px;
      font-size:11.5px;
      font-weight:500;
      line-height:1.4;
      transition:all .2s ease;
    `;

    // Badge nach dem AZ-Input-Container einfügen
    const parent = azInput.closest('.form-group') || azInput.parentElement;
    parent.appendChild(badge);
  }

  function _setAzBadge(state, info) {
    const badge = document.getElementById('jveg-az-badge');
    if (!badge) return;

    badge.style.display = state === 'empty' ? 'none' : 'block';

    switch (state) {
      case 'loading':
        badge.style.background  = 'rgba(126,200,255,0.08)';
        badge.style.border      = '1px solid rgba(126,200,255,0.2)';
        badge.style.color       = 'rgba(126,200,255,0.7)';
        badge.textContent       = '⏳ Akte wird geladen…';
        break;

      case 'found':
        badge.style.background  = 'rgba(16,185,129,0.08)';
        badge.style.border      = '1px solid rgba(16,185,129,0.25)';
        badge.style.color       = '#10b981';
        badge.innerHTML         = `✅ Akte gefunden: <strong>${_esc(info)}</strong>`;
        break;

      case 'notfound':
        badge.style.background  = 'rgba(251,191,36,0.08)';
        badge.style.border      = '1px solid rgba(251,191,36,0.2)';
        badge.style.color       = 'rgba(251,191,36,0.8)';
        badge.textContent       = `⚠️ Keine Akte mit AZ "${info}" gefunden — Auftraggeber bitte manuell prüfen`;
        break;

      case 'error':
        badge.style.background  = 'rgba(239,68,68,0.08)';
        badge.style.border      = '1px solid rgba(239,68,68,0.2)';
        badge.style.color       = 'rgba(239,68,68,0.8)';
        badge.textContent       = `❌ Lookup-Fehler: ${info || 'Unbekannt'}`;
        break;

      default:
        badge.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Prefill-Vollständigkeits-Indikator am btn-rechnung
  // ─────────────────────────────────────────────────────────────────────────
  function _updatePrefillIndicator() {
    const btn = document.getElementById('btn-rechnung');
    if (!btn) return;

    const hasGericht = !!(sessionStorage.getItem('prova_jveg_gericht'));
    const hasAg      = !!(sessionStorage.getItem('prova_jveg_ag_name') || localStorage.getItem('prova_auftraggeber_name'));

    if (hasGericht && hasAg) {
      // Vollständig — grüner Indikator
      if (!document.getElementById('jveg-transfer-completeness')) {
        const dot = document.createElement('span');
        dot.id    = 'jveg-transfer-completeness';
        dot.style.cssText = `
          display:inline-block;width:7px;height:7px;
          border-radius:50%;background:#10b981;
          margin-left:8px;vertical-align:middle;
          box-shadow:0 0 6px #10b981;
        `;
        dot.title = 'Gericht + Auftraggeber aus Akte geladen';
        btn.appendChild(dot);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  function _heuteDE() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}.${mm}.${yy}`;
  }

  function _getPat() {
    // PROVA nutzt prova-api.js / prova-auth-api.js
    // PAT kommt aus window.PROVA_AT_KEY oder dem prova-api module
    if (window.PROVA_AT_KEY)         return window.PROVA_AT_KEY;
    if (window.PROVA_CONFIG && window.PROVA_CONFIG.atKey) return window.PROVA_CONFIG.atKey;
    // Fallback: aus localStorage (wird von prova-auth-api.js gesetzt)
    return localStorage.getItem('prova_at_key')
        || localStorage.getItem('prova_airtable_key')
        || '';
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Öffentliches API
  // ─────────────────────────────────────────────────────────────────────────
  window.ProvaJvegTransfer = {
    init,
    lookupAz:         _triggerLookup,
    enrichPrefill:    _enrichPrefill,
    getAkteCache:     () => ({ ..._akteCache }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-Init
  // ─────────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})();

/* ═══════════════════════════════════════════════════════════════════════════
   RECHNUNGEN-LOGIC.JS PATCH
   ═══════════════════════════════════════════════════════════════════════════
   In rechnungen-logic.js, NACH der vorhandenen JVEG-Prefill-Sektion
   (nach `sessionStorage.removeItem('prova_rechnung_prefill')`)
   folgendes ergänzen:

   // ── Erweiterte JVEG-Felder (von jveg-rechnung-transfer.js) ──
   (function() {
     var ext = null;
     try { ext = JSON.parse(sessionStorage.getItem('prova_rechnung_prefill_extended') || 'null'); }
     catch(e) {}
     if (!ext || ext.typ !== 'JVEG') return;

     // Rechnungsdatum
     var datumEl = document.getElementById('r-datum') || document.getElementById('rechnungsdatum');
     if (datumEl && ext.rechnungsdatum && !datumEl.value) {
       datumEl.value = ext.rechnungsdatum; datumEl.classList.add('prefilled');
     }
     // Gericht
     var gEl = document.getElementById('r-gericht');
     if (gEl && ext.gericht_name && !gEl.value) {
       gEl.value = ext.gericht_name; gEl.classList.add('prefilled');
     }
     // Gericht-Adresse
     var gaEl = document.getElementById('r-gericht-adresse');
     if (gaEl && ext.gericht_adresse) { gaEl.value = ext.gericht_adresse; gaEl.classList.add('prefilled'); }
     // Gericht-AZ
     var gazEl = document.getElementById('r-gericht-az') || document.getElementById('r-fremd-az');
     if (gazEl && ext.gericht_az) { gazEl.value = ext.gericht_az; gazEl.classList.add('prefilled'); }
     // JVEG-Bemerkung
     var bemEl = document.getElementById('r-bemerkung') || document.getElementById('r-notiz');
     if (bemEl && ext.jveg_bemerkung && !bemEl.value) {
       bemEl.value = ext.jveg_bemerkung; bemEl.classList.add('prefilled');
     }
     // Steuernummer
     var stEl = document.getElementById('r-steuernummer');
     if (stEl && ext.sv_steuernummer && !stEl.value) {
       stEl.value = ext.sv_steuernummer; stEl.classList.add('prefilled');
     }
     // sessionStorage aufräumen
     sessionStorage.removeItem('prova_rechnung_prefill_extended');
   })();
   ═══════════════════════════════════════════════════════════════════════════

   JVEG.HTML INTEGRATION:
   ═══════════════════════════════════════════════════════════════════════════
   Vor </body> in jveg.html:

     <!-- JVEG-Transfer Enhancement (PROVA v98 fix) -->
     <script src="jveg-rechnung-transfer.js" defer></script>

   Optional: Prefill-Backup anlegen damit rechnungen-logic.js die neuen
   Felder lesen kann AUCH NACHDEM es prova_rechnung_prefill gelöscht hat.
   In jveg-rechnung-transfer.js ist _enrichPrefill() so implementiert dass
   es prova_rechnung_prefill ERWEITERT (nicht überschreibt). Damit rechnungen.html
   Zugriff auf die extended Felder hat bevor rechnungen-logic.js es löscht,
   schreibt _enrichPrefill() zusätzlich nach prova_rechnung_prefill_extended.
   ═══════════════════════════════════════════════════════════════════════════ */