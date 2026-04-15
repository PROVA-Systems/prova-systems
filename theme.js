/* ============================================================
   PROVA — Theme Manager (theme.js)
   Einbinden in JEDE Seite: <script src="theme.js"></script>
   Muss VOR nav.js und vor dem <body>-Content eingebunden werden
============================================================ */
(function() {
  // 3-Way: 'dark' | 'light' | 'system'
  // 'system' folgt dem OS-Setting automatisch
  var stored = localStorage.getItem('prova_theme');
  var theme = stored || 'system';
  applyTheme(theme);

  // System-Theme: auf OS-Änderungen reagieren
  if (window.matchMedia) {
    var sysMq = window.matchMedia('(prefers-color-scheme: light)');
    var _onSysChange = function() {
      if ((localStorage.getItem('prova_theme') || 'system') === 'system') {
        applyTheme('system');
      }
    };
    if (sysMq.addEventListener) sysMq.addEventListener('change', _onSysChange);
    else if (sysMq.addListener) sysMq.addListener(_onSysChange);
  }

  function applyTheme(t) {
    var root = document.documentElement;
    var effectiveTheme = t;
    if (t === 'system') {
      effectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    if (effectiveTheme === 'light') {
      root.setAttribute('data-theme', 'light');
      injectLightCSS();
    } else {
      root.removeAttribute('data-theme');
      removeLightCSS();
    }
    // Data-Attribut für CSS-Selektoren
    root.setAttribute('data-effective-theme', effectiveTheme);
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
    },
    // Gibt den tatsächlich angewendeten Theme zurück (light/dark), nie 'system'
    getEffective: function() {
      return document.documentElement.getAttribute('data-effective-theme') || 'dark';
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
