/**
 * PROVA Workflow-Engine (MEGA⁶⁸-FINAL-3 Item E.2)
 *
 * Phasen-Definitionen pro `auftraege.typ`-Enum-Wert.
 * 10 Typen: schaden / beweis / ergaenzung / gegen / kurzstellungnahme /
 *           wertgutachten / beratung / baubegleitung / schied / gericht
 *
 * Quellen-Recherche (SV-Praxis):
 *   1. IHK Sachverständigenordnung (BIH-Mustertext §1-§7)
 *   2. BVS Verbandsrichtlinien
 *   3. IfS Köln Praxis-Handbuch
 *   4. §404, §407a, §411 ZPO (Gerichtsgutachten)
 *   5. §485 ZPO (Beweissicherung)
 *   6. JVEG (Honorar Gerichtsgutachten)
 *   7. BGB §286 (Mahnwesen-Verzug)
 *   8. ImmoWertV (Wertgutachten)
 *   9. HOAI §34 (Baubegleitung)
 *   10. PROVA-VISION-MASTER.md (4-Flow-Architektur)
 *
 * Public API:
 *   ProvaWorkflowEngine.getPhases(auftragsTyp) → Array<Phase>
 *   ProvaWorkflowEngine.getCurrentPhase(auftrag) → Phase
 *   ProvaWorkflowEngine.getNextActions(auftrag) → Array<{label, action, icon}>
 *   ProvaWorkflowEngine.renderStepper(container, auftrag) → DOM-Stepper
 *   ProvaWorkflowEngine.getFristTemplates(auftragsTyp) → Array<FristTemplate>
 */
'use strict';

