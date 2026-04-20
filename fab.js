/* ═══════════════════════════════════════════════════════════════════════
   PROVA — Globaler FAB (Floating Action Button) + Command-Menü
   fab.js — Einbinden in nav.js oder alle relevanten HTMLs

   Features:
   - Schwebender "+" Button rechts unten auf jeder Seite
   - Command-Menü mit Quick-Actions
   - Tastaturkürzel: Ctrl+N öffnet Menü, Ctrl+K öffnet Suche
   - Schließt bei Klick außerhalb oder ESC
   - Responsiv: Mobile-optimiert
   ═══════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // Nur initialisieren wenn nicht bereits vorhanden
  if (document.getElementById('prova-fab')) return;

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = `
    /* FAB Button */
    #prova-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 800;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent, #4f8ef7);
      color: #fff;
      border: none;
      font-size: 24px;
      font-weight: 300;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(79, 142, 247, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: var(--font-ui, 'DM Sans', sans-serif);
      line-height: 1;
      -webkit-tap-highlight-color: transparent;
    }
    #prova-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(79, 142, 247, 0.6);
    }
    #prova-fab.open {
      transform: rotate(45deg) scale(1.05);
      background: var(--danger, #ef4444);
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.45);
    }
    /* Mobile: Bottom-Nav-Abstand berücksichtigen */
    @media (max-width: 768px) {
      #prova-fab {
        bottom: 70px;
        right: 16px;
        width: 48px;
        height: 48px;
        font-size: 22px;
      }
    }

    /* FAB Backdrop */
    #prova-fab-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 799;
      background: transparent;
    }
    #prova-fab-backdrop.open {
      display: block;
    }

    /* FAB Menü */
    #prova-fab-menu {
      position: fixed;
      bottom: 88px;
      right: 24px;
      z-index: 801;
      background: var(--surface, #1c2130);
      border: 1px solid var(--border2, rgba(255,255,255,0.11));
      border-radius: 16px;
      min-width: 260px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
      overflow: hidden;
      transform: scale(0.9) translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: bottom right;
    }
    #prova-fab-menu.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }
    @media (max-width: 768px) {
      #prova-fab-menu {
        bottom: 128px;
        right: 12px;
        left: 12px;
        min-width: 0;
        border-radius: 18px;
      }
    }

    /* Menü-Header */
    .fab-menu-header {
      padding: 12px 16px 8px;
      font-size: 10px;
      font-weight: 700;
      color: var(--text3, #4d5568);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-family: var(--font-ui, 'DM Sans', sans-serif);
    }

    /* Menü-Items */
    .fab-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 16px;
      cursor: pointer;
      transition: background 0.1s;
      text-decoration: none;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      font-family: var(--font-ui, 'DM Sans', sans-serif);
    }
    .fab-item:hover {
      background: var(--surface2, #232a3a);
    }
    .fab-item:active {
      background: var(--surface3, #2a3142);
    }
    .fab-item-icon {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .fab-item-text {
      flex: 1;
      min-width: 0;
    }
    .fab-item-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #eaecf4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fab-item-desc {
      font-size: 11px;
      color: var(--text3, #4d5568);
      margin-top: 1px;
    }
    .fab-item-kbd {
      font-size: 10px;
      color: var(--text3, #4d5568);
      background: var(--bg, #0b0d11);
      border: 1px solid var(--border2, rgba(255,255,255,0.11));
      border-radius: 4px;
      padding: 2px 6px;
      font-family: var(--font-mono, monospace);
      flex-shrink: 0;
    }

    /* Divider */
    .fab-divider {
      height: 1px;
      background: var(--border, rgba(255,255,255,0.06));
      margin: 4px 0;
    }

    /* Menü-Footer */
    .fab-menu-footer {
      padding: 8px 16px 12px;
      font-size: 10.5px;
      color: var(--text3, #4d5568);
      font-family: var(--font-ui, 'DM Sans', sans-serif);
      display: flex;
      gap: 16px;
    }
    .fab-menu-footer kbd {
      background: var(--bg, #0b0d11);
      border: 1px solid var(--border2, rgba(255,255,255,.11));
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10px;
      font-family: var(--font-mono, monospace);
    }
  `;
  document.head.appendChild(style);

  /* ── HTML-Struktur ── */
  var wrap = document.createElement('div');
  wrap.id = 'prova-fab-wrap';

  // Backdrop
  var backdrop = document.createElement('div');
  backdrop.id = 'prova-fab-backdrop';
  backdrop.addEventListener('click', close);

  // Menü
  var menu = document.createElement('div');
  menu.id = 'prova-fab-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Schnellaktionen');

  // Aktuelle Seite für Kontext
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';

  // Menu Items (Context-aware)
  var items = getMenuItems(page);
  menu.innerHTML = buildMenuHTML(items);

  // FAB Button
  var fab = document.createElement('button');
  fab.id = 'prova-fab';
  fab.setAttribute('aria-label', 'Schnellaktionen öffnen');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'prova-fab-menu');
  fab.innerHTML = '<span style="line-height:1;display:block;">+</span>';
  fab.addEventListener('click', toggle);

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
  document.body.appendChild(fab);

  // Click-Handler für Menü-Items
  menu.addEventListener('click', function(e) {
    var item = e.target.closest('.fab-item');
    if (!item) return;
    var href = item.dataset.href;
    var action = item.dataset.action;
    if (action === 'search') {
      close();
      // Globale Suche öffnen (nav.js / global-search.js)
      if (window.PROVASearch) window.PROVASearch.open();
      else if (window.ProvaNav && window.ProvaNav.openSearch) window.ProvaNav.openSearch();
      return;
    }
    if (href) {
      close();
      window.location.href = href;
    }
  });

  /* ── Keyboard ── */
  document.addEventListener('keydown', function(e) {
    // Ctrl+N = FAB-Menü öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInputFocused()) {
      e.preventDefault();
      toggle();
      return;
    }
    // Ctrl+K = Suche öffnen
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      close();
      if (window.PROVASearch) window.PROVASearch.open();
      else if (window.ProvaNav && window.ProvaNav.openSearch) window.ProvaNav.openSearch();
      return;
    }
    // ESC = schließen
    if (e.key === 'Escape') {
      close();
    }
  });

  function isInputFocused() {
    var t = document.activeElement;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  /* ── Toggle ── */
  function toggle() {
    var isOpen = fab.classList.contains('open');
    isOpen ? close() : open();
  }

  function open() {
    fab.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    menu.classList.add('open');
    backdrop.classList.add('open');
    // Erstes Item fokussieren
    var first = menu.querySelector('.fab-item');
    if (first) setTimeout(function() { first.focus(); }, 50);
  }

  function close() {
    fab.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    backdrop.classList.remove('open');
  }

  /* ── Menu Items (kontext-sensitiv) ── */
  function getMenuItems(currentPage) {
    var items = [
      {
        icon: '📂',
        iconBg: 'rgba(79,142,247,.15)',
        label: 'Neuer Fall (Wizard)',
        desc: 'Gutachten, Beratung, Baubegleitung',
        href: 'app.html',
        kbd: 'Ctrl+N →'
      },
      {
        icon: '💶',
        iconBg: 'rgba(16,185,129,.15)',
        label: 'Schnellrechnung',
        desc: 'Ohne Fall — sofort erstellen',
        href: 'schnelle-rechnung.html'
      },
      {
        icon: '✉️',
        iconBg: 'rgba(245,158,11,.15)',
        label: 'Schnellbrief',
        desc: 'Brief ohne Fallzuordnung',
        href: 'briefvorlagen.html?modus=freistehend'
      },
      {
        icon: '📅',
        iconBg: 'rgba(139,92,246,.15)',
        label: 'Termin eintragen',
        desc: 'Ortstermin, Frist, Besprechung',
        href: 'termine.html?neu=1'
      },
      {
        icon: '📝',
        iconBg: 'rgba(99,102,241,.15)',
        label: 'Aktennotiz',
        desc: 'Schnelle Notiz zu beliebigem Fall',
        href: 'aktennotiz.html'
      }
    ];

    // Kontextabhängige Ergänzungen
    if (currentPage === 'akte.html' || currentPage === 'archiv.html') {
      // Im Fall-Kontext: JVEG-Rechner anbieten
      items.push({
        icon: '⚖️',
        iconBg: 'rgba(239,68,68,.15)',
        label: 'JVEG-Rechner',
        desc: 'Honorar nach §7–§9 JVEG berechnen',
        href: 'jveg.html'
      });
    }

    if (currentPage === 'rechnungen.html' || currentPage === 'mahnwesen.html') {
      // Im Rechnungs-Kontext: Mahnung anbieten
      items.push({
        icon: '📣',
        iconBg: 'rgba(239,68,68,.15)',
        label: 'Mahnung erstellen',
        desc: 'Zahlungserinnerung / Mahnung 1–3',
        href: 'mahnwesen.html?neu=1'
      });
    }

    // Suche immer am Ende
    items.push({
      divider: true
    });
    items.push({
      icon: '🔍',
      iconBg: 'rgba(107,114,128,.15)',
      label: 'Suchen',
      desc: 'Fälle, Normen, Kontakte…',
      action: 'search',
      kbd: 'Ctrl+K'
    });

    return items;
  }

  function buildMenuHTML(items) {
    var html = '<div class="fab-menu-header">Schnellaktionen</div>';

    items.forEach(function(item) {
      if (item.divider) {
        html += '<div class="fab-divider"></div>';
        return;
      }
      html += '<button class="fab-item" role="menuitem"' +
        (item.href    ? ' data-href="'   + item.href   + '"' : '') +
        (item.action  ? ' data-action="' + item.action + '"' : '') +
        '>' +
        '<div class="fab-item-icon" style="background:' + (item.iconBg || 'rgba(255,255,255,.05)') + '">' +
          item.icon +
        '</div>' +
        '<div class="fab-item-text">' +
          '<div class="fab-item-label">' + item.label + '</div>' +
          (item.desc ? '<div class="fab-item-desc">' + item.desc + '</div>' : '') +
        '</div>' +
        (item.kbd ? '<span class="fab-item-kbd">' + item.kbd + '</span>' : '') +
        '</button>';
    });

    html += '<div class="fab-menu-footer">' +
      '<span><kbd>↑↓</kbd> Navigieren</span>' +
      '<span><kbd>↵</kbd> Öffnen</span>' +
      '<span><kbd>ESC</kbd> Schließen</span>' +
    '</div>';

    return html;
  }

  // Public API
  window.ProvaFAB = { open: open, close: close, toggle: toggle };

})();