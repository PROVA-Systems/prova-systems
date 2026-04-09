/* ============================================================
   PROVA — Theme & Basis-Typo (theme.js)
   Einbinden in JEDE App-Seite: <script src="theme.js"></script>
   Quellen (Priorität):
   1) localStorage.prova_einstellungen  { theme, fontsize }
   2) Legacy: prova_theme, prova_fontsize / prova_fontsize_px
============================================================ */
(function () {
  var ES_KEY = 'prova_einstellungen';

  function readEinstellungen() {
    try {
      return JSON.parse(localStorage.getItem(ES_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  /** theme-Modus in Einstellungen: 'auto' | 'light' | 'dark' */
  function getThemeMode() {
    var es = readEinstellungen();
    if (es.theme === 'auto' || es.theme === 'light' || es.theme === 'dark') return es.theme;
    var legacy = localStorage.getItem('prova_theme');
    if (legacy === 'light' || legacy === 'dark') return legacy;
    return 'dark';
  }

  function effectivePalette(mode) {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    if (mode === 'auto') {
      try {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      } catch (e) {
        return 'dark';
      }
    }
    return 'dark';
  }

  function applyPalette(palette) {
    var root = document.documentElement;
    if (palette === 'light') {
      root.setAttribute('data-theme', 'light');
      injectLightCSS();
    } else {
      root.removeAttribute('data-theme');
      removeLightCSS();
    }
    try {
      root.style.colorScheme = palette === 'light' ? 'light' : 'dark';
    } catch (e) {}
  }

  function injectLightCSS() {
    if (document.getElementById('prova-light-css')) return;
    var style = document.createElement('style');
    style.id = 'prova-light-css';
    style.textContent = [
      '[data-theme="light"] {',
      '  --bg:       #f4f5f7;',
      '  --bg2:      #ffffff;',
      '  --bg3:      #f0f1f3;',
      '  --surface:  #ffffff;',
      '  --surface2: #f4f5f7;',
      '  --border:   rgba(0,0,0,.09);',
      '  --border2:  rgba(0,0,0,.13);',
      '  --text:     #111827;',
      '  --text2:    #374151;',
      '  --text3:    #6b7280;',
      '  --text4:    #9ca3af;',
      '  --accent:   #2563eb;',
      '  --accent2:  #1d4ed8;',
      '  color-scheme: light;',
      '}',
      '[data-theme="light"] .sidebar { background:#fff; border-right-color:rgba(0,0,0,.09); }',
      '[data-theme="light"] .sb-item { color:#6b7280; }',
      '[data-theme="light"] .sb-item:hover { background:rgba(0,0,0,.04); color:#374151; }',
      '[data-theme="light"] .sb-item.active { color:#2563eb; background:rgba(37,99,235,.08); }',
      '[data-theme="light"] .sb-section-label { color:rgba(0,0,0,.4)!important; }',
      '[data-theme="light"] .topbar { background:#fff; border-bottom-color:rgba(0,0,0,.09); }',
      '[data-theme="light"] .card, [data-theme="light"] .feed-card, [data-theme="light"] .kpi-card { background:#fff; border-color:rgba(0,0,0,.09); }',
      '[data-theme="light"] body { background:#f4f5f7; }'
    ].join('\n');
    var first = document.head.querySelector('style, link');
    if (first) document.head.insertBefore(style, first);
    else document.head.appendChild(style);
  }

  function removeLightCSS() {
    var el = document.getElementById('prova-light-css');
    if (el) el.remove();
  }

  var mediaListener = null;

  function bindAutoMedia() {
    if (mediaListener) {
      try {
        window.matchMedia('(prefers-color-scheme: light)').removeListener(mediaListener);
      } catch (e) {}
      mediaListener = null;
    }
    if (getThemeMode() !== 'auto') return;
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    mediaListener = function () {
      applyPalette(effectivePalette('auto'));
    };
    try {
      mq.addEventListener('change', mediaListener);
    } catch (e) {
      mq.addListener(mediaListener);
    }
  }

  function applyFromStorage() {
    var mode = getThemeMode();
    localStorage.setItem('prova_theme_mode', mode);
    var pal = effectivePalette(mode);
    localStorage.setItem('prova_theme', pal);
    applyPalette(pal);
    bindAutoMedia();

    /* Schrift: Einstellungen (px) > Legacy-Map */
    var es = readEinstellungen();
    var px = es.fontsize;
    if (!px) {
      var leg = localStorage.getItem('prova_fontsize_px');
      if (leg) px = leg;
    }
    if (!px) {
      var key = localStorage.getItem('prova_fontsize') || 'normal';
      var map = { klein: '13px', normal: '15px', gross: '17px', xgross: '19px' };
      var size = map[key] || '15px';
      document.documentElement.style.fontSize = size;
    } else {
      var n = parseInt(px, 10);
      if (!isNaN(n) && n >= 12 && n <= 24) {
        document.documentElement.style.fontSize = n + 'px';
        localStorage.setItem('prova_fontsize_px', String(n));
      }
    }
    try {
      document.documentElement.style.setProperty('--font-base', document.documentElement.style.fontSize || '15px');
    } catch (e) {}
  }

  applyFromStorage();

  window.PROVA_THEME = {
    /** Nur light|dark — für Legacy-Calls */
    apply: function (palette) {
      applyPalette(palette === 'light' ? 'light' : 'dark');
      localStorage.setItem('prova_theme', palette === 'light' ? 'light' : 'dark');
    },
    get: function () {
      return localStorage.getItem('prova_theme') || 'dark';
    },
    set: function (palette) {
      localStorage.setItem('prova_theme', palette === 'light' ? 'light' : 'dark');
      applyPalette(palette === 'light' ? 'light' : 'dark');
    },
    /** Neu: Modus wie in Einstellungen */
    setMode: function (mode) {
      try {
        var es = readEinstellungen();
        es.theme = mode;
        localStorage.setItem(ES_KEY, JSON.stringify(es));
      } catch (e) {}
      applyFromStorage();
    },
    refresh: applyFromStorage
  };

  window.PROVA_FONT = {
    setPx: function (n) {
      var v = parseInt(n, 10);
      if (isNaN(v) || v < 12 || v > 24) return;
      document.documentElement.style.fontSize = v + 'px';
      localStorage.setItem('prova_fontsize_px', String(v));
      try {
        var es = readEinstellungen();
        es.fontsize = String(v);
        localStorage.setItem(ES_KEY, JSON.stringify(es));
      } catch (e) {}
      try {
        document.documentElement.style.setProperty('--font-base', v + 'px');
      } catch (e) {}
    }
  };
})();
