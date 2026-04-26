/**
 * PROVA Systems — Frist-Guard
 * Vollständiges Fristen-Management für Sachverständige
 *
 * Features:
 * - Fristen-Badge im Seitenmenü (roter Punkt mit Zahl)
 * - Overlay-Warnung beim Seitenaufruf wenn kritische Fristen nahen
 * - Farbcodierte Fristenampel: Rot (<= 3 Tage), Gelb (4–7 Tage), Grün (8–14 Tage)
 * - Integration mit Airtable TERMINE-Tabelle
 * - Gericht-/Versicherungs-/Auftraggeber-Fristen unterschieden
 * - §407 StPO / §§ 407a, 411 ZPO Fristen-Typen
 * - Tages-Check beim App-Start + Web Push (via push-notify.js)
 * - Kalender-Export (ICS)
 */

'use strict';

const FristGuard = (function() {

  // ── Konfiguration ──────────────────────────────────────────────
  const CONFIG = {
    WARN_TAGE_KRITISCH: 3,    // Rot: <= 3 Tage
    WARN_TAGE_WICHTIG:  7,    // Gelb: 4–7 Tage
    WARN_TAGE_INFO:    14,    // Grün: 8–14 Tage
    CHECK_INTERVAL_H:  1,     // Stündlicher Check
    STORAGE_KEY:       'prova_fristen_cache',
    DISMISSED_KEY:     'prova_fristen_dismissed',
    OVERLAY_COOLDOWN:  3600000, // 1h Cooldown für Overlay
    VERSION: '1.0'
  };

  // ── Frist-Typen ─────────────────────────────────────────────────
  const FRIST_TYPEN = {
    GERICHT:       { label: 'Gerichtsfrist',      icon: '🏛️', farbe: '#ef4444', prioritaet: 10 },
    ABGABE:        { label: 'Gutachten-Abgabe',   icon: '📋', farbe: '#f59e0b', prioritaet: 9  },
    ORTSTERMIN:    { label: 'Ortstermin',          icon: '🏗️', farbe: '#3b82f6', prioritaet: 8  },
    RECHNUNG:      { label: 'Zahlungsfrist',       icon: '💶', farbe: '#8b5cf6', prioritaet: 7  },
    VERSICHERUNG:  { label: 'Versicherungsfrist',  icon: '🛡️', farbe: '#06b6d4', prioritaet: 6  },
    AUFTRAGGEBER:  { label: 'Auftraggeber-Frist',  icon: '👤', farbe: '#6b7280', prioritaet: 5  },
    SONSTIGE:      { label: 'Sonstige Frist',      icon: '📅', farbe: '#9ca3af', prioritaet: 1  }
  };

  // ── State ───────────────────────────────────────────────────────
  let state = {
    fristen:       [],
    geladen:       false,
    letzterCheck:  null,
    checkTimer:    null,
    overlayGezeigt: false
  };

  // ── CSS ─────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('fg-styles')) return;
    const css = `
      /* PROVA Frist-Guard Styles */

      /* Badge im Nav */
      .fg-nav-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px; height: 18px;
        padding: 0 4px;
        background: #ef4444;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        border-radius: 9px;
        line-height: 1;
        animation: fg-badge-pulse 2s ease infinite;
      }
      .fg-nav-badge.gelb { background: #f59e0b; }
      .fg-nav-badge.gruen { background: #10b981; animation: none; }
      @keyframes fg-badge-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
      }

      /* Frist-Banner (oben auf jeder Seite) */
      .fg-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 10px;
        margin-bottom: 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .fg-banner:hover { opacity: 0.9; }
      .fg-banner.kritisch { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .fg-banner.wichtig  { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
      .fg-banner.info     { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
      .fg-banner-icon { font-size: 18px; flex-shrink: 0; }
      .fg-banner-text { flex: 1; }
      .fg-banner-close {
        width: 20px; height: 20px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 4px;
        background: rgba(0,0,0,0.06);
        font-size: 12px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .fg-banner-close:hover { background: rgba(0,0,0,0.12); }

      /* Frist-Widget (kompakte Liste) */
      .fg-widget {
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 14px;
        overflow: hidden;
        font-size: 13px;
      }
      .fg-widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border, #e5e7eb);
      }
      .fg-widget-title {
        font-weight: 600;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .fg-widget-mehr {
        font-size: 11px;
        color: #1a56db;
        text-decoration: none;
        font-weight: 500;
      }
      .fg-widget-mehr:hover { text-decoration: underline; }
      .fg-widget-list { padding: 4px 0; }

      /* Einzelne Frist in Widget */
      .fg-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--border-light, #f3f4f6);
        cursor: pointer;
        transition: background 0.1s;
      }
      .fg-item:last-child { border-bottom: none; }
      .fg-item:hover { background: var(--bg-hover, #f9fafb); }

      .fg-item-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .fg-item-dot.kritisch { background: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.2); }
      .fg-item-dot.wichtig  { background: #f59e0b; }
      .fg-item-dot.info     { background: #10b981; }

      .fg-item-content { flex: 1; min-width: 0; }
      .fg-item-title {
        font-weight: 500;
        font-size: 12.5px;
        color: var(--text-primary, #111827);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fg-item-meta {
        font-size: 11px;
        color: var(--text-muted, #6b7280);
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 1px;
      }

      .fg-item-countdown {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .fg-item-countdown.kritisch { background: #fef2f2; color: #ef4444; }
      .fg-item-countdown.wichtig  { background: #fffbeb; color: #d97706; }
      .fg-item-countdown.info     { background: #f0fdf4; color: #059669; }
      .fg-item-countdown.heute    { background: #ef4444; color: #fff; animation: fg-badge-pulse 1.5s ease infinite; }
      .fg-item-countdown.ueber    { background: #fef2f2; color: #7f1d1d; font-style: italic; }

      /* Overlay (kritische Warnung beim Seitenaufruf) */
      .fg-overlay-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 9000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fg-fade-in 0.2s ease;
      }
      @keyframes fg-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .fg-overlay {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        max-width: 480px;
        width: 100%;
        overflow: hidden;
        animation: fg-slide-up 0.25s ease;
      }
      @keyframes fg-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      .fg-overlay-header {
        background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
        padding: 20px 24px 16px;
        color: #fff;
      }
      .fg-overlay-header.gelb {
        background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
      }
      .fg-overlay-header-top {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .fg-overlay-header-icon { font-size: 28px; }
      .fg-overlay-header-title { font-size: 18px; font-weight: 700; line-height: 1.2; }
      .fg-overlay-header-sub { font-size: 13px; opacity: 0.85; margin-top: 2px; }

      .fg-overlay-body { padding: 20px 24px; }
      .fg-overlay-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

      .fg-overlay-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        background: #f9fafb;
        border-radius: 10px;
        border-left: 4px solid;
      }
      .fg-overlay-item.kritisch { border-color: #ef4444; }
      .fg-overlay-item.wichtig  { border-color: #f59e0b; }
      .fg-overlay-item-icon { font-size: 20px; flex-shrink: 0; }
      .fg-overlay-item-content { flex: 1; }
      .fg-overlay-item-title { font-weight: 600; font-size: 14px; color: #111827; }
      .fg-overlay-item-meta  { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .fg-overlay-item-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        flex-shrink: 0;
        align-self: center;
      }
      .fg-overlay-item-badge.kritisch { background: #fef2f2; color: #ef4444; }
      .fg-overlay-item-badge.heute    { background: #ef4444; color: #fff; }
      .fg-overlay-item-badge.wichtig  { background: #fffbeb; color: #d97706; }

      .fg-overlay-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .fg-overlay-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s;
        text-align: center;
      }
      .fg-overlay-btn:hover { opacity: 0.85; }
      .fg-overlay-btn.primary { background: #1a56db; color: #fff; }
      .fg-overlay-btn.secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      /* Vollansicht-Modal */
      .fg-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 8000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 60px 16px 16px;
        overflow-y: auto;
      }
      .fg-modal {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        width: 100%;
        max-width: 680px;
        overflow: hidden;
      }
      .fg-modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .fg-modal-title { font-size: 17px; font-weight: 700; color: #111827; }
      .fg-modal-close {
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: #f3f4f6;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #6b7280;
      }
      .fg-modal-close:hover { background: #e5e7eb; }
      .fg-modal-body { padding: 20px 24px; }
      .fg-modal-section { margin-bottom: 24px; }
      .fg-modal-section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #9ca3af;
        margin-bottom: 10px;
      }

      /* Vollständige Frist-Karte */
      .fg-karte {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 8px;
        transition: box-shadow 0.15s;
      }
      .fg-karte:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .fg-karte-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
      }
      .fg-karte-typ-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .fg-karte-title { flex: 1; font-weight: 600; font-size: 13.5px; color: #111827; }
      .fg-karte-body { padding: 10px 14px; background: #f9fafb; }
      .fg-karte-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        font-size: 12px;
        color: #4b5563;
      }
      .fg-karte-meta-item { display: flex; flex-direction: column; gap: 1px; }
      .fg-karte-meta-label { font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
      .fg-karte-meta-value { font-weight: 500; }
      .fg-karte-actions { padding: 8px 14px; display: flex; gap: 8px; }
      .fg-karte-btn {
        font-size: 11.5px;
        padding: 5px 12px;
        border-radius: 7px;
        cursor: pointer;
        border: 1px solid #e5e7eb;
        background: #fff;
        color: #374151;
        font-weight: 500;
        transition: background 0.1s;
      }
      .fg-karte-btn:hover { background: #f3f4f6; }
      .fg-karte-btn.primary { background: #1a56db; color: #fff; border-color: #1a56db; }
      .fg-karte-btn.primary:hover { background: #1d4ed8; }

      /* Neue Frist Form */
      .fg-form { display: flex; flex-direction: column; gap: 12px; }
      .fg-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .fg-form-group { display: flex; flex-direction: column; gap: 4px; }
      .fg-form-label { font-size: 11.5px; font-weight: 600; color: #374151; }
      .fg-form-input, .fg-form-select {
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 13px;
        color: #111827;
        background: #fff;
        transition: border-color 0.15s;
        font-family: inherit;
      }
      .fg-form-input:focus, .fg-form-select:focus {
        outline: none;
        border-color: #1a56db;
        box-shadow: 0 0 0 3px rgba(26,86,219,0.1);
      }
      .fg-form-submit {
        padding: 10px 20px;
        background: #1a56db;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        align-self: flex-start;
        transition: background 0.15s;
      }
      .fg-form-submit:hover { background: #1d4ed8; }

      /* Leer-Zustand */
      .fg-leer {
        text-align: center;
        padding: 32px 16px;
        color: #6b7280;
      }
      .fg-leer-icon { font-size: 40px; margin-bottom: 8px; }
      .fg-leer-text { font-size: 13px; }

      /* Loading */
      .fg-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        color: #6b7280;
        font-size: 13px;
      }
      .fg-loading-spinner {
        width: 16px; height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #1a56db;
        border-radius: 50%;
        animation: fg-spin 0.7s linear infinite;
      }
      @keyframes fg-spin { to { transform: rotate(360deg); } }

      @media (max-width: 600px) {
        .fg-form-row { grid-template-columns: 1fr; }
        .fg-overlay { border-radius: 16px 16px 0 0; }
        .fg-overlay-backdrop { align-items: flex-end; padding: 0; }
        .fg-modal { border-radius: 16px 16px 0 0; max-width: 100%; }
        .fg-modal-backdrop { padding: 0; align-items: flex-end; }
      }
    `;
    const el = document.createElement('style');
    el.id = 'fg-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── Fristen laden ───────────────────────────────────────────────
  async function ladeFristen(forceFresh = false) {
    // Cache nutzen wenn frisch
    if (!forceFresh && state.geladen && state.letzterCheck) {
      const alter = Date.now() - state.letzterCheck;
      if (alter < CONFIG.CHECK_INTERVAL_H * 3600000) return state.fristen;
    }

    // Aus localStorage laden (Offline-Fallback)
    const cached = ladeFristenAusCache();

    try {
      // Airtable via Netlify Function
      const svEmail = localStorage.getItem('prova_sv_email') || '';
      if (!svEmail) return cached;

      const resp = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          method: 'GET',
          path: '/v0/appJ7bLlAHZoxENWE/tblyMTTdtfGQjjmc2?filterByFormula=' + encodeURIComponent('AND({Status}!="Abgeschlossen",{sv_email}="' + svEmail + '")') + '&sort[0][field]=termin_datum&sort[0][direction]=asc&fields[]=aktenzeichen&fields[]=termin_datum&fields[]=termin_typ&fields[]=objekt_adresse&fields[]=notizen&fields[]=erinnerung_24h&fields[]=sv_email&fields[]=Status'
        })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const fristen = (data.records || []).map(normalisiereFrist);
      
      state.fristen    = fristen;
      state.geladen    = true;
      state.letzterCheck = Date.now();
      speicherFristenInCache(fristen);
      return fristen;

    } catch (err) {
      console.warn('[FristGuard] Airtable Fehler, nutze Cache:', err.message);
      return cached;
    }
  }

  function normalisiereFrist(record) {
    const f = record.fields || {};
    const datum = f.termin_datum ? new Date(f.termin_datum) : null;
    const heute = new Date(); heute.setHours(0,0,0,0);
    const datumNorm = datum ? new Date(datum.setHours(0,0,0,0)) : null;
    const tageDiff = datumNorm ? Math.round((datumNorm - heute) / 86400000) : null;

    let dringlichkeit = 'info';
    if (tageDiff !== null) {
      if (tageDiff <= 0)                              dringlichkeit = 'ueber';
      else if (tageDiff <= CONFIG.WARN_TAGE_KRITISCH) dringlichkeit = 'kritisch';
      else if (tageDiff <= CONFIG.WARN_TAGE_WICHTIG)  dringlichkeit = 'wichtig';
      else if (tageDiff <= CONFIG.WARN_TAGE_INFO)     dringlichkeit = 'info';
      else                                             dringlichkeit = 'ok';
    }

    const typ = (f.termin_typ || 'SONSTIGE').toUpperCase();

    return {
      id:           record.id,
      titel:        f.aktenzeichen || 'Unbenannte Frist',
      datum:        datum,
      datumText:    datum ? datum.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
      tageDiff:     tageDiff,
      dringlichkeit,
      typ:          FRIST_TYPEN[typ] || FRIST_TYPEN.SONSTIGE,
      typKey:       typ,
      fallId:       f.aktenzeichen || null,
      fallTitel:    f.objekt_adresse || null,
      notiz:        f.notizen || '',
      prioritaet:   f.termin_typ || 5,
      erinnerungTage: f.erinnerung_24h || CONFIG.WARN_TAGE_WICHTIG
    };
  }

  // ── Cache ────────────────────────────────────────────────────────
  function speicherFristenInCache(fristen) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        fristen: fristen.map(f => ({ ...f, datum: (f.datum ? f.datum.toISOString() : null) })),
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function ladeFristenAusCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
      if (!cached) return [];
      return cached.fristen.map(f => ({
        ...f,
        datum: f.datum ? new Date(f.datum) : null
      }));
    } catch (e) { return []; }
  }

  // ── Fristen filtern ─────────────────────────────────────────────
  function getFristenNaechste(fristen, maxTage = 14) {
    return fristen
      .filter(f => f.tageDiff !== null && f.tageDiff <= maxTage)
      .sort((a, b) => a.tageDiff - b.tageDiff);
  }

  function getFristenKritisch(fristen) {
    return fristen.filter(f => f.dringlichkeit === 'kritisch' || f.dringlichkeit === 'ueber');
  }

  function getGesamtDringlichkeit(fristen) {
    if (fristen.some(f => f.dringlichkeit === 'ueber' || f.dringlichkeit === 'kritisch')) return 'kritisch';
    if (fristen.some(f => f.dringlichkeit === 'wichtig')) return 'wichtig';
    if (fristen.some(f => f.dringlichkeit === 'info'))    return 'info';
    return 'ok';
  }

  // ── Countdown-Text ───────────────────────────────────────────────
  function countdownText(frist) {
    if (frist.tageDiff === null) return '—';
    if (frist.tageDiff < 0)  return `${Math.abs(frist.tageDiff)}d überfällig`;
    if (frist.tageDiff === 0) return 'Heute!';
    if (frist.tageDiff === 1) return 'Morgen';
    return `${frist.tageDiff} Tage`;
  }

  function countdownKlasse(frist) {
    if (frist.tageDiff === null)  return '';
    if (frist.tageDiff < 0)       return 'ueber';
    if (frist.tageDiff === 0)     return 'heute';
    return frist.dringlichkeit;
  }

  // ── Nav-Badge setzen ────────────────────────────────────────────
  function aktualisiereBadge(fristen) {
    // Alle vorhandenen Badge-Container im Nav
    const badges = document.querySelectorAll('[data-fg-badge]');
    const naechste = getFristenNaechste(fristen, CONFIG.WARN_TAGE_WICHTIG);
    const anzahl   = naechste.length;
    const dringl   = getGesamtDringlichkeit(naechste);

    badges.forEach(el => {
      if (anzahl === 0) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'inline-flex';
      el.textContent   = anzahl > 9 ? '9+' : anzahl;
      el.className     = `fg-nav-badge ${dringl === 'wichtig' ? 'gelb' : dringl === 'info' ? 'gruen' : ''}`;
    });

    // Auch Tab-Titel aktualisieren
    if (anzahl > 0 && dringl === 'kritisch') {
      document.title = `(${anzahl}) ${document.title.replace(/^\(\d+\)\s*/, '')}`;
    }
  }

  // ── Banner rendern ──────────────────────────────────────────────
  function zeigeBanner(containerId, fristen) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const naechste = getFristenNaechste(fristen, CONFIG.WARN_TAGE_WICHTIG);
    if (!naechste.length) { container.innerHTML = ''; return; }

    const dringl  = getGesamtDringlichkeit(naechste);
    const erste   = naechste[0];
    const weitere = naechste.length - 1;

    let text = `<strong>${erste.titel}</strong> — ${countdownText(erste)}`;
    if (weitere > 0) text += ` · und ${weitere} weitere Frist${weitere > 1 ? 'en' : ''}`;

    container.innerHTML = `
      <div class="fg-banner ${dringl}" onclick="FristGuard.oeffneModal()">
        <span class="fg-banner-icon">${erste.typ.icon}</span>
        <span class="fg-banner-text">${text}</span>
        <span class="fg-banner-close" onclick="event.stopPropagation(); this.closest('.fg-banner').remove()">✕</span>
      </div>
    `;
  }

  // ── Widget rendern ──────────────────────────────────────────────
  function renderWidget(containerId, fristen, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const naechste = getFristenNaechste(fristen, opts.maxTage || 30);
    const zeige    = naechste.slice(0, opts.max || 5);

    if (!naechste.length) {
      container.innerHTML = `
        <div class="fg-widget">
          <div class="fg-widget-header">
            <div class="fg-widget-title">⏰ Fristen</div>
          </div>
          <div class="fg-leer">
            <div class="fg-leer-icon">✅</div>
            <div class="fg-leer-text">Keine Fristen in den nächsten ${opts.maxTage || 30} Tagen</div>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="fg-widget">
        <div class="fg-widget-header">
          <div class="fg-widget-title">⏰ Fristen <span data-fg-badge style="margin-left:4px"></span></div>
          <a href="termine.html" class="fg-widget-mehr">Alle →</a>
        </div>
        <div class="fg-widget-list">
          ${zeige.map(f => `
            <div class="fg-item" onclick="FristGuard.oeffneModal('${f.id}')">
              <span class="fg-item-dot ${f.dringlichkeit}"></span>
              <div class="fg-item-content">
                <div class="fg-item-title">${f.titel}</div>
                <div class="fg-item-meta">
                  <span>${f.typ.icon} ${f.typ.label}</span>
                  ${f.fallTitel ? `<span>· ${f.fallTitel}</span>` : ''}
                </div>
              </div>
              <span class="fg-item-countdown ${countdownKlasse(f)}">${countdownText(f)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    aktualisiereBadge(fristen);
  }

  // ── Kritisches Overlay ──────────────────────────────────────────
  function pruefeUndZeigeOverlay(fristen) {
    const kritisch = getFristenKritisch(fristen);
    if (!kritisch.length) return;

    // Cooldown prüfen
    try {
      const dismissed = JSON.parse(localStorage.getItem(CONFIG.DISMISSED_KEY) || '{}');
      const letzteAnzeige = dismissed.letzteAnzeige || 0;
      if (Date.now() - letzteAnzeige < CONFIG.OVERLAY_COOLDOWN) return;
    } catch (e) {}

    if (state.overlayGezeigt) return;
    state.overlayGezeigt = true;

    const dringl = getGesamtDringlichkeit(kritisch);
    const zeige  = kritisch.slice(0, 3);

    const backdrop = document.createElement('div');
    backdrop.className = 'fg-overlay-backdrop';
    backdrop.id = 'fg-overlay-backdrop';
    backdrop.innerHTML = `
      <div class="fg-overlay">
        <div class="fg-overlay-header ${dringl === 'wichtig' ? 'gelb' : ''}">
          <div class="fg-overlay-header-top">
            <span class="fg-overlay-header-icon">⚠️</span>
            <div>
              <div class="fg-overlay-header-title">
                ${kritisch.length} kritische Frist${kritisch.length > 1 ? 'en' : ''}
              </div>
              <div class="fg-overlay-header-sub">Sofortiger Handlungsbedarf</div>
            </div>
          </div>
        </div>
        <div class="fg-overlay-body">
          <div class="fg-overlay-list">
            ${zeige.map(f => `
              <div class="fg-overlay-item ${f.dringlichkeit}">
                <span class="fg-overlay-item-icon">${f.typ.icon}</span>
                <div class="fg-overlay-item-content">
                  <div class="fg-overlay-item-title">${f.titel}</div>
                  <div class="fg-overlay-item-meta">
                    ${f.datumText}
                    ${f.fallTitel ? ` · ${f.fallTitel}` : ''}
                  </div>
                </div>
                <span class="fg-overlay-item-badge ${countdownKlasse(f)}">${countdownText(f)}</span>
              </div>
            `).join('')}
            ${kritisch.length > 3 ? `<div style="font-size:12px;color:#6b7280;text-align:center;padding:4px">
              + ${kritisch.length - 3} weitere kritische Frist${kritisch.length - 3 > 1 ? 'en' : ''}
            </div>` : ''}
          </div>
          <div class="fg-overlay-actions">
            <button class="fg-overlay-btn primary" onclick="FristGuard.oeffneModal(); (function(){var _e=document.getElementById('fg-overlay-backdrop');if(_e)_e.remove();})();">
              📋 Fristen verwalten
            </button>
            <button class="fg-overlay-btn secondary" onclick="FristGuard._dismissOverlay()">
              Schließen (1h)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) FristGuard._dismissOverlay();
    });
  }

  function _dismissOverlay() {
    (function(){var _e=document.getElementById('fg-overlay-backdrop');if(_e)_e.remove();})();;
    try {
      localStorage.setItem(CONFIG.DISMISSED_KEY, JSON.stringify({ letzteAnzeige: Date.now() }));
    } catch (e) {}
  }

  // ── Vollansicht-Modal ───────────────────────────────────────────
  function oeffneModal(fokusId = null) {
    const fristen = state.fristen;
    
    const backdrop = document.createElement('div');
    backdrop.className = 'fg-modal-backdrop';
    backdrop.id = 'fg-modal-backdrop';
    backdrop.innerHTML = `
      <div class="fg-modal">
        <div class="fg-modal-header">
          <div class="fg-modal-title">⏰ Fristen-Manager</div>
          <button class="fg-modal-close" onclick="(function(){var _e=document.getElementById('fg-modal-backdrop');if(_e)_e.remove();})();">✕</button>
        </div>
        <div class="fg-modal-body" id="fg-modal-body">
          ${renderModalInhalt(fristen, fokusId)}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) backdrop.remove();
    });

    // Zum fokussierten Element scrollen
    if (fokusId) {
      setTimeout(function() {
        const el = document.getElementById('fg-k-'+(fokusId));
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  function renderModalInhalt(fristen, fokusId) {
    const kritisch = fristen.filter(f => f.dringlichkeit === 'kritisch' || f.dringlichkeit === 'ueber');
    const wichtig  = fristen.filter(f => f.dringlichkeit === 'wichtig');
    const spaeter  = fristen.filter(f => f.dringlichkeit === 'info' || f.dringlichkeit === 'ok');

    let html = '';

    // Neue Frist hinzufügen
    html += `
      <div class="fg-modal-section">
        <div class="fg-modal-section-title">➕ Neue Frist</div>
        <div class="fg-form">
          <div class="fg-form-row">
            <div class="fg-form-group">
              <label class="fg-form-label">Bezeichnung *</label>
              <input class="fg-form-input" id="fg-neu-titel" placeholder="z.B. Gutachten-Abgabe Gericht München" />
            </div>
            <div class="fg-form-group">
              <label class="fg-form-label">Datum *</label>
              <input class="fg-form-input" id="fg-neu-datum" type="date" />
            </div>
          </div>
          <div class="fg-form-row">
            <div class="fg-form-group">
              <label class="fg-form-label">Typ</label>
              <select class="fg-form-select" id="fg-neu-typ">
                ${Object.entries(FRIST_TYPEN).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
              </select>
            </div>
            <div class="fg-form-group">
              <label class="fg-form-label">Erinnerung (Tage vorher)</label>
              <select class="fg-form-select" id="fg-neu-erinnerung">
                <option value="1">1 Tag</option>
                <option value="3">3 Tage</option>
                <option value="7" selected>7 Tage</option>
                <option value="14">14 Tage</option>
              </select>
            </div>
          </div>
          <div class="fg-form-group">
            <label class="fg-form-label">Notiz (optional)</label>
            <input class="fg-form-input" id="fg-neu-notiz" placeholder="z.B. Aktenzeichen, Ansprechpartner …" />
          </div>
          <button class="fg-form-submit" onclick="FristGuard._neueFristSpeichern()">Frist speichern</button>
        </div>
      </div>
    `;

    // Kritische Fristen
    if (kritisch.length) {
      html += `
        <div class="fg-modal-section">
          <div class="fg-modal-section-title">🔴 Kritisch (${kritisch.length})</div>
          ${kritisch.map(f => renderKarte(f, fokusId === f.id)).join('')}
        </div>`;
    }

    // Wichtige Fristen
    if (wichtig.length) {
      html += `
        <div class="fg-modal-section">
          <div class="fg-modal-section-title">🟡 Diese Woche (${wichtig.length})</div>
          ${wichtig.map(f => renderKarte(f, fokusId === f.id)).join('')}
        </div>`;
    }

    // Spätere Fristen
    if (spaeter.length) {
      html += `
        <div class="fg-modal-section">
          <div class="fg-modal-section-title">🟢 Demnächst (${spaeter.length})</div>
          ${spaeter.map(f => renderKarte(f, false)).join('')}
        </div>`;
    }

    if (!fristen.length) {
      html += `<div class="fg-leer"><div class="fg-leer-icon">📭</div><div class="fg-leer-text">Keine offenen Fristen eingetragen.</div></div>`;
    }

    return html;
  }

  function renderKarte(f, hervorgehoben = false) {
    const typStyle = `background:${f.typ.farbe}20; color:${f.typ.farbe}`;
    return `
      <div class="fg-karte ${hervorgehoben ? 'fg-karte-focus' : ''}" id="fg-k-${f.id}">
        <div class="fg-karte-header">
          <span class="fg-karte-typ-badge" style="${typStyle}">${f.typ.icon} ${f.typ.label}</span>
          <span class="fg-karte-title">${f.titel}</span>
          <span class="fg-item-countdown ${countdownKlasse(f)}">${countdownText(f)}</span>
        </div>
        <div class="fg-karte-body">
          <div class="fg-karte-meta-grid">
            <div class="fg-karte-meta-item">
              <span class="fg-karte-meta-label">Datum</span>
              <span class="fg-karte-meta-value">${f.datumText}</span>
            </div>
            ${f.fallTitel ? `<div class="fg-karte-meta-item">
              <span class="fg-karte-meta-label">Fall</span>
              <span class="fg-karte-meta-value">${f.fallTitel}</span>
            </div>` : ''}
            ${f.notiz ? `<div class="fg-karte-meta-item" style="grid-column:1/-1">
              <span class="fg-karte-meta-label">Notiz</span>
              <span class="fg-karte-meta-value">${f.notiz}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="fg-karte-actions">
          ${f.fallId ? `<button class="fg-karte-btn primary" onclick="window.location='akte.html?id=${f.fallId}'">📁 Fall öffnen</button>` : ''}
          <button class="fg-karte-btn" onclick="FristGuard._exportICS('${f.id}')">📅 Kalender</button>
          <button class="fg-karte-btn" onclick="FristGuard._abschliessen('${f.id}')">✅ Erledigt</button>
        </div>
      </div>
    `;
  }

  // ── Neue Frist speichern ────────────────────────────────────────
  async function _neueFristSpeichern() {
    const titel     = (document.getElementById('fg-neu-titel') ? document.getElementById('fg-neu-titel').value : undefined).trim();
    const datum     = (document.getElementById('fg-neu-datum') ? document.getElementById('fg-neu-datum').value : undefined);
    const typ       = (document.getElementById('fg-neu-typ') ? document.getElementById('fg-neu-typ').value : undefined);
    const erinnerung = (document.getElementById('fg-neu-erinnerung') ? document.getElementById('fg-neu-erinnerung').value : undefined);
    const notiz     = (document.getElementById('fg-neu-notiz') ? document.getElementById('fg-neu-notiz').value : undefined).trim();

    if (!titel || !datum) {
      alert('Bitte Bezeichnung und Datum eingeben.');
      return;
    }

    const svEmail = localStorage.getItem('prova_sv_email') || '';
    const btn = document.querySelector('.fg-form-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Speichern…'; }

    try {
      const resp = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'create',
          tabelle: 'TERMINE',
          felder: {
            Titel:           titel,
            Datum:           datum,
            Typ:             typ,
            Erinnerung_Tage: parseInt(erinnerung),
            Notiz:           notiz,
            SV_Email:        svEmail,
            Abgeschlossen:   false
          }
        })
      });

      if (!resp.ok) throw new Error('Speichern fehlgeschlagen');

      // Cache leeren + neu laden
      state.geladen = false;
      state.letzterCheck = null;
      await init();

      // Modal neu rendern
      const body = document.getElementById('fg-modal-body');
      if (body) body.innerHTML = renderModalInhalt(state.fristen, null);

    } catch (err) {
      alert('Frist konnte nicht gespeichert werden: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Frist speichern'; }
    }
  }

  // ── Frist als erledigt markieren ────────────────────────────────
  async function _abschliessen(fristId) {
    if (!confirm('Frist als erledigt markieren?')) return;
    try {
      await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.provaAuthHeaders ? window.provaAuthHeaders() : {}),
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update',
          tabelle: 'TERMINE',
          id: fristId,
          felder: { Abgeschlossen: true }
        })
      });
      // Aus State entfernen
      state.fristen = state.fristen.filter(f => f.id !== fristId);
      speicherFristenInCache(state.fristen);
      aktualisiereBadge(state.fristen);
      // Karte aus Modal entfernen
      document.getElementById('fg-k-'+(fristId) && 'fg-k-'+(fristId).closest)('.fg-modal-section')
        ? document.querySelector('#fg-k-'+fristId) : null; if(_rm) _rm.remove();
      document.getElementById('fg-k-'+(fristId)) && (function(el){if(el)el.remove();})(el);
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  }

  // ── ICS Kalender Export ─────────────────────────────────────────
  function _exportICS(fristId) {
    const frist = state.fristen.find(f => f.id === fristId);
    if (!frist || !frist.datum) return;

    const d     = frist.datum;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = d.toISOString().split('T')[0].replace(/-/g, '');
    const desc  = [frist.notiz, frist.fallTitel ? `Fall: ${frist.fallTitel}` : ''].filter(Boolean).join('\\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PROVA Systems//Fristen//DE',
      'BEGIN:VEVENT',
      `UID:prova-${frist.id}@prova-systems.de`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `SUMMARY:${frist.typ.icon} ${frist.titel}`,
      `DESCRIPTION:${desc}`,
      `CATEGORIES:${frist.typ.label}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `prova-frist-${frist.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Stündlicher Check-Timer ─────────────────────────────────────
  function starteCheckTimer() {
    if (state.checkTimer) return;
    state.checkTimer = setInterval(async function() {
      await ladeFristen(true);
      aktualisiereBadge(state.fristen);
    }, CONFIG.CHECK_INTERVAL_H * 3600000);
  }

  // ── Init ────────────────────────────────────────────────────────
  async function init(opts = {}) {
    injectStyles();
    const fristen = await ladeFristen();
    state.fristen = fristen;

    if (opts.bannerId)  zeigeBanner(opts.bannerId, fristen);
    if (opts.widgetId)  renderWidget(opts.widgetId, fristen, opts);
    if (opts.badge !== false) aktualisiereBadge(fristen);
    if (opts.overlay !== false) setTimeout(function() { pruefeUndZeigeOverlay(fristen); }, 1500);

    starteCheckTimer();
    return fristen;
  }

  // ── Öffentliche API ─────────────────────────────────────────────
  return {
    init,
    ladeFristen,
    getFristenNaechste,
    getFristenKritisch,
    getGesamtDringlichkeit,
    aktualisiereBadge,
    zeigeBanner,
    renderWidget,
    oeffneModal,
    _dismissOverlay,
    _neueFristSpeichern,
    _abschliessen,
    _exportICS,
    get fristen() { return state.fristen; }
  };

})();

// Auto-Export
if (typeof module !== 'undefined') module.exports = FristGuard;