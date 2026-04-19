/* ═══════════════════════════════════════════════════════════════════
   PROVA bescheinigungen-logic.js — Sprint 5 Bescheinigungen

   Drei Werkzeuge:
   1. § 3 MaBV Bautenstand        — Fertigstellungsgrad-Rechner nach MaBV
   2. § 632a BGB Abschlagsrechner — Zahlungsstände bei Meilensteinen
   3. WoFlV Wohnflächenrechner    — §§ 2, 4 WoFlV 2003

   Alle Werte persistent in localStorage; PDF-Versand via PDFMonkey
   (BRIEF-Template, K3-Webhook). § 407a ZPO: SV bleibt Entscheider —
   Werkzeuge liefern Rechenergebnisse, keine rechtsverbindlichen Aussagen.
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var K3_WEBHOOK = 'https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl';

  function toast(msg, art) {
    var t = document.getElementById('toast');
    if (!t) { console.log('[Besch]', msg); return; }
    t.textContent = msg;
    t.style.color = art === 'err' ? '#ef4444' : art === 'ok' ? '#10b981' : '';
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 2400);
  }
  function fmtEUR(n) { return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'; }
  function fmtPct(n) { return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' %'; }
  function fmtM2(n)  { return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' m²'; }

  /* ═══════════════════════════════════════════════════════════
     TOOL-SWITCHER
  ═══════════════════════════════════════════════════════════ */
  window.switchTool = function(name) {
    document.querySelectorAll('.tool-tab').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-tool') === name);
    });
    document.querySelectorAll('.tool-panel').forEach(function(p) {
      p.hidden = (p.id !== 'tool-' + name);
    });
  };

  /* ═══════════════════════════════════════════════════════════
     1. § 3 MaBV BAUTENSTAND
     Prozentsätze nach § 3 Abs. 2 MaBV — Standard-Staffel
  ═══════════════════════════════════════════════════════════ */
  // MaBV-Staffel: 7 Raten à max. die genannten Prozent der Gesamtleistung
  // Vereinfachte Gewerke-Aufstellung (üblich für Bauträger-Objekte)
  var MABV_GEWERKE = [
    { id: 'g1', label: 'Beginn der Erdarbeiten',               pct: 30.0, done: false },
    { id: 'g2', label: 'Rohbaufertigstellung inkl. Dach',      pct: 28.0, done: false },
    { id: 'g3', label: 'Herstellung der Rohinstallation (Heizung/Sanitär/Elektro)', pct: 5.6, done: false },
    { id: 'g4', label: 'Fenstereinbau inkl. Verglasung',       pct: 7.0, done: false },
    { id: 'g5', label: 'Innenputz, ausgenommen Beiputzarbeiten', pct: 2.1, done: false },
    { id: 'g6', label: 'Estrich',                              pct: 2.1, done: false },
    { id: 'g7', label: 'Fliesenarbeiten im Sanitärbereich',    pct: 2.8, done: false },
    { id: 'g8', label: 'Einbau der Fertigteilbauteile',        pct: 8.4, done: false },
    { id: 'g9', label: 'Fassadenarbeiten',                     pct: 2.1, done: false },
    { id: 'g10',label: 'Vollständige Fertigstellung',          pct: 11.9, done: false }
  ];
  var _mabvState = null;

  function mabvLaden() {
    try {
      var s = JSON.parse(localStorage.getItem('prova_mabv_state') || 'null');
      if (s && Array.isArray(s.gewerke)) return s;
    } catch(e) {}
    return { gewerke: JSON.parse(JSON.stringify(MABV_GEWERKE)), meta: {} };
  }
  function mabvSpeichern() {
    try { localStorage.setItem('prova_mabv_state', JSON.stringify(_mabvState)); } catch(e) {}
  }

  function mabvRender() {
    var container = document.getElementById('mabv-gewerke');
    if (!container) return;
    container.innerHTML = _mabvState.gewerke.map(function(g) {
      return '<div class="gewerk-row">'
        + '<input type="checkbox" ' + (g.done ? 'checked' : '') + ' onchange="mabvToggle(\'' + g.id + '\')">'
        + '<label>' + g.label + '</label>'
        + '<input type="number" min="0" max="100" step="0.1" value="' + g.pct + '" onchange="mabvSetPct(\'' + g.id + '\', this.value)">'
        + '<span class="gewerk-percent">%-Anteil</span>'
        + '<span></span>'
        + '</div>';
    }).join('');
    mabvUpdate();
  }
  window.mabvToggle = function(id) {
    var g = _mabvState.gewerke.find(function(x){return x.id===id;});
    if (g) { g.done = !g.done; mabvSpeichern(); mabvUpdate(); }
  };
  window.mabvSetPct = function(id, val) {
    var g = _mabvState.gewerke.find(function(x){return x.id===id;});
    if (g) { g.pct = parseFloat(val) || 0; mabvSpeichern(); mabvUpdate(); }
  };

  function mabvUpdate() {
    var erreicht = _mabvState.gewerke.filter(function(g){return g.done;}).reduce(function(s,g){return s+g.pct;}, 0);
    var total = _mabvState.gewerke.reduce(function(s,g){return s+g.pct;}, 0);
    var erreichtEl = document.getElementById('mabv-erreicht');
    var totalEl    = document.getElementById('mabv-total');
    if (erreichtEl) erreichtEl.textContent = fmtPct(erreicht);
    if (totalEl)    totalEl.textContent    = fmtPct((erreicht / total) * 100);
    // Synchronisation mit BGB-Werkzeug
    var bgbGrad = document.getElementById('bgb-grad');
    if (bgbGrad && !bgbGrad.value) bgbGrad.value = ((erreicht / total) * 100).toFixed(1);
  }

  window.mabvZuruecksetzen = function() {
    if (!confirm('Alle Häkchen und Prozente zurücksetzen?')) return;
    _mabvState = { gewerke: JSON.parse(JSON.stringify(MABV_GEWERKE)), meta: {} };
    mabvSpeichern(); mabvRender();
    toast('Zurückgesetzt');
  };

  function mabvInhalt() {
    var erreicht = _mabvState.gewerke.filter(function(g){return g.done;}).reduce(function(s,g){return s+g.pct;}, 0);
    var total = _mabvState.gewerke.reduce(function(s,g){return s+g.pct;}, 0);
    var lines = [];
    lines.push('BAUTENSTANDSBESCHEINIGUNG nach § 3 MaBV');
    lines.push('');
    lines.push('Objekt: ' + (document.getElementById('mabv-adresse').value || '—'));
    lines.push('Bauträger: ' + (document.getElementById('mabv-bautraeger').value || '—'));
    lines.push('Aktenzeichen: ' + (document.getElementById('mabv-az').value || '—'));
    lines.push('Datum der Feststellung: ' + (document.getElementById('mabv-datum').value || '—'));
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('GEWERKESTAND');
    lines.push('─────────────────────────────────────');
    _mabvState.gewerke.forEach(function(g) {
      lines.push((g.done ? '✓' : '○') + '  ' + g.label + '  —  ' + fmtPct(g.pct));
    });
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('Summe erreicht: ' + fmtPct(erreicht));
    lines.push('Fertigstellungsgrad (gesamt): ' + fmtPct((erreicht/total)*100));
    lines.push('');
    lines.push('§ 407a ZPO: Die Bescheinigung beruht auf dem am Stichtag augenscheinlich festgestellten');
    lines.push('Gewerkestand. Verdeckte Mängel bleiben hiervon unberührt. Finale Bewertung:');
    lines.push('Eigenleistung des Sachverständigen.');
    return lines.join('\n');
  }

  window.mabvPdfVersenden = async function() {
    if (!confirm('Bautenstandsbescheinigung als PDF per E-Mail versenden?')) return;
    var email = prompt('E-Mail des Empfängers (Bauträger/Bank):', '');
    if (!email) return;
    try {
      await sendeBescheinigungsPDF({
        vorlage_id: 'BRIEF-MABV',
        typ: 'mabv_bautenstand',
        empfaenger_email: email,
        empfaenger_name: document.getElementById('mabv-bautraeger').value || '',
        aktenzeichen: document.getElementById('mabv-az').value || '',
        betreff: 'Bautenstandsbescheinigung § 3 MaBV — ' + (document.getElementById('mabv-adresse').value || ''),
        inhalt_text: mabvInhalt()
      });
    } catch(e) { toast('Fehler: ' + e.message, 'err'); }
  };

  /* ═══════════════════════════════════════════════════════════
     2. § 632a BGB ABSCHLAGSRECHNER
  ═══════════════════════════════════════════════════════════ */
  // Typischer Abschlagsplan (vereinfacht, anpassbar durch Nutzer)
  var BGB_PLAN = [
    { pct: 30.0,  beschreibung: 'Beginn Erdarbeiten / Baugrube' },
    { pct: 58.0,  beschreibung: 'Rohbau inkl. Dach' },
    { pct: 63.6,  beschreibung: 'Rohinstallation Heizung/Sanitär/Elektro' },
    { pct: 70.6,  beschreibung: 'Fenster und Außentüren' },
    { pct: 72.7,  beschreibung: 'Innenputz' },
    { pct: 74.8,  beschreibung: 'Estrich' },
    { pct: 77.6,  beschreibung: 'Fliesenarbeiten' },
    { pct: 86.0,  beschreibung: 'Fertigteile eingebaut' },
    { pct: 88.1,  beschreibung: 'Fassadenarbeiten' },
    { pct: 100.0, beschreibung: 'Vollständige Fertigstellung' }
  ];

  function bgbRender() {
    var tbl = document.getElementById('bgb-tabelle');
    if (!tbl) return;
    tbl.innerHTML = '<thead><tr><th>#</th><th>Meilenstein</th><th style="text-align:right;">Fertig bei</th><th style="text-align:right;">Abschlag kumul.</th><th>Status</th></tr></thead><tbody id="bgb-tbody"></tbody>';
    bgbBerechne();
  }

  window.bgbBerechne = function() {
    var summe = parseFloat(document.getElementById('bgb-summe').value) || 0;
    var grad = parseFloat(document.getElementById('bgb-grad').value) || 0;
    var tbody = document.getElementById('bgb-tbody');
    if (!tbody) return;

    var rows = '';
    var faellig = 0;
    var naechst = null;
    BGB_PLAN.forEach(function(ms, i) {
      var kumulativ = summe * ms.pct / 100;
      var erreicht = grad >= ms.pct;
      if (erreicht) faellig = kumulativ;
      if (!erreicht && !naechst) naechst = ms;
      rows += '<tr class="' + (erreicht ? 'erreicht' : 'offen') + '">'
        + '<td>' + (i + 1) + '</td>'
        + '<td>' + ms.beschreibung + '</td>'
        + '<td style="text-align:right;">' + fmtPct(ms.pct) + '</td>'
        + '<td style="text-align:right;font-weight:600;">' + fmtEUR(kumulativ) + '</td>'
        + '<td><span class="abschlag-badge ' + (erreicht ? 'erreicht' : 'offen') + '">' + (erreicht ? 'Erreicht' : 'Offen') + '</span></td>'
        + '</tr>';
    });
    tbody.innerHTML = rows;

    var ergEl = document.getElementById('bgb-ergebnis');
    if (summe > 0 && grad > 0) {
      ergEl.style.display = '';
      document.getElementById('bgb-faellig').textContent = fmtEUR(faellig);
      document.getElementById('bgb-offen').textContent = fmtEUR(summe - faellig);
      document.getElementById('bgb-naechst').textContent = naechst ? (naechst.beschreibung + ' (' + fmtPct(naechst.pct) + ')') : 'Alle Meilensteine erreicht';
    } else {
      ergEl.style.display = 'none';
    }
  };

  function bgbInhalt() {
    var summe = parseFloat(document.getElementById('bgb-summe').value) || 0;
    var grad = parseFloat(document.getElementById('bgb-grad').value) || 0;
    var lines = [];
    lines.push('ABSCHLAGSNACHWEIS nach § 632a BGB');
    lines.push('');
    lines.push('Gesamtauftragssumme (netto): ' + fmtEUR(summe));
    lines.push('Aktueller Fertigstellungsgrad: ' + fmtPct(grad));
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('MEILENSTEIN-ABRECHNUNG');
    lines.push('─────────────────────────────────────');
    var faellig = 0;
    BGB_PLAN.forEach(function(ms) {
      var kum = summe * ms.pct / 100;
      var err = grad >= ms.pct;
      if (err) faellig = kum;
      lines.push((err ? '✓ ' : '○ ') + ms.beschreibung + ' — ' + fmtPct(ms.pct) + ' = ' + fmtEUR(kum));
    });
    lines.push('');
    lines.push('Bereits fällig (netto): ' + fmtEUR(faellig));
    lines.push('Noch offen (netto): ' + fmtEUR(summe - faellig));
    lines.push('');
    lines.push('§ 632a BGB: Der Auftraggeber hat Abschlagszahlungen in Höhe des Wertes der vom');
    lines.push('Unternehmer erbrachten und nach dem Vertrag geschuldeten Leistung zu entrichten.');
    lines.push('§ 407a ZPO: Rechtliche Bewertung bleibt dem Gericht/den Parteien vorbehalten.');
    return lines.join('\n');
  }

  window.bgbPdfVersenden = async function() {
    var summe = parseFloat(document.getElementById('bgb-summe').value) || 0;
    if (!summe) { toast('Bitte Auftragssumme eingeben', 'err'); return; }
    var email = prompt('E-Mail des Empfängers:', '');
    if (!email) return;
    try {
      await sendeBescheinigungsPDF({
        vorlage_id: 'BRIEF-BGB-ABSCHLAG',
        typ: 'bgb_abschlag',
        empfaenger_email: email,
        betreff: 'Abschlagsnachweis § 632a BGB',
        inhalt_text: bgbInhalt()
      });
    } catch(e) { toast('Fehler: ' + e.message, 'err'); }
  };

  /* ═══════════════════════════════════════════════════════════
     3. WoFlV — WOHNFLÄCHENVERORDNUNG
     Anrechnung nach § 4: >= 2m voll, 1-2m halb, < 1m null, Balkone 25%
  ═══════════════════════════════════════════════════════════ */
  var WOFLV_TYPEN = [
    { id: 'voll',    label: 'Wohnraum (100 %)',             faktor: 1.0 },
    { id: 'halb',    label: 'Dachschräge 1–2 m (50 %)',     faktor: 0.5 },
    { id: 'balkon',  label: 'Balkon/Terrasse (25 %)',       faktor: 0.25 },
    { id: 'loggia',  label: 'Loggia (50 %)',                faktor: 0.5 },
    { id: 'keller',  label: 'Keller/Hobbyraum (0 %)',       faktor: 0.0 }
  ];
  var _woflvState = null;

  function woflvLaden() {
    try {
      var s = JSON.parse(localStorage.getItem('prova_woflv_state') || 'null');
      if (s && Array.isArray(s.raeume)) return s;
    } catch(e) {}
    return { raeume: [], meta: {} };
  }
  function woflvSpeichern() {
    try { localStorage.setItem('prova_woflv_state', JSON.stringify(_woflvState)); } catch(e) {}
  }

  function woflvRender() {
    var container = document.getElementById('woflv-raeume');
    if (!container) return;
    if (!_woflvState.raeume.length) {
      container.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px;font-style:italic;">Noch keine Räume erfasst</div>';
    } else {
      container.innerHTML = _woflvState.raeume.map(function(r, i) {
        var typOptions = WOFLV_TYPEN.map(function(t) {
          return '<option value="' + t.id + '"' + (r.typ === t.id ? ' selected' : '') + '>' + t.label + '</option>';
        }).join('');
        return '<div class="raum-row">'
          + '<input type="text" value="' + (r.name || '') + '" oninput="woflvSetRaum(' + i + ',\'name\',this.value)" placeholder="z.B. Wohnzimmer">'
          + '<input type="number" min="0" step="0.01" value="' + r.flaeche + '" oninput="woflvSetRaum(' + i + ',\'flaeche\',this.value)">'
          + '<span class="gewerk-percent" style="text-align:left;">' + fmtPct(WOFLV_TYPEN.find(function(t){return t.id===r.typ;}).faktor * 100) + '</span>'
          + '<select onchange="woflvSetRaum(' + i + ',\'typ\',this.value)">' + typOptions + '</select>'
          + '<button class="btn-del" onclick="woflvLoescheRaum(' + i + ')" title="Löschen">✕</button>'
          + '</div>';
      }).join('');
    }
    woflvUpdate();
  }

  window.woflvRaumHinzufuegen = function() {
    _woflvState.raeume.push({ name: '', flaeche: 0, typ: 'voll' });
    woflvSpeichern(); woflvRender();
  };
  window.woflvSetRaum = function(idx, feld, wert) {
    if (!_woflvState.raeume[idx]) return;
    _woflvState.raeume[idx][feld] = (feld === 'flaeche') ? parseFloat(wert) || 0 : wert;
    woflvSpeichern(); woflvUpdate();
    if (feld === 'typ') woflvRender(); // Anrechnung aktualisieren
  };
  window.woflvLoescheRaum = function(idx) {
    _woflvState.raeume.splice(idx, 1);
    woflvSpeichern(); woflvRender();
  };

  function woflvUpdate() {
    var voll = 0, halb = 0, freiflaechen = 0;
    _woflvState.raeume.forEach(function(r) {
      var t = WOFLV_TYPEN.find(function(x){return x.id===r.typ;});
      if (!t) return;
      var anrechnung = r.flaeche * t.faktor;
      if (t.id === 'voll')                         voll += anrechnung;
      else if (t.id === 'halb')                    halb += anrechnung;
      else if (t.id === 'balkon' || t.id === 'loggia') freiflaechen += anrechnung;
      // keller = 0
    });
    var total = voll + halb + freiflaechen;
    var vollEl = document.getElementById('woflv-voll');
    var halbEl = document.getElementById('woflv-halb');
    var freiEl = document.getElementById('woflv-freiflaechen');
    var totEl  = document.getElementById('woflv-total');
    if (vollEl) vollEl.textContent = fmtM2(voll);
    if (halbEl) halbEl.textContent = fmtM2(halb);
    if (freiEl) freiEl.textContent = fmtM2(freiflaechen);
    if (totEl)  totEl.textContent  = fmtM2(total);
  }

  window.woflvZuruecksetzen = function() {
    if (!confirm('Alle Räume löschen?')) return;
    _woflvState = { raeume: [], meta: {} };
    woflvSpeichern(); woflvRender();
  };

  function woflvInhalt() {
    var lines = [];
    lines.push('WOHNFLÄCHENBERECHNUNG nach WoFlV');
    lines.push('');
    lines.push('Objekt: ' + (document.getElementById('woflv-adresse').value || '—'));
    lines.push('Datum der Aufmaß-Feststellung: ' + (document.getElementById('woflv-datum').value || '—'));
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('RÄUME');
    lines.push('─────────────────────────────────────');
    var voll = 0, halb = 0, freiflaechen = 0, total = 0;
    _woflvState.raeume.forEach(function(r) {
      var t = WOFLV_TYPEN.find(function(x){return x.id===r.typ;});
      if (!t) return;
      var anrechnung = r.flaeche * t.faktor;
      lines.push((r.name || '(unbenannt)') + ' — ' + fmtM2(r.flaeche) + ' × ' + fmtPct(t.faktor*100) + ' = ' + fmtM2(anrechnung) + '  (' + t.label + ')');
      if (t.id === 'voll')   voll += anrechnung;
      else if (t.id === 'halb') halb += anrechnung;
      else if (t.id === 'balkon' || t.id === 'loggia') freiflaechen += anrechnung;
      total = voll + halb + freiflaechen;
    });
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('Vollanrechnung (100 %): ' + fmtM2(voll));
    lines.push('Halbanrechnung (50 %): ' + fmtM2(halb));
    lines.push('Balkone/Terrassen (25/50 %): ' + fmtM2(freiflaechen));
    lines.push('Wohnfläche nach WoFlV: ' + fmtM2(total));
    lines.push('');
    lines.push('Rechtsgrundlage: Verordnung zur Berechnung der Wohnfläche (WoFlV) v. 25.11.2003.');
    lines.push('§ 407a ZPO: Aufmaß am Stichtag. Maßgenauigkeit unterliegt üblichen Toleranzen.');
    return lines.join('\n');
  }

  window.woflvPdfVersenden = async function() {
    if (!_woflvState.raeume.length) { toast('Bitte mindestens einen Raum erfassen', 'err'); return; }
    var email = prompt('E-Mail des Empfängers:', '');
    if (!email) return;
    try {
      await sendeBescheinigungsPDF({
        vorlage_id: 'BRIEF-WOFLV',
        typ: 'woflv',
        empfaenger_email: email,
        betreff: 'Wohnflächenberechnung nach WoFlV — ' + (document.getElementById('woflv-adresse').value || ''),
        inhalt_text: woflvInhalt()
      });
    } catch(e) { toast('Fehler: ' + e.message, 'err'); }
  };

  /* ═══════════════════════════════════════════════════════════
     GEMEINSAMER PDF-VERSAND via Make K3-Webhook
  ═══════════════════════════════════════════════════════════ */
  async function sendeBescheinigungsPDF(opts) {
    var svEmail = localStorage.getItem('prova_sv_email') || '';
    var svName  = localStorage.getItem('prova_sv_name')  || '';
    if (!svEmail) { toast('Keine SV-E-Mail im Account hinterlegt', 'err'); return; }

    var payload = {
      vorlage_id:       opts.vorlage_id,
      typ:              opts.typ,
      empfaenger_email: opts.empfaenger_email,
      empfaenger_name:  opts.empfaenger_name || '',
      sv_email:         svEmail,
      sv_name:          svName,
      aktenzeichen:     opts.aktenzeichen || '',
      betreff:          opts.betreff,
      inhalt_text:      opts.inhalt_text,
      datum:            new Date().toISOString().slice(0,10)
    };
    var res = await fetch(K3_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Webhook HTTP ' + res.status);
    toast('✓ PDF-Erstellung gestartet — Zustellung per E-Mail', 'ok');
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    _mabvState  = mabvLaden();
    _woflvState = woflvLaden();
    mabvRender();
    bgbRender();
    woflvRender();
    // Default-Datum = heute
    var heute = new Date().toISOString().slice(0,10);
    var d1 = document.getElementById('mabv-datum');
    var d2 = document.getElementById('woflv-datum');
    if (d1 && !d1.value) d1.value = heute;
    if (d2 && !d2.value) d2.value = heute;
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
