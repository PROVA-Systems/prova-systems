/**
 * PROVA Systems — KI-Lernpool
 * Diktat-Lernmodus: KI lernt aus Korrekturen des Sachverständigen
 *
 * Features:
 * - Korrekturen aus Whisper-Transkription speichern (Original → Korrektur)
 * - Lernpool mit Fachvokabular aufbauen (Eigennamen, Fachbegriffe, Abkürzungen)
 * - Korrektur-Vorschläge beim nächsten Diktat einblenden
 * - Statistiken: Lernfortschritt, häufigste Korrekturen
 * - Fachvokabular-Export für Whisper-Prompt (verbessert Transkription)
 * - Team-Sharing: Vokabular mit Team teilen (Team-Paket)
 * - DSGVO: Lokaler Speicher, kein Training auf Servern
 */

'use strict';

const KILernpool = (() => {

  // ── Konfiguration ──────────────────────────────────────────────
  const CONFIG = {
    STORAGE_KEY:     'prova_ki_lernpool',
    VOKABULAR_KEY:   'prova_ki_vokabular',
    MAX_EINTRAEGE:   500,
    MAX_VOKABULAR:   200,
    KONFIDENZ_SCHWELLE: 3,  // Nach 3 Korrekturen → hohes Vertrauen
    VERSION: '1.1'
  };

  // ── Lernmodus-Guard (Session 22) ─────────────────────────────────
  // Respektiert den Toggle aus Einstellungen → KI & Diktat → "KI-Lernmodus".
  // Default: aktiv. Nur wenn User explizit false setzt, werden Write-Operationen
  // blockiert (Lese- und Render-Funktionen bleiben unberührt).
  function lernmodusAktiv() {
    try {
      var s = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
      return s.lernmodus !== false;
    } catch(e) { return true; }
  }

  // ── Kategorie-System ─────────────────────────────────────────────
  const KATEGORIEN = {
    EIGENNAME:     { label: 'Eigenname',       icon: '👤', farbe: '#6366f1' },
    FACHBEGRIFF:   { label: 'Fachbegriff',     icon: '🔬', farbe: '#0891b2' },
    ABKUERZUNG:    { label: 'Abkürzung',        icon: '📝', farbe: '#7c3aed' },
    NORM:          { label: 'Norm / Standard', icon: '📏', farbe: '#0369a1' },
    ADRESSE:       { label: 'Adresse / Ort',   icon: '📍', farbe: '#047857' },
    SONSTIGES:     { label: 'Sonstiges',       icon: '💡', farbe: '#6b7280' }
  };

  // ── Vordefiniertes Bau-Fachvokabular ────────────────────────────
  const STANDARD_VOKABULAR = [
    // Normen
    'DIN 4108', 'DIN 18195', 'DIN 18533', 'DIN EN 1990', 'DIN EN 1991',
    'DIN 68800', 'WTA-Merkblatt', 'EnEV', 'GEG', 'BauONRW', 'VOB',
    // Fachbegriffe
    'Sachverständiger', 'Beweissicherung', 'Ortstermin', 'Schadensbild',
    'Feuchteschaden', 'Schimmelbefall', 'Wärmebrücke', 'Taupunkt',
    'Kondensation', 'Kapillarität', 'Diffusionswiderstand', 'sd-Wert',
    'U-Wert', 'Lambda-Wert', 'Wärmedurchgangskoeffizient', 'Blower-Door',
    'Thermografie', 'Endoskopie', 'Bauteilöffnung', 'Kernbohrung',
    'Aufmaß', 'Leistungsverzeichnis', 'Ausschreibung', 'Abnahme',
    // Rechtliches
    '§407a ZPO', '§411 ZPO', 'JVEG', 'Privatgutachten', 'Gerichtsgutachten',
    'Beweisbeschluss', 'Ergänzungsfragen', 'Obergutachten', 'Schiedsgutachten',
    // Schadenstypen
    'Wasserschaden', 'Brandschaden', 'Sturmschaden', 'Elementarschaden',
    'Bauschaden', 'Baumangel', 'Ausführungsfehler', 'Planungsfehler',
    // Bauteile
    'Außenwand', 'Innenwand', 'Bodenplatte', 'Kellerdecke', 'Dachgeschoss',
    'Flachdach', 'Steildach', 'Abdichtung', 'Dämmung', 'Putz', 'Estrich',
    'Fußbodenaufbau', 'Fensteranschluss', 'Attika', 'Sockel'
  ];

  // ── State ─────────────────────────────────────────────────────────
  let state = {
    korrekturen: [],    // Alle gespeicherten Korrekturen
    vokabular:   [],    // Gelernte + manuelle Vokabeln
    geladen:     false
  };

  // ── CSS ───────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('kl-styles')) return;
    const css = `
      /* PROVA KI-Lernpool Styles */

      .kl-widget {
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 14px;
        overflow: hidden;
        font-size: 13px;
      }
      .kl-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
        color: #fff;
      }
      .kl-header-title {
        font-weight: 600;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kl-header-stats {
        font-size: 11px;
        opacity: 0.85;
        display: flex;
        gap: 10px;
      }
      .kl-header-stat { display: flex; align-items: center; gap: 3px; }

      .kl-body { padding: 14px; }

      /* Diktat-Korrektur Panel */
      .kl-korrektur-panel {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 14px;
      }
      .kl-korrektur-title {
        font-size: 11.5px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .kl-diff-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .kl-diff-original {
        flex: 1;
        padding: 6px 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 12px;
        color: #991b1b;
        text-decoration: line-through;
        font-style: italic;
      }
      .kl-diff-arrow { font-size: 14px; color: #6b7280; flex-shrink: 0; }
      .kl-diff-korrektur {
        flex: 1;
        padding: 6px 10px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        font-size: 12px;
        color: #065f46;
        font-weight: 500;
      }

      /* Korrektur-Eingabe */
      .kl-korrektur-form {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .kl-korrektur-input {
        flex: 1;
        padding: 7px 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 12.5px;
        color: #111827;
        background: #fff;
        font-family: inherit;
      }
      .kl-korrektur-input:focus {
        outline: none;
        border-color: #7c3aed;
        box-shadow: 0 0 0 2px rgba(124,58,237,0.1);
      }
      .kl-korrektur-btn {
        padding: 7px 14px;
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        font-family: inherit;
        white-space: nowrap;
      }
      .kl-korrektur-btn:hover { background: #6d28d9; }

      /* Vokabular-Liste */
      .kl-vokabular-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .kl-vokabular-title {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .kl-vokabular-add {
        font-size: 11px;
        padding: 4px 10px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 7px;
        cursor: pointer;
        color: #374151;
        font-weight: 500;
        font-family: inherit;
        transition: background 0.1s;
      }
      .kl-vokabular-add:hover { background: #e5e7eb; }

      .kl-vokabular-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 10px;
        max-height: 120px;
        overflow-y: auto;
        padding: 4px 0;
      }
      .kl-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 9px;
        border-radius: 12px;
        font-size: 11.5px;
        font-weight: 500;
        cursor: default;
        transition: opacity 0.1s;
        border: 1px solid transparent;
      }
      .kl-tag:hover { opacity: 0.8; }
      .kl-tag-remove {
        font-size: 10px;
        opacity: 0.6;
        cursor: pointer;
        padding: 0 1px;
      }
      .kl-tag-remove:hover { opacity: 1; }
      .kl-tag.konfidenz-hoch { border-style: solid; }
      .kl-tag.neu { opacity: 0.7; }

      /* Neue Vokabel hinzufügen */
      .kl-add-form {
        display: none;
        gap: 6px;
        margin-bottom: 10px;
        align-items: flex-end;
      }
      .kl-add-form.sichtbar { display: flex; }
      .kl-add-inputs { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .kl-add-input {
        padding: 6px 10px;
        border: 1px solid #d1d5db;
        border-radius: 7px;
        font-size: 12px;
        color: #111827;
        background: #fff;
        font-family: inherit;
      }
      .kl-add-input:focus {
        outline: none;
        border-color: #7c3aed;
      }
      .kl-add-select {
        padding: 5px 8px;
        border: 1px solid #d1d5db;
        border-radius: 7px;
        font-size: 12px;
        background: #fff;
        font-family: inherit;
      }
      .kl-add-btn {
        padding: 6px 14px;
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        white-space: nowrap;
        align-self: flex-end;
      }

      /* Korrekturen-Historie */
      .kl-historie {
        border-top: 1px solid #f3f4f6;
        padding-top: 12px;
        margin-top: 10px;
      }
      .kl-historie-title {
        font-size: 11.5px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
      }
      .kl-historie-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        border-bottom: 1px solid #f9fafb;
        font-size: 12px;
      }
      .kl-historie-item:last-child { border-bottom: none; }
      .kl-historie-original { color: #9ca3af; text-decoration: line-through; flex: 1; }
      .kl-historie-arrow { color: #d1d5db; flex-shrink: 0; }
      .kl-historie-korrektur { color: #111827; font-weight: 500; flex: 1; }
      .kl-historie-count {
        font-size: 10px;
        background: #f3f4f6;
        padding: 1px 6px;
        border-radius: 8px;
        color: #6b7280;
        flex-shrink: 0;
      }

      /* Fortschritts-Stats */
      .kl-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      .kl-stat-card {
        background: #f9fafb;
        border-radius: 8px;
        padding: 8px 10px;
        text-align: center;
      }
      .kl-stat-value {
        font-size: 18px;
        font-weight: 700;
        color: #7c3aed;
        line-height: 1;
        margin-bottom: 2px;
      }
      .kl-stat-label { font-size: 10px; color: #9ca3af; font-weight: 500; }

      /* Prompt-Vorschau */
      .kl-prompt-vorschau {
        background: #1f2937;
        border-radius: 8px;
        padding: 10px 12px;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 11px;
        color: #d1fae5;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 80px;
        overflow-y: auto;
        margin-bottom: 10px;
      }

      /* Export-Buttons */
      .kl-export-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .kl-export-btn {
        flex: 1;
        min-width: 100px;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        color: #374151;
        transition: background 0.1s;
        text-align: center;
        font-family: inherit;
      }
      .kl-export-btn:hover { background: #f3f4f6; }
      .kl-export-btn.primary { background: #7c3aed; color: #fff; border-color: #7c3aed; }
      .kl-export-btn.primary:hover { background: #6d28d9; }

      /* Inline-Korrektur (im Diktat-Text) */
      .kl-inline-suggestion {
        position: relative;
        display: inline;
        cursor: pointer;
      }
      .kl-inline-suggestion mark {
        background: rgba(124,58,237,0.12);
        border-bottom: 2px solid #7c3aed;
        border-radius: 2px;
        padding: 0 1px;
        cursor: pointer;
      }
      .kl-inline-tooltip {
        position: absolute;
        bottom: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: #fff;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 6px;
        white-space: nowrap;
        z-index: 100;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s;
      }
      .kl-inline-suggestion:hover .kl-inline-tooltip { opacity: 1; }
      .kl-inline-suggestion:hover mark { background: rgba(124,58,237,0.25); }
    `;
    const el = document.createElement('style');
    el.id = 'kl-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── Daten laden ───────────────────────────────────────────────────
  function laden() {
    if (state.geladen) return;
    try {
      const k = localStorage.getItem(CONFIG.STORAGE_KEY);
      state.korrekturen = k ? JSON.parse(k) : [];
    } catch (e) { state.korrekturen = []; }
    try {
      const v = localStorage.getItem(CONFIG.VOKABULAR_KEY);
      state.vokabular = v ? JSON.parse(v) : [];
    } catch (e) { state.vokabular = []; }

    // Standard-Vokabular einmalig initialisieren
    if (state.vokabular.length === 0) {
      state.vokabular = STANDARD_VOKABULAR.map(w => ({
        id:        'std_' + w.replace(/\s/g, '_'),
        wort:      w,
        kategorie: erkenneKategorie(w),
        konfidenz: 5,
        standard:  true,
        erstellt:  new Date().toISOString()
      }));
      speichereVokabular();
    }
    state.geladen = true;
  }

  function speichereKorrekturen() {
    try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.korrekturen.slice(-CONFIG.MAX_EINTRAEGE))); } catch (e) {}
  }

  function speichereVokabular() {
    try { localStorage.setItem(CONFIG.VOKABULAR_KEY, JSON.stringify(state.vokabular.slice(-CONFIG.MAX_VOKABULAR))); } catch (e) {}
  }

  // ── Kategorie automatisch erkennen ───────────────────────────────
  function erkenneKategorie(wort) {
    if (/^DIN|^EN |^ISO|^VOB|^GEG|^EnEV|§/.test(wort))   return 'NORM';
    if (/^[A-Z][a-z]/.test(wort) && wort.split(' ').every(w => /^[A-Z]/.test(w))) return 'EIGENNAME';
    if (/[A-Z]{2,}$|^[A-Z]{2,}/.test(wort))               return 'ABKUERZUNG';
    if (/straße|weg|platz|gasse|\d{5}/i.test(wort))        return 'ADRESSE';
    return 'FACHBEGRIFF';
  }

  // ── Korrektur speichern ───────────────────────────────────────────
  function korrekturSpeichern(original, korrektur, kontext = '') {
    if (!lernmodusAktiv()) return false;
    laden();
    if (!original || !korrektur || original === korrektur) return false;

    // Bestehende Korrektur suchen
    const existing = state.korrekturen.find(k =>
      k.original.toLowerCase() === original.toLowerCase()
    );

    if (existing) {
      // Update: Häufigkeit erhöhen
      existing.korrektur  = korrektur; // Neueste gewinnt
      existing.haeufigkeit = (existing.haeufigkeit || 1) + 1;
      existing.zuletzt    = new Date().toISOString();
    } else {
      state.korrekturen.push({
        id:          `k_${Date.now()}`,
        original:    original.trim(),
        korrektur:   korrektur.trim(),
        haeufigkeit: 1,
        kontext:     kontext.substring(0, 100),
        erstellt:    new Date().toISOString(),
        zuletzt:     new Date().toISOString()
      });
    }

    speichereKorrekturen();

    // Nach CONFIG.KONFIDENZ_SCHWELLE Korrekturen → ins Vokabular
    const k = state.korrekturen.find(k => k.original.toLowerCase() === original.toLowerCase());
    if (k && k.haeufigkeit >= CONFIG.KONFIDENZ_SCHWELLE) {
      vokabularHinzufuegen(k.korrektur);
    }

    return true;
  }

  // ── Vokabular verwalten ───────────────────────────────────────────
  function vokabularHinzufuegen(wort, kategorie = null, manuell = false) {
    // Session 22: Automatisches Lernen nur wenn Lernmodus aktiv.
    // Manuelle Einträge (Button „Hinzufügen") bleiben immer erlaubt.
    if (!manuell && !lernmodusAktiv()) return false;
    laden();
    const normiert = wort.trim();
    if (!normiert) return false;
    if (state.vokabular.some(v => v.wort.toLowerCase() === normiert.toLowerCase())) return false;
    if (state.vokabular.length >= CONFIG.MAX_VOKABULAR) {
      // Älteste nicht-Standard-Einträge entfernen
      const idx = state.vokabular.findIndex(v => !v.standard);
      if (idx !== -1) state.vokabular.splice(idx, 1);
    }

    state.vokabular.push({
      id:        `v_${Date.now()}`,
      wort:      normiert,
      kategorie: kategorie || erkenneKategorie(normiert),
      konfidenz: manuell ? CONFIG.KONFIDENZ_SCHWELLE : 1,
      standard:  false,
      erstellt:  new Date().toISOString()
    });
    speichereVokabular();
    return true;
  }

  function vokabularEntfernen(vokabularId) {
    laden();
    state.vokabular = state.vokabular.filter(v => v.id !== vokabularId);
    speichereVokabular();
  }

  // ── Whisper-Prompt generieren ─────────────────────────────────────
  function generiereWhisperPrompt(schadenart = '') {
    laden();
    // Hochkonfidente Vokabeln für Prompt nutzen
    const konfident = state.vokabular
      .filter(v => v.konfidenz >= CONFIG.KONFIDENZ_SCHWELLE)
      .map(v => v.wort)
      .slice(0, 80); // Whisper-Prompt-Limit beachten

    const basis = [
      'Sachverständiger', 'Gutachten', 'Ortstermin', 'Beweissicherung',
      'DIN-Norm', 'Schadensbild', 'JVEG', '§407a ZPO'
    ];
    if (schadenart) basis.push(schadenart);

    const alle = [...new Set([...basis, ...konfident])];
    return alle.join(', ');
  }

  // ── Text-Korrekturen vorschlagen (für Diktat-Textarea) ────────────
  function schlagoKorrekturenVor(text) {
    laden();
    if (!text) return [];
    const vorschlaege = [];

    state.korrekturen.forEach(k => {
      const regex = new RegExp(`\\b${k.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        vorschlaege.push({
          original:  match[0],
          korrektur: k.korrektur,
          position:  match.index,
          haeufigkeit: k.haeufigkeit
        });
      }
    });

    return vorschlaege;
  }

  // ── Text automatisch korrigieren ─────────────────────────────────
  function autoKorrigiere(text) {
    laden();
    let korrigiert = text;
    let anzahl = 0;

    // Nur hochkonfidente Korrekturen (>= SCHWELLE)
    state.korrekturen
      .filter(k => k.haeufigkeit >= CONFIG.KONFIDENZ_SCHWELLE)
      .forEach(k => {
        const regex = new RegExp(`\\b${k.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const vorher = korrigiert;
        korrigiert = korrigiert.replace(regex, k.korrektur);
        if (korrigiert !== vorher) anzahl++;
      });

    return { text: korrigiert, anzahl };
  }

  // ── Diff zwischen Original und Korrektur berechnen ───────────────
  function berechneDiff(original, korrigiert) {
    const origWorte  = original.split(/\s+/);
    const korrWorte  = korrigiert.split(/\s+/);
    const aenderungen = [];

    const lcs = buildLCS(origWorte, korrWorte);
    let i = 0, j = 0, k = 0;

    while (i < origWorte.length || j < korrWorte.length) {
      if (k < lcs.length && i < origWorte.length && j < korrWorte.length &&
          origWorte[i] === lcs[k] && korrWorte[j] === lcs[k]) {
        i++; j++; k++;
      } else if (j < korrWorte.length && (k >= lcs.length || korrWorte[j] !== lcs[k])) {
        aenderungen.push({ typ: 'hinzugefuegt', wort: korrWorte[j], pos: j });
        j++;
      } else if (i < origWorte.length && (k >= lcs.length || origWorte[i] !== lcs[k])) {
        aenderungen.push({ typ: 'entfernt', wort: origWorte[i], pos: i });
        i++;
      } else { i++; j++; k++; }
    }

    return aenderungen;
  }

  function buildLCS(a, b) {
    const m = Math.min(a.length, 50); // Performance-Limit
    const n = Math.min(b.length, 50);
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i-1] === b[j-1]) { lcs.unshift(a[i-1]); i--; j--; }
      else if (dp[i-1][j] > dp[i][j-1]) i--;
      else j--;
    }
    return lcs;
  }

  // ── Widget rendern ─────────────────────────────────────────────────
  function renderWidget(containerId, opts = {}) {
    laden();
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = berechneStats();
    const prompt = generiereWhisperPrompt(opts.schadenart);
    const topKorrekturen = [...state.korrekturen]
      .sort((a, b) => b.haeufigkeit - a.haeufigkeit)
      .slice(0, 5);

    const userVokabular = state.vokabular.filter(v => !v.standard);
    const hochkonfident = state.vokabular.filter(v => v.konfidenz >= CONFIG.KONFIDENZ_SCHWELLE);

    container.innerHTML = `
      <div class="kl-widget">
        <div class="kl-header">
          <div class="kl-header-title">🧠 KI-Lernpool</div>
          <div class="kl-header-stats">
            <div class="kl-header-stat">📚 ${stats.vokabularGelernt} Wörter</div>
            <div class="kl-header-stat">✏️ ${stats.korrekturen} Korrekturen</div>
          </div>
        </div>
        <div class="kl-body">

          <!-- Stats -->
          <div class="kl-stats-grid">
            <div class="kl-stat-card">
              <div class="kl-stat-value">${stats.vokabularGelernt}</div>
              <div class="kl-stat-label">Gelernte Wörter</div>
            </div>
            <div class="kl-stat-card">
              <div class="kl-stat-value">${stats.korrekturen}</div>
              <div class="kl-stat-label">Korrekturen</div>
            </div>
            <div class="kl-stat-card">
              <div class="kl-stat-value">${stats.verbesserungsRate}%</div>
              <div class="kl-stat-label">Konfidenz</div>
            </div>
          </div>

          <!-- Korrektur Eingabe -->
          <div class="kl-korrektur-panel">
            <div class="kl-korrektur-title">✏️ Neue Korrektur hinzufügen</div>
            <div class="kl-diff-row">
              <input class="kl-diff-original kl-korrektur-input"
                     id="kl-input-original"
                     placeholder="Falsch erkannt (z.B. »sacherständiger«)" />
              <span class="kl-diff-arrow">→</span>
              <input class="kl-diff-korrektur kl-korrektur-input"
                     id="kl-input-korrektur"
                     placeholder="Richtig (z.B. »Sachverständiger«)" />
            </div>
            <div style="text-align:right;margin-top:6px">
              <button class="kl-korrektur-btn" onclick="KILernpool._korrekturEingabe()">
                💾 Korrektur speichern
              </button>
            </div>
          </div>

          <!-- Gelerntes Vokabular -->
          <div class="kl-vokabular-header">
            <div class="kl-vokabular-title">🏷️ Mein Fachvokabular</div>
            <button class="kl-vokabular-add" onclick="KILernpool._toggleAddForm()">
              + Hinzufügen
            </button>
          </div>

          <!-- Neue Vokabel Form -->
          <div class="kl-add-form" id="kl-add-form">
            <div class="kl-add-inputs">
              <input class="kl-add-input" id="kl-add-wort" placeholder="Fachbegriff eingeben …" />
              <select class="kl-add-select" id="kl-add-kategorie">
                ${Object.entries(KATEGORIEN).map(([k, v]) =>
                  `<option value="${k}">${v.icon} ${v.label}</option>`
                ).join('')}
              </select>
            </div>
            <button class="kl-add-btn" onclick="KILernpool._addVokabel()">+</button>
          </div>

          <!-- Tags -->
          <div class="kl-vokabular-tags" id="kl-vokabular-tags">
            ${userVokabular.length === 0
              ? '<span style="font-size:11px;color:#9ca3af;padding:4px">Noch keine benutzerdefinierten Einträge. KI lernt aus deinen Diktat-Korrekturen automatisch.</span>'
              : userVokabular.map(v => renderTag(v)).join('')
            }
          </div>

          <!-- Häufige Korrekturen -->
          ${topKorrekturen.length > 0 ? `
            <div class="kl-historie">
              <div class="kl-historie-title">📊 Häufigste Korrekturen</div>
              ${topKorrekturen.map(k => `
                <div class="kl-historie-item">
                  <span class="kl-historie-original">${k.original}</span>
                  <span class="kl-historie-arrow">→</span>
                  <span class="kl-historie-korrektur">${k.korrektur}</span>
                  <span class="kl-historie-count">${k.haeufigkeit}×</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Whisper-Prompt Vorschau -->
          <div style="margin-top:14px">
            <div style="font-size:11.5px;font-weight:600;color:#374151;margin-bottom:6px;display:flex;align-items:center;gap:5px">
              🎙️ Whisper-Fachvokabular-Prompt
              <span style="font-size:10px;color:#9ca3af;font-weight:400">(${hochkonfident.length} Wörter)</span>
            </div>
            <div class="kl-prompt-vorschau" id="kl-prompt-vorschau">${prompt}</div>
          </div>

          <!-- Export -->
          <div class="kl-export-row">
            <button class="kl-export-btn primary" onclick="KILernpool.exportPrompt()">
              📋 Prompt kopieren
            </button>
            <button class="kl-export-btn" onclick="KILernpool.exportJSON()">
              ⬇️ Export JSON
            </button>
            <button class="kl-export-btn" onclick="KILernpool.importJSON()">
              ⬆️ Import
            </button>
          </div>

        </div>
      </div>
    `;
  }

  function renderTag(v) {
    const kat   = KATEGORIEN[v.kategorie] || KATEGORIEN.SONSTIGES;
    const style = `background:${kat.farbe}18;color:${kat.farbe};border-color:${kat.farbe}30`;
    const klasse = v.konfidenz >= CONFIG.KONFIDENZ_SCHWELLE ? 'konfidenz-hoch' : 'neu';
    return `
      <span class="kl-tag ${klasse}" style="${style}" title="${kat.label}">
        ${kat.icon} ${v.wort}
        ${!v.standard ? `<span class="kl-tag-remove" onclick="KILernpool._tagEntfernen('${v.id}')">×</span>` : ''}
      </span>`;
  }

  // ── Benutzer-Aktionen ─────────────────────────────────────────────
  function _korrekturEingabe() {
    const original  = document.getElementById('kl-input-original')?.value.trim();
    const korrektur = document.getElementById('kl-input-korrektur')?.value.trim();
    if (!original || !korrektur) { alert('Bitte beide Felder ausfüllen.'); return; }

    korrekturSpeichern(original, korrektur);

    // Eingaben leeren
    document.getElementById('kl-input-original').value  = '';
    document.getElementById('kl-input-korrektur').value = '';

    // Feedback
    const btn = document.querySelector('.kl-korrektur-btn');
    if (btn) {
      btn.textContent = '✅ Gespeichert!';
      setTimeout(() => { btn.textContent = '💾 Korrektur speichern'; }, 2000);
    }

    // Tags neu rendern
    _aktualisiereTags();
  }

  function _toggleAddForm() {
    const form = document.getElementById('kl-add-form');
    if (!form) return;
    form.classList.toggle('sichtbar');
    if (form.classList.contains('sichtbar')) {
      document.getElementById('kl-add-wort')?.focus();
    }
  }

  function _addVokabel() {
    const wort      = document.getElementById('kl-add-wort')?.value.trim();
    const kategorie = document.getElementById('kl-add-kategorie')?.value;
    if (!wort) { alert('Bitte einen Begriff eingeben.'); return; }

    const ok = vokabularHinzufuegen(wort, kategorie, true);
    if (!ok) { alert(`"${wort}" ist bereits im Vokabular.`); return; }

    document.getElementById('kl-add-wort').value = '';
    document.getElementById('kl-add-form').classList.remove('sichtbar');
    _aktualisiereTags();
    _aktualisierePrompt();
  }

  function _tagEntfernen(vokabularId) {
    vokabularEntfernen(vokabularId);
    _aktualisiereTags();
    _aktualisierePrompt();
  }

  function _aktualisiereTags() {
    const container = document.getElementById('kl-vokabular-tags');
    if (!container) return;
    const userVokabular = state.vokabular.filter(v => !v.standard);
    container.innerHTML = userVokabular.length === 0
      ? '<span style="font-size:11px;color:#9ca3af;padding:4px">Noch keine benutzerdefinierten Einträge.</span>'
      : userVokabular.map(v => renderTag(v)).join('');
  }

  function _aktualisierePrompt() {
    const el = document.getElementById('kl-prompt-vorschau');
    if (el) el.textContent = generiereWhisperPrompt();
  }

  // ── Stats berechnen ───────────────────────────────────────────────
  function berechneStats() {
    laden();
    const gelernt    = state.vokabular.filter(v => !v.standard).length;
    const korrAnzahl = state.korrekturen.length;
    const hochkonfident = state.korrekturen.filter(k => k.haeufigkeit >= CONFIG.KONFIDENZ_SCHWELLE).length;
    const rate = korrAnzahl > 0 ? Math.round(hochkonfident / korrAnzahl * 100) : 0;

    return {
      vokabularGelernt: gelernt,
      korrekturen:      korrAnzahl,
      hochkonfident,
      verbesserungsRate: rate
    };
  }

  // ── Export / Import ───────────────────────────────────────────────
  function exportPrompt(schadenart = '') {
    const prompt = generiereWhisperPrompt(schadenart);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(() => {
        alert('✅ Whisper-Prompt in Zwischenablage kopiert!');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('✅ Kopiert!');
    }
  }

  function exportJSON() {
    laden();
    const data = {
      version: CONFIG.VERSION,
      exportiert: new Date().toISOString(),
      korrekturen: state.korrekturen,
      vokabular: state.vokabular.filter(v => !v.standard)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `PROVA-KI-Lernpool-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          let importiert = 0;

          (data.korrekturen || []).forEach(k => {
            if (k.original && k.korrektur && !state.korrekturen.find(x => x.id === k.id)) {
              state.korrekturen.push(k);
              importiert++;
            }
          });
          (data.vokabular || []).forEach(v => {
            if (v.wort && !state.vokabular.find(x => x.id === v.id)) {
              state.vokabular.push(v);
              importiert++;
            }
          });

          speichereKorrekturen();
          speichereVokabular();
          alert(`✅ ${importiert} Einträge importiert.`);
          _aktualisiereTags();
          _aktualisierePrompt();
        } catch (err) {
          alert('Import fehlgeschlagen: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Diktat-Integration: Korrekturen aus Diff lernen ──────────────
  function lernAusDiff(originalText, korrigiertText) {
    if (!lernmodusAktiv()) return 0;
    if (!originalText || !korrigiertText) return 0;
    const aenderungen = berechneDiff(originalText, korrigiertText);
    let gelernt = 0;

    // Einfache Wort-für-Wort Korrekturen extrahieren
    const origWorte = originalText.split(/\s+/);
    const korrWorte = korrigiertText.split(/\s+/);

    for (let i = 0; i < Math.min(origWorte.length, korrWorte.length); i++) {
      if (origWorte[i] !== korrWorte[i] &&
          origWorte[i].length > 2 && korrWorte[i].length > 2) {
        korrekturSpeichern(origWorte[i], korrWorte[i],
          origWorte.slice(Math.max(0, i-2), i+3).join(' ')
        );
        gelernt++;
      }
    }
    return gelernt;
  }

  // ── Öffentliche API ───────────────────────────────────────────────
  return {
    laden,
    korrekturSpeichern,
    vokabularHinzufuegen,
    vokabularEntfernen,
    generiereWhisperPrompt,
    schlagoKorrekturenVor,
    autoKorrigiere,
    lernAusDiff,
    berechneStats,
    renderWidget,
    exportPrompt,
    exportJSON,
    importJSON,
    _korrekturEingabe,
    _toggleAddForm,
    _addVokabel,
    _tagEntfernen,
    _aktualisiereTags,
    _aktualisierePrompt,
    get korrekturen() { laden(); return state.korrekturen; },
    get vokabular()   { laden(); return state.vokabular;   },
    get whisperPrompt() { return generiereWhisperPrompt(); }
  };

})();

if (typeof module !== 'undefined') module.exports = KILernpool;