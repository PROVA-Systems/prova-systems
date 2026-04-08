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
