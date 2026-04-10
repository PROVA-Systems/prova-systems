/**
 * PROVA — Unified Navigation System v90
 * Generiert automatisch: Topbar + Sidebar-Drawer + Mobile-Bottom-Nav
 * Einbindung: <script src="nav.js" defer></script>
 * Benötigt: <div id="provaNavMount"></div> im Body
 */
(function () {
  'use strict';
  var NS = (window.PROVA_NAV = window.PROVA_NAV || {});

  /* ═══ CSS ══════════════════════════════════════════════════════════ */
  var CSS = `
:root {
  --nav-bg: #0a0e1a;
  --nav-surface: #111827;
  --nav-border: rgba(255,255,255,0.07);
  --nav-accent: #4f8ef7;
  --nav-text: #eef0f6;
  --nav-text2: #9aa5bc;
  --nav-text3: #5a6480;
  --nav-hover: rgba(255,255,255,0.05);
  --nav-active: rgba(79,142,247,0.12);
  --nav-topbar-h: 56px;
  --nav-drawer-w: 260px;
}

/* ─── TOPBAR ─── */
#provaTopbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: var(--nav-topbar-h);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  display: flex; align-items: center; gap: 0;
  padding: 0 16px;
  box-sizing: border-box;
}
#provaTopbar .nav-logo {
  font-size: 18px; font-weight: 800; color: var(--nav-text);
  letter-spacing: -0.5px; text-decoration: none;
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
#provaTopbar .nav-logo span { color: var(--nav-accent); }
#provaTopbar .nav-logo svg { width: 22px; height: 22px; }
.nav-burger {
  background: none; border: none; cursor: pointer;
  color: var(--nav-text2); padding: 8px; margin-right: 4px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; flex-shrink: 0;
}
.nav-burger:hover { background: var(--nav-hover); color: var(--nav-text); }
.nav-burger svg { width: 20px; height: 20px; }
.nav-topbar-title {
  flex: 1; font-size: 15px; font-weight: 600;
  color: var(--nav-text); padding: 0 12px;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.nav-topbar-actions {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
}
.nav-topbar-actions a, .nav-topbar-actions button {
  background: none; border: none; cursor: pointer;
  color: var(--nav-text2); padding: 7px; border-radius: 7px;
  font-size: 16px; text-decoration: none;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.nav-topbar-actions a:hover, .nav-topbar-actions button:hover {
  background: var(--nav-hover); color: var(--nav-text);
}
.nav-paket-badge {
  font-size: 10px; font-weight: 700; padding: 3px 8px;
  border-radius: 20px; letter-spacing: 0.04em;
  background: rgba(79,142,247,0.15); color: var(--nav-accent);
  border: 1px solid rgba(79,142,247,0.25);
}

/* ─── OVERLAY ─── */
#provaOverlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.55); z-index: 300;
  backdrop-filter: blur(2px);
}
#provaOverlay.open { display: block; }

/* ─── DRAWER ─── */
#provaDrawer {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: var(--nav-drawer-w); z-index: 400;
  background: var(--nav-bg);
  border-right: 1px solid var(--nav-border);
  display: flex; flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.24s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
#provaDrawer.open { transform: translateX(0); box-shadow: 4px 0 32px rgba(0,0,0,0.4); }

.drawer-header {
  height: var(--nav-topbar-h);
  display: flex; align-items: center; gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid var(--nav-border);
  flex-shrink: 0;
}
.drawer-header .nav-logo { flex: 1; }
.drawer-close {
  background: none; border: none; cursor: pointer;
  color: var(--nav-text2); padding: 7px; border-radius: 7px;
  font-size: 18px; line-height: 1;
}
.drawer-close:hover { background: var(--nav-hover); color: var(--nav-text); }

.drawer-scroll {
  flex: 1; overflow-y: auto; padding: 10px 10px 0;
  display: flex; flex-direction: column; gap: 2px;
}
.drawer-scroll::-webkit-scrollbar { width: 4px; }
.drawer-scroll::-webkit-scrollbar-thumb { background: var(--nav-border); border-radius: 2px; }

.nav-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--nav-text3);
  padding: 16px 10px 4px; margin: 0;
}
.nav-group-label:first-child { padding-top: 4px; }

.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 10px; border-radius: 8px;
  color: var(--nav-text2); font-size: 14px;
  text-decoration: none; min-height: 42px;
  box-sizing: border-box; transition: background 0.12s, color 0.12s;
  cursor: pointer;
}
.nav-item:hover { background: var(--nav-hover); color: var(--nav-text); }
.nav-item.active {
  background: var(--nav-active); color: var(--nav-accent);
  font-weight: 600;
}
.nav-item .ni-icon {
  width: 20px; text-align: center; font-size: 15px;
  flex-shrink: 0; line-height: 1;
}
.nav-item .ni-label { flex: 1; }
.nav-item .ni-lock {
  font-size: 11px; opacity: 0.5; margin-left: auto; flex-shrink: 0;
}

/* Aktiver Fall */
.drawer-active-case {
  margin: 0 2px 6px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(79,142,247,0.2);
  background: rgba(79,142,247,0.06);
}
.dac-label { font-size: 10px; font-weight: 700; color: var(--nav-text3);
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
.dac-az { font-size: 13px; font-weight: 700; color: var(--nav-accent); }
.dac-cta {
  display: block; margin-top: 8px; padding: 8px 10px; border-radius: 7px;
  background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.2);
  color: var(--nav-accent); font-size: 12px; font-weight: 600;
  text-decoration: none; text-align: center;
}

/* Drawer Footer */
.drawer-footer {
  flex-shrink: 0; padding: 10px 10px 14px;
  border-top: 1px solid var(--nav-border);
}
.drawer-footer-links { display: flex; flex-direction: column; gap: 1px; }
.drawer-footer a {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border-radius: 8px; color: var(--nav-text2); font-size: 13px;
  text-decoration: none; min-height: 38px;
}
.drawer-footer a:hover { background: var(--nav-hover); color: var(--nav-text); }
.drawer-footer-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 4px 4px; gap: 8px;
}
.drawer-legal {
  display: flex; flex-wrap: wrap; gap: 4px 10px;
  padding: 8px 4px 0; border-top: 1px solid var(--nav-border); margin-top: 6px;
}
.drawer-legal a {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--nav-text3); text-decoration: none;
  padding: 0;
}
.drawer-legal a:hover { color: var(--nav-text2); }

/* ─── BOTTOM NAV (Mobile) ─── */
#provaBottomNav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 200; height: 56px;
  background: var(--nav-bg); border-top: 1px solid var(--nav-border);
  display: flex; align-items: stretch;
}
.bn-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px;
  color: var(--nav-text2); text-decoration: none; font-size: 9px;
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 4px; border: none; background: none; cursor: pointer;
}
.bn-item:hover, .bn-item.active { color: var(--nav-accent); }
.bn-icon { font-size: 18px; line-height: 1; }

/* ─── PAGE OFFSET ─── */
body { padding-top: var(--nav-topbar-h) !important; }
@media (max-width: 768px) {
  body { padding-bottom: 56px !important; }
  #provaBottomNav { display: flex; }
}

/* ─── DARK BASE ─── */
body:not(.prova-light) {
  background: #0a0e1a; color: #eef0f6;
}
`;

  /* ═══ NAV STRUKTUR ═══════════════════════════════════════════════ */
  var GROUPS = [
    { label: null, items: [
      { href: 'dashboard.html', icon: '⊞', label: 'Zentrale' },
      { href: 'archiv.html', icon: '📂', label: 'Alle Fälle' },
      { href: 'termine.html', icon: '📅', label: 'Kalender' }
    ]},
    { label: 'Gutachten', items: [
      { href: 'app.html', icon: '✏️', label: 'Neues Gutachten', dynApp: true },
      { href: 'ortstermin-modus.html', icon: '📍', label: 'Ortstermin' },
      { href: 'stellungnahme.html', icon: '📋', label: '§6 Fachurteil' },
      { href: 'freigabe.html', icon: '✅', label: 'Freigabe & PDF' },
      { href: 'gericht-auftrag.html', icon: '🏛️', label: 'Gerichtsauftrag' },
      { href: 'ergaenzung.html', icon: '🧩', label: 'Ergänzung §411' },
      { href: 'schiedsgutachten.html', icon: '⚖️', label: 'Schiedsgutachten' },
      { href: 'widerspruch-gutachten.html', icon: '↩️', label: 'Widerspruch' },
      { href: 'baubegleitung.html', icon: '🏗️', label: 'Baubegleitung', team: true }
    ]},
    { label: 'Werkzeuge', items: [
      { href: 'normen.html', icon: '📚', label: 'Normen' },
      { href: 'textbausteine.html', icon: '📝', label: 'Textbausteine' },
      { href: 'positionen.html', icon: '💰', label: 'Positionen' },
      { href: 'jveg.html', icon: '🧮', label: 'JVEG-Rechner' }
    ]},
    { label: 'Abrechnung', items: [
      { href: 'rechnungen.html', icon: '💶', label: 'Rechnungen' },
      { href: 'schnelle-rechnung.html', icon: '⚡', label: 'Schnellrechnung' },
      { href: 'mahnwesen.html', icon: '📨', label: 'Mahnwesen' },
      { href: 'erechnung.html', icon: '📄', label: 'E-Rechnung', team: true },
      { href: 'statistiken.html', icon: '📈', label: 'Statistiken' },
      { href: 'effizienz.html', icon: '⚡', label: 'Effizienz', team: true },
      { href: 'jahresbericht.html', icon: '📊', label: 'Jahresbericht' }
    ]},
    { label: 'Büro', items: [
      { href: 'briefvorlagen.html', icon: '✉️', label: 'Briefe & Vorlagen' },
      { href: 'kontakte.html', icon: '👥', label: 'Kontakte' },
      { href: 'benachrichtigungen.html', icon: '🔔', label: 'Benachrichtigungen' },
      { href: 'import-assistent.html', icon: '📥', label: 'Import' },
      { href: 'einstellungen.html', icon: '⚙️', label: 'Einstellungen' },
      { href: 'hilfe.html', icon: '❓', label: 'Hilfe & Support' }
    ]}
  ];

  var BOTTOM = [
    { href: 'dashboard.html', icon: '⊞', label: 'Zentrale' },
    { href: 'archiv.html', icon: '📂', label: 'Fälle' },
    { href: 'app.html', icon: '✏️', label: 'Gutachten', dynApp: true },
    { href: 'rechnungen.html', icon: '💶', label: 'Rechn.' },
    { href: '#', icon: '☰', label: 'Mehr', burger: true }
  ];

  /* ═══ HELPERS ═══════════════════════════════════════════════════ */
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function page() {
    var p = (location.pathname || '').split('/').pop() || '';
    return p || 'index.html';
  }
  function appHref() {
    var t = (window.PROVA && PROVA.tier) || localStorage.getItem('prova_paket') || 'Solo';
    return t === 'Team' ? 'app-enterprise.html' : 'app-starter.html';
  }
  function isTeam() {
    var t = (window.PROVA && PROVA.tier) || localStorage.getItem('prova_paket') || 'Solo';
    return t === 'Team';
  }
  function isActive(href) {
    var cur = page();
    var base = (href || '').split('?')[0].split('/').pop();
    if (base === cur) return true;
    if (base === 'app.html' && (cur === 'app-starter.html' || cur === 'app-enterprise.html')) return true;
    if (base === 'stellungnahme.html' && cur === 'stellungnahme-gate.html') return true;
    if (base === 'mahnwesen.html' && (cur.startsWith('mahnung'))) return true;
    return false;
  }
  function pageTitle() {
    var titles = {
      'dashboard.html': 'Zentrale', 'archiv.html': 'Alle Fälle',
      'termine.html': 'Kalender', 'app-starter.html': 'Neues Gutachten',
      'app-enterprise.html': 'Neues Gutachten', 'app.html': 'Neues Gutachten',
      'ortstermin-modus.html': 'Ortstermin', 'stellungnahme.html': '§6 Fachurteil',
      'stellungnahme-gate.html': '§6 Fachurteil', 'freigabe.html': 'Freigabe & PDF',
      'gericht-auftrag.html': 'Gerichtsauftrag', 'ergaenzung.html': 'Ergänzung §411',
      'schiedsgutachten.html': 'Schiedsgutachten', 'widerspruch-gutachten.html': 'Widerspruch',
      'baubegleitung.html': 'Baubegleitung', 'normen.html': 'Normen',
      'textbausteine.html': 'Textbausteine', 'positionen.html': 'Positionen',
      'jveg.html': 'JVEG-Rechner', 'rechnungen.html': 'Rechnungen',
      'schnelle-rechnung.html': 'Schnellrechnung', 'mahnwesen.html': 'Mahnwesen',
      'erechnung.html': 'E-Rechnung', 'statistiken.html': 'Statistiken',
      'effizienz.html': 'Effizienz', 'jahresbericht.html': 'Jahresbericht',
      'briefvorlagen.html': 'Briefe & Vorlagen', 'kontakte.html': 'Kontakte',
      'benachrichtigungen.html': 'Benachrichtigungen', 'import-assistent.html': 'Import',
      'einstellungen.html': 'Einstellungen', 'hilfe.html': 'Hilfe & Support',
      'akte.html': 'Fallakte'
    };
    return titles[page()] || document.title.replace(' · PROVA','').replace('PROVA — ','').replace('PROVA – ','') || 'PROVA';
  }
  function paketBadge() {
    var p = (window.PROVA && PROVA.paket) || localStorage.getItem('prova_paket') || 'Solo';
    return p;
  }

  /* ═══ RENDER ════════════════════════════════════════════════════ */
  function buildCSS() {
    if (document.getElementById('prova-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'prova-nav-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildTopbar() {
    var el = document.createElement('div');
    el.id = 'provaTopbar';
    el.innerHTML =
      '<button class="nav-burger" id="provaBurger" aria-label="Menü öffnen">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '</button>' +
      '<a href="dashboard.html" class="nav-logo">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4f8ef7"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f8ef7" stroke-width="1.5" fill="none"/></svg>' +
      'PRO<span>VA</span>' +
      '</a>' +
      '<div class="nav-topbar-title" id="provaPageTitle">' + esc(pageTitle()) + '</div>' +
      '<div class="nav-topbar-actions">' +
      '<span class="nav-paket-badge" id="navPaketBadge">' + esc(paketBadge()) + '</span>' +
      '<a href="benachrichtigungen.html" title="Benachrichtigungen">🔔</a>' +
      '<a href="einstellungen.html" title="Einstellungen">⚙️</a>' +
      '</div>';
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById('provaBurger').addEventListener('click', NS.open);
  }

  function buildOverlay() {
    var el = document.createElement('div');
    el.id = 'provaOverlay';
    el.addEventListener('click', NS.close);
    document.body.appendChild(el);
  }

  function buildDrawer() {
    var appH = appHref();
    var team = isTeam();
    var cur = page();

    // Aktiver Fall
    var az = localStorage.getItem('prova_letztes_az') || '';
    var activeCase = az
      ? '<div class="drawer-active-case"><div class="dac-label">Aktiver Fall</div><div class="dac-az">' + esc(az) + '</div><a href="akte.html?az=' + encodeURIComponent(az) + '" class="dac-cta">Zur Akte →</a></div>'
      : '';

    // Nav Links
    var navHtml = activeCase;
    GROUPS.forEach(function(g) {
      if (g.label) navHtml += '<div class="nav-group-label">' + esc(g.label) + '</div>';
      g.items.forEach(function(it) {
        var href = it.dynApp ? appH : it.href;
        var active = isActive(it.dynApp ? 'app.html' : it.href);
        var locked = it.team && !team;
        var cls = 'nav-item' + (active ? ' active' : '') + (locked ? ' nav-item-locked' : '');
        navHtml +=
          '<a href="' + (locked ? '#' : esc(href)) + '" class="' + cls + '"' +
          (locked ? ' onclick="return false" title="Nur im Team-Paket"' : '') + '>' +
          '<span class="ni-icon">' + it.icon + '</span>' +
          '<span class="ni-label">' + esc(it.label) + '</span>' +
          (locked ? '<span class="ni-lock">🔒</span>' : '') +
          '</a>';
      });
    });

    // Footer
    var footer =
      '<div class="drawer-footer">' +
      '<div class="drawer-footer-links">' +
      '<a href="einstellungen.html"><span class="ni-icon">⚙️</span>Einstellungen</a>' +
      '<a href="hilfe.html"><span class="ni-icon">❓</span>Hilfe & Support</a>' +
      '</div>' +
      '<div class="drawer-footer-row">' +
      '<span class="nav-paket-badge" id="drawerPaketBadge">' + esc(paketBadge()) + '</span>' +
      '<a href="app-login.html" onclick="if(window.netlifyIdentity)netlifyIdentity.logout();localStorage.clear();sessionStorage.clear();" style="font-size:12px;color:var(--nav-text3);text-decoration:none;">Abmelden</a>' +
      '</div>' +
      '<div class="drawer-legal">' +
      '<a href="legal/agb.html">AGB</a>' +
      '<a href="legal/datenschutz.html">Datenschutz</a>' +
      '<a href="legal/avv.html">AVV</a>' +
      '<a href="legal/impressum.html">Impressum</a>' +
      '</div>' +
      '</div>';

    var el = document.createElement('div');
    el.id = 'provaDrawer';
    el.innerHTML =
      '<div class="drawer-header">' +
      '<a href="dashboard.html" class="nav-logo">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4f8ef7"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f8ef7" stroke-width="1.5"/></svg>' +
      'PRO<span>VA</span>' +
      '</a>' +
      '<button class="drawer-close" onclick="PROVA_NAV.close()">✕</button>' +
      '</div>' +
      '<div class="drawer-scroll">' + navHtml + '</div>' +
      footer;

    document.body.appendChild(el);

    // Auch alten Mount befüllen falls vorhanden
    var oldMount = document.getElementById('provaDrawerMount');
    if (oldMount) oldMount.style.display = 'none';
  }

  function buildBottomNav() {
    var appH = appHref();
    var cur = page();
    var el = document.createElement('nav');
    el.id = 'provaBottomNav';
    var html = '';
    BOTTOM.forEach(function(it) {
      if (it.burger) {
        html += '<button class="bn-item" onclick="PROVA_NAV.open()"><span class="bn-icon">' + it.icon + '</span><span>' + it.label + '</span></button>';
      } else {
        var href = it.dynApp ? appH : it.href;
        var active = isActive(it.dynApp ? 'app.html' : it.href);
        html += '<a href="' + esc(href) + '" class="bn-item' + (active ? ' active' : '') + '"><span class="bn-icon">' + it.icon + '</span><span>' + it.label + '</span></a>';
      }
    });
    el.innerHTML = html;
    document.body.appendChild(el);
  }

  /* ═══ PUBLIC API ════════════════════════════════════════════════ */
  NS.open = function() {
    var d = document.getElementById('provaDrawer');
    var o = document.getElementById('provaOverlay');
    if (d) d.classList.add('open');
    if (o) o.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  NS.close = function() {
    var d = document.getElementById('provaDrawer');
    var o = document.getElementById('provaOverlay');
    if (d) d.classList.remove('open');
    if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  };

  NS.paintPaketBadges = function() {
    var p = paketBadge();
    ['navPaketBadge', 'drawerPaketBadge', 'topbarPaket', 'drawerPaket'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = p;
    });
  };

  NS.init = function() {
    buildCSS();
    // Alte page-spezifische Nav-Elemente verstecken (werden durch nav.js ersetzt)
    var oldTopbar = document.querySelector('.topbar:not(#provaTopbar)');
    if (oldTopbar) oldTopbar.style.display = 'none';
    var oldOverlay = document.querySelector('.drawer-overlay');
    if (oldOverlay) oldOverlay.style.display = 'none';
    var oldDrawer = document.querySelector('.drawer:not(#provaDrawer)');
    if (oldDrawer) oldDrawer.style.display = 'none';
    if (!document.getElementById('provaTopbar')) buildTopbar();
    if (!document.getElementById('provaOverlay')) buildOverlay();
    if (!document.getElementById('provaDrawer')) buildDrawer();
    if (!document.getElementById('provaBottomNav')) buildBottomNav();
    NS.paintPaketBadges();

    // ESC schließt Drawer
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') NS.close();
    });
  };

  /* ═══ START ═════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NS.init);
  } else {
    NS.init();
  }
})();
