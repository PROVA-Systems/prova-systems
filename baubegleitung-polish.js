/* ═══════════════════════════════════════════════════════════════════
   PROVA baubegleitung-polish.js — Flow D Ausbau (Session 30 / Sprint 4)

   Ergänzt baubegleitung-logic.js um:
   1. Bauphasen-Timeline (Erdarbeiten → Abnahme, mit Phase-Fortschritt)
   2. KI-Begehungs-Formulierungshilfe (präziser als kiBegehungAssist)
   3. Monatsbericht-Generator (alle Begehungen eines Monats zusammenfassen)
   4. PDF-Export via PDFMonkey (BRIEF-Template)

   Alle Features sind additiv — keine bestehende Funktion wird ersetzt.
   KI-Calls: DSGVO-pseudonymisiert, Halluzinationsverbot, Konjunktiv II.
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  /* ── Bauphasen-Reihenfolge (Standard-Neubau) ── */
  var BAUPHASEN = [
    { id: 'planung',     label: 'Planung',       icon: '📐' },
    { id: 'erdarbeiten', label: 'Erdarbeiten',   icon: '🚜' },
    { id: 'rohbau',      label: 'Rohbau',        icon: '🧱' },
    { id: 'dach',        label: 'Dach',          icon: '🏠' },
    { id: 'fassade',     label: 'Fassade',       icon: '🎨' },
    { id: 'innenausbau', label: 'Innenausbau',   icon: '🔨' },
    { id: 'haustechnik', label: 'Haustechnik',   icon: '⚡' },
    { id: 'abnahme',     label: 'Abnahme',       icon: '✅' }
  ];

  function phaseZuId(phaseText) {
    if (!phaseText) return null;
    var t = String(phaseText).toLowerCase();
    for (var i = 0; i < BAUPHASEN.length; i++) {
      if (t.indexOf(BAUPHASEN[i].id) !== -1 || t.indexOf(BAUPHASEN[i].label.toLowerCase()) !== -1) {
        return BAUPHASEN[i].id;
      }
    }
    return null;
  }

  /* ── Phase-Status pro Projekt berechnen ── */
  function berechnePhasenStatus(proj) {
    var result = {};
    BAUPHASEN.forEach(function(p) { result[p.id] = 'pending'; });

    var begehungen = proj.begehungen || [];
    if (!begehungen.length) return result;

    // Finde letzte begangene Phase — alles davor = done, letzte = aktiv
    var letzterPhaseIdx = -1;
    begehungen.forEach(function(b) {
      var pid = phaseZuId(b.phase);
      if (pid) {
        var idx = BAUPHASEN.findIndex(function(p){return p.id === pid;});
        if (idx > letzterPhaseIdx) letzterPhaseIdx = idx;
      }
    });

    if (letzterPhaseIdx >= 0) {
      for (var i = 0; i < letzterPhaseIdx; i++) result[BAUPHASEN[i].id] = 'done';
      result[BAUPHASEN[letzterPhaseIdx].id] = 'active';
    }
    return result;
  }

  /* ── UI: Bauphasen-Timeline als HTML-String ── */
  PROVA.renderBauphasenTimeline = function(proj) {
    if (!proj) return '';
    var phasenStatus = berechnePhasenStatus(proj);
    var html = '<div style="display:flex;gap:0;align-items:stretch;overflow-x:auto;background:var(--surface,#1c2537);border:1px solid var(--border,rgba(255,255,255,.07));border-radius:10px;padding:12px;margin-bottom:16px;">';
    BAUPHASEN.forEach(function(p, i) {
      var status = phasenStatus[p.id];
      var col = status === 'done' ? '#10b981' : status === 'active' ? '#4f8ef7' : '#6b7a99';
      var bg  = status === 'done' ? 'rgba(16,185,129,.15)' : status === 'active' ? 'rgba(79,142,247,.15)' : 'rgba(107,122,153,.08)';
      var border = status === 'active' ? '2px solid ' + col : '2px solid transparent';

      html += '<div style="flex:1;min-width:80px;text-align:center;padding:8px 4px;border-radius:8px;border:' + border + ';background:' + bg + ';margin:0 2px;">'
        + '<div style="font-size:18px;margin-bottom:4px;filter:' + (status === 'pending' ? 'grayscale(60%) opacity(.5)' : 'none') + ';">' + p.icon + '</div>'
        + '<div style="font-size:10px;font-weight:700;color:' + col + ';text-transform:uppercase;letter-spacing:.04em;">' + p.label + '</div>'
        + (status === 'done' ? '<div style="font-size:9px;color:' + col + ';margin-top:2px;">✓ erledigt</div>'
           : status === 'active' ? '<div style="font-size:9px;color:' + col + ';margin-top:2px;">● aktuell</div>'
           : '<div style="font-size:9px;color:' + col + ';opacity:.6;margin-top:2px;">—</div>')
        + '</div>';
    });
    html += '</div>';
    return html;
  };

  /* ─────────────────────────────────────────────
     KI-Formulierungshilfe für Begehungstext
     DSGVO-pseudonymisiert, Halluzinationsverbot
  ───────────────────────────────────────────── */
  function pseudonymisieren(text) {
    if (!text) return '';
    var t = String(text);
    t = t.replace(/\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\b/gi, '[IBAN]');
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    t = t.replace(/\b(?:\+49|0)[\s\-/]?\d{2,5}[\s\-/]?\d{2,}[\s\-/]?\d{0,}\b/g, '[TELEFON]');
    return t;
  }

  var BEGEHUNGS_PROMPT = [
    'Du bist Assistent eines Bausachverständigen bei einer Baubegleitung.',
    '',
    'ABSOLUTE REGELN:',
    '1. HALLUZINATIONSVERBOT: Übernimm nur was der SV diktiert/schreibt.',
    '2. Keine erfundenen Normen, Werte, Personen.',
    '3. Bei Mängel-Einschätzungen: Konjunktiv II ("könnte einen Mangel darstellen", "wäre als Hinweis zu werten").',
    '4. Struktur: Vorgefunden → Bewertung (Konjunktiv II) → Handlungsvorschlag.',
    '5. Keine Schuldzuweisungen.',
    '',
    'AUFGABE: Formatiere den folgenden Rohtext zu einem sauberen Begehungsprotokoll-Eintrag. Ergänze keine Inhalte.',
    '',
    'STIL: Fachlich präzise, 3–6 Sätze. Keine Aufzählungen außer bei Mess-Listen.'
  ].join('\n');

  PROVA.kiBegehungsFormulierung = async function(rohtext, phase) {
    if (!rohtext || !rohtext.trim()) throw new Error('Text ist leer');
    var kontext = 'Bauphase: ' + (phase || 'unbekannt') + '\n\nRohtext:\n' + pseudonymisieren(rohtext);
    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 800,
          temperature: 0.2,
          messages: [
            { role: 'system', content: BEGEHUNGS_PROMPT },
            { role: 'user',   content: kontext }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var txt = (data.content && data.content[0] && data.content[0].text) || '';
      return txt.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/,'').trim();
    } catch (e) {
      throw new Error('KI-Formulierungshilfe fehlgeschlagen: ' + e.message);
    }
  };

  /* ─────────────────────────────────────────────
     Monatsbericht-Generator
     Fasst alle Begehungen eines Kalendermonats zusammen
  ───────────────────────────────────────────── */
  PROVA.generiereMonatsbericht = function(proj, jahr, monat /* 1-12 */) {
    if (!proj) return '';
    var begehungenImMonat = (proj.begehungen || []).filter(function(b) {
      if (!b.datum) return false;
      var d = new Date(b.datum);
      return d.getFullYear() === jahr && (d.getMonth() + 1) === monat;
    });
    if (!begehungenImMonat.length) {
      return 'Keine Begehungen im ' + monat + '/' + jahr + ' erfasst.';
    }

    var monatsname = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][monat-1];
    var lines = [];
    lines.push('MONATSBERICHT BAUBEGLEITUNG — ' + monatsname + ' ' + jahr);
    lines.push('');
    lines.push('Projekt: ' + proj.name);
    lines.push('Aktenzeichen: ' + (proj.az || '—'));
    lines.push('Auftraggeber: ' + (proj.auftraggeber || '—'));
    lines.push('Objekt: ' + (proj.adresse || '—'));
    lines.push('');
    lines.push('Anzahl Begehungen im Berichtsmonat: ' + begehungenImMonat.length);
    lines.push('');

    // Nach Phasen gruppieren
    var byPhase = {};
    begehungenImMonat.forEach(function(b) {
      var p = b.phase || 'Sonstiges';
      byPhase[p] = byPhase[p] || [];
      byPhase[p].push(b);
    });

    Object.keys(byPhase).forEach(function(phase) {
      lines.push('── ' + phase + ' ──');
      byPhase[phase].forEach(function(b) {
        lines.push('');
        lines.push(b.datum + (b.uhrzeit ? ' ' + b.uhrzeit : '') +
          (b.dringlichkeit && b.dringlichkeit !== 'Normal' ? ' [' + b.dringlichkeit.toUpperCase() + ']' : ''));
        if (b.anwesend) lines.push('Anwesende: ' + b.anwesend);
        lines.push(b.text || '—');
        if (b.fotos > 0) lines.push('(' + b.fotos + ' Foto' + (b.fotos === 1 ? '' : 's') + ')');
      });
      lines.push('');
    });

    // Kritische Punkte hervorheben
    var kritisch = begehungenImMonat.filter(function(b) {
      return ['Kritisch', 'Mangel'].indexOf(b.dringlichkeit) !== -1;
    });
    if (kritisch.length) {
      lines.push('══════════════════════════════');
      lines.push('KRITISCHE / MANGEL-BEFUNDE (' + kritisch.length + ')');
      lines.push('══════════════════════════════');
      kritisch.forEach(function(b) {
        lines.push('• ' + b.datum + ' — ' + (b.text || '').split('\n')[0]);
      });
      lines.push('');
    }

    lines.push('— Ende des Monatsberichts —');
    lines.push('Erstellt mit PROVA Systems · Baubegleitungsassistenz');

    return lines.join('\n');
  };

  /* ─────────────────────────────────────────────
     PDF-Export via PDFMonkey (BRIEF-Template)
     Sendet strukturierten Bericht an K3-Webhook
  ───────────────────────────────────────────── */
  PROVA.exportiereBaubegleitungPDF = async function(proj, berichtstyp /* 'einzel'|'gesamt'|'monat' */, extra) {
    if (!proj) throw new Error('Kein Projekt übergeben');
    extra = extra || {};

    var svEmail = localStorage.getItem('prova_sv_email') || '';
    var svName  = localStorage.getItem('prova_sv_name')  || '';

    var inhalt = '';
    var titel = '';
    if (berichtstyp === 'monat') {
      titel = 'Monatsbericht ' + (extra.monat || '') + '/' + (extra.jahr || new Date().getFullYear());
      inhalt = PROVA.generiereMonatsbericht(proj, extra.jahr || new Date().getFullYear(), extra.monat || (new Date().getMonth() + 1));
    } else if (berichtstyp === 'gesamt') {
      titel = 'Gesamt-Baubegleitungsbericht';
      inhalt = typeof generiereGesamtBericht === 'function' ? '[Gesamtbericht via bestehende Funktion]' : '';
    } else {
      titel = 'Begehungsbericht';
      inhalt = '[Einzelbericht]';
    }

    var webhookUrl = 'https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl'; // K3 Briefvorlagen-Webhook

    var payload = {
      vorlage_id: 'BRIEF-BAUBEGLEITUNG',
      empfaenger_name:  proj.auftraggeber || '',
      empfaenger_email: extra.email || '',
      sv_email: svEmail,
      sv_name:  svName,
      aktenzeichen: proj.az || '',
      betreff: titel + ' — ' + proj.name,
      inhalt_text: inhalt,
      projekt_name: proj.name,
      projekt_adresse: proj.adresse || '',
      datum: new Date().toISOString().slice(0,10),
      typ: 'baubegleitung_' + berichtstyp
    };

    try {
      var res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Webhook HTTP ' + res.status);
      return { ok: true, message: 'PDF-Erstellung gestartet — Zustellung per E-Mail' };
    } catch (e) {
      throw new Error('PDF-Export fehlgeschlagen: ' + e.message);
    }
  };

  /* ─────────────────────────────────────────────
     DOM-Hook: Erweitert das bestehende Detail-Panel
     um Timeline + Monatsbericht-Button
  ───────────────────────────────────────────── */
  PROVA.enhanceBaubegleitungUI = function() {
    // Timeline in Detail-Panel einfügen (nach renderProjektDetail)
    var origRender = window.ladeProduktDetail;
    if (typeof origRender !== 'function' || origRender.__polished) return;

    window.ladeProduktDetail = function(id) {
      origRender(id);
      try {
        var proj = (window._data && window._data.projekte || []).find(function(p){return p.id===id;})
          || (typeof ladeDaten === 'function' ? ladeDaten().projekte.find(function(p){return p.id===id;}) : null);
        if (!proj) return;

        // Timeline einfügen vor dem ersten card-body-Element
        var detail = document.getElementById('proj-detail');
        if (!detail) return;
        var cardBody = detail.querySelector('.card-body');
        if (!cardBody) return;
        if (detail.querySelector('.bb-phasen-timeline')) return; // schon drin

        var tlWrapper = document.createElement('div');
        tlWrapper.className = 'bb-phasen-timeline';
        tlWrapper.innerHTML = PROVA.renderBauphasenTimeline(proj);
        cardBody.insertBefore(tlWrapper, cardBody.firstChild);

        // Monatsbericht-Button in Aktionsleiste
        var btnRow = cardBody.querySelector('div[style*="flex-wrap:wrap"]');
        if (btnRow && !btnRow.querySelector('[data-bb-monat]')) {
          var btn = document.createElement('button');
          btn.className = 'btn btn-ghost';
          btn.style.fontSize = '12px';
          btn.setAttribute('data-bb-monat', '1');
          btn.textContent = '📅 Monatsbericht';
          btn.onclick = function() {
            var jetzt = new Date();
            var monat = prompt('Monat (1–12):', String(jetzt.getMonth() + 1));
            var jahr  = prompt('Jahr:', String(jetzt.getFullYear()));
            if (!monat || !jahr) return;
            var bericht = PROVA.generiereMonatsbericht(proj, parseInt(jahr,10), parseInt(monat,10));
            if (typeof window.showBerichtModal === 'function') {
              window.showBerichtModal(bericht, 'Monatsbericht ' + monat + '/' + jahr);
            } else {
              // Fallback: Alert mit Kopier-Option
              if (confirm(bericht.slice(0, 300) + '\n\n...\n\n[OK für Vollständig in neuem Fenster]')) {
                var w = window.open('', '_blank');
                w.document.body.innerText = bericht;
              }
            }
          };
          btnRow.appendChild(btn);
        }

        // PDF-Export-Button
        if (btnRow && !btnRow.querySelector('[data-bb-pdf]')) {
          var btnPdf = document.createElement('button');
          btnPdf.className = 'btn btn-ghost';
          btnPdf.style.fontSize = '12px';
          btnPdf.setAttribute('data-bb-pdf', '1');
          btnPdf.textContent = '📄 PDF versenden';
          btnPdf.onclick = async function() {
            var email = prompt('E-Mail-Adresse des Empfängers:', '');
            if (!email) return;
            try {
              btnPdf.textContent = '⏳ Sende…';
              btnPdf.disabled = true;
              var jetzt = new Date();
              var result = await PROVA.exportiereBaubegleitungPDF(proj, 'monat', {
                email: email,
                monat: jetzt.getMonth() + 1,
                jahr:  jetzt.getFullYear()
              });
              alert('✅ ' + (result.message || 'Versendet'));
            } catch (e) {
              alert('Fehler: ' + e.message);
            } finally {
              btnPdf.textContent = '📄 PDF versenden';
              btnPdf.disabled = false;
            }
          };
          btnRow.appendChild(btnPdf);
        }
      } catch (err) {
        console.warn('[BB Polish] enhance-UI Fehler:', err);
      }
    };
    window.ladeProduktDetail.__polished = true;
  };

  // Auto-enhance wenn DOM bereit
  if (document.readyState !== 'loading') {
    setTimeout(PROVA.enhanceBaubegleitungUI, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(PROVA.enhanceBaubegleitungUI, 100);
    });
  }

  /* ─────────────────────────────────────────────
     Query-Param-Handling: ?id=recordId aus auftragstyp.js
  ───────────────────────────────────────────── */
  (function() {
    try {
      var params = new URLSearchParams(window.location.search);
      var externalId = params.get('id') || params.get('fall');
      if (!externalId) return;
      // Wenn Projekt mit dieser ID existiert, aktivieren
      if (document.readyState !== 'loading') {
        setTimeout(function() {
          if (typeof ladeProduktDetail === 'function') {
            var d = typeof ladeDaten === 'function' ? ladeDaten() : null;
            if (d && d.projekte && d.projekte.find(function(p){return p.id === externalId;})) {
              ladeProduktDetail(externalId);
            }
          }
        }, 200);
      }
    } catch (e) {}
  })();

})();
