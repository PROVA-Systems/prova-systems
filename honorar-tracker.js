/**
 * PROVA Systems — Honorar-Tracker
 * Dashboard-Widget: Offene Rechnungen & Umsatz-KPIs
 *
 * Features:
 * - KPI-Cards: Offen, Überfällig, Monatsumsatz, Jahresumsatz
 * - Offene Rechnungen Liste mit Ampel-Status
 * - Mahnfrist-Tracking (30/60/90 Tage Stufen)
 * - JVEG-Honorar vs. Privatgutachten unterscheiden
 * - Schnell-Aktionen: Mahnung senden, PDF öffnen, als bezahlt markieren
 * - Diagramm: Monatsumsatz der letzten 6 Monate (pure CSS, kein Chart.js)
 * - Export: Offene Posten Liste als CSV
 */

'use strict';

const HonorarTracker = (() => {

  // ── Konfiguration ──────────────────────────────────────────────
  const CONFIG = {
    FAELLIG_TAGE_ERSTE:  30,  // Erste Mahnung
    FAELLIG_TAGE_ZWEITE: 60,  // Zweite Mahnung
    FAELLIG_TAGE_DRITTE: 90,  // Dritte Mahnung / Inkasso
    STORAGE_KEY: 'prova_honorar_cache',
    WAEHRUNG: 'EUR',
    VERSION: '1.0'
  };

  // ── Rechnungs-Status ────────────────────────────────────────────
  const STATUS = {
    OFFEN:       { label: 'Offen',        farbe: '#f59e0b', icon: '📄', klasse: 'offen'     },
    UEBERFAELLIG:{ label: 'Überfällig',   farbe: '#ef4444', icon: '🔴', klasse: 'ueberfaellig'},
    MAHNUNG_1:   { label: '1. Mahnung',   farbe: '#f97316', icon: '⚠️', klasse: 'mahnung'   },
    MAHNUNG_2:   { label: '2. Mahnung',   farbe: '#dc2626', icon: '🚨', klasse: 'mahnung2'  },
    MAHNUNG_3:   { label: '3. Mahnung',   farbe: '#7f1d1d', icon: '🆘', klasse: 'mahnung3'  },
    BEZAHLT:     { label: 'Bezahlt',      farbe: '#10b981', icon: '✅', klasse: 'bezahlt'   },
    STORNIERT:   { label: 'Storniert',    farbe: '#9ca3af', icon: '❌', klasse: 'storniert' }
  };

  // ── State ───────────────────────────────────────────────────────
  let state = {
    rechnungen:   [],
    geladen:      false,
    letzterCheck: null
  };

  // ── CSS ─────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ht-styles')) return;
    const css = `
      /* PROVA Honorar-Tracker */

      /* KPI-Grid */
      .ht-kpi-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      @media (min-width: 900px) {
        .ht-kpi-grid { grid-template-columns: repeat(4, 1fr); }
      }
      .ht-kpi-card {
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 12px;
        padding: 14px 16px;
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.15s;
      }
      .ht-kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
      .ht-kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: var(--ht-accent, #1a56db);
        border-radius: 12px 12px 0 0;
      }
      .ht-kpi-card.rot  { --ht-accent: #ef4444; }
      .ht-kpi-card.gelb { --ht-accent: #f59e0b; }
      .ht-kpi-card.gruen { --ht-accent: #10b981; }
      .ht-kpi-card.blau  { --ht-accent: #1a56db; }

      .ht-kpi-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted, #9ca3af);
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .ht-kpi-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-primary, #111827);
        letter-spacing: -0.02em;
        line-height: 1;
        margin-bottom: 4px;
      }
      .ht-kpi-value.gross { font-size: 26px; }
      .ht-kpi-sub {
        font-size: 11px;
        color: var(--text-muted, #9ca3af);
      }
      .ht-kpi-sub.positiv { color: #10b981; font-weight: 600; }
      .ht-kpi-sub.negativ { color: #ef4444; font-weight: 600; }

      /* Rechnungen-Liste */
      .ht-liste-container {
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 16px;
      }
      .ht-liste-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border, #e5e7eb);
        background: var(--bg-muted, #f9fafb);
      }
      .ht-liste-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #111827);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ht-liste-actions { display: flex; gap: 6px; }
      .ht-btn {
        font-size: 12px;
        padding: 5px 12px;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid var(--border, #e5e7eb);
        background: var(--bg-card, #fff);
        color: var(--text-secondary, #374151);
        font-weight: 500;
        transition: all 0.15s;
        font-family: inherit;
      }
      .ht-btn:hover { background: var(--bg-muted, #f3f4f6); }
      .ht-btn.primary { background: #1a56db; color: #fff; border-color: #1a56db; }
      .ht-btn.primary:hover { background: #1d4ed8; }
      .ht-btn.danger { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
      .ht-btn.danger:hover { background: #fee2e2; }

      /* Filter-Tabs */
      .ht-filter-tabs {
        display: flex;
        gap: 2px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border, #f3f4f6);
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .ht-filter-tabs::-webkit-scrollbar { display: none; }
      .ht-filter-tab {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--text-muted, #9ca3af);
        white-space: nowrap;
        transition: all 0.15s;
        font-family: inherit;
      }
      .ht-filter-tab:hover { background: var(--bg-muted, #f3f4f6); color: var(--text-secondary, #374151); }
      .ht-filter-tab.aktiv { background: #1a56db; color: #fff; }

      /* Rechnungs-Zeile */
      .ht-rechnung {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border-light, #f3f4f6);
        transition: background 0.1s;
        cursor: pointer;
      }
      .ht-rechnung:last-child { border-bottom: none; }
      .ht-rechnung:hover { background: var(--bg-hover, #f9fafb); }
      .ht-rechnung.ueberfaellig { background: #fff9f9; }
      .ht-rechnung.ueberfaellig:hover { background: #fef2f2; }

      .ht-rechnung-status-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .ht-rechnung-info { flex: 1; min-width: 0; }
      .ht-rechnung-titel {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #111827);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ht-rechnung-meta {
        font-size: 11px;
        color: var(--text-muted, #6b7280);
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
      }
      .ht-rechnung-nr {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10.5px;
        background: var(--bg-muted, #f3f4f6);
        padding: 1px 6px;
        border-radius: 4px;
      }

      .ht-rechnung-betrag {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-primary, #111827);
        text-align: right;
        flex-shrink: 0;
        min-width: 72px;
      }
      .ht-rechnung-betrag.ueberfaellig { color: #ef4444; }

      .ht-rechnung-status-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .ht-rechnung-status-badge.offen      { background: #fffbeb; color: #d97706; }
      .ht-rechnung-status-badge.ueberfaellig { background: #fef2f2; color: #ef4444; }
      .ht-rechnung-status-badge.mahnung    { background: #fff7ed; color: #f97316; }
      .ht-rechnung-status-badge.mahnung2   { background: #fef2f2; color: #dc2626; }
      .ht-rechnung-status-badge.mahnung3   { background: #450a0a; color: #fca5a5; }
      .ht-rechnung-status-badge.bezahlt    { background: #f0fdf4; color: #10b981; }
      .ht-rechnung-status-badge.storniert  { background: #f9fafb; color: #9ca3af; }

      /* Umsatz-Diagramm (Pure CSS Bars) */
      .ht-chart-container {
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .ht-chart-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary, #111827);
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ht-chart {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 80px;
      }
      .ht-chart-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        height: 100%;
        justify-content: flex-end;
      }
      .ht-chart-bar-wrap {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .ht-chart-bar {
        width: 80%;
        min-height: 4px;
        border-radius: 4px 4px 0 0;
        background: #1a56db;
        transition: height 0.6s ease;
        position: relative;
        cursor: pointer;
      }
      .ht-chart-bar.aktiv { background: #3b82f6; }
      .ht-chart-bar:hover { opacity: 0.8; }
      .ht-chart-bar-tip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: #fff;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 7px;
        border-radius: 5px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s;
        margin-bottom: 4px;
      }
      .ht-chart-bar:hover .ht-chart-bar-tip { opacity: 1; }
      .ht-chart-label {
        font-size: 10px;
        color: var(--text-muted, #9ca3af);
        text-align: center;
        font-weight: 500;
      }
      .ht-chart-label.aktiv { color: #1a56db; font-weight: 700; }

      /* Schnell-Aktion Dropdown */
      .ht-action-menu {
        position: relative;
        display: inline-block;
      }
      .ht-action-menu-list {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        min-width: 180px;
        z-index: 100;
        overflow: hidden;
        display: none;
      }
      .ht-action-menu-list.offen { display: block; animation: fg-fade-in 0.15s ease; }
      .ht-action-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        font-size: 12.5px;
        color: #374151;
        cursor: pointer;
        transition: background 0.1s;
      }
      .ht-action-menu-item:hover { background: #f9fafb; }
      .ht-action-menu-item.danger { color: #ef4444; }
      .ht-action-menu-divider { height: 1px; background: #f3f4f6; margin: 2px 0; }

      /* Leer + Loading */
      .ht-leer {
        text-align: center;
        padding: 40px 16px;
        color: #6b7280;
      }
      .ht-leer-icon { font-size: 40px; margin-bottom: 8px; }
      .ht-leer-text { font-size: 13px; }
      .ht-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 20px 16px;
        color: #6b7280;
        font-size: 13px;
      }
      .ht-loading-spinner {
        width: 16px; height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #1a56db;
        border-radius: 50%;
        animation: ht-spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes ht-spin { to { transform: rotate(360deg); } }

      /* Responsive */
      @media (max-width: 640px) {
        .ht-rechnung-nr { display: none; }
        .ht-rechnung-meta { gap: 4px; }
        .ht-kpi-value { font-size: 18px; }
        .ht-kpi-value.gross { font-size: 20px; }
      }
    `;
    const el = document.createElement('style');
    el.id = 'ht-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── Rechnungen laden ────────────────────────────────────────────
  async function ladeRechnungen(forceFresh = false) {
    if (!forceFresh && state.geladen) return state.rechnungen;

    // Cache
    const cached = ladeAusCache();

    try {
      const svEmail = localStorage.getItem('prova_sv_email') || '';
      if (!svEmail) return cached;

      const resp = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          method: 'GET',
          path: '/v0/appJ7bLlAHZoxENWE/tblF6MS7uiFAJDjiT?filterByFormula=' + encodeURIComponent('{sv_email}"' + svEmail + '"') + '&sort[0][field]=rechnungsdatum&sort[0][direction]=desc&fields[]=Rechnungsnummer&fields[]=empfaenger_name&fields[]=brutto_betrag_eur&fields[]=netto_betrag_eur&fields[]=rechnungsdatum&fields[]=faellig_am&fields[]=Status&fields[]=aktenzeichen&fields[]=mahnstufe&fields[]=mahngebuehren_eur&fields[]=Rechnungstyp&fields[]=sv_email'
        })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data   = await resp.json();
      const liste  = (data.records || []).map(normalisiereRechnung);

      state.rechnungen = liste;
      state.geladen    = true;
      state.letzterCheck = Date.now();
      speichereInCache(liste);
      return liste;

    } catch (err) {
      console.warn('[HonorarTracker] Airtable Fehler:', err.message);
      return cached;
    }
  }

  function normalisiereRechnung(record) {
    const f     = record.fields || {};
    const heute = new Date(); heute.setHours(0,0,0,0);
    const datum  = f.rechnungsdatum   ? new Date(f.rechnungsdatum)    : null;
    const faellig = f.faellig_am ? new Date(f.faellig_am) : null;

    const tageOffen = faellig
      ? Math.round((heute - faellig) / 86400000)
      : null;

    // Status bestimmen
    let statusKey = (f.Status || 'OFFEN').toUpperCase().replace(/ /g, '_');
    if (statusKey === 'OFFEN' && tageOffen !== null) {
      if      (tageOffen >= CONFIG.FAELLIG_TAGE_DRITTE) statusKey = 'MAHNUNG_3';
      else if (tageOffen >= CONFIG.FAELLIG_TAGE_ZWEITE) statusKey = 'MAHNUNG_2';
      else if (tageOffen >= CONFIG.FAELLIG_TAGE_ERSTE)  statusKey = 'MAHNUNG_1';
      else if (tageOffen > 0)                            statusKey = 'UEBERFAELLIG';
    }

    const status = STATUS[statusKey] || STATUS.OFFEN;

    return {
      id:            record.id,
      nr:            f.Rechnungsnummer || '—',
      empfaenger:    f.empfaenger_name     || 'Unbekannt',
      betragBrutto:  parseFloat(f.brutto_betrag_eur || 0),
      betragNetto:   parseFloat(f.netto_betrag_eur  || 0),
      datum:         datum,
      faellig:       faellig,
      faelligText:   faellig ? faellig.toLocaleDateString('de-DE') : '—',
      datumText:     datum   ? datum.toLocaleDateString('de-DE')   : '—',
      tageOffen,
      status,
      statusKey,
      fallId:        f.aktenzeichen    || null,
      fallTitel:     f.empfaenger_name || null,
      mahnungen:     parseInt(f.mahnstufe || 0),
      letzeMahnung:  f.mahngebuehren_eur ? new Date(f.mahngebuehren_eur) : null,
      typ:           f.Rechnungstyp || 'PRIVAT'
    };
  }

  // ── Cache ─────────────────────────────────────────────────────────
  function speichereInCache(rechnungen) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        rechnungen: rechnungen.map(r => ({
          ...r,
          datum:  (r.datum ? r.datum.toISOString() : null),
          faellig: (r.faellig ? r.faellig.toISOString() : null),
          letzeMahnung: (r.letzeMahnung ? r.letzeMahnung.toISOString() : null)
        })),
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function ladeAusCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
      if (!cached) return [];
      return cached.rechnungen.map(r => ({
        ...r,
        datum:  r.datum  ? new Date(r.datum)  : null,
        faellig: r.faellig ? new Date(r.faellig) : null,
        letzeMahnung: r.letzeMahnung ? new Date(r.letzeMahnung) : null
      }));
    } catch (e) { return []; }
  }

  // ── KPIs berechnen ───────────────────────────────────────────────
  function berechneKPIs(rechnungen) {
    const offen       = rechnungen.filter(r => ['OFFEN','UEBERFAELLIG','MAHNUNG_1','MAHNUNG_2','MAHNUNG_3'].includes(r.statusKey));
    const ueberfaellig = rechnungen.filter(r => ['UEBERFAELLIG','MAHNUNG_1','MAHNUNG_2','MAHNUNG_3'].includes(r.statusKey));
    
    const heute = new Date();
    const monatsStart = new Date(heute.getFullYear(), heute.getMonth(), 1);
    const jahresStart = new Date(heute.getFullYear(), 0, 1);
    
    const diesenMonat = rechnungen.filter(r =>
      r.statusKey === 'BEZAHLT' && r.datum >= monatsStart
    );
    const diesesJahr = rechnungen.filter(r =>
      r.statusKey === 'BEZAHLT' && r.datum >= jahresStart
    );
    
    const vorMonatStart = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
    const vorMonatEnde  = new Date(heute.getFullYear(), heute.getMonth(), 0);
    const vorMonat = rechnungen.filter(r =>
      r.statusKey === 'BEZAHLT' && r.datum >= vorMonatStart && r.datum <= vorMonatEnde
    );

    const summe = arr => arr.reduce((s, r) => s + r.betragBrutto, 0);
    const monatsUmsatz = summe(diesenMonat);
    const vorMonatUmsatz = summe(vorMonat);
    const veraenderung = vorMonatUmsatz > 0
      ? Math.round((monatsUmsatz - vorMonatUmsatz) / vorMonatUmsatz * 100)
      : null;

    return {
      offenAnzahl:    offen.length,
      offenSumme:     summe(offen),
      ueberfaelligAnzahl: ueberfaellig.length,
      ueberfaelligSumme:  summe(ueberfaellig),
      monatsUmsatz,
      jahresUmsatz:   summe(diesesJahr),
      vorMonatUmsatz,
      veraenderung
    };
  }

  // ── Monatsdaten für Chart ────────────────────────────────────────
  function berechneMonatsDaten(rechnungen, monate = 6) {
    const heute = new Date();
    const daten = [];

    for (let i = monate - 1; i >= 0; i--) {
      const start = new Date(heute.getFullYear(), heute.getMonth() - i, 1);
      const ende  = new Date(heute.getFullYear(), heute.getMonth() - i + 1, 0);
      const summe = rechnungen
        .filter(r => r.statusKey === 'BEZAHLT' && r.datum >= start && r.datum <= ende)
        .reduce((s, r) => s + r.betragBrutto, 0);
      daten.push({
        label: start.toLocaleDateString('de-DE', { month: 'short' }),
        summe,
        aktiv: i === 0
      });
    }
    return daten;
  }

  // ── KPI-Grid rendern ─────────────────────────────────────────────
  function renderKPIs(containerId, kpis) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const fmt = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    const veraenderungHtml = kpis.veraenderung !== null
      ? `<span class="ht-kpi-sub ${kpis.veraenderung >= 0 ? 'positiv' : 'negativ'}">
           ${kpis.veraenderung >= 0 ? '↑' : '↓'} ${Math.abs(kpis.veraenderung)}% vs. Vormonat
         </span>`
      : '<span class="ht-kpi-sub">Erster Monat</span>';

    container.innerHTML = `
      <div class="ht-kpi-grid">
        <div class="ht-kpi-card gelb">
          <div class="ht-kpi-label">📄 Offene Rechnungen</div>
          <div class="ht-kpi-value gross">${fmt(kpis.offenSumme)}</div>
          <span class="ht-kpi-sub">${kpis.offenAnzahl} Rechnung${kpis.offenAnzahl !== 1 ? 'en' : ''}</span>
        </div>
        <div class="ht-kpi-card rot">
          <div class="ht-kpi-label">🔴 Überfällig</div>
          <div class="ht-kpi-value gross">${fmt(kpis.ueberfaelligSumme)}</div>
          <span class="ht-kpi-sub ${kpis.ueberfaelligAnzahl > 0 ? 'negativ' : ''}">${kpis.ueberfaelligAnzahl} Rechnung${kpis.ueberfaelligAnzahl !== 1 ? 'en' : ''}</span>
        </div>
        <div class="ht-kpi-card blau">
          <div class="ht-kpi-label">📊 Monatsumsatz</div>
          <div class="ht-kpi-value gross">${fmt(kpis.monatsUmsatz)}</div>
          ${veraenderungHtml}
        </div>
        <div class="ht-kpi-card gruen">
          <div class="ht-kpi-label">💰 Jahresumsatz ${new Date().getFullYear()}</div>
          <div class="ht-kpi-value gross">${fmt(kpis.jahresUmsatz)}</div>
          <span class="ht-kpi-sub">Bezahlte Rechnungen</span>
        </div>
      </div>
    `;
  }

  // ── Chart rendern ────────────────────────────────────────────────
  function renderChart(containerId, rechnungen) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const daten    = berechneMonatsDaten(rechnungen, 6);
    const maxSumme = Math.max(...daten.map(d => d.summe), 1);
    const fmt      = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    container.innerHTML = `
      <div class="ht-chart-container">
        <div class="ht-chart-title">📈 Monatsumsatz (letzte 6 Monate)</div>
        <div class="ht-chart">
          ${daten.map(d => `
            <div class="ht-chart-col">
              <div class="ht-chart-bar-wrap">
                <div class="ht-chart-bar ${d.aktiv ? 'aktiv' : ''}"
                     style="height:${Math.max(5, d.summe / maxSumme * 100)}%">
                  <div class="ht-chart-bar-tip">${fmt(d.summe)}</div>
                </div>
              </div>
              <div class="ht-chart-label ${d.aktiv ? 'aktiv' : ''}">${d.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Rechnungs-Liste rendern ──────────────────────────────────────
  let aktuellerFilter = 'alle';

  function renderListe(containerId, rechnungen, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const gefiltert = filterRechnungen(rechnungen, aktuellerFilter);
    const zeige     = gefiltert.slice(0, opts.max || 999);

    const anzahlOffen        = rechnungen.filter(r => r.statusKey === 'OFFEN').length;
    const anzahlUeberfaellig = rechnungen.filter(r => ['UEBERFAELLIG','MAHNUNG_1','MAHNUNG_2','MAHNUNG_3'].includes(r.statusKey)).length;
    const anzahlBezahlt      = rechnungen.filter(r => r.statusKey === 'BEZAHLT').length;

    container.innerHTML = `
      <div class="ht-liste-container">
        <div class="ht-liste-header">
          <div class="ht-liste-title">🧾 Rechnungen</div>
          <div class="ht-liste-actions">
            <button class="ht-btn" onclick="HonorarTracker.exportCSV()">⬇️ CSV</button>
            <button class="ht-btn primary" onclick="window.location='rechnungen.html'">Alle →</button>
          </div>
        </div>
        <div class="ht-filter-tabs">
          ${[
            ['alle',         `Alle (${rechnungen.length})`],
            ['offen',        `Offen (${anzahlOffen})`],
            ['ueberfaellig', `Überfällig (${anzahlUeberfaellig})`],
            ['bezahlt',      `Bezahlt (${anzahlBezahlt})`]
          ].map(([key, label]) => `
            <button class="ht-filter-tab ${aktuellerFilter === key ? 'aktiv' : ''}"
              onclick="HonorarTracker._setFilter('${key}', '${containerId}', event)">
              ${label}
            </button>
          `).join('')}
        </div>
        <div id="ht-liste-zeilen">
          ${zeige.length === 0
            ? `<div class="ht-leer">
                 <div class="ht-leer-icon">📭</div>
                 <div class="ht-leer-text">Keine Rechnungen gefunden</div>
               </div>`
            : zeige.map(r => renderZeile(r)).join('')
          }
        </div>
      </div>
    `;
  }

  function renderZeile(r) {
    const fmt = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const istUeberfaellig = ['UEBERFAELLIG','MAHNUNG_1','MAHNUNG_2','MAHNUNG_3'].includes(r.statusKey);

    return `
      <div class="ht-rechnung ${istUeberfaellig ? 'ueberfaellig' : ''}"
           onclick="HonorarTracker._oeffneRechnung('${r.id}')">
        <span class="ht-rechnung-status-dot" style="background:${r.status.farbe}"></span>
        <div class="ht-rechnung-info">
          <div class="ht-rechnung-titel">
            ${r.status.icon} ${r.empfaenger}
            ${r.fallTitel ? `<span style="font-weight:400;color:#6b7280"> · ${r.fallTitel}</span>` : ''}
          </div>
          <div class="ht-rechnung-meta">
            <span class="ht-rechnung-nr">${r.nr}</span>
            <span>${r.datumText}</span>
            ${r.faellig ? `<span>Fällig: ${r.faelligText}</span>` : ''}
            ${r.tageOffen > 0 ? `<span style="color:#ef4444;font-weight:600">${r.tageOffen}d überfällig</span>` : ''}
          </div>
        </div>
        <div>
          <div class="ht-rechnung-betrag ${istUeberfaellig ? 'ueberfaellig' : ''}">${fmt(r.betragBrutto)}</div>
          <div style="text-align:right;margin-top:2px">
            <span class="ht-rechnung-status-badge ${r.status.klasse}">${r.status.label}</span>
          </div>
        </div>
        <button class="ht-btn" style="padding:4px 8px;font-size:11px"
          onclick="event.stopPropagation(); HonorarTracker._zeigeAktionen('${r.id}', event)">
          ⋮
        </button>
      </div>
    `;
  }

  function filterRechnungen(rechnungen, filter) {
    switch (filter) {
      case 'offen':        return rechnungen.filter(r => r.statusKey === 'OFFEN');
      case 'ueberfaellig': return rechnungen.filter(r => ['UEBERFAELLIG','MAHNUNG_1','MAHNUNG_2','MAHNUNG_3'].includes(r.statusKey));
      case 'bezahlt':      return rechnungen.filter(r => r.statusKey === 'BEZAHLT');
      default:             return rechnungen;
    }
  }

  // ── Schnell-Aktionen ─────────────────────────────────────────────
  function _zeigeAktionen(rechnungId, event) {
    // Schließe bestehende Menus
    document.querySelectorAll('.ht-action-menu-list.offen').forEach(el => el.classList.remove('offen'));

    const r = state.rechnungen.find(r => r.id === rechnungId);
    if (!r) return;

    const menu = document.createElement('div');
    menu.className = 'ht-action-menu-list offen';
    menu.id = `ht-menu-${rechnungId}`;
    menu.innerHTML = `
      ${r.fallId ? `<div class="ht-action-menu-item" onclick="window.location='akte.html?id=${r.fallId}'">📁 Fall öffnen</div>` : ''}
      <div class="ht-action-menu-item" onclick="HonorarTracker._markiereBezahlt('${rechnungId}')">✅ Als bezahlt markieren</div>
      <div class="ht-action-menu-item" onclick="HonorarTracker._sendeMahnung('${rechnungId}')">📨 Mahnung senden</div>
      <div class="ht-action-menu-divider"></div>
      <div class="ht-action-menu-item" onclick="window.location='rechnungen.html?id=${rechnungId}'">✏️ Rechnung öffnen</div>
      <div class="ht-action-menu-item danger" onclick="HonorarTracker._stornieren('${rechnungId}')">❌ Stornieren</div>
    `;

    const btn = event.currentTarget;
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(menu);

    // Click außerhalb schließt Menu
    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        menu.remove();
        document.removeEventListener('click', close);
      }, { once: true });
    }, 10);
  }

  async function _markiereBezahlt(rechnungId) {
    if (!confirm('Rechnung als bezahlt markieren?')) return;
    try {
      await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update',
          tabelle: 'RECHNUNGEN',
          id: rechnungId,
          felder: { Status: 'Bezahlt', Bezahlt_Am: new Date().toISOString().split('T')[0] }
        })
      });
      // State updaten
      const r = state.rechnungen.find(r => r.id === rechnungId);
      if (r) { r.statusKey = 'BEZAHLT'; r.status = STATUS.BEZAHLT; }
      _refreshUI();
    } catch (err) { alert('Fehler: ' + err.message); }
  }

  async function _sendeMahnung(rechnungId) {
    const r = state.rechnungen.find(r => r.id === rechnungId);
    if (!r) return;
    const stufe = r.mahnungen + 1;
    if (!confirm(`${stufe}. Mahnung für ${r.empfaenger} über ${r.betragBrutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} senden?`)) return;

    try {
      // Make.com Mahnung-Szenario triggern
      await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update',
          tabelle: 'RECHNUNGEN',
          id: rechnungId,
          felder: {
            Status: `Mahnung ${stufe}`,
            Mahnungen: stufe,
            Letzte_Mahnung: new Date().toISOString().split('T')[0]
          }
        })
      });
      alert(`✅ ${stufe}. Mahnung wurde gespeichert. Make.com Szenario wird ausgeführt.`);
      const r_ref = state.rechnungen.find(r => r.id === rechnungId);
      if (r_ref) r_ref.mahnungen = stufe;
    } catch (err) { alert('Fehler: ' + err.message); }
  }

  async function _stornieren(rechnungId) {
    if (!confirm('Rechnung wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update',
          tabelle: 'RECHNUNGEN',
          id: rechnungId,
          felder: { Status: 'Storniert' }
        })
      });
      state.rechnungen = state.rechnungen.filter(r => r.id !== rechnungId);
      _refreshUI();
    } catch (err) { alert('Fehler: ' + err.message); }
  }

  function _oeffneRechnung(rechnungId) {
    window.location.href = `rechnungen.html?id=${rechnungId}`;
  }

  function _setFilter(filter, containerId, event) {
    aktuellerFilter = filter;
    renderListe(containerId, state.rechnungen);
  }

  // ── CSV Export ───────────────────────────────────────────────────
  function exportCSV() {
    const offen = state.rechnungen.filter(r => !['BEZAHLT', 'STORNIERT'].includes(r.statusKey));
    if (!offen.length) { alert('Keine offenen Rechnungen zum Export.'); return; }

    const header = ['Nummer', 'Empfänger', 'Fall', 'rechnungsdatum', 'Fällig am', 'Betrag (Brutto)', 'Status', 'Tage überfällig'];
    const zeilen = offen.map(r => [
      r.nr, r.empfaenger, r.fallTitel || '', r.datumText, r.faelligText,
      r.betragBrutto.toFixed(2).replace('.', ','),
      r.status.label, r.tageOffen > 0 ? r.tageOffen : 0
    ].map(v => `"${v}"`).join(';'));

    const csv  = [header.join(';'), ...zeilen].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `PROVA-Offene-Posten-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── UI neu rendern ───────────────────────────────────────────────
  function _refreshUI() {
    // Alle bekannten Container neu rendern
    if (document.getElementById('ht-kpi'))   renderKPIs('ht-kpi', berechneKPIs(state.rechnungen));
    if (document.getElementById('ht-chart')) renderChart('ht-chart', state.rechnungen);
    if (document.getElementById('ht-liste')) renderListe('ht-liste', state.rechnungen);
  }

  // ── Init ─────────────────────────────────────────────────────────
  async function init(opts = {}) {
    injectStyles();
    const rechnungen = await ladeRechnungen();
    state.rechnungen = rechnungen;
    const kpis = berechneKPIs(rechnungen);

    if (opts.kpiId)   renderKPIs(opts.kpiId, kpis);
    if (opts.chartId) renderChart(opts.chartId, rechnungen);
    if (opts.listeId) renderListe(opts.listeId, rechnungen, opts);

    return { rechnungen, kpis };
  }

  // ── Öffentliche API ──────────────────────────────────────────────
  return {
    init,
    ladeRechnungen,
    berechneKPIs,
    renderKPIs,
    renderChart,
    renderListe,
    exportCSV,
    _setFilter,
    _zeigeAktionen,
    _markiereBezahlt,
    _sendeMahnung,
    _stornieren,
    _oeffneRechnung,
    _refreshUI,
    get rechnungen() { return state.rechnungen; }
  };

})();

if (typeof module !== 'undefined') module.exports = HonorarTracker;