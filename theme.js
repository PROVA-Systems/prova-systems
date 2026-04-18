/* ============================================================
   PROVA — Theme Manager (theme.js)
   Einbinden in JEDE Seite: <script src="theme.js"></script>
   Muss VOR nav.js und vor dem <body>-Content eingebunden werden
============================================================ */
(function() {
  var theme = localStorage.getItem('prova_theme') || 'dark';
  applyTheme(theme);

  function applyTheme(t) {
    var root = document.documentElement;
    if (t === 'light') {
      root.setAttribute('data-theme', 'light');
      // Light-Mode CSS-Variablen überschreiben
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
    // Vor dem ersten Stylesheet einfügen damit es überschrieben werden kann
    var first = document.head.querySelector('style, link');
    if (first) {
      document.head.insertBefore(style, first);
    } else {
      document.head.appendChild(style);
    }
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
(function() {
  var FONT_SIZES = { klein:'13px', normal:'15px', gross:'17px', xgross:'19px' };
  var fs = localStorage.getItem('prova_fontsize') || 'normal';
  var size = FONT_SIZES[fs] || '15px';
  document.documentElement.style.fontSize = size;
  document.documentElement.style.setProperty('--font-base', size);
})();
