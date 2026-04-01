/* ============================================================
   PROVA — Zentrale Navigation (nav.js) v2.0
   Einbinden in JEDE Seite:  <script src="nav.js"></script>
   
   v2.0 Änderungen:
   - Fix: Kein Layout-Shift mehr (font-weight bleibt konstant)
   - Fix: Alle Items haben fixe min-height (36px)
   - Fix: Icons haben fixe Breite (kein Emoji-Shift)
   - Neu: Gruppierung Arbeit / Werkzeuge / Verwaltung
   - Neu: Einstellungen fixiert im Footer
   - Neu: Mobile Overlay-Support
   - Neu: Einheitlicher Link zu gutachten.html (statt 3 separate Apps)
   - Neu: Baubegleitung in Nav aufgenommen
   ============================================================ */
(function () {
  /* ── Aktive Seite erkennen ── */
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';
  // Auch app-starter/pro/enterprise als gutachten.html matchen
  if (page === 'app-starter.html' || page === 'app-pro.html' || page === 'app-enterprise.html' || page === 'gutachten.html') {
    page = 'gutachten';
  }

  /* ── Paket aus localStorage (Solo/Team) ── */
  var rawPaket = localStorage.getItem('prova_paket') || 'Solo';
  // Backward-Kompatibilität: alte Werte mappen
  var paketMap = { Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' };
  var paket = paketMap[rawPaket] || rawPaket;
  // Korrektur: Alten Paketnamen überschreiben damit alle Seiten den richtigen lesen
  if (paketMap[rawPaket]) localStorage.setItem('prova_paket', paket);
  var paketColors = { Solo: '#4f8ef7', Team: '#a78bfa' };
  var pc = paketColors[paket] || paketColors.Solo;
  
  // Übergangsphase: noch separate Dateien, später gutachten.html
  var appUrl = paket === 'Team' ? 'app-enterprise.html' : 'gutachten.html';

  /* ── Nav-Items: workflow-orientierte Gruppierung ── */
  var ARBEIT = [
    { href: 'dashboard.html',     icon: '⊞',  label: 'Zentrale' },
    { href: 'archiv.html',        icon: '📂', label: 'Fälle' },
    { href: 'termine.html',       icon: '📅', label: 'Kalender' },
  ];
  var WERKZEUGE = [
    { href: 'normen.html',            icon: '📚', label: 'Normen' },
    { href: 'textbausteine.html',     icon: '📝', label: 'Textbausteine' },
    { href: 'positionen.html',        icon: '🗂️', label: 'Positionen' },
    { href: 'jveg.html',              icon: '⚖️', label: 'JVEG-Rechner' },
    { href: 'kostenermittlung.html',  icon: '📐', label: 'Kosten & Aufmaß' },
  ];
  var VERWALTUNG = [
    { href: 'briefvorlagen.html', icon: '✉️', label: 'Briefe' },
    { href: 'rechnungen.html',    icon: '🧾', label: 'Rechnungen' },
    { href: 'kontakte.html',      icon: '👥', label: 'Kontakte' },
    { href: 'baubegleitung.html', icon: '🏗️', label: 'Baubegleitung' },
  ];

  function makeItem(item) {
    var isActive = (page === item.href) || (page === 'gutachten' && item.href === appUrl);
    var cls = 'sb-item' + (isActive ? ' active' : '');
    return '<a href="' + item.href + '" class="' + cls + '" title="' + item.label + '">'
      + '<span class="sb-icon" aria-hidden="true">' + item.icon + '</span>'
      + '<span class="sb-label">' + item.label + '</span>'
      + '</a>';
  }

  function makeGroup(label, items) {
    return '<div class="sb-section-label">' + label + '</div>'
      + items.map(makeItem).join('');
  }

  /* ── CSS injizieren (einmalig) ── */
  if (!document.getElementById('prova-nav-css')) {
    var style = document.createElement('style');
    style.id = 'prova-nav-css';
    style.textContent = ''
      /* Root vars */
      + ':root{--sb-w:228px;--sb-w-col:56px;}'

      /* ─── SIDEBAR SHELL ─── */
      + '.sidebar{'
      +   'position:fixed;left:0;top:0;bottom:0;width:var(--sb-w);min-width:var(--sb-w);'
      +   'background:var(--bg2,#111318);border-right:1px solid var(--border,rgba(255,255,255,.07));'
      +   'display:flex;flex-direction:column;z-index:200;'
      +   'transition:width .22s cubic-bezier(.4,0,.2,1),min-width .22s cubic-bezier(.4,0,.2,1);'
      +   'overflow:hidden;font-family:var(--font-ui,"DM Sans",system-ui,sans-serif);'
      + '}'
      + '.sidebar.collapsed{width:var(--sb-w-col);min-width:var(--sb-w-col);}'

      /* ─── LOGO ─── */
      + '.sb-logo{'
      +   'display:flex;align-items:center;gap:10px;padding:14px 16px;'
      +   'border-bottom:1px solid var(--border,rgba(255,255,255,.07));'
      +   'min-height:52px;overflow:hidden;cursor:pointer;flex-shrink:0;'
      +   'text-decoration:none;'
      + '}'
      + '.sb-logo:hover .sb-logo-text{opacity:.8;}'
      + '.sb-logo-mark{'
      +   'width:30px;height:30px;background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;'
      +   'font-size:13px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(79,142,247,.3);'
      + '}'
      + '.sb-logo-text{'
      +   'font-size:16px;font-weight:800;letter-spacing:-.02em;color:var(--text,#eaecf4);'
      +   'white-space:nowrap;overflow:hidden;transition:opacity .18s;'
      + '}'
      + '.sb-logo-text span{color:var(--accent,#4f8ef7);}'
      + '.sidebar.collapsed .sb-logo-text{opacity:0;width:0;}'

      /* ─── NEUER FALL BUTTON ─── */
      + '.sb-new-btn{'
      +   'display:flex;align-items:center;gap:8px;margin:12px 12px 6px;padding:10px 14px;'
      +   'background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;'
      +   'cursor:pointer;font-family:inherit;transition:all .18s;'
      +   'box-shadow:0 2px 12px rgba(79,142,247,.3);white-space:nowrap;'
      + '}'
      + '.sb-new-btn:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 4px 16px rgba(79,142,247,.4);}'
      + '.sb-new-btn:active{transform:translateY(0);}'
      + '.sb-new-btn .btn-icon{font-size:16px;flex-shrink:0;line-height:1;}'
      + '.sb-new-btn .btn-label{transition:opacity .18s;overflow:hidden;}'
      + '.sidebar.collapsed .sb-new-btn .btn-label{opacity:0;width:0;margin:0;padding:0;}'
      + '.sidebar.collapsed .sb-new-btn{justify-content:center;padding:10px;margin:12px 8px 6px;}'

      /* ─── NAV SCROLL AREA ─── */
      + '.sb-nav{'
      +   'flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 10px;'
      +   'display:flex;flex-direction:column;gap:0;'
      + '}'
      + '.sb-nav::-webkit-scrollbar{width:3px;}'
      + '.sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}'

      /* ─── SECTION LABEL ─── */
      + '.sb-section-label{'
      +   'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;'
      +   'color:rgba(255,255,255,0.55) !important;padding:6px 10px 4px;margin-top:16px;'
      +   'white-space:nowrap;overflow:visible;'
      +   'transition:opacity .18s,height .18s,padding .18s;'
      +   'user-select:none;line-height:1.2;'
      + '}'
      + '.sb-section-label:first-child{margin-top:4px;}'
      + '.sidebar.collapsed .sb-section-label{opacity:0;height:0;padding:0;margin:0;overflow:hidden;}'

      /* ─── NAV ITEMS — NO LAYOUT SHIFT ─── */
      + '.sb-item{'
      +   'display:flex;align-items:center;gap:10px;'
      +   'padding:0 10px;'  /* horizontal padding only, height via min-height */
      +   'min-height:36px;'  /* FIXED HEIGHT — prevents shifting */
      +   'border-radius:8px;'
      +   'color:var(--text3,#4d5568);font-size:13px;'
      +   'font-weight:500;'  /* NEVER changes — key fix */
      +   'cursor:pointer;transition:color .12s,background .12s;'
      +   'text-decoration:none;position:relative;'
      +   'border-left:none;'  /* removed — was causing shift */
      + '}'
      + '.sb-item:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}'
      
      /* Active state — NO font-weight change, NO border-left */
      + '.sb-item.active{'
      +   'color:var(--accent,#4f8ef7);'
      +   'background:rgba(79,142,247,.08);'
      +   'font-weight:500;'  /* SAME as default — no shift */
      + '}'
      /* Active indicator via box-shadow inset — no layout impact */
      + '.sb-item.active::before{'
      +   'content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;'
      +   'background:var(--accent,#4f8ef7);border-radius:0 2px 2px 0;'
      + '}'
      
      /* Icon — fixed width container prevents emoji width variations */
      + '.sb-icon{'
      +   'width:22px;height:22px;'
      +   'display:inline-flex;align-items:center;justify-content:center;'
      +   'font-size:15px;flex-shrink:0;line-height:1;'
      + '}'
      
      /* Label */
      + '.sb-label{white-space:nowrap;overflow:hidden;transition:opacity .18s;}'
      + '.sidebar.collapsed .sb-label{opacity:0;width:0;}'
      + '.sidebar.collapsed .sb-item{justify-content:center;padding:0;min-height:40px;}'

      /* Tooltip on collapsed */
      + '.sidebar.collapsed .sb-item[title]:hover::after{'
      +   'content:attr(title);position:absolute;'
      +   'left:calc(var(--sb-w-col) + 8px);top:50%;transform:translateY(-50%);'
      +   'background:var(--bg2,#111318);border:1px solid var(--border2,rgba(255,255,255,.13));'
      +   'color:var(--text,#eaecf4);font-size:12px;font-weight:500;padding:5px 12px;'
      +   'border-radius:7px;white-space:nowrap;z-index:500;pointer-events:none;'
      +   'box-shadow:0 4px 12px rgba(0,0,0,.3);'
      + '}'

      /* ─── FOOTER: EINSTELLUNGEN + PAKET + COLLAPSE ─── */
      + '.sb-footer{margin-top:auto;flex-shrink:0;border-top:1px solid var(--border,rgba(255,255,255,.07));}'
      
      /* Einstellungen Link */
      + '.sb-settings{'
      +   'display:flex;align-items:center;gap:10px;padding:0 10px;min-height:36px;'
      +   'color:var(--text3,#4d5568);font-size:13px;font-weight:500;'
      +   'cursor:pointer;text-decoration:none;transition:color .12s,background .12s;'
      +   'border-radius:8px;margin:6px 10px 0;position:relative;'
      + '}'
      + '.sb-settings:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}'
      + '.sb-settings.active{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.08);}'

      /* Paket Badge */
      + '.sb-paket{'
      +   'display:flex;align-items:center;gap:8px;padding:10px 14px;'
      + '}'
      + '.paket-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}'
      + '.paket-name{'
      +   'font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap;'
      +   'overflow:hidden;transition:opacity .18s;'
      + '}'
      + '.sidebar.collapsed .paket-name{opacity:0;width:0;}'

      /* Collapse toggle */
      + '.sb-collapse{'
      +   'display:flex;align-items:center;gap:8px;padding:9px 14px;width:100%;'
      +   'color:var(--text3,#4d5568);font-size:12px;cursor:pointer;'
      +   'background:none;border:none;font-family:inherit;transition:color .12s;flex-shrink:0;'
      + '}'
      + '.sb-collapse:hover{color:var(--text2,#8b93ab);}'
      + '.sb-toggle-icon{font-size:14px;transition:transform .22s;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;}'
      + '.sidebar.collapsed .sb-toggle-icon{transform:rotate(180deg);}'
      + '.sb-collapse-label{white-space:nowrap;overflow:hidden;transition:opacity .18s;}'
      + '.sidebar.collapsed .sb-collapse-label{opacity:0;width:0;}'

      /* ─── MAIN CONTENT OFFSET ─── */
      + '.main-wrap{margin-left:var(--sb-w);transition:margin-left .22s cubic-bezier(.4,0,.2,1);}'
      + '.sidebar.collapsed ~ .main-wrap{margin-left:var(--sb-w-col);}'
      + '.main{margin-left:var(--sb-w);transition:margin-left .22s cubic-bezier(.4,0,.2,1);}'
      + '.sidebar.collapsed ~ .main{margin-left:var(--sb-w-col);}'

      /* ─── MOBILE ─── */
      + '.sb-overlay{'
      +   'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199;'
      +   'backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);'
      +   'opacity:0;transition:opacity .25s;'
      + '}'
      + '.sb-overlay.open{display:block;opacity:1;}'
      + '@media(max-width:768px){'
      +   '.sidebar{transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);}'
      +   '.sidebar.mobile-open{transform:translateX(0);width:var(--sb-w);min-width:var(--sb-w);}'
      +   '.sidebar.mobile-open .sb-label,.sidebar.mobile-open .sb-logo-text,'
      +   '.sidebar.mobile-open .sb-section-label,.sidebar.mobile-open .paket-name,'
      +   '.sidebar.mobile-open .btn-label,.sidebar.mobile-open .sb-collapse-label{opacity:1;width:auto;}'
      +   '.sidebar.mobile-open .sb-new-btn{justify-content:flex-start;padding:10px 14px;}'
      +   '.sidebar.mobile-open .sb-item{justify-content:flex-start;padding:0 10px;}'
      +   '.main-wrap,.main{margin-left:0!important;}'
      + '}'
    ;
    document.head.appendChild(style);
  }

  /* ── HTML aufbauen ── */
  var settingsActive = (page === 'einstellungen.html') ? ' active' : '';
  

  /* ── NEUER FALL: kompletter Fall-Reset ── */
  window.provaResetFall = function() {
    var FALL_KEYS = [
      'prova_transkript','prova_aktiver_fall','prova_schadenart','prova_baujahr',
      'prova_adresse','prova_messwerte','prova_messwerte_strukturiert',
      'prova_stellungnahme_text','prova_stellungnahme_done','prova_stellungnahme_ts',
      'prova_stellungnahme_weg','prova_stellungnahme_kj2_ok','prova_stellungnahme_version',
      'prova_stellungnahme_audit','prova_ki_stellungnahme_vorschlag',
      'prova_entwurf_text','prova_entwurf_edits','prova_entwurf_edit_ts',
      'prova_offenlegungstext','prova_gutachten_typ',
      'prova_diktat_ts','prova_diktat_start_ts','prova_diktat_ende_ts','prova_diktat_dauer_sek',
      'prova_ki_ts','prova_ki_modell','prova_407a_ts',
      'prova_qi_done','prova_qi_ts',
      'prova_auftraggeber_name','prova_auftraggeber_email',
      'prova_audit_log','prova_stellungnahme_return'
    ];
    FALL_KEYS.forEach(function(k){ localStorage.removeItem(k); });
    // Foto-Metadaten (prova_foto_metadata_* Keys)
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('prova_foto_metadata_')) toRemove.push(key);
    }
    toRemove.forEach(function(k){ localStorage.removeItem(k); });
  };

  var html = ''
    + '<div class="sb-logo" onclick="window.location.href=\'dashboard.html\'" title="Zur Zentrale">'
    +   '<div class="sb-logo-mark">P</div>'
    +   '<div class="sb-logo-text">PR<span>O</span>VA</div>'
    + '</div>'

    + '<button class="sb-new-btn" id="sb-new-btn" onclick="provaResetFall();window.location.href=\'' + appUrl + '\'">'
    +   '<span class="btn-icon">+</span>'
    +   '<span class="btn-label">Neuer Fall</span>'
    + '</button>'

    + '<div class="sb-nav">'
    +   makeGroup('Arbeit', ARBEIT)
    +   makeGroup('Werkzeuge', WERKZEUGE)
    +   makeGroup('Verwaltung', VERWALTUNG)
    + '</div>'

    + '<div class="sb-footer">'
    +   '<a href="einstellungen.html" class="sb-settings' + settingsActive + '" title="Einstellungen">'
    +     '<span class="sb-icon" aria-hidden="true">⚙️</span>'
    +     '<span class="sb-label">Einstellungen</span>'
    +   '</a>'
    +   '<div class="sb-paket">'
    +     '<div class="paket-dot" style="background:' + pc + '"></div>'
    +     '<span class="paket-name" style="color:' + pc + '">' + paket + '</span>'
    +   '</div>'
    +   '<button class="sb-collapse" id="sb-collapse-btn">'
    +     '<span class="sb-toggle-icon">‹</span>'
    +     '<span class="sb-collapse-label">Einklappen</span>'
    +   '</button>'
    + '</div>'
  ;

  /* ── In DOM einfügen ── */
  function injectNav() {
    var existing = document.getElementById('sidebar');
    if (!existing) return;
    existing.innerHTML = html;
    existing.className = 'sidebar';

    // Overlay für Mobile erstellen (falls nicht vorhanden)
    if (!document.getElementById('sb-overlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'sb-overlay';
      overlay.id = 'sb-overlay';
      overlay.onclick = function() { closeMobileSidebar(); };
      existing.parentNode.insertBefore(overlay, existing.nextSibling);
    }

    // Collapse-State aus localStorage wiederherstellen
    var collapsed = localStorage.getItem('prova_sb_collapsed') === '1';
    if (collapsed) existing.classList.add('collapsed');

    // Collapse-Button
    var btn = document.getElementById('sb-collapse-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        existing.classList.toggle('collapsed');
        var isCol = existing.classList.contains('collapsed');
        localStorage.setItem('prova_sb_collapsed', isCol ? '1' : '0');
      });
    }
  }

  /* ── Mobile Sidebar Funktionen (global) ── */
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
  // ESC schließt Mobile-Sidebar
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