(function (global) {

  /**
   * Phasen-Struktur:
   *   { nr, titel, icon, beschreibung, helferlein: [{ label, action, icon }] }
   * action: Cmd+K-Command-ID oder Page-Path
   *
   * NIE als Term: "§411" (Marcel-Memory) — verwende "Ergänzungsgutachten"
   * KI_LERNPOOL als "Datenbank-Wachstum", nie "KI lernt"
   */
  const PHASEN = {
    schaden: [
      { nr: 1, titel: 'Auftragseingang',        icon: '📥', beschreibung: 'Schadensmeldung / Versicherer-Auftrag erfassen.',
        helferlein: [
          { label: 'Neuer Auftrag', icon: '➕', action: '/auftrag-neu' },
          { label: 'Auftragsbestätigung schreiben', icon: '✉', action: '/briefe?vorlage=auftragsbestaetigung' }
        ] },
      { nr: 2, titel: 'Akteanlage',             icon: '📂', beschreibung: 'Kontakte, Adressen, Termine, erste Fristen.',
        helferlein: [
          { label: 'Kontakt hinzufügen', icon: '👤', action: '/kontakte?action=new' },
          { label: 'Termin anlegen', icon: '📅', action: '/termine?action=new' },
          { label: 'Frist setzen', icon: '⏰', action: '/fristen.html?action=new' }
        ] },
      { nr: 3, titel: 'Ortstermin',             icon: '🎙', beschreibung: 'Diktat, Fotos, Skizzen, Messwerte vor Ort.',
        helferlein: [
          { label: 'Ortstermin starten', icon: '🎙', action: '/ortstermin' },
          { label: 'Ortstermin-Protokoll', icon: '📋', action: '/briefe?vorlage=ortstermin-protokoll' }
        ] },
      { nr: 4, titel: 'Befund-Aufbereitung',    icon: '🧩', beschreibung: 'Fragmente kuratieren, Befund generieren.',
        helferlein: [
          { label: 'Stellungnahme öffnen', icon: '⚖', action: '/stellungnahme' },
          { label: 'Befund-Generator', icon: '✨', action: 'cmd:ki.fragments-to-befund' }
        ] },
      { nr: 5, titel: '§6 Fachurteil',           icon: '⚖', beschreibung: 'Konjunktiv-II, Norm-Zitate, Eigenleistung ≥ 500 Zeichen.',
        helferlein: [
          { label: 'Konjunktiv-Check', icon: '⚖', action: 'cmd:ki.konjunktiv' },
          { label: 'Norm-Picker', icon: '📐', action: 'cmd:ki.norm-zitat' }
        ] },
      { nr: 6, titel: 'Freigabe + PDF',          icon: '🖨', beschreibung: 'Vor-Versand-Check, PDF generieren, Public-Hash.',
        helferlein: [
          { label: 'Versand-Modal', icon: '📤', action: 'cmd:export.versand' },
          { label: 'IHK-Export', icon: '📄', action: 'cmd:export.pdf' }
        ] },
      { nr: 7, titel: 'Versand',                 icon: '📤', beschreibung: 'Download / Platform-Link / E-Mail.',
        helferlein: [
          { label: 'Per Email', icon: '✉', action: 'cmd:export.versand' }
        ] },
      { nr: 8, titel: 'Rechnung',                icon: '💶', beschreibung: 'JVEG / Pauschal / Stundenabrechnung.',
        helferlein: [
          { label: 'Rechnung erstellen', icon: '➕💶', action: '/rechnungen?action=new' }
        ] },
      { nr: 9, titel: 'Archivierung',            icon: '📦', beschreibung: 'Auftrag abschließen, Aufbewahrungs-Frist starten (10 Jahre).',
        helferlein: [
          { label: 'Status auf abgeschlossen', icon: '✓', action: 'cmd:auftrag.abschliessen' }
        ] }
    ],

    gericht: [
      { nr: 1, titel: 'Beauftragung (Gericht)',  icon: '⚖', beschreibung: '§404 ZPO Beauftragung, §407a Annahme-Prüfung.',
        helferlein: [
          { label: 'Annahme prüfen (§407a)', icon: '✓', action: '/briefe?vorlage=annahmeerklaerung' },
          { label: 'Auftrag-Ablehnung', icon: '✗', action: '/briefe?vorlage=auftrag-ablehnen' }
        ] },
      { nr: 2, titel: 'Akteneinsicht',           icon: '📑', beschreibung: 'Beweisbeschluss + Akte einsehen, Externe Dokumente hochladen.',
        helferlein: [
          { label: 'Akteneinsicht-Antrag', icon: '📨', action: '/briefe?vorlage=akteneinsicht-antrag' },
          { label: 'Beweisbeschluss hochladen', icon: '📎', action: '/akte?tab=anhang' }
        ] },
      { nr: 3, titel: 'Beweisbeschluss-Analyse', icon: '🔍', beschreibung: 'Fragen extrahieren (parse-beweisbeschluss), Anhänge zuordnen.',
        helferlein: [
          { label: 'Beweisfragen-Panel öffnen', icon: '⚖', action: 'cmd:akte.beweisfragen' }
        ] },
      { nr: 4, titel: 'Ortstermin (Parteien)',   icon: '🎙', beschreibung: 'Anhörung beider Parteien, Diktat + Fotos + Skizzen.',
        helferlein: [
          { label: 'Einladung Ortstermin', icon: '✉', action: '/briefe?vorlage=einladung-ortstermin-gericht' },
          { label: 'Ortstermin starten', icon: '🎙', action: '/ortstermin' }
        ] },
      { nr: 5, titel: 'Befund',                  icon: '🧩', beschreibung: 'Kuratierung der Fragmente pro Beweisfrage.' },
      { nr: 6, titel: '§6 Fachurteil + Antwort', icon: '⚖', beschreibung: 'Beweisfragen einzeln beantworten, Konjunktiv II + Normen-Zitate.',
        helferlein: [
          { label: 'Konjunktiv-Check', icon: '⚖', action: 'cmd:ki.konjunktiv' },
          { label: 'Plausibilität prüfen', icon: '🔍', action: 'cmd:ki.plausibilitaet' }
        ] },
      { nr: 7, titel: 'Vor-Versand-Check',       icon: '✓', beschreibung: '§407a-Compliance, Hash-Chain prüfen, Halluzinations-Check.',
        helferlein: [
          { label: 'Audit-Trail anzeigen', icon: '📋', action: 'cmd:audit.view' }
        ] },
      { nr: 8, titel: 'Gerichts-Versand',        icon: '📤', beschreibung: 'PDF an Gericht (Stufe 1 mit Public-Hash).',
        helferlein: [
          { label: 'Versand-Modal', icon: '📤', action: 'cmd:export.versand' }
        ] },
      { nr: 9, titel: 'JVEG-Rechnung',           icon: '💶', beschreibung: 'Stunden + Auslagen nach JVEG-Sätzen.',
        helferlein: [
          { label: 'Rechnung erstellen', icon: '➕💶', action: '/rechnungen?action=new&typ=jveg' }
        ] },
      { nr: 10, titel: 'Ggf. Ergänzungsgutachten', icon: '↻', beschreibung: 'Wenn Gericht Ergänzungs-Fragen stellt, ergänzendes Gutachten.',
        helferlein: [
          { label: 'Ergänzungsgutachten anlegen', icon: '➕', action: '/auftrag-neu?typ=ergaenzung' }
        ] }
    ],

    beratung: [
      { nr: 1, titel: 'Beratungsanruf',          icon: '☎', beschreibung: 'Telefonische Auftragsannahme, Notizen.' },
      { nr: 2, titel: 'Beratungsnotiz',          icon: '📝', beschreibung: 'Schriftliche Zusammenfassung der Beratung.',
        helferlein: [{ label: 'Aktennotiz öffnen', icon: '📝', action: '/briefe?vorlage=aktennotiz' }] },
      { nr: 3, titel: 'Schriftliche Zusammenfassung', icon: '✉', beschreibung: 'Optional: Mandant erhält schriftliche Zusammenfassung.',
        helferlein: [{ label: 'Brief erstellen', icon: '➕✉', action: '/briefe?action=new' }] },
      { nr: 4, titel: 'Rechnung',                icon: '💶', beschreibung: 'Stundenabrechnung Beratungs-Honorar.',
        helferlein: [{ label: 'Stundenrechnung', icon: '💶', action: '/rechnungen?action=new&typ=stunden' }] },
      { nr: 5, titel: 'Archivierung',            icon: '📦', beschreibung: 'Beratung abschließen.' }
    ],

    baubegleitung: [
      { nr: 1, titel: 'Beauftragung',            icon: '📥', beschreibung: 'Vertrag + HOAI-Honorarvereinbarung.',
        helferlein: [{ label: 'Honorarvereinbarung', icon: '✉', action: '/briefe?vorlage=honorarvereinbarung' }] },
      { nr: 2, titel: 'Bestandsaufnahme',        icon: '🔍', beschreibung: 'Ist-Zustand erfassen, Foto-Doku.' },
      { nr: 3, titel: 'Begleit-Termine',         icon: '🏗', beschreibung: 'Mehrere Ortstermine in Bauphasen (Aushub, Rohbau, Ausbau).',
        helferlein: [
          { label: 'Termin anlegen', icon: '📅', action: '/termine?action=new' },
          { label: 'Ortstermin', icon: '🎙', action: '/ortstermin' }
        ] },
      { nr: 4, titel: 'Zwischenberichte',        icon: '📊', beschreibung: 'Phasen-Reports nach jedem Termin.',
        helferlein: [{ label: 'Brief erstellen', icon: '➕✉', action: '/briefe?action=new' }] },
      { nr: 5, titel: 'Schluss-Abnahme',         icon: '✓', beschreibung: 'Abnahme + Mängelliste.',
        helferlein: [{ label: 'Abnahmeprotokoll', icon: '📋', action: '/briefe?vorlage=ortstermin-protokoll' }] },
      { nr: 6, titel: 'Schluss-Bericht',         icon: '📄', beschreibung: 'Zusammenfassung gesamte Baubegleitung.' },
      { nr: 7, titel: 'Schluss-Rechnung',        icon: '💶', beschreibung: 'HOAI-Rechnung mit Phasen-Aufschlüsselung.',
        helferlein: [{ label: 'Schlussrechnung', icon: '💶', action: '/briefe?vorlage=schlussrechnung-aufstellung' }] }
    ],

    kurzstellungnahme: [
      { nr: 1, titel: 'Eingang',                 icon: '📥', beschreibung: 'Anfrage + Unterlagen prüfen.' },
      { nr: 2, titel: 'Sichtung',                icon: '🔍', beschreibung: 'Anhänge OCR + Klassifizierung.',
        helferlein: [{ label: 'Anhang hochladen', icon: '📎', action: '/akte?tab=anhang' }] },
      { nr: 3, titel: 'Kurzstellungnahme',       icon: '✏', beschreibung: 'Editor F-04 / Vorlage-02-Kurzgutachten.',
        helferlein: [{ label: 'Stellungnahme öffnen', icon: '⚖', action: '/stellungnahme' }] },
      { nr: 4, titel: 'Versand',                 icon: '📤', beschreibung: 'PDF + Email.',
        helferlein: [{ label: 'Versand', icon: '📤', action: 'cmd:export.versand' }] },
      { nr: 5, titel: 'Rechnung',                icon: '💶', beschreibung: 'Pauschal oder Stunden.' }
    ],

    wertgutachten: [
      { nr: 1, titel: 'Beauftragung',            icon: '📥', beschreibung: 'Wert-Anfrage + Objekt-Daten.' },
      { nr: 2, titel: 'Objekt-Besichtigung',     icon: '🏠', beschreibung: 'Vor-Ort-Aufnahme, Foto-Doku.',
        helferlein: [{ label: 'Ortstermin', icon: '🎙', action: '/ortstermin' }] },
      { nr: 3, titel: 'Wertermittlung',          icon: '💶', beschreibung: 'Sachwert / Vergleichswert / Ertragswert (ImmoWertV).',
        helferlein: [{ label: 'Vergleichswerte recherchieren', icon: '🔍', action: 'cmd:sys.global-search' }] },
      { nr: 4, titel: 'Gutachten-Erstellung',    icon: '📄', beschreibung: 'Editor mit Wert-Schema.',
        helferlein: [{ label: 'Stellungnahme', icon: '⚖', action: '/stellungnahme' }] },
      { nr: 5, titel: 'Versand + Rechnung',      icon: '📤', beschreibung: 'PDF + Rechnung kombiniert.' }
    ],

    beweis: [
      { nr: 1, titel: 'Eingang (§485 ZPO)',      icon: '📥', beschreibung: 'Selbständiges Beweisverfahren-Auftrag.' },
      { nr: 2, titel: 'Termin-Koordination',     icon: '📅', beschreibung: 'Anwälte/Parteien einladen.',
        helferlein: [
          { label: 'Einladung Ortstermin', icon: '✉', action: '/briefe?vorlage=einladung-ortstermin' },
          { label: 'Termin', icon: '📅', action: '/termine?action=new' }
        ] },
      { nr: 3, titel: 'Ortstermin',              icon: '🎙', beschreibung: 'Beweissicherungs-Aufnahme.',
        helferlein: [{ label: 'Ortstermin starten', icon: '🎙', action: '/ortstermin' }] },
      { nr: 4, titel: 'Beweissicherungs-Bericht', icon: '📄', beschreibung: 'Fakten-Bericht ohne Bewertung.' },
      { nr: 5, titel: 'Versand',                 icon: '📤', beschreibung: 'An Gericht + Anwälte.' }
    ],

    ergaenzung: [
      { nr: 1, titel: 'Eingang Ergänzungs-Fragen', icon: '📥', beschreibung: 'Anwalt/Gericht stellt Ergänzungs-Fragen.' },
      { nr: 2, titel: 'Sichtung Vor-Gutachten',  icon: '🔍', beschreibung: 'Eigenes Vor-Gutachten + neue Fragen abgleichen.' },
      { nr: 3, titel: 'Antwort-Stellungnahme',   icon: '⚖', beschreibung: 'Punktuelle Antwort auf jede Frage.',
        helferlein: [{ label: 'Stellungnahme', icon: '⚖', action: '/stellungnahme' }] },
      { nr: 4, titel: 'Versand',                 icon: '📤', beschreibung: 'An Adressat.' },
      { nr: 5, titel: 'Rechnung',                icon: '💶', beschreibung: 'Stundenabrechnung.' }
    ],

    gegen: [
      { nr: 1, titel: 'Eingang',                 icon: '📥', beschreibung: 'Gegen-Gutachten-Auftrag (kritische Würdigung Vor-Gutachten).' },
      { nr: 2, titel: 'Vor-Gutachten-Analyse',   icon: '🔍', beschreibung: 'Strukturelle + inhaltliche Schwachstellen.',
        helferlein: [{ label: 'Externe Doku hochladen', icon: '📎', action: '/akte?tab=anhang' }] },
      { nr: 3, titel: 'Eigene Befund-Aufbereitung', icon: '🧩', beschreibung: 'Eigene Beweissicherung (falls möglich).' },
      { nr: 4, titel: 'Vergleichs-Gutachten',    icon: '⚖', beschreibung: 'Punktuelle Kritik + eigene Schlussfolgerung.' },
      { nr: 5, titel: 'Versand',                 icon: '📤', beschreibung: 'An Auftraggeber.' }
    ],

    schied: [
      { nr: 1, titel: 'Schiedsverfahren-Auftrag', icon: '⚖', beschreibung: 'Vertragliche Schiedsgutachter-Bindung beider Parteien.' },
      { nr: 2, titel: 'Parteien-Anhörung',       icon: '👥', beschreibung: 'Beide Parteien anhören.' },
      { nr: 3, titel: 'Beweisaufnahme',          icon: '🎙', beschreibung: 'Eigene Befund-Erhebung.',
        helferlein: [{ label: 'Ortstermin', icon: '🎙', action: '/ortstermin' }] },
      { nr: 4, titel: 'Schiedsgutachten',        icon: '📄', beschreibung: 'Bindende Entscheidung für beide Parteien.',
        helferlein: [{ label: 'Stellungnahme', icon: '⚖', action: '/stellungnahme' }] },
      { nr: 5, titel: 'Versand + Rechnung',      icon: '📤', beschreibung: 'An beide Parteien.' }
    ]
  };

  // Fallback für unbekannte Typen
  PHASEN.default = PHASEN.schaden;

  /**
   * Frist-Templates pro Auftrags-Typ (Stand: Recherche IHK + BVS + JVEG).
   * - Schadensgutachten: 4-6 Wochen typisch
   * - Gericht: meist Gerichts-Frist 3-6 Monate
   * - Kurzstellungnahme: 1-2 Wochen
   * - Beratung: keine Frist
   * - Baubegleitung: laufend (Phasen-Termine)
   */
  const FRIST_TEMPLATES = {
    schaden: [
      { titel: 'Stellungnahme-Abgabe', daysFromNow: 28, pipeline: 'gutachten_abgabe' },
      { titel: 'Rückfrage-Antwort', daysFromNow: 14, pipeline: 'rueckfrage' }
    ],
    gericht: [
      { titel: 'Gerichtliche Abgabe-Frist', daysFromNow: 90, pipeline: 'gericht_abgabe' },
      { titel: 'Akteneinsicht-Antwort', daysFromNow: 21, pipeline: 'akteneinsicht' },
      { titel: 'Ergänzungs-Antwort', daysFromNow: 28, pipeline: 'ergaenzung' }
    ],
    kurzstellungnahme: [
      { titel: 'Kurzstellungnahme-Abgabe', daysFromNow: 10, pipeline: 'gutachten_abgabe' }
    ],
    beweis: [
      { titel: 'Beweissicherungs-Bericht', daysFromNow: 28, pipeline: 'gutachten_abgabe' }
    ],
    ergaenzung: [
      { titel: 'Ergänzungsgutachten-Abgabe', daysFromNow: 21, pipeline: 'ergaenzung' }
    ],
    gegen: [
      { titel: 'Gegen-Gutachten-Abgabe', daysFromNow: 42, pipeline: 'gutachten_abgabe' }
    ],
    wertgutachten: [
      { titel: 'Wertgutachten-Abgabe', daysFromNow: 35, pipeline: 'gutachten_abgabe' }
    ],
    baubegleitung: [
      { titel: 'Zwischenbericht Phase 1', daysFromNow: 30, pipeline: 'baubegleitung' },
      { titel: 'Zwischenbericht Phase 2', daysFromNow: 90, pipeline: 'baubegleitung' },
      { titel: 'Schluss-Abnahme', daysFromNow: 180, pipeline: 'baubegleitung' }
    ],
    schied: [
      { titel: 'Schiedsgutachten-Abgabe', daysFromNow: 60, pipeline: 'gutachten_abgabe' }
    ],
    beratung: [] // typisch keine Fristen
  };

  const ProvaWorkflowEngine = {
    getPhases(auftragsTyp) {
      return PHASEN[auftragsTyp] || PHASEN.default;
    },

    /**
     * @param {Object} auftrag — mit typ + phase_aktuell (numeric)
     */
    getCurrentPhase(auftrag) {
      if (!auftrag) return null;
      const phases = this.getPhases(auftrag.typ);
      const nr = Number(auftrag.phase_aktuell) || 1;
      return phases.find(p => p.nr === nr) || phases[0];
    },

    /**
     * Nächste mögliche Aktionen für SV.
     * Aktuelle Phase + nächste 1-2 Phasen helferlein.
     */
    getNextActions(auftrag) {
      if (!auftrag) return [];
      const phases = this.getPhases(auftrag.typ);
      const curNr = Number(auftrag.phase_aktuell) || 1;
      const out = [];
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        if (p.nr < curNr) continue;
        if (p.nr > curNr + 1) break;
        if (Array.isArray(p.helferlein)) {
          out.push(...p.helferlein.map(h => ({ ...h, phase: p.nr, phaseTitel: p.titel })));
        }
      }
      return out;
    },

    getFristTemplates(auftragsTyp) {
      return FRIST_TEMPLATES[auftragsTyp] || [];
    },

    /**
     * Render Phase-Stepper in einen Container.
     * Container bekommt CSS-Class .prova-phase-stepper.
     */
    renderStepper(container, auftrag) {
      if (!container || !auftrag) return;
      const phases = this.getPhases(auftrag.typ);
      const curNr = Number(auftrag.phase_aktuell) || 1;
      _injectStyle();
      container.classList.add('prova-phase-stepper');
      container.innerHTML = phases.map(p => {
        const state = p.nr < curNr ? 'done' : (p.nr === curNr ? 'current' : 'todo');
        return `<div class="step step-${state}" data-phase="${p.nr}" title="${_esc(p.beschreibung || '')}">
          <span class="step-nr">${p.nr}</span>
          <span class="step-icon">${p.icon || '·'}</span>
          <span class="step-title">${_esc(p.titel)}</span>
        </div>`;
      }).join('<div class="step-conn"></div>');

      container.querySelectorAll('.step').forEach(el => {
        el.addEventListener('click', () => {
          const nr = parseInt(el.dataset.phase, 10);
          document.dispatchEvent(new CustomEvent('prova:phase-click', { detail: { auftrag, phaseNr: nr } }));
        });
      });
    },

    /**
     * Render Helferlein-Buttons (nächste Aktionen) in Container.
     */
    renderHelferlein(container, auftrag) {
      if (!container) return;
      _injectStyle();
      const actions = this.getNextActions(auftrag);
      if (actions.length === 0) {
        container.innerHTML = '<div class="helferlein-empty">Keine Aktion vorgeschlagen</div>';
        return;
      }
      container.classList.add('prova-helferlein-bar');
      container.innerHTML = `
        <div class="helferlein-label">Nächste Schritte:</div>
        <div class="helferlein-actions">
          ${actions.map(a => `<button type="button" class="helferlein-btn" data-action="${_esc(a.action)}" title="Phase ${a.phase}: ${_esc(a.phaseTitel)}">
            <span class="hb-icon">${a.icon || '·'}</span>
            <span class="hb-label">${_esc(a.label)}</span>
          </button>`).join('')}
        </div>
      `;
      container.querySelectorAll('.helferlein-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action.startsWith('cmd:')) {
            const cmdId = action.slice(4);
            document.dispatchEvent(new CustomEvent('prova:cmd-trigger', { detail: { commandId: cmdId } }));
          } else if (action.startsWith('/')) {
            window.location.href = action;
          }
        });
      });
    }
  };

  function _injectStyle() {
    if (document.getElementById('prova-workflow-engine-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-workflow-engine-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-workflow-engine.css';
    document.head.appendChild(link);
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  global.ProvaWorkflowEngine = ProvaWorkflowEngine;
})(typeof window !== 'undefined' ? window : globalThis);
