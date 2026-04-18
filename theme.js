/* ============================================================
   PROVA — Theme Manager (theme.js) — v2 (Session 21)
   Einbinden in JEDE Seite: <script src="theme.js"></script>
   Muss VOR nav.js und vor dem <body>-Content eingebunden werden

   Single source of truth: localStorage['prova_theme'] ∈ {'dark','light','auto'}
   Auto → folgt System-Einstellung (prefers-color-scheme).
============================================================ */
(function() {
  /* ── MIGRATION (Session 21): alter Dual-Speicher → einheitlich ──
     Wenn prova_theme leer ist, aber prova_einstellungen.theme gesetzt:
     Wert rüber kopieren. Einmalig & harmlos. */
  try {
    if (!localStorage.getItem('prova_theme')) {
      var es = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
      if (es.theme === 'dark' || es.theme === 'light' || es.theme === 'auto') {
        localStorage.setItem('prova_theme', es.theme);
      }
    }
  } catch(e) {}

  var theme = localStorage.getItem('prova_theme') || 'dark';
  applyTheme(theme);

  /* Auf System-Änderung hören (nur relevant wenn Theme='auto') */
  if (window.matchMedia) {
    try {
      var mq = window.matchMedia('(prefers-color-scheme: light)');
      var onChange = function() {
        if ((localStorage.getItem('prova_theme') || 'dark') === 'auto') {
          applyTheme('auto');
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);  // Safari Legacy
    } catch(e) {}
  }

  function effectiveTheme(t) {
    if (t === 'auto') {
      try {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      } catch(e) { return 'dark'; }
    }
    return (t === 'light') ? 'light' : 'dark';
  }

  function applyTheme(t) {
    var root = document.documentElement;
    var eff  = effectiveTheme(t);
    if (eff === 'light') {
      root.setAttribute('data-theme', 'light');
      injectLightCSS();
    } else {
      root.removeAttribute('data-theme');
      removeLightCSS();
    }
  }

  function injectLightCSS() {
    if (document.getElementById('prova-light-css')) return;
    var style = document.createElement('style');
    style.id = 'prova-light-css';
    style.textContent = `
      [data-theme="light"] {
        --bg:       #f4f5f7;
        --bg2:      #ffffff;
        --bg3:      #f0f1f3;
        --surface:  #ffffff;
        --surface2: #f4f5f7;
        --border:   rgba(0,0,0,.09);
        --border2:  rgba(0,0,0,.13);
        --text:     #111827;
        --text2:    #374151;
        --text3:    #6b7280;
        --text4:    #9ca3af;
        --accent:   #2563eb;
        --accent2:  #1d4ed8;
        color-scheme: light;
      }
      [data-theme="light"] .sidebar {
        background: #ffffff;
        border-right-color: rgba(0,0,0,.09);
      }
      [data-theme="light"] .sb-item {
        color: #6b7280;
      }
      [data-theme="light"] .sb-item:hover {
        background: rgba(0,0,0,.04);
        color: #374151;
      }
      [data-theme="light"] .sb-item.active {
        color: #2563eb;
        background: rgba(37,99,235,.08);
      }
      [data-theme="light"] .sb-section-label {
        color: rgba(0,0,0,.4) !important;
      }
      [data-theme="light"] .topbar {
        background: #ffffff;
        border-bottom-color: rgba(0,0,0,.09);
      }
      [data-theme="light"] .card,
      [data-theme="light"] .feed-card,
      [data-theme="light"] .kpi-card {
        background: #ffffff;
        border-color: rgba(0,0,0,.09);
      }
      [data-theme="light"] body {
        background: #f4f5f7;
      }

      /* ── Einstellungen-Seite (es-*) ── */
      [data-theme="light"] .es-section,
      [data-theme="light"] .es-nav,
      [data-theme="light"] .es-content {
        background: #ffffff;
        border-color: rgba(0,0,0,.09);
      }
      [data-theme="light"] .es-section-title,
      [data-theme="light"] .es-zeile-label {
        color: #111827;
      }
      [data-theme="light"] .es-section-sub,
      [data-theme="light"] .es-zeile-sub {
        color: #6b7280;
      }
      [data-theme="light"] .es-zeile {
        border-bottom-color: rgba(0,0,0,.06);
      }
      [data-theme="light"] .es-nav-item {
        color: #374151;
      }
      [data-theme="light"] .es-nav-item:hover {
        background: rgba(0,0,0,.04);
      }
      [data-theme="light"] .es-nav-item.active {
        background: rgba(37,99,235,.08);
        color: #1d4ed8;
      }

      /* ── Form-Controls allgemein ── */
      [data-theme="light"] .es-select,
      [data-theme="light"] input[type="text"],
      [data-theme="light"] input[type="email"],
      [data-theme="light"] input[type="password"],
      [data-theme="light"] input[type="number"],
      [data-theme="light"] input[type="search"],
      [data-theme="light"] select,
      [data-theme="light"] textarea {
        background: #ffffff;
        color: #111827;
        border-color: rgba(0,0,0,.13);
      }
      [data-theme="light"] .es-btn {
        color: #111827;
        border-color: rgba(0,0,0,.13);
        background: #ffffff;
      }
      [data-theme="light"] .es-btn.primary {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
      }

      /* ═════════════════════════════════════════════════════════════════
         Dashboard, Archiv, Termine, Rechnungen, Kontakte, Briefvorlagen,
         Normen, Textbausteine, JVEG, E-Rechnung, Statistiken, Hilfe
         — alle Seiten mit Standard-Dashboard-Layout
         ═════════════════════════════════════════════════════════════════ */

      /* Haupt-Content-Bereich */
      [data-theme="light"] .main-content,
      [data-theme="light"] .page-content,
      [data-theme="light"] .main,
      [data-theme="light"] .main-wrap {
        background: #f4f5f7;
        color: #111827;
      }

      /* Überschriften */
      [data-theme="light"] h1,
      [data-theme="light"] h2,
      [data-theme="light"] h3,
      [data-theme="light"] h4,
      [data-theme="light"] .page-title,
      [data-theme="light"] .section-title {
        color: #111827;
      }

      /* Sekundärtext / Subtitle / Hints */
      [data-theme="light"] .subtitle,
      [data-theme="light"] .hint,
      [data-theme="light"] .muted,
      [data-theme="light"] .meta,
      [data-theme="light"] small {
        color: #6b7280;
      }

      /* Alle Kartentypen die es im Projekt gibt */
      [data-theme="light"] .stat-card,
      [data-theme="light"] .info-card,
      [data-theme="light"] .list-card,
      [data-theme="light"] .tile,
      [data-theme="light"] .panel,
      [data-theme="light"] .row-card,
      [data-theme="light"] .akte-card,
      [data-theme="light"] .termin-card,
      [data-theme="light"] .rechnung-row,
      [data-theme="light"] .kontakt-row,
      [data-theme="light"] .brief-card,
      [data-theme="light"] .norm-card,
      [data-theme="light"] .textbaustein-card,
      [data-theme="light"] .hilfe-card {
        background: #ffffff;
        color: #111827;
        border-color: rgba(0,0,0,.09);
      }

      /* Tabellen */
      [data-theme="light"] table {
        background: #ffffff;
        color: #111827;
      }
      [data-theme="light"] th {
        background: #f9fafb;
        color: #374151;
        border-bottom-color: rgba(0,0,0,.09);
      }
      [data-theme="light"] td {
        border-bottom-color: rgba(0,0,0,.06);
      }
      [data-theme="light"] tr:hover td {
        background: rgba(0,0,0,.02);
      }

      /* Such-Inputs, Filter-Bars */
      [data-theme="light"] .search-input,
      [data-theme="light"] .filter-input,
      [data-theme="light"] .search-bar input {
        background: #ffffff;
        color: #111827;
        border-color: rgba(0,0,0,.13);
      }

      /* Topbar-Elements */
      [data-theme="light"] .topbar-title {
        color: #111827;
      }
      [data-theme="light"] .topbar-icon,
      [data-theme="light"] .notification-icon {
        color: #374151;
      }

      /* Modals, Popups, Dropdowns */
      [data-theme="light"] .modal-box,
      [data-theme="light"] .modal-inner,
      [data-theme="light"] .popup,
      [data-theme="light"] .dropdown-menu,
      [data-theme="light"] [id$="-modal"] > div {
        background: #ffffff;
        color: #111827;
        border-color: rgba(0,0,0,.13);
      }
      [data-theme="light"] .modal-overlay,
      [data-theme="light"] .overlay {
        background: rgba(0,0,0,.4);
      }

      /* Buttons: generisch */
      [data-theme="light"] .btn,
      [data-theme="light"] button.secondary {
        background: #ffffff;
        color: #374151;
        border: 1px solid rgba(0,0,0,.13);
      }
      [data-theme="light"] .btn:hover {
        background: #f9fafb;
      }
      [data-theme="light"] .btn-primary,
      [data-theme="light"] button.primary {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
      }
      [data-theme="light"] .btn-primary:hover {
        background: #1d4ed8;
      }

      /* Status-Badges neutraler auf Light */
      [data-theme="light"] .badge,
      [data-theme="light"] .tag,
      [data-theme="light"] .chip {
        background: #f3f4f6;
        color: #374151;
        border-color: rgba(0,0,0,.09);
      }
    `;
    // Light-CSS ans Ende von <head> anhängen, damit es in der
    // Kaskadenordnung NACH prova-design.css kommt und gewinnt.
    // (Früher: insertBefore → Light-CSS wurde von Haupt-CSS überschrieben.)
    document.head.appendChild(style);
  }

  function removeLightCSS() {
    var el = document.getElementById('prova-light-css');
    if (el) el.remove();
  }

  // Global verfügbar machen für Einstellungen-Seite
  window.PROVA_THEME = {
    apply: applyTheme,
    get: function() { return localStorage.getItem('prova_theme') || 'dark'; },
    set: function(t) {
      localStorage.setItem('prova_theme', t);
      applyTheme(t);
    }
  };
})();

/* ── Schriftgröße beim Laden sofort anwenden (vor DOM-Ready) ── */
/* Session 23: akzeptiert sowohl Pixel-Strings ('14'/'16'/'18') aus dem
   Einstellungs-Dropdown als auch alte Keyword-Werte (klein/normal/gross).
   Liest aus beiden Speicherorten (prova_fontsize + prova_einstellungen.fontsize)
   mit automatischer Migration. */
(function() {
  var FONT_KEYWORDS = { klein:'13px', normal:'15px', gross:'17px', xgross:'19px' };

  function leseFontsize() {
    // 1) primär: dedizierter Key
    var v = localStorage.getItem('prova_fontsize');
    if (!v) {
      // 2) fallback/migration: aus Einstellungs-Objekt
      try {
        var es = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
        if (es.fontsize) {
          v = String(es.fontsize);
          localStorage.setItem('prova_fontsize', v);  // Migration
        }
      } catch(e) {}
    }
    return v || 'normal';
  }

  function zuPixel(v) {
    // Pixel-String mit/ohne px: '14' oder '14px' → '14px'
    if (/^\d+$/.test(v))    return v + 'px';
    if (/^\d+px$/.test(v))  return v;
    // Keyword-Fallback
    return FONT_KEYWORDS[v] || '15px';
  }

  var size = zuPixel(leseFontsize());
  document.documentElement.style.fontSize = size;
  document.documentElement.style.setProperty('--font-base', size);

  // Global exposen für Live-Update aus Einstellungen
  window.provaApplyFontsize = function(v) {
    var px = zuPixel(String(v));
    localStorage.setItem('prova_fontsize', String(v));
    document.documentElement.style.fontSize = px;
    document.documentElement.style.setProperty('--font-base', px);
  };
})();

/* ════════════════════════════════════════════════════════════════════════
   SESSION 20: UI-Toggles — Animationen + Kompakter Modus
   Liest aus localStorage['prova_einstellungen'] die Toggles 'animationen'
   und 'kompakt' und setzt entsprechende Klassen auf <body>. CSS wird einmal
   in <head> injiziert. Respektiert prefers-reduced-motion automatisch.

   Live-Update aus einstellungen.html: window.provaApplyUIToggles() aufrufen.
   ════════════════════════════════════════════════════════════════════════ */
(function() {
  function leseEinstellungen() {
    try { return JSON.parse(localStorage.getItem('prova_einstellungen') || '{}'); }
    catch(e) { return {}; }
  }

  function injizierteCSS() {
    if (document.getElementById('prova-ui-toggles-css')) return;
    var style = document.createElement('style');
    style.id = 'prova-ui-toggles-css';
    style.textContent = [
      /* ── ANIMATIONEN AUS — respektiert auch System-Einstellung ── */
      'body.no-animations *,',
      'body.no-animations *::before,',
      'body.no-animations *::after,',
      '@media (prefers-reduced-motion: reduce) { *, *::before, *::after',
      '{ transition-duration: 0.001ms !important;',
      '  transition-delay: 0ms !important;',
      '  animation-duration: 0.001ms !important;',
      '  animation-delay: 0ms !important;',
      '  animation-iteration-count: 1 !important;',
      '  scroll-behavior: auto !important; }',
      '}',
      /* Doppelt für body.no-animations da der Media-Query-Trick nur mit Media Query funktioniert */
      'body.no-animations *,',
      'body.no-animations *::before,',
      'body.no-animations *::after {',
      '  transition-duration: 0.001ms !important;',
      '  transition-delay: 0ms !important;',
      '  animation-duration: 0.001ms !important;',
      '  animation-delay: 0ms !important;',
      '  animation-iteration-count: 1 !important;',
      '}',

      /* ── KOMPAKTER MODUS — reduzierte Abstände auf der gesamten App ── */
      /* Haupt-Content */
      'body.compact-mode .page-content { padding: 14px 18px !important; }',
      'body.compact-mode main.page-content { padding: 14px 18px !important; }',
      'body.compact-mode .topbar { padding: 8px 18px !important; min-height: 48px !important; }',

      /* Überschriften */
      'body.compact-mode h1 { margin-bottom: 4px !important; font-size: 18px !important; }',
      'body.compact-mode h2 { margin-bottom: 4px !important; font-size: 16px !important; }',
      'body.compact-mode .breadcrumb { font-size: 12px !important; }',

      /* Sidebar kompakter */
      'body.compact-mode .sb-item { min-height: 34px !important; padding: 0 12px !important; font-size: 13px !important; }',
      'body.compact-mode .sb-logo { padding: 10px 14px !important; min-height: 44px !important; }',
      'body.compact-mode .sb-new-btn { padding: 8px 12px !important; margin: 8px 10px 4px !important; font-size: 12px !important; }',
      'body.compact-mode .sb-section-label { padding: 8px 16px 4px !important; }',

      /* Karten & Sektionen */
      'body.compact-mode .es-section { padding: 12px 16px !important; margin-bottom: 8px !important; }',
      'body.compact-mode .es-zeile { padding: 8px 0 !important; }',
      'body.compact-mode .es-section-header { margin-bottom: 10px !important; padding-bottom: 8px !important; }',

      /* Buttons */
      'body.compact-mode button.es-btn { padding: 6px 12px !important; font-size: 12px !important; }',
      'body.compact-mode input.es-input, body.compact-mode select.es-select, body.compact-mode textarea.es-input {',
      '  padding: 7px 10px !important; font-size: 13px !important;',
      '}',

      /* Tabellen */
      'body.compact-mode .table-body .pos-row, body.compact-mode .ht-row {',
      '  padding: 8px 12px !important; min-height: 38px !important;',
      '}',

      /* KPI-Karten & Stat-Chips */
      'body.compact-mode .kpi-card { padding: 10px 14px !important; }',
      'body.compact-mode .stat-chip { padding: 4px 10px !important; font-size: 12px !important; }',

      /* Margen zwischen Sektionen */
      'body.compact-mode section + section { margin-top: 6px !important; }'
    ].join('\n');
    // Ans Ende von <head> damit es die Haupt-CSS überschreibt (gleiche Logik wie Light-CSS-Fix)
    document.head.appendChild(style);
  }

  function applyUIToggles() {
    if (!document.body) return;  // ggf. zu früh — später nochmal
    var s = leseEinstellungen();
    // 'animationen' default: true. Nur wenn explizit false, Animationen aus.
    var keineAnimationen = (s.animationen === false);
    // 'kompakt' default: false. Nur aktivieren wenn explizit true.
    var kompakt = (s.kompakt === true);

    document.body.classList.toggle('no-animations', keineAnimationen);
    document.body.classList.toggle('compact-mode', kompakt);
    injizierteCSS();
  }

  // Global für Einstellungen-Seite — für Live-Update bei Toggle-Klick
  window.provaApplyUIToggles = applyUIToggles;

  // Beim Seitenladen ausführen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyUIToggles);
  } else {
    applyUIToggles();
  }
})();
