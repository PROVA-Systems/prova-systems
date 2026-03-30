/* ============================================================
   PROVA — Zentrale Navigation (nav.js) v3.0
   Einbinden in JEDE Seite:  <script src="nav.js"></script>

   v3.0 Änderungen:
   - NEU: Sidebar-Toggle OBEN (direkt unter Logo, wie claude.ai)
   - NEU: Nav-Architektur: FÄLLE / ABRECHNUNG / BIBLIOTHEK / BÜRO
   - NEU: Trial-Badge zentral oben injiziert (verschwindet nach Kauf)
   - NEU: "Solo"-Badge aus Topbar entfernt (steht in Sidebar unten)
   - FIX: appUrl → app.html (einheitlich Solo + Team)
============================================================ */
(function () {

  /* ── Aktive Seite erkennen ─────────────────────────────── */
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';
  if (page === 'gutachten.html' || page === 'app-starter.html' ||
      page === 'app-pro.html'   || page === 'app-enterprise.html') {
    page = 'app.html';
  }

  /* ── Paket aus localStorage ────────────────────────────── */
  var rawPaket = localStorage.getItem('prova_paket') || 'Solo';
  var paketMap  = { Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' };
  var paket     = paketMap[rawPaket] || rawPaket;
  if (paketMap[rawPaket]) localStorage.setItem('prova_paket', paket);
  var paketColors = { Solo: '#4f8ef7', Team: '#a78bfa' };
  var pc = paketColors[paket] || '#4f8ef7';
  var appUrl = 'app.html'; // Solo + Team → gleiche Datei

  /* ── Trial-Status ──────────────────────────────────────── */
  var status     = localStorage.getItem('prova_status') || 'Trial';
  var trialEnde  = localStorage.getItem('prova_trial_end') || '';
  var isTrial    = (status === 'Trial' || status === 'trial');
  var trialTage  = 14;
  if (trialEnde) {
    var diff = Math.ceil((new Date(trialEnde) - new Date()) / 86400000);
    trialTage = Math.max(0, diff);
  }

  /* ── Nav-Gruppen: neue Architektur ─────────────────────── */
  var FAELLE = [
    { href: 'dashboard.html',    icon: '⊞',  label: 'Zentrale'   },
    { href: 'archiv.html',       icon: '📂', label: 'Alle Fälle' },
    { href: 'termine.html',      icon: '📅', label: 'Kalender'   },
  ];
  var ABRECHNUNG = [
    { href: 'rechnungen.html',       icon: '🧾', label: 'Rechnungen'    },
    { href: 'jveg.html',             icon: '⚖️', label: 'JVEG-Rechner'  },
    { href: 'kostenermittlung.html', icon: '📐', label: 'Kosten & Aufmaß'},
  ];
  var BIBLIOTHEK = [
    { href: 'normen.html',        icon: '📚', label: 'Normen'        },
    { href: 'textbausteine.html', icon: '📝', label: 'Textbausteine' },
    { href: 'positionen.html',    icon: '🗂️', label: 'Positionen'   },
    { href: 'briefvorlagen.html', icon: '✉️', label: 'Briefvorlagen' },
  ];
  var BUERO = [
    { href: 'kontakte.html',    icon: '👥', label: 'Kontakte'     },
    { href: 'baubegleitung.html',icon: '🏗️', label: 'Baubegleitung'},
  ];

  function makeItem(item) {
    var isActive = (page === item.href);
    return '<a href="' + item.href + '" class="sb-item' + (isActive ? ' active' : '') + '" title="' + item.label + '">'
      + '<span class="sb-icon" aria-hidden="true">' + item.icon + '</span>'
      + '<span class="sb-label">' + item.label + '</span>'
      + '</a>';
  }
  function makeGroup(label, items) {
    return '<div class="sb-section-label">' + label + '</div>' + items.map(makeItem).join('');
  }

  /* ── CSS injizieren ────────────────────────────────────── */
  if (!document.getElementById('prova-nav-css')) {
    var style = document.createElement('style');
    style.id = 'prova-nav-css';
    style.textContent = ''
      + ':root{--sb-w:228px;--sb-w-col:56px;}'

      /* SIDEBAR */
      + '.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sb-w);min-width:var(--sb-w);'
      +   'background:var(--bg2,#111318);border-right:1px solid var(--border,rgba(255,255,255,.07));'
      +   'display:flex;flex-direction:column;z-index:200;'
      +   'transition:width .22s cubic-bezier(.4,0,.2,1),min-width .22s cubic-bezier(.4,0,.2,1);'
      +   'overflow:hidden;font-family:var(--font-ui,"DM Sans",system-ui,sans-serif);}'
      + '.sidebar.collapsed{width:var(--sb-w-col);min-width:var(--sb-w-col);}'

      /* LOGO ROW — logo + toggle nebeneinander */
      + '.sb-logo-row{display:flex;align-items:center;'
      +   'border-bottom:1px solid var(--border,rgba(255,255,255,.07));'
      +   'min-height:52px;flex-shrink:0;}'
      + '.sb-logo{display:flex;align-items:center;gap:10px;padding:14px 12px;'
      +   'flex:1;overflow:hidden;cursor:pointer;text-decoration:none;}'
      + '.sb-logo:hover .sb-logo-text{opacity:.8;}'
      + '.sb-logo-mark{width:30px;height:30px;background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;'
      +   'font-size:13px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(79,142,247,.3);}'
      + '.sb-logo-text{font-size:16px;font-weight:800;letter-spacing:-.02em;color:var(--text,#eaecf4);'
      +   'white-space:nowrap;overflow:hidden;transition:opacity .18s,width .22s;}'
      + '.sb-logo-text span{color:var(--accent,#4f8ef7);}'
      + '.sidebar.collapsed .sb-logo-text{opacity:0;width:0;}'

      /* TOGGLE-BUTTON oben (wie claude.ai) */
      + '.sb-toggle-top{display:flex;align-items:center;justify-content:center;'
      +   'width:36px;height:36px;border:none;background:none;cursor:pointer;'
      +   'color:var(--text3,#4d5568);border-radius:8px;flex-shrink:0;margin-right:6px;'
      +   'transition:color .15s,background .15s;font-size:16px;font-family:inherit;}'
      + '.sb-toggle-top:hover{color:var(--text,#eaecf4);background:rgba(255,255,255,.07);}'
      + '.sb-toggle-top .sb-tog-icon{display:inline-flex;align-items:center;justify-content:center;'
      +   'transition:transform .22s cubic-bezier(.4,0,.2,1);line-height:1;}'
      + '.sidebar.collapsed .sb-toggle-top .sb-tog-icon{transform:rotate(180deg);}'

      /* NEUER FALL BUTTON */
      + '.sb-new-btn{display:flex;align-items:center;gap:8px;margin:12px 12px 6px;padding:10px 14px;'
      +   'background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;'
      +   'cursor:pointer;font-family:inherit;transition:all .18s;'
      +   'box-shadow:0 2px 12px rgba(79,142,247,.3);white-space:nowrap;width:calc(100% - 24px);}'
      + '.sb-new-btn:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 4px 16px rgba(79,142,247,.4);}'
      + '.sb-new-btn:active{transform:translateY(0);}'
      + '.sb-new-btn .btn-icon{font-size:16px;flex-shrink:0;line-height:1;}'
      + '.sb-new-btn .btn-label{transition:opacity .18s;overflow:hidden;white-space:nowrap;}'
      + '.sidebar.collapsed .sb-new-btn .btn-label{opacity:0;width:0;margin:0;padding:0;}'
      + '.sidebar.collapsed .sb-new-btn{justify-content:center;padding:10px;margin:12px 8px 6px;width:auto;}'

      /* NAV */
      + '.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 10px;display:flex;flex-direction:column;}'
      + '.sb-nav::-webkit-scrollbar{width:3px;}'
      + '.sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}'

      /* SECTION LABEL */
      + '.sb-section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;'
      +   'color:rgba(255,255,255,0.45)!important;padding:6px 10px 4px;margin-top:16px;'
      +   'white-space:nowrap;overflow:visible;transition:opacity .18s,height .18s,padding .18s,margin .18s;'
      +   'user-select:none;line-height:1.2;}'
      + '.sb-section-label:first-child{margin-top:4px;}'
      + '.sidebar.collapsed .sb-section-label{opacity:0;height:0;padding:0;margin:0;overflow:hidden;}'

      /* NAV ITEMS */
      + '.sb-item{display:flex;align-items:center;gap:10px;padding:0 10px;min-height:36px;'
      +   'border-radius:8px;color:var(--text3,#4d5568);font-size:13px;font-weight:500;'
      +   'cursor:pointer;transition:color .12s,background .12s;text-decoration:none;position:relative;}'
      + '.sb-item:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}'
      + '.sb-item.active{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.08);}'
      + '.sb-item.active::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;'
      +   'background:var(--accent,#4f8ef7);border-radius:0 2px 2px 0;}'
      + '.sb-icon{width:22px;height:22px;display:flex;align-items:center;justify-content:center;'
      +   'font-size:14px;flex-shrink:0;}'
      + '.sb-label{white-space:nowrap;overflow:hidden;transition:opacity .18s;}'
      + '.sidebar.collapsed .sb-label{opacity:0;width:0;}'
      + '.sidebar.collapsed .sb-item{justify-content:center;padding:0;min-height:40px;}'

      /* Tooltip on collapsed */
      + '.sidebar.collapsed .sb-item[title]:hover::after{content:attr(title);position:absolute;'
      +   'left:calc(var(--sb-w-col) + 8px);top:50%;transform:translateY(-50%);'
      +   'background:var(--bg2,#111318);border:1px solid var(--border2,rgba(255,255,255,.13));'
      +   'color:var(--text,#eaecf4);font-size:12px;font-weight:500;padding:5px 12px;'
      +   'border-radius:7px;white-space:nowrap;z-index:500;pointer-events:none;'
      +   'box-shadow:0 4px 12px rgba(0,0,0,.3);}'

      /* FOOTER */
      + '.sb-footer{margin-top:auto;flex-shrink:0;border-top:1px solid var(--border,rgba(255,255,255,.07));}'
      + '.sb-settings{display:flex;align-items:center;gap:10px;padding:0 10px;min-height:36px;'
      +   'color:var(--text3,#4d5568);font-size:13px;font-weight:500;'
      +   'cursor:pointer;text-decoration:none;transition:color .12s,background .12s;'
      +   'border-radius:8px;margin:6px 10px 0;position:relative;}'
      + '.sb-settings:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}'
      + '.sb-settings.active{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.08);}'
      + '.sb-paket{display:flex;align-items:center;gap:8px;padding:10px 14px;}'
      + '.paket-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}'
      + '.paket-name{font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap;'
      +   'overflow:hidden;transition:opacity .18s;}'
      + '.sidebar.collapsed .paket-name{opacity:0;width:0;}'

      /* TRIAL-BADGE zentriert oben */
      + '#prova-trial-badge{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9999;'
      +   'background:linear-gradient(90deg,#22c55e,#16a34a);color:#fff;'
      +   'font-size:11px;font-weight:700;letter-spacing:.04em;'
      +   'padding:4px 16px;border-radius:0 0 10px 10px;'
      +   'box-shadow:0 2px 12px rgba(34,197,94,.4);white-space:nowrap;'
      +   'pointer-events:none;user-select:none;}'

      /* MAIN CONTENT OFFSET */
      + '.main-wrap{margin-left:var(--sb-w)!important;transition:margin-left .22s cubic-bezier(.4,0,.2,1);}'
      + '.sidebar.collapsed~.main-wrap{margin-left:var(--sb-w-col)!important;}'
      + '.main{margin-left:var(--sb-w)!important;transition:margin-left .22s cubic-bezier(.4,0,.2,1);}'
      + '.sidebar.collapsed~.main{margin-left:var(--sb-w-col)!important;}'

      /* MOBILE */
      + '.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199;'
      +   'backdrop-filter:blur(2px);opacity:0;transition:opacity .25s;}'
      + '.sb-overlay.open{display:block;opacity:1;}'
      + '@media(max-width:768px){'
      +   '.sidebar{transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);}'
      +   '.sidebar.mobile-open{transform:translateX(0);width:var(--sb-w);min-width:var(--sb-w);}'
      +   '.sidebar.mobile-open .sb-label,.sidebar.mobile-open .sb-logo-text,'
      +   '.sidebar.mobile-open .sb-section-label,.sidebar.mobile-open .paket-name,'
      +   '.sidebar.mobile-open .btn-label{opacity:1!important;width:auto!important;}'
      +   '.sidebar.mobile-open .sb-new-btn{justify-content:flex-start;padding:10px 14px;width:calc(100% - 24px);}'
      +   '.sidebar.mobile-open .sb-item{justify-content:flex-start;padding:0 10px;}'
      +   '.main-wrap,.main{margin-left:0!important;}'
      + '}'
    ;
    document.head.appendChild(style);
  }

  /* ── HTML aufbauen ─────────────────────────────────────── */
  var settingsActive = (page === 'einstellungen.html') ? ' active' : '';
  var trialLabel = isTrial
    ? '✦ Test-Version · noch ' + trialTage + (trialTage === 1 ? ' Tag' : ' Tage')
    : '';

  var html = ''
    /* Logo-Zeile: Logo links, Toggle-Button rechts */
    + '<div class="sb-logo-row">'
    +   '<a class="sb-logo" href="dashboard.html" title="Zur Zentrale">'
    +     '<div class="sb-logo-mark">P</div>'
    +     '<div class="sb-logo-text">PR<span>O</span>VA</div>'
    +   '</a>'
    +   '<button class="sb-toggle-top" id="sb-toggle-top" title="Sidebar ein-/ausklappen" aria-label="Sidebar umschalten">'
    +     '<span class="sb-tog-icon">‹</span>'
    +   '</button>'
    + '</div>'

    /* Neuer Fall Button */
    + '<button class="sb-new-btn" id="sb-new-btn" onclick="window.location.href=\'' + appUrl + '\'">'
    +   '<span class="btn-icon">+</span>'
    +   '<span class="btn-label">Neuer Fall</span>'
    + '</button>'

    /* Navigation */
    + '<div class="sb-nav">'
    +   makeGroup('Fälle',       FAELLE)
    +   makeGroup('Abrechnung',  ABRECHNUNG)
    +   makeGroup('Bibliothek',  BIBLIOTHEK)
    +   makeGroup('Büro',        BUERO)
    + '</div>'

    /* Footer */
    + '<div class="sb-footer">'
    +   '<a href="einstellungen.html" class="sb-settings' + settingsActive + '" title="Einstellungen">'
    +     '<span class="sb-icon" aria-hidden="true">⚙️</span>'
    +     '<span class="sb-label">Einstellungen</span>'
    +   '</a>'
    +   '<div class="sb-paket">'
    +     '<div class="paket-dot" style="background:' + pc + '"></div>'
    +     '<span class="paket-name" style="color:' + pc + '">' + paket + '</span>'
    +   '</div>'
    + '</div>'
  ;

  /* ── In DOM einfügen ───────────────────────────────────── */
  function injectNav() {
    var sb = document.getElementById('sidebar');
    if (!sb) return;
    sb.innerHTML = html;
    sb.className = 'sidebar';

    /* Overlay für Mobile */
    if (!document.getElementById('sb-overlay')) {
      var ov = document.createElement('div');
      ov.className = 'sb-overlay';
      ov.id = 'sb-overlay';
      ov.onclick = function() { closeMobileSidebar(); };
      sb.parentNode.insertBefore(ov, sb.nextSibling);
    }

    /* Collapsed-State wiederherstellen */
    var isCol = localStorage.getItem('prova_sb_collapsed') === '1';
    if (isCol) sb.classList.add('collapsed');

    /* Toggle-Button oben */
    var togBtn = document.getElementById('sb-toggle-top');
    if (togBtn) {
      togBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        sb.classList.toggle('collapsed');
        localStorage.setItem('prova_sb_collapsed', sb.classList.contains('collapsed') ? '1' : '0');
      });
    }

    // Trial-Badge wird von trial-guard.js gesetzt

    /* Solo-Badge aus Topbar entfernen (steht in Sidebar unten) */
    setTimeout(function() {
      document.querySelectorAll('.topbar-paket, .badge-paket, [data-paket-badge]').forEach(function(el) {
        el.style.display = 'none';
      });
    }, 100);
  }

  /* ── Mobile ─────────────────────────────────────────────── */
  window.openMobileSidebar = function() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.add('mobile-open');
    if (ov) ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeMobileSidebar = function() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.remove('mobile-open');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileSidebar();
  });



  /* ── View Transitions CSS ────────────────────────────── */
  if (!document.getElementById('prova-vt-css')) {
    var vtStyle = document.createElement('style');
    vtStyle.id = 'prova-vt-css';
    vtStyle.textContent = [
      '@keyframes provaFadeOut{from{opacity:1;translate:0 0}to{opacity:0;translate:0 -4px}}',
      '@keyframes provaFadeIn{from{opacity:0;translate:0 4px}to{opacity:1;translate:0 0}}',
      '::view-transition-old(root){animation:provaFadeOut .14s ease forwards}',
      '::view-transition-new(root){animation:provaFadeIn .17s ease forwards}'
    ].join('');
    document.head.appendChild(vtStyle);
  }
  /* ── View Transitions: weiche Seitenübergänge ───────── */
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    // Nur interne relative Links (keine #, keine externen)
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('javascript') ||
        a.target === '_blank') return;
    if (!document.startViewTransition) return;
    e.preventDefault();
    document.startViewTransition(function() {
      window.location.href = href;
    });
  }, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
