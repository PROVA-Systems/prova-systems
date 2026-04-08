/**
 * PROVA Systems — §407a Rechtsprüfung
 * Objektive Konformitätsprüfung für Gutachten-Texte
 *
 * Philosophie: Der SV ist der Experte. Dieses Tool prüft ausschließlich
 * objektive juristische Anforderungen nach §407a ZPO, nicht die fachliche
 * Qualität. Kein Score, keine Bewertung — nur konkrete Hinweise.
 *
 * Checks:
 *   1. Konjunktiv II: Kausalaussagen im Indikativ entdeckt?
 *   2. §407a ZPO: Erklärung vorhanden?
 *   3. Normzitate: DIN/WTA/VOB referenziert?
 *   4. Mindestumfang: Ausreichend für eine Beweisfrage?
 *
 * Keine Noten. Kein Score. Nur Hinweise mit direktem Mehrwert.
 */

'use strict';

const Rechtspruefung = (() => {

  // ── Konfiguration ──────────────────────────────────────────────
  const CONFIG = {
    MIN_ZEICHEN:       200,    // Unter dieser Länge: kein Check
    DEBOUNCE_MS:      5000,    // 5s nach letztem Tippen (nur bei Auto-Mode)
    AUTO_CHECK:        false,  // Expliziter Klick, kein Auto-Check
    STORAGE_KEY: 'prova_rp_last',
    VERSION: '1.0'
  };

  // ── Konjunktiv-II Muster (Kausalaussagen im Indikativ) ──────────
  // Nur Kausal- und Bewertungsverben — KEIN Indikativ bei Messwerten
  const INDIKATIV_MUSTER = [
    // Kausalverben
    { pattern: /\b(führt|führte|führen)\s+(zu|dazu)\b/gi,       beispiel: 'führt zu → dürfte führen zu' },
    { pattern: /\b(verursacht|verursachte|verursachen)\b/gi,    beispiel: 'verursacht → dürfte verursacht haben' },
    { pattern: /\bist\s+(die\s+)?(Ursache|Auslöser|Grund)\b/gi, beispiel: 'ist die Ursache → dürfte die Ursache sein' },
    { pattern: /\b(entstand|entsteht|entstanden\s+ist)\b/gi,    beispiel: 'entstand → dürfte entstanden sein' },
    // Bewertungsverben
    { pattern: /\bist\s+(mangelhaft|unzureichend|fehlerhaft|nicht\s+regelkonform)\b/gi,
                                                                  beispiel: 'ist mangelhaft → dürfte mangelhaft sein' },
    { pattern: /\b(liegt\s+vor|liegen\s+vor)\b/gi,              beispiel: 'liegt vor → dürfte vorliegen' },
    { pattern: /\bist\s+(auf\s+)(den|die|das|einen|eine|ein)\b/gi, beispiel: 'ist auf ... zurückzuführen → dürfte zurückzuführen sein' },
    { pattern: /\bzurückzuführen\s+ist\b/gi,                    beispiel: 'zurückzuführen ist → zurückzuführen sein dürfte' },
    { pattern: /\b(bewirkt|bewirkte)\b/gi,                      beispiel: 'bewirkt → dürfte bewirkt haben' },
  ];

  // ── Normen-Erkennung ─────────────────────────────────────────────
  const NORM_PATTERN = /\b(DIN\s*\d{3,5}|WTA[- ]?\d|VOB\s*\/\s*[A-C]|§\s*\d+[a-z]?\s*ZPO|§\s*\d+\s*[A-Z]{2,}|EN\s*\d{4,5}|ISO\s*\d{4,5})\b/gi;

  // ── §407a Pflichtinhalte ─────────────────────────────────────────
  const PARA407A_PATTERN = /§\s*407\s*a|persönlich.*erstatt|Aufgaben.*übertrag|nicht.*persönlich|wesentlich.*Teile/gi;

  // ── State ─────────────────────────────────────────────────────────
  let state = {
    letzterCheck: null,
    hinweise:     [],
    widgetEl:     null,
    zielTextarea: null,
    isChecking:   false
  };

  // ── CSS injizieren ─────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('rp-styles')) return;
    const style = document.createElement('style');
    style.id = 'rp-styles';
    style.textContent = `
      /* §407a Rechtsprüfung Widget */
      .rp-widget {
        background: var(--bg2, #111827);
        border: 1px solid var(--border2, rgba(255,255,255,.12));
        border-radius: 12px;
        padding: 0;
        font-family: var(--font-ui, system-ui, sans-serif);
        overflow: hidden;
      }
      .rp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,.07));
        cursor: pointer;
        user-select: none;
        transition: background .12s;
      }
      .rp-header:hover { background: rgba(255,255,255,.03); }
      .rp-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .rp-icon { font-size: 18px; }
      .rp-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text, #eaecf4);
        letter-spacing: .01em;
      }
      .rp-subtitle {
        font-size: 11px;
        color: var(--text3, #4d5568);
        margin-top: 1px;
      }
      .rp-status-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        background: var(--text3, #4d5568);
        flex-shrink: 0;
      }
      .rp-status-dot.ok      { background: #10b981; }
      .rp-status-dot.hinweis { background: #f59e0b; }
      .rp-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: rgba(79,142,247,.1);
        border: 1px solid rgba(79,142,247,.25);
        border-radius: 8px;
        color: #4f8ef7;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all .12s;
        letter-spacing: .02em;
      }
      .rp-btn:hover  { background: rgba(79,142,247,.18); }
      .rp-btn:active { transform: scale(.97); }
      .rp-btn:disabled { opacity: .5; cursor: not-allowed; }
      .rp-body {
        display: none;
        padding: 14px 16px;
      }
      .rp-body.open { display: block; }
      .rp-hinweis {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        line-height: 1.6;
        background: rgba(245,158,11,.06);
        border: 1px solid rgba(245,158,11,.15);
        color: var(--text, #eaecf4);
      }
      .rp-hinweis.konjunktiv { background: rgba(245,158,11,.06); border-color: rgba(245,158,11,.2); }
      .rp-hinweis.para407    { background: rgba(79,142,247,.06); border-color: rgba(79,142,247,.2); }
      .rp-hinweis.norm       { background: rgba(139,92,246,.06); border-color: rgba(139,92,246,.2); }
      .rp-hinweis.info       { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.1); }
      .rp-hinweis-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
      .rp-hinweis-body { flex: 1; }
      .rp-hinweis-titel { font-weight: 700; color: var(--text, #eaecf4); margin-bottom: 2px; }
      .rp-hinweis-text  { color: var(--text2, #8b93ab); }
      .rp-hinweis-fund  {
        margin-top: 4px;
        font-size: 11px;
        color: var(--text3, #4d5568);
        font-family: monospace;
        background: rgba(255,255,255,.04);
        padding: 3px 7px;
        border-radius: 4px;
        display: inline-block;
      }
      .rp-ok {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(16,185,129,.06);
        border: 1px solid rgba(16,185,129,.15);
        border-radius: 8px;
        font-size: 12px;
        color: #10b981;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .rp-leer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: var(--text3, #4d5568);
      }
      .rp-para407-info {
        margin-top: 10px;
        padding: 10px 12px;
        background: rgba(255,255,255,.02);
        border-radius: 8px;
        font-size: 11px;
        color: var(--text3, #4d5568);
        line-height: 1.6;
      }
      .rp-spin {
        display: inline-block;
        width: 12px; height: 12px;
        border: 2px solid rgba(255,255,255,.15);
        border-top-color: #4f8ef7;
        border-radius: 50%;
        animation: rp-spin .7s linear infinite;
      }
      @keyframes rp-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  // ── Widget HTML ────────────────────────────────────────────────────
  function buildWidgetHTML(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;

    el.innerHTML = `
      <div class="rp-widget" id="rp-widget">
        <div class="rp-header" onclick="Rechtspruefung._toggleBody()">
          <div class="rp-header-left">
            <span class="rp-icon">⚖️</span>
            <div>
              <div class="rp-title">§407a Rechtsprüfung</div>
              <div class="rp-subtitle" id="rp-subtitle">Konjunktiv II · Normzitate · Pflichtinhalt</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="rp-status-dot" id="rp-dot"></div>
            <button class="rp-btn" id="rp-btn"
              onclick="event.stopPropagation();Rechtspruefung.pruefen()"
              title="§407a-Konformität prüfen">
              Prüfen
            </button>
          </div>
        </div>
        <div class="rp-body" id="rp-body">
          <div id="rp-ergebnis">
            <div class="rp-leer">
              Klicken Sie auf "Prüfen" um die §407a-Konformität zu analysieren.
            </div>
          </div>
          <div class="rp-para407-info">
            <strong>Was wird geprüft:</strong><br>
            Kausalaussagen im Indikativ (statt Konjunktiv II) · §407a ZPO Erklärung ·
            Normzitate (DIN/WTA/VOB) · Mindestumfang für Beweisfragen
          </div>
        </div>
      </div>`;

    state.widgetEl = document.getElementById('rp-widget');
    return state.widgetEl;
  }

  // ── Prüflogik ──────────────────────────────────────────────────────
  function pruefeText(text) {
    const hinweise = [];

    if (!text || text.trim().length < CONFIG.MIN_ZEICHEN) {
      return [{
        typ: 'info',
        icon: 'ℹ️',
        titel: 'Text zu kurz für Analyse',
        text: `Mindestens ${CONFIG.MIN_ZEICHEN} Zeichen für eine sinnvolle Prüfung.`
      }];
    }

    // ── CHECK 1: Konjunktiv II ──────────────────────────────────────
    const konjunktivFunde = [];
    INDIKATIV_MUSTER.forEach(function(muster) {
      const treffer = text.match(muster.pattern);
      if (treffer) {
        treffer.slice(0, 2).forEach(function(t) {
          konjunktivFunde.push({ fund: t.trim(), beispiel: muster.beispiel });
        });
      }
    });

    if (konjunktivFunde.length > 0) {
      konjunktivFunde.slice(0, 3).forEach(function(f) {
        hinweise.push({
          typ: 'konjunktiv',
          icon: '⚠️',
          titel: 'Kausalaussage im Indikativ',
          text: `Nach §407a ZPO: Ursachen und Bewertungen im Konjunktiv II formulieren.`,
          fund: `"${f.fund}" → ${f.beispiel}`
        });
      });
      if (konjunktivFunde.length > 3) {
        hinweise.push({
          typ: 'konjunktiv',
          icon: '⚠️',
          titel: `${konjunktivFunde.length - 3} weitere Indikativ-Stellen`,
          text: 'Vollständige Durchsicht empfohlen.'
        });
      }
    }

    // ── CHECK 2: §407a ZPO Erklärung ───────────────────────────────
    const hat407a = PARA407A_PATTERN.test(text);
    if (!hat407a) {
      hinweise.push({
        typ: 'para407',
        icon: '📋',
        titel: '§407a ZPO — Pflichtinhalt nicht erkannt',
        text: 'Gerichtsgutachten erfordern die §407a-Erklärung (persönliche Erstattungspflicht / Übertragung wesentlicher Teile).',
        fund: 'Hinweis: Nur relevant wenn §6 das Fachurteil für ein Gerichtsgutachten enthält'
      });
    }

    // ── CHECK 3: Normzitate ─────────────────────────────────────────
    const normen = text.match(NORM_PATTERN);
    const anzahlNormen = normen ? [...new Set(normen.map(n => n.replace(/\s+/g, ' ').trim()))].length : 0;

    if (anzahlNormen === 0) {
      hinweise.push({
        typ: 'norm',
        icon: '📚',
        titel: 'Keine Normen referenziert',
        text: 'Fachurteile werden durch DIN-, WTA- oder VOB-Normen als Beurteilungsmaßstab gestärkt.'
      });
    }

    // ── CHECK 4: Mindestumfang ──────────────────────────────────────
    const zeichenOhneLeerstellen = text.replace(/\s+/g, '').length;
    if (zeichenOhneLeerstellen < 400) {
      hinweise.push({
        typ: 'info',
        icon: 'ℹ️',
        titel: 'Geringer Textumfang',
        text: `${zeichenOhneLeerstellen} Zeichen (ohne Leerzeichen). Für Beweisfragen typischerweise 400+ Zeichen.`
      });
    }

    // ── Alle Checks bestanden ───────────────────────────────────────
    if (hinweise.length === 0) {
      hinweise.push({
        typ: 'ok',
        icon: '✅',
        titel: 'Keine formalen Auffälligkeiten gefunden',
        text: `${anzahlNormen} Norm${anzahlNormen === 1 ? '' : 'en'} referenziert · Konjunktiv II: ✓ · §407a: ✓`
      });
    }

    return hinweise;
  }

  // ── Ergebnis rendern ───────────────────────────────────────────────
  function renderErgebnis(hinweise) {
    const container = document.getElementById('rp-ergebnis');
    const dot       = document.getElementById('rp-dot');
    const subtitle  = document.getElementById('rp-subtitle');
    if (!container) return;

    const hatAuffaelligkeiten = hinweise.some(h => h.typ !== 'ok' && h.typ !== 'info');

    // Status-Dot
    if (dot) {
      dot.className = 'rp-status-dot ' + (hatAuffaelligkeiten ? 'hinweis' : 'ok');
    }
    if (subtitle) {
      const anzahl = hinweise.filter(h => h.typ !== 'ok').length;
      subtitle.textContent = hatAuffaelligkeiten
        ? `${anzahl} Hinweis${anzahl === 1 ? '' : 'e'} · Geprüft ${new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}`
        : `Keine Auffälligkeiten · ${new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}`;
    }

    container.innerHTML = hinweise.map(function(h) {
      if (h.typ === 'ok') {
        return `<div class="rp-ok"><span>${h.icon}</span><span>${h.titel}</span></div>`;
      }
      return `
        <div class="rp-hinweis ${h.typ}">
          <span class="rp-hinweis-icon">${h.icon}</span>
          <div class="rp-hinweis-body">
            <div class="rp-hinweis-titel">${h.titel}</div>
            <div class="rp-hinweis-text">${h.text}</div>
            ${h.fund ? `<div class="rp-hinweis-fund">${h.fund}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ── Öffentliche API ────────────────────────────────────────────────
  function pruefen() {
    if (state.isChecking) return;
    state.isChecking = true;

    const btn = document.getElementById('rp-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="rp-spin"></span> Prüfe…'; }

    // Body öffnen
    const body = document.getElementById('rp-body');
    if (body) body.classList.add('open');

    // Text aus Textarea holen
    const text = state.zielTextarea
      ? state.zielTextarea.value
      : (document.getElementById('svTextA') || document.getElementById('ki-edit') || {}).value || '';

    // Kurze Verzögerung für UX (fühlt sich nach echtem Check an)
    setTimeout(function() {
      const hinweise = pruefeText(text);
      renderErgebnis(hinweise);
      state.hinweise    = hinweise;
      state.letzterCheck = Date.now();
      state.isChecking   = false;
      if (btn) { btn.disabled = false; btn.innerHTML = 'Erneut prüfen'; }
    }, 600);
  }

  function init(opts) {
    opts = opts || {};
    injectStyles();

    if (opts.containerId) {
      buildWidgetHTML(opts.containerId);
    }
    if (opts.textareaId) {
      state.zielTextarea = document.getElementById(opts.textareaId);
    } else if (opts.textarea) {
      state.zielTextarea = opts.textarea;
    }

    return { pruefen };
  }

  // Globale Hilfsfunktionen (für onclick im HTML)
  window.Rechtspruefung = {
    pruefen,
    init,
    _toggleBody: function() {
      const body = document.getElementById('rp-body');
      if (body) body.classList.toggle('open');
    }
  };

  return { pruefen, init };

})();

if (typeof module !== 'undefined') module.exports = Rechtspruefung;
