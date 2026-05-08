/**
 * PROVA Document-Mode-Modal (MEGA⁴⁰ P3)
 *
 * 3-Wege-Auswahl-Modal:
 *   weg_a — Wizard-geführt (für Einsteiger, Schnell-Standard)
 *   weg_b — Eigene Word-Vorlage (Etablierte mit 15-Jahres-Vorlage)
 *   weg_c — Hybrid (PROVA übernimmt rechtlich kritische Sektionen)
 *
 * Public API (window.ProvaDocumentModeModal):
 *   open({ currentWeg?, onSelect: (weg) => Promise<void> })
 *     → Promise<weg | null>
 *
 *   confirmModeSwitch({ currentWeg, newWeg, hasContent: boolean })
 *     → Promise<boolean>  (true = OK, false = abgebrochen)
 *
 *   LOCKED_SECTION_KEYS (für Hybrid weg_c)
 *
 * Locked-Sections werden in documents.locked_sections (JSONB-Array)
 * pro Dokument gespeichert. Beim PDF-Generation in M⁴⁰ P9 werden
 * sie aus PROVA-Defaults ergänzt. Im Editor (P2) sind sie als
 * read-only-Inhalte sichtbar (P5/P9-Implementation).
 */
'use strict';

(function () {

  const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];

  // Hybrid-Mode (weg_c) Locked-Sections — auto-eingefügte PROVA-Sektionen
  const LOCKED_SECTION_KEYS = [
    'deckblatt',           // Auftraggeber + Aktenzeichen + Datum
    'paragraph_407a_zpo',  // §407a-Belehrung + Compliance-Block
    'eu_ai_act_disclosure',// EU-AI-Act-Disclosure (Pflicht ab Aug 2026)
    'unterschrift'         // SV-Unterschrift + IHK-Bestellungstext
  ];

  const LOCKED_SECTION_LABELS = {
    deckblatt:             'Deckblatt (Auftraggeber + Aktenzeichen + Datum)',
    paragraph_407a_zpo:    '§ 407a ZPO-Belehrung',
    eu_ai_act_disclosure:  'EU AI Act-Disclosure (KI-Nutzung-Hinweis)',
    unterschrift:          'SV-Unterschrift + IHK-Bestellungstext'
  };

  const WEG_META = {
    weg_a: {
      icon: '🧙',
      title: 'A — Wizard-geführt',
      pitch: 'Für Einsteiger und Standard-Fälle.',
      details: [
        'PROVA-Wizard führt durch alle SV-Pflichtfelder',
        'Auto-Vorschläge aus Bibliothek',
        'KI-Hilfen optional zuschaltbar',
        'PROVA-Layout (IHK-konform)'
      ],
      bestFor: 'Erste 5–10 Gutachten, wenn du dein Format noch findest.'
    },
    weg_b: {
      icon: '📄',
      title: 'B — Eigene Word-Vorlage',
      pitch: 'Du hast ein 15-Jahre-Format. Lade es hoch.',
      details: [
        'DOCX-Import 1:1 (Headings, Listen, Tabellen, Bilder)',
        'Platzhalter-Detection ({{Mandant}}, {{AZ}})',
        'Vollwertiger Editor — keine Format-Einschränkung',
        'PDF-Export erhält Word-Layout'
      ],
      bestFor: 'Etablierte SVs mit eigener Vorlagen-Bibliothek.'
    },
    weg_c: {
      icon: '🪡',
      title: 'C — Hybrid',
      pitch: 'Du schreibst den Hauptteil. PROVA setzt Rechts-Pflicht.',
      details: [
        'Du entscheidest Aufbau + Stil im Hauptteil',
        'Auto-eingefügt: ' + LOCKED_SECTION_KEYS.length + ' Compliance-Sektionen',
        'Locked-Sections sind read-only',
        'Beste Mischung aus Eigenstil + Rechtssicherheit'
      ],
      bestFor: 'Etablierte SVs, die rechtliche Compliance auslagern wollen.'
    }
  };

  const STYLE_ID = 'prova-document-mode-modal-style';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/lib/document-mode-modal.css';
    document.head.appendChild(link);
  }

  /**
   * @param {Object} opts
   * @param {string?} opts.currentWeg
   * @param {Function?} opts.onSelect — async (weg) => any (kann werfen → Modal bleibt offen)
   * @returns {Promise<string|null>} ausgewähltes weg oder null wenn abgebrochen
   */
  function open(opts) {
    opts = opts || {};
    _injectStyle();

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pdmm-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'pdmm-title');

      const wrap = document.createElement('div');
      wrap.className = 'pdmm-wrap';

      const head = document.createElement('div');
      head.className = 'pdmm-head';
      head.innerHTML = '<h2 id="pdmm-title">Wie möchtest du dieses Dokument erstellen?</h2>' +
                       '<p class="pdmm-sub">Wähle 1 von 3 Wegen — du kannst später wechseln.</p>';
      wrap.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'pdmm-grid';

      VALID_WEGE.forEach(weg => {
        const meta = WEG_META[weg];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pdmm-card' + (opts.currentWeg === weg ? ' pdmm-card--current' : '');
        card.setAttribute('data-weg', weg);
        card.setAttribute('aria-label', meta.title);
        card.innerHTML =
          '<div class="pdmm-card-icon" aria-hidden="true">' + meta.icon + '</div>' +
          '<div class="pdmm-card-title">' + meta.title + '</div>' +
          '<div class="pdmm-card-pitch">' + meta.pitch + '</div>' +
          '<ul class="pdmm-card-details">' + meta.details.map(d => '<li>' + d + '</li>').join('') + '</ul>' +
          '<div class="pdmm-card-best">Am besten für: <strong>' + meta.bestFor + '</strong></div>' +
          (opts.currentWeg === weg ? '<div class="pdmm-card-current-badge">aktuell</div>' : '<div class="pdmm-card-action">Wählen →</div>');
        card.addEventListener('click', async () => {
          if (typeof opts.onSelect === 'function') {
            card.disabled = true;
            try {
              await opts.onSelect(weg);
            } catch (e) {
              card.disabled = false;
              return;  // Modal bleibt offen
            }
          }
          _close(overlay);
          resolve(weg);
        });
        grid.appendChild(card);
      });

      wrap.appendChild(grid);

      const foot = document.createElement('div');
      foot.className = 'pdmm-foot';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'pdmm-cancel';
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.addEventListener('click', () => { _close(overlay); resolve(null); });
      foot.appendChild(cancelBtn);
      wrap.appendChild(foot);

      overlay.appendChild(wrap);
      document.body.appendChild(overlay);

      // ESC schließt
      const onEsc = (e) => {
        if (e.key === 'Escape') { _close(overlay); resolve(null); }
      };
      document.addEventListener('keydown', onEsc);
      overlay._onEsc = onEsc;

      // Click-outside schließt
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { _close(overlay); resolve(null); }
      });

      // Auto-Focus auf erste Karte (oder current)
      setTimeout(() => {
        const target = wrap.querySelector('.pdmm-card--current') || wrap.querySelector('.pdmm-card');
        if (target) target.focus();
      }, 50);
    });
  }

  function _close(overlay) {
    if (overlay._onEsc) document.removeEventListener('keydown', overlay._onEsc);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  /**
   * Datenverlust-Warning beim Mode-Switch.
   * Pattern: Locked-Sections beim Switch zu/von weg_c können Datenverlust bedeuten.
   *
   * @returns {Promise<boolean>} true wenn User OK klickt
   */
  function confirmModeSwitch(opts) {
    opts = opts || {};
    const cur = opts.currentWeg;
    const nu = opts.newWeg;
    if (cur === nu) return Promise.resolve(true);
    if (!opts.hasContent) return Promise.resolve(true);  // leeres Doc — kein Verlust

    let warning = 'Du wechselst von „' + (WEG_META[cur] ? WEG_META[cur].title : cur) +
                  '" zu „' + (WEG_META[nu] ? WEG_META[nu].title : nu) + '".\n\n';

    if (cur === 'weg_b' && nu !== 'weg_b') {
      warning += '⚠️ Wenn du eine eigene Word-Vorlage importiert hast, kann beim Wechsel ' +
                 'zu Wizard- oder Hybrid-Modus dein Layout verloren gehen.\n\n';
    }
    if (cur === 'weg_c' && nu !== 'weg_c') {
      warning += '⚠️ Im Hybrid-Modus eingefügte Locked-Sections (§407a, EU AI Act, ' +
                 'Deckblatt, Unterschrift) werden NICHT mehr automatisch eingefügt — ' +
                 'du musst sie selbst pflegen.\n\n';
    }
    if (nu === 'weg_c' && cur !== 'weg_c') {
      warning += 'ℹ️ Beim Wechsel zu Hybrid werden ' + LOCKED_SECTION_KEYS.length +
                 ' Compliance-Sektionen automatisch read-only ergänzt.\n\n';
    }
    warning += 'Wirklich wechseln?';

    if (window.confirm) {
      return Promise.resolve(window.confirm(warning));
    }
    return Promise.resolve(true);
  }

  // Public API
  const api = {
    open: open,
    confirmModeSwitch: confirmModeSwitch,
    LOCKED_SECTION_KEYS: LOCKED_SECTION_KEYS,
    LOCKED_SECTION_LABELS: LOCKED_SECTION_LABELS,
    WEG_META: WEG_META,
    VALID_WEGE: VALID_WEGE
  };

  if (typeof window !== 'undefined') {
    window.ProvaDocumentModeModal = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
