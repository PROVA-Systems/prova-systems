/* ============================================================
   PROVA — Zentrale Navigation (nav.js)
   Einbinden in JEDE Seite:  <script src="nav.js"></script>
   Das Script ersetzt das Element <nav id="sidebar"> komplett.
   ============================================================ */
(function () {
  /* ── Aktive Seite erkennen ── */
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';

  /* ── Paket aus localStorage ── */
  var paket = localStorage.getItem('prova_paket') || 'Starter';
  var paketColors = { Starter: '#4f8ef7', Pro: '#f59e0b', Enterprise: '#a78bfa' };
  var pc = paketColors[paket] || paketColors.Starter;
  var appUrl = paket === 'Enterprise' ? 'app-enterprise.html'
             : paket === 'Pro'        ? 'app-pro.html'
             :                          'app-starter.html';

  /* ── Nav-Items: Reihenfolge ist kanonisch ── */
  var MAIN = [
    { href: 'dashboard.html',    icon: '⊞',  label: 'Zentrale',      tip: 'Zentrale' },
    { href: 'archiv.html',       icon: '📁', label: 'Fälle',         tip: 'Fälle' },
    { href: 'termine.html',      icon: '📅', label: 'Kalender',      tip: 'Kalender' },
    { href: 'rechnungen.html',   icon: '💶', label: 'Rechnungen',    tip: 'Rechnungen' },
    { href: 'briefvorlagen.html',icon: '✉️', label: 'Briefe',        tip: 'Briefe' },
  ];
  var TOOLS = [
    { href: 'jveg.html',             icon: '⚖️', label: 'JVEG-Rechner',   tip: 'JVEG-Rechner' },
    { href: 'kostenermittlung.html', icon: '📐', label: 'Kosten & Aufmaß', tip: 'Kosten & Aufmaß' },
    { href: 'positionen.html',       icon: '🗂', label: 'Positionen',      tip: 'Positionsdatenbank' },
    { href: 'normen.html',           icon: '📚', label: 'Normen',          tip: 'Normendatenbank' },
    { href: 'textbausteine.html',    icon: '✏️', label: 'Textbausteine',   tip: 'Textbausteine' },
    { href: 'kontakte.html',         icon: '👥', label: 'Kontakte',        tip: 'Kontakte' },
  ];

  function makeItem(item) {
    var active = (page === item.href) ? ' active' : '';
    return '<a href="' + item.href + '" class="sb-item' + active + '" data-tip="' + item.tip + '">'
      + '<span class="sb-icon">' + item.icon + '</span>'
      + '<span class="sb-label">' + item.label + '</span>'
      + '</a>';
  }

  /* ── CSS injizieren (einmalig) ── */
  if (!document.getElementById('prova-nav-css')) {
    var style = document.createElement('style');
    style.id = 'prova-nav-css';
    style.textContent = [
      ':root{--sb-w:220px;--sb-w-col:52px;}',
      '.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sb-w);min-width:var(--sb-w);',
      '  background:var(--bg2,#111318);border-right:1px solid var(--border,rgba(255,255,255,.07));',
      '  display:flex;flex-direction:column;z-index:200;',
      '  transition:width .22s cubic-bezier(.4,0,.2,1),min-width .22s cubic-bezier(.4,0,.2,1);overflow:hidden;}',
      '.sidebar.collapsed{width:var(--sb-w-col);min-width:var(--sb-w-col);}',

      /* Logo */
      '.sb-logo{display:flex;align-items:center;gap:10px;padding:16px 14px 12px;',
      '  border-bottom:1px solid var(--border,rgba(255,255,255,.07));min-height:54px;overflow:hidden;',
      '  cursor:pointer;flex-shrink:0;}',
      '.sb-logo:hover .sb-logo-text{opacity:.8;}',
      '.sb-logo-mark{width:28px;height:28px;background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));',
      '  border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;',
      '  font-size:13px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(79,142,247,.35);}',
      '.sb-logo-text{font-size:15px;font-weight:800;letter-spacing:-.02em;color:var(--text,#eaecf4);',
      '  white-space:nowrap;overflow:hidden;transition:opacity .15s,width .15s;}',
      '.sb-logo-text span{color:var(--accent,#4f8ef7);}',
      '.sidebar.collapsed .sb-logo-text{opacity:0;width:0;}',

      /* Neuer Fall Button */
      '.sb-new-btn{display:flex;align-items:center;gap:8px;margin:10px 10px 4px;padding:9px 12px;',
      '  background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));',
      '  border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;',
      '  font-family:inherit;transition:all .15s;box-shadow:0 2px 10px rgba(79,142,247,.3);white-space:nowrap;}',
      '.sb-new-btn:hover{opacity:.9;transform:translateY(-1px);}',
      '.sb-new-btn .btn-icon{font-size:14px;flex-shrink:0;}',
      '.sb-new-btn .btn-label{transition:opacity .15s,width .15s;overflow:hidden;}',
      '.sidebar.collapsed .sb-new-btn .btn-label{opacity:0;width:0;margin:0;padding:0;}',
      '.sidebar.collapsed .sb-new-btn{justify-content:center;padding:9px;}',

      /* Nav */
      '.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 8px 8px;display:flex;flex-direction:column;gap:1px;}',
      '.sb-nav::-webkit-scrollbar{width:3px;}',
      '.sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}',

      /* Section label */
      '.sb-section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;',
      '  color:var(--text3,#4d5568);padding:10px 8px 4px;margin-top:4px;white-space:nowrap;',
      '  overflow:hidden;transition:opacity .15s,height .15s,padding .15s;}',
      '.sidebar.collapsed .sb-section-label{opacity:0;height:0;padding:0;}',

      /* Items */
      '.sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;',
      '  color:var(--text3,#4d5568);font-size:13px;font-weight:500;cursor:pointer;',
      '  transition:all .12s;text-decoration:none;border-left:2px solid transparent;position:relative;}',
      '.sb-item:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}',
      '.sb-item.active{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.08);',
      '  border-left-color:var(--accent,#4f8ef7);font-weight:600;}',
      '.sb-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0;transition:transform .12s;}',
      '.sb-item:hover .sb-icon{transform:translateX(1px);}',
      '.sb-label{white-space:nowrap;overflow:hidden;transition:opacity .15s,width .15s;}',
      '.sidebar.collapsed .sb-label{opacity:0;width:0;}',
      '.sidebar.collapsed .sb-item{justify-content:center;padding:10px;}',
      /* Tooltip */
      '.sidebar.collapsed .sb-item[data-tip]:hover::after{content:attr(data-tip);position:absolute;',
      '  left:calc(var(--sb-w-col) + 8px);top:50%;transform:translateY(-50%);',
      '  background:#1e2536;border:1px solid var(--border2,rgba(255,255,255,.13));',
      '  color:var(--text,#eaecf4);font-size:12px;font-weight:500;padding:5px 10px;',
      '  border-radius:6px;white-space:nowrap;z-index:500;pointer-events:none;}',

      /* Paket Badge */
      '.sb-paket{display:flex;align-items:center;gap:7px;padding:10px 12px;',
      '  border-top:1px solid var(--border,rgba(255,255,255,.07));margin-top:auto;flex-shrink:0;}',
      '.paket-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
      '.paket-name{font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap;',
      '  overflow:hidden;transition:opacity .15s,width .15s;}',
      '.sidebar.collapsed .paket-name{opacity:0;width:0;}',

      /* Collapse toggle */
      '.sb-collapse{display:flex;align-items:center;gap:8px;padding:9px 12px;',
      '  border-top:1px solid var(--border,rgba(255,255,255,.07));',
      '  color:var(--text3,#4d5568);font-size:12px;cursor:pointer;',
      '  background:none;border-left:none;border-right:none;border-bottom:none;',
      '  font-family:inherit;transition:color .12s;flex-shrink:0;}',
      '.sb-collapse:hover{color:var(--text2,#8b93ab);}',
      '.sb-toggle-icon{font-size:14px;transition:transform .22s;flex-shrink:0;}',
      '.sidebar.collapsed .sb-toggle-icon{transform:rotate(180deg);}',
      '.sb-collapse-label{white-space:nowrap;overflow:hidden;transition:opacity .15s,width .15s;}',
      '.sidebar.collapsed .sb-collapse-label{opacity:0;width:0;}',

      /* Main-wrap offset */
      '.main-wrap{margin-left:var(--sb-w);transition:margin-left .22s cubic-bezier(.4,0,.2,1);}',
      '.sidebar.collapsed ~ .main-wrap{margin-left:var(--sb-w-col);}',
      /* Legacy .main support */
      '.main{margin-left:var(--sb-w);transition:margin-left .22s cubic-bezier(.4,0,.2,1);}',
      '.sidebar.collapsed ~ .main{margin-left:var(--sb-w-col);}',

      /* Mobile */
      '@media(max-width:768px){',
      '  .sidebar{transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);}',
      '  .sidebar.mobile-open{transform:translateX(0);width:var(--sb-w);min-width:var(--sb-w);}',
      '  .sidebar.mobile-open .sb-label,.sidebar.mobile-open .sb-logo-text,',
      '  .sidebar.mobile-open .sb-section-label,.sidebar.mobile-open .paket-name,',
      '  .sidebar.mobile-open .btn-label{opacity:1;width:auto;}',
      '  .sidebar.mobile-open .sb-new-btn{justify-content:flex-start;padding:9px 12px;}',
      '  .main-wrap,.main{margin-left:0!important;}',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  /* ── HTML aufbauen ── */
  var html = [
    '<div class="sb-logo" onclick="window.location.href=\'dashboard.html\'" title="Zur Zentrale">',
    '  <div class="sb-logo-mark">P</div>',
    '  <div class="sb-logo-text">PR<span>O</span>VA</div>',
    '</div>',

    '<button class="sb-new-btn" id="sb-new-btn" onclick="window.location.href=\'' + appUrl + '\'">',
    '  <span class="btn-icon">+</span>',
    '  <span class="btn-label">Neuer Fall</span>',
    '</button>',

    '<div class="sb-nav">',
    MAIN.map(makeItem).join(''),
    '<div class="sb-section-label">Werkzeuge</div>',
    TOOLS.map(makeItem).join(''),
    '</div>',

    '<div class="sb-paket" id="sb-paket-display">',
    '  <div class="paket-dot" id="sb-paket-dot" style="background:' + pc + '"></div>',
    '  <span class="paket-name" id="sb-paket-name" style="color:' + pc + '">' + paket + '</span>',
    '</div>',

    '<button class="sb-collapse" id="sb-collapse-btn">',
    '  <span class="sb-toggle-icon" id="sb-toggle-icon">‹</span>',
    '  <span class="sb-collapse-label">Einklappen</span>',
    '</button>',
  ].join('');

  /* ── In DOM einfügen ── */
  function injectNav() {
    var existing = document.getElementById('sidebar');
    if (!existing) return;
    existing.innerHTML = html;
    existing.className = 'sidebar';

    // Collapse-State aus localStorage wiederherstellen
    var collapsed = localStorage.getItem('prova_nav_collapsed') === '1';
    if (collapsed) existing.classList.add('collapsed');

    // Collapse-Button
    var btn = document.getElementById('sb-collapse-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        existing.classList.toggle('collapsed');
        var isCol = existing.classList.contains('collapsed');
        localStorage.setItem('prova_nav_collapsed', isCol ? '1' : '0');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
