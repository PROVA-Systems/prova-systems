/**
 * PROVA — Sidebar-Navigation (Workflow Bausachverständiger)
 * Erwartet: paket-guard.js, #provaDrawerMount, optional #provaBottomNav
 */
(function () {
  var NS = (window.PROVA_NAV = window.PROVA_NAV || {});

  function pageName() {
    var p = (location.pathname || '').split('/').pop() || '';
    if (!p || p === '') return 'index.html';
    return p;
  }

  function appHref() {
    var t = (window.PROVA && PROVA.tier) || 'Solo';
    return t === 'Team' ? 'app-enterprise.html' : 'app-starter.html';
  }

  function isActive(href, current) {
    if (!href || href === '#') return false;
    var base = href.split('?')[0].split('/').pop();
    if (base === current) return true;
    if (base === 'app.html') {
      return (
        current === 'app-starter.html' ||
        current === 'app-pro.html' ||
        current === 'app-enterprise.html' ||
        current === 'app.html'
      );
    }
    if (base === 'stellungnahme.html') {
      return (
        current === 'stellungnahme.html' ||
        current === 'stellungnahme-gate.html' ||
        current === 'stellungnahme-v3.1.html'
      );
    }
    if (base === 'mahnwesen.html') {
      return (
        current === 'mahnwesen.html' ||
        current === 'mahnung.html' ||
        current === 'mahnung-1.html' ||
        current === 'mahnung-2.html' ||
        current === 'mahnung-3.html'
      );
    }
    return false;
  }

  var GROUPS = [
    {
      label: null,
      items: [
        { href: 'dashboard.html', icon: '⊞', label: 'Zentrale' },
        { href: 'archiv.html', icon: '📂', label: 'Alle Fälle' },
        { href: 'termine.html', icon: '📅', label: 'Kalender' }
      ]
    },
    {
      label: 'Gutachten',
      items: [
        { href: 'app.html', icon: '✏️', label: 'Neues Gutachten', dynamicApp: true },
        { href: 'ortstermin-modus.html', icon: '📍', label: 'Ortstermin' },
        { href: 'stellungnahme.html', icon: '📋', label: '§6 Fachurteil' },
        { href: 'freigabe.html', icon: '✅', label: 'Freigabe & PDF' },
        { href: 'gericht-auftrag.html', icon: '🏛️', label: 'Gerichtsauftrag' },
        { href: 'ergaenzung.html', icon: '🧩', label: 'Ergänzung §411' },
        { href: 'schiedsgutachten.html', icon: '⚖️', label: 'Schiedsgutachten' },
        { href: 'widerspruch-gutachten.html', icon: '↩️', label: 'Widerspruch' },
        { href: 'baubegleitung.html', icon: '🏗️', label: 'Baubegleitung', teamOnly: true, feature: 'baubegleitung' }
      ]
    },
    {
      label: 'Werkzeuge',
      items: [
        { href: 'normen.html', icon: '📚', label: 'Normen' },
        { href: 'textbausteine.html', icon: '📝', label: 'Textbausteine' },
        { href: 'positionen.html', icon: '💰', label: 'Positionen' },
        { href: 'jveg.html', icon: '🧮', label: 'JVEG-Rechner' }
      ]
    },
    {
      label: 'Abrechnung',
      items: [
        { href: 'rechnungen.html', icon: '💶', label: 'Rechnungen' },
        { href: 'schnelle-rechnung.html', icon: '⚡', label: 'Schnellrechnung' },
        { href: 'mahnwesen.html', icon: '📨', label: 'Mahnwesen' },
        { href: 'erechnung.html', icon: '📄', label: 'E-Rechnung', teamOnly: true, feature: 'erechnung' },
        { href: 'statistiken.html', icon: '📈', label: 'Statistiken' },
        { href: 'effizienz.html', icon: '⚡', label: 'Effizienz', teamOnly: true, feature: 'effizienz' },
        { href: 'jahresbericht.html', icon: '📊', label: 'Jahresbericht' }
      ]
    },
    {
      label: 'Büro',
      items: [
        { href: 'briefvorlagen.html', icon: '✉️', label: 'Briefe & Vorlagen' },
        { href: 'kontakte.html', icon: '👥', label: 'Kontakte' },
        { href: 'benachrichtigungen.html', icon: '🔔', label: 'Benachrichtigungen' },
        { href: 'import-assistent.html', icon: '📥', label: 'Import' }
      ]
    }
  ];

  var BOTTOM_ITEMS = [
    { href: 'dashboard.html', icon: '⊞', label: 'Zentrale', short: 'Home' },
    { href: 'archiv.html', icon: '📂', label: 'Fälle', short: 'Fälle' },
    { href: 'app.html', icon: '✏️', label: 'Gutachten', short: 'Neu', dynamicApp: true },
    { href: 'termine.html', icon: '📅', label: 'Termine', short: 'Termin' },
    { href: 'einstellungen.html', icon: '⚙', label: 'Mehr', short: 'Mehr', settingsFallback: true }
  ];

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function canUseFeature(key) {
    if (!window.PROVA || typeof PROVA.canUse !== 'function') return true;
    return PROVA.canUse(key);
  }

  function onLockedClick(e, feature) {
    e.preventDefault();
    if (window.PaketGuard && typeof PaketGuard.zeigeUpgrade === 'function') {
      PaketGuard.zeigeUpgrade(feature);
    } else if (window.PROVA && typeof PROVA.requirePaket === 'function') {
      PROVA.requirePaket(feature);
    }
  }

  function renderNavLinks(current, appH) {
    var html = '';
    GROUPS.forEach(function (g) {
      if (g.label) {
        html += '<div class="drawer-nav-group-label">' + esc(g.label) + '</div>';
      }
      g.items.forEach(function (it) {
        var href = it.dynamicApp ? appH : it.href;
        var active = isActive(it.dynamicApp ? 'app.html' : it.href, current);
        var locked = it.teamOnly && !canUseFeature(it.feature);
        var cls = 'drawer-nav-item' + (active ? ' active' : '') + (locked ? ' drawer-nav-item--locked' : '');
        var lockHtml = locked ? '<span class="nav-lock-badge" aria-hidden="true">🔒</span>' : '';
        var dataFeat = it.feature ? ' data-prova-feature="' + esc(it.feature) + '"' : '';
        html +=
          '<a href="' +
          esc(href) +
          '" class="' +
          cls +
          '"' +
          dataFeat +
          (locked ? ' aria-describedby="prova-nav-lock-hint"' : '') +
          '><span class="dnav-icon">' +
          esc(it.icon) +
          '</span><span class="dnav-label">' +
          esc(it.label) +
          '</span>' +
          lockHtml +
          '</a>';
      });
    });
    return html;
  }

  function bindLockedNav(root) {
    if (!root) return;
    root.querySelectorAll('a.drawer-nav-item--locked[data-prova-feature]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        onLockedClick(e, a.getAttribute('data-prova-feature'));
      });
    });
  }

  function renderAktiverFall() {
    var az = '';
    try {
      az = (localStorage.getItem('prova_letztes_az') || '').trim();
    } catch (e) {}
    if (!az) return '<div class="drawer-aktiver-fall" id="provaDrawerAktiverFall" hidden></div>';

    var stDone = false;
    try {
      stDone = localStorage.getItem('prova_stellungnahme_done') === 'true';
    } catch (e2) {}

    var phaseText;
    var ctaHref;
    var ctaLabel;
    if (stDone) {
      phaseText = 'Phase 4–5 · Freigabe &amp; Export';
      ctaHref = 'freigabe.html';
      ctaLabel = 'Zu Freigabe & PDF';
    } else {
      phaseText = 'Phase 2–3 · Gutachten &amp; §6 Fachurteil';
      ctaHref = 'stellungnahme-gate.html?az=' + encodeURIComponent(az);
      ctaLabel = 'Weiter zum Fachurteil';
    }

    return (
      '<div class="drawer-aktiver-fall" id="provaDrawerAktiverFall">' +
      '<div class="daf-az">Aktiver Fall · ' +
      esc(az) +
      '</div>' +
      '<div class="daf-phase">' +
      phaseText +
      '</div>' +
      '<a class="daf-cta" href="' +
      esc(ctaHref) +
      '">' +
      esc(ctaLabel) +
      '</a>' +
      '</div>'
    );
  }

  function renderFooter() {
    return (
      '<div class="drawer-footer-prova">' +
      '<div class="drawer-footer-links">' +
      '<a href="einstellungen.html"><span class="dnav-icon">⚙️</span>Einstellungen</a>' +
      '<a href="hilfe.html"><span class="dnav-icon">❓</span>Hilfe &amp; Support</a>' +
      '</div>' +
      '<div class="drawer-footer-row">' +
      '<span class="paket-badge" id="drawerPaket"></span>' +
      '</div>' +
      '<div class="drawer-legal">' +
      '<a href="legal/agb.html">AGB</a>' +
      '<a href="legal/datenschutz.html">Datenschutz</a>' +
      '<a href="legal/avv.html">AVV</a>' +
      '<a href="legal/impressum.html">Impressum</a>' +
      '</div>' +
      '</div>'
    );
  }

  function renderBottomNav(current, appH) {
    var html = '';
    BOTTOM_ITEMS.forEach(function (it) {
      var href = it.dynamicApp ? appH : it.href;
      var checkHref = it.dynamicApp ? 'app.html' : it.href;
      var active = isActive(checkHref, current);
      if (it.settingsFallback && !active) {
        active = current === 'hilfe.html';
      }
      html +=
        '<a href="' +
        esc(href) +
        '" class="bn-item' +
        (active ? ' active' : '') +
        '"><span class="bn-icon">' +
        esc(it.icon) +
        '</span><span class="bn-label">' +
        esc(it.label) +
        '</span></a>';
    });
    return html;
  }

  NS.paintPaketBadges = function () {
    if (!window.PROVA) return;
    var p = PROVA.paket || localStorage.getItem('prova_paket') || 'Solo';
    var c = typeof PROVA.paketColor === 'function' ? PROVA.paketColor() : '#4f8ef7';
    var style = 'background:' + c + '18;color:' + c + ';border:1px solid ' + c + '33';
    var label = typeof PROVA.paketLabel === 'function' ? PROVA.paketLabel() : p;
    ['topbarPaket', 'drawerPaket'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = label;
        el.setAttribute('style', style);
      }
    });
  };

  NS.init = function () {
    var mount = document.getElementById('provaDrawerMount');
    if (!mount) return;

    var current = pageName();
    var appH = appHref();

    mount.innerHTML =
      '<div class="drawer-body-prova">' +
      '<div class="drawer-scroll-prova">' +
      renderAktiverFall() +
      '<nav class="drawer-nav drawer-nav-prova" id="provaDrawerNavInner">' +
      renderNavLinks(current, appH) +
      '</nav></div>' +
      renderFooter() +
      '</div>';

    bindLockedNav(mount.querySelector('#provaDrawerNavInner'));

    var bn = document.getElementById('provaBottomNav');
    if (bn) {
      bn.innerHTML = renderBottomNav(current, appH);
    }

    NS.paintPaketBadges();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NS.init);
  } else {
    NS.init();
  }
})();
