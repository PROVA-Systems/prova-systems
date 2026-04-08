/* ============================================================
   PROVA paket-guard.js — Paket-basierter Feature-Gate
   
   EINBINDEN (nach prova-preise.js, vor allen logic.js):
   <script src="paket-guard.js"></script>
   
   VERWENDUNG:
   PaketGuard.pruefeFeature('ki_foto');        // zeigt Overlay bei Fehler
   PaketGuard.hatFeature('zugferd');            // gibt true/false zurück
   PaketGuard.blockiereSeite('baubegleitung');  // blockiert ganze Seite
   PaketGuard.zeigeBadge('#mein-btn', 'ki_foto'); // zeigt Lock-Icon
   
   DRITTES PAKET HINZUFÜGEN:
   1. Eintrag in FEATURE_MAP hinzufügen (unten)
   2. Eintrag in PROVA_PREISE (prova-preise.js) hinzufügen
   3. nav.js: Neues Paket als eigenen Eintrag (nicht als Alias)
   4. Stripe: Neuen Price-ID anlegen
   Das war's. Alles andere wird automatisch übernommen.
============================================================ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     FEATURE MAP — NUR HIER ÄNDERN FÜR NEUES PAKET
     
     true  = Feature im Paket enthalten
     false = Feature nicht im Paket (zeigt Upgrade-Overlay)
     Zahl  = Limit (z.B. max_svs: 5)
  ══════════════════════════════════════════════════════════ */
  var FEATURE_MAP = {

    Solo: {
      // KI-Features
      ki_diktat:          true,
      ki_fachurteil:      true,
      ki_qualitaet:       true,
      ki_foto_analyse:    false,   // Team only
      ki_credits:         200,     // pro Monat

      // Gutachten & Workflow
      gutachten:          true,
      jveg:               true,
      normen:             true,
      textbausteine:      20,      // Limit
      briefvorlagen:      15,      // Limit
      positionen:         true,
      baubegleitung:      false,   // Team only

      // Abrechnung
      rechnungen:         true,
      zugferd:            false,   // Team only
      xrechnung:          false,   // Team only
      jveg_rechnung:      true,

      // Team
      max_svs:            1,
      team_dashboard:     false,
      einladen:           false,

      // Extras
      docestate:          false,   // Team only
      jahresbericht:      true,
      archiv:             true,
      kontakte:           true,
      termine:            true,
      freigabe:           true,    // Gutachten-Freigabe für Mandanten
      import_assistent:   true,

      // Support
      support_email:      true,
      support_chat:       false,
      api_zugang:         false,
    },

    Team: {
      // KI-Features
      ki_diktat:          true,
      ki_fachurteil:      true,
      ki_qualitaet:       true,
      ki_foto_analyse:    true,    // Team only
      ki_credits:         1000,

      // Gutachten & Workflow
      gutachten:          true,
      jveg:               true,
      normen:             true,
      textbausteine:      100,
      briefvorlagen:      999,     // unbegrenzt
      positionen:         true,
      baubegleitung:      true,    // Team only

      // Abrechnung
      rechnungen:         true,
      zugferd:            true,    // Team only
      xrechnung:          true,    // Team only
      jveg_rechnung:      true,

      // Team
      max_svs:            999,     // unbegrenzt
      team_dashboard:     true,
      einladen:           true,

      // Extras
      docestate:          true,    // Team only
      jahresbericht:      true,
      archiv:             true,
      kontakte:           true,
      termine:            true,
      freigabe:           true,
      import_assistent:   true,

      // Support
      support_email:      true,
      support_chat:       true,
      api_zugang:         false,
    },

    /* ── HIER DRITTES PAKET EINFÜGEN WENN BEREIT ──────────
    Enterprise: {
      ki_diktat:          true,
      ki_fachurteil:      true,
      ki_qualitaet:       true,
      ki_foto_analyse:    true,
      ki_credits:         500,
      gutachten:          true,
      jveg:               true,
      normen:             true,
      textbausteine:      50,
      briefvorlagen:      25,
      positionen:         true,
      baubegleitung:      false,
      rechnungen:         true,
      zugferd:            true,
      xrechnung:          true,
      jveg_rechnung:      true,
      max_svs:            5,
      team_dashboard:     false,
      einladen:           true,
      docestate:          false,
      jahresbericht:      true,
      archiv:             true,
      kontakte:           true,
      termine:            true,
      freigabe:           true,
      import_assistent:   true,
      support_email:      true,
      support_chat:       true,
      api_zugang:         false,
    },
    ─────────────────────────────────────────────────────── */
  };

  /* ══════════════════════════════════════════════════════════
     UPGRADE-TEXTE pro Feature
  ══════════════════════════════════════════════════════════ */
  var UPGRADE_TEXTE = {
    ki_foto_analyse: {
      titel:    'KI-Foto-Analyse',
      text:     'Die automatische KI-Analyse deiner Schadensfotos ist im Team-Paket enthalten. Spare bis zu 45 Minuten pro Gutachten.',
      icon:     '📷',
    },
    baubegleitung: {
      titel:    'Baubegleitung',
      text:     'Projekte, Bauphasen und Baubegleitung sind exklusiv im Team-Paket verfügbar.',
      icon:     '🏗️',
    },
    zugferd: {
      titel:    'ZUGFeRD / XRechnung',
      text:     'Elektronische Rechnungen nach EN 16931 (ZUGFeRD) und XRechnung für Behörden sind im Team-Paket enthalten.',
      icon:     '🧾',
    },
    xrechnung: {
      titel:    'XRechnung',
      text:     'XRechnung für öffentliche Auftraggeber ist im Team-Paket enthalten.',
      icon:     '🧾',
    },
    docestate: {
      titel:    'DocEstate-Integration',
      text:     'Grundbuchauszüge, Baulastenverzeichnis und amtliche Dokumente direkt aus PROVA bestellen — im Team-Paket.',
      icon:     '📋',
    },
    einladen: {
      titel:    'Team-Einladungen',
      text:     'Weitere Sachverständige einladen und gemeinsam an Gutachten arbeiten ist im Team-Paket verfügbar.',
      icon:     '👥',
    },
    team_dashboard: {
      titel:    'Team-Dashboard',
      text:     'Überblick über alle SVs, ihre Fälle und Auslastung — im Team-Paket enthalten.',
      icon:     '📊',
    },
    support_chat: {
      titel:    'Live-Chat Support',
      text:     'Direkter Chat-Support mit dem PROVA-Team ist im Team-Paket enthalten.',
      icon:     '💬',
    },
  };

  /* ══════════════════════════════════════════════════════════
     CSS EINMALIG INJIZIEREN
  ══════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('prova-paket-guard-css')) return;
    var css = document.createElement('style');
    css.id = 'prova-paket-guard-css';
    css.textContent = [
      /* Overlay — ganze Seite */
      '.pg-overlay{position:fixed;inset:0;z-index:9000;background:rgba(10,14,23,.82);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;}',
      /* Modal */
      '.pg-modal{background:#141b2d;border:1px solid rgba(79,142,247,.25);border-radius:16px;padding:36px 40px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.6);}',
      '.pg-modal .pg-icon{font-size:48px;margin-bottom:16px;}',
      '.pg-modal h2{font-size:20px;font-weight:700;color:#e2e8f0;margin:0 0 12px;}',
      '.pg-modal p{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 28px;}',
      '.pg-modal .pg-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}',
      '.pg-modal .pg-btn-upgrade{background:linear-gradient(135deg,#4f8ef7,#7c3aed);color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s;}',
      '.pg-modal .pg-btn-upgrade:hover{opacity:.88;}',
      '.pg-modal .pg-btn-back{background:rgba(255,255,255,.06);color:#94a3b8;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 20px;font-size:14px;cursor:pointer;transition:background .2s;}',
      '.pg-modal .pg-btn-back:hover{background:rgba(255,255,255,.1);}',
      /* Inline-Lock-Badge */
      '.pg-lock-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:.03em;padding:2px 8px;border-radius:6px;background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.25);cursor:pointer;vertical-align:middle;margin-left:6px;white-space:nowrap;}',
      /* Inline-Block mit Lock */
      '.pg-feature-locked{opacity:.45;pointer-events:none;position:relative;}',
      '.pg-feature-locked::after{content:"🔒";position:absolute;top:4px;right:8px;font-size:14px;}',
      /* Inline-Teaser-Box */
      '.pg-teaser{background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.2);border-radius:12px;padding:20px 24px;margin:20px 0;display:flex;align-items:flex-start;gap:16px;}',
      '.pg-teaser-icon{font-size:28px;flex-shrink:0;}',
      '.pg-teaser-body h4{font-size:14px;font-weight:700;color:#e2e8f0;margin:0 0 6px;}',
      '.pg-teaser-body p{font-size:13px;color:#94a3b8;margin:0 0 12px;line-height:1.5;}',
      '.pg-teaser-body button{background:rgba(79,142,247,.15);color:#4f8ef7;border:1px solid rgba(79,142,247,.3);border-radius:8px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s;}',
      '.pg-teaser-body button:hover{background:rgba(79,142,247,.25);}',
      /* Mobile */
      '@media(max-width:480px){.pg-modal{padding:28px 20px;}.pg-modal h2{font-size:17px;}.pg-btns{flex-direction:column;}.pg-btn-upgrade,.pg-btn-back{width:100%;}}',
    ].join('');
    document.head.appendChild(css);
  }

  /* ══════════════════════════════════════════════════════════
     KERN-LOGIK
  ══════════════════════════════════════════════════════════ */

  /* Aktuelles Paket lesen (mit Rückwärtskompatibilität) */
  function getPaket() {
    var raw = localStorage.getItem('prova_paket') || 'Solo';
    // Legacy-Mapping
    var map = { Starter: 'Solo', Pro: 'Solo', 'app-starter': 'Solo', 'app-pro': 'Solo', Enterprise: 'Team' };
    var paket = map[raw] || raw;
    // Unbekannte Pakete → Solo (safe fallback)
    if (!FEATURE_MAP[paket]) paket = 'Solo';
    return paket;
  }

  /* Feature-Wert lesen (true/false/Zahl) */
  function getFeatureValue(featureKey) {
    var paket = getPaket();
    var map   = FEATURE_MAP[paket];
    if (!map) return false;
    var val = map[featureKey];
    return (val === undefined) ? false : val;
  }

  /* Feature vorhanden? (boolean) */
  function hatFeature(featureKey) {
    var val = getFeatureValue(featureKey);
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number')  return val > 0;
    return Boolean(val);
  }

  /* Feature-Limit lesen (für numerische Features) */
  function getLimit(featureKey) {
    var val = getFeatureValue(featureKey);
    return (typeof val === 'number') ? val : (val ? 999 : 0);
  }

  /* ══════════════════════════════════════════════════════════
     UI: UPGRADE-OVERLAY (ganze Seite)
  ══════════════════════════════════════════════════════════ */
  function zeigeUpgradeOverlay(featureKey, onAbbruch) {
    injectCSS();
    var info = UPGRADE_TEXTE[featureKey] || {
      titel: 'Premium-Feature',
      text:  'Dieses Feature ist in deinem aktuellen Paket nicht enthalten. Upgrade auf Team für vollen Zugriff.',
      icon:  '⭐',
    };

    // Altes Overlay entfernen
    var old = document.getElementById('pg-overlay-' + featureKey);
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'pg-overlay';
    overlay.id = 'pg-overlay-' + featureKey;
    overlay.innerHTML = [
      '<div class="pg-modal">',
        '<div class="pg-icon">' + info.icon + '</div>',
        '<h2>' + info.titel + ' — Team-Paket</h2>',
        '<p>' + info.text + '</p>',
        '<div class="pg-btns">',
          '<button class="pg-btn-upgrade" onclick="window.location.href=\'einstellungen.html#sec-paket\'">',
            '🚀 Jetzt auf Team upgraden',
          '</button>',
          '<button class="pg-btn-back" id="pg-back-' + featureKey + '">',
            '← Zurück',
          '</button>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    // Zurück-Button
    var backBtn = document.getElementById('pg-back-' + featureKey);
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        overlay.remove();
        if (typeof onAbbruch === 'function') onAbbruch();
        else history.back();
      });
    }
    // Klick außerhalb schließt
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        if (typeof onAbbruch === 'function') onAbbruch();
      }
    });

    return overlay;
  }

  /* ══════════════════════════════════════════════════════════
     UI: INLINE TEASER-BOX (innerhalb einer Seite)
  ══════════════════════════════════════════════════════════ */
  function zeigeTeaser(containerId, featureKey) {
    injectCSS();
    var container = document.getElementById(containerId);
    if (!container) return;
    var info = UPGRADE_TEXTE[featureKey] || { titel: 'Team-Feature', text: 'Im Team-Paket enthalten.', icon: '⭐' };
    container.innerHTML = [
      '<div class="pg-teaser">',
        '<div class="pg-teaser-icon">' + info.icon + '</div>',
        '<div class="pg-teaser-body">',
          '<h4>' + info.titel + ' — nur im Team-Paket</h4>',
          '<p>' + info.text + '</p>',
          '<button onclick="window.location.href=\'einstellungen.html#sec-paket\'">🚀 Team-Paket ansehen</button>',
        '</div>',
      '</div>',
    ].join('');
  }

  /* ══════════════════════════════════════════════════════════
     UI: LOCK-BADGE AN ELEMENT ANHÄNGEN
  ══════════════════════════════════════════════════════════ */
  function zeigeBadge(selector, featureKey) {
    injectCSS();
    var el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if (!el || hatFeature(featureKey)) return;
    if (el.querySelector('.pg-lock-badge')) return;
    var badge = document.createElement('span');
    badge.className = 'pg-lock-badge';
    badge.textContent = '🔒 Team';
    badge.title = 'Nur im Team-Paket verfügbar';
    badge.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      zeigeUpgradeOverlay(featureKey);
    });
    el.appendChild(badge);
    el.style.cursor = 'pointer';
    el.addEventListener('click', function (e) {
      zeigeUpgradeOverlay(featureKey);
    });
  }

  /* ══════════════════════════════════════════════════════════
     HAUPT-API: pruefeFeature()
     Gibt true zurück wenn Feature erlaubt, false + Overlay wenn nicht.
  ══════════════════════════════════════════════════════════ */
  function pruefeFeature(featureKey, opts) {
    opts = opts || {};
    if (hatFeature(featureKey)) return true;
    // Feature nicht im Paket → Overlay anzeigen
    var typ = opts.typ || 'overlay'; // 'overlay', 'teaser', 'badge', 'silent'
    if (typ === 'overlay') {
      zeigeUpgradeOverlay(featureKey, opts.onAbbruch);
    } else if (typ === 'teaser' && opts.container) {
      zeigeTeaser(opts.container, featureKey);
    } else if (typ === 'badge' && opts.selector) {
      zeigeBadge(opts.selector, featureKey);
    }
    return false;
  }

  /* ══════════════════════════════════════════════════════════
     SEITE BLOCKIEREN (für pages die komplett gesperrt sind)
     Aufruf ganz oben im logic.js:
     PaketGuard.blockiereSeite('baubegleitung');
  ══════════════════════════════════════════════════════════ */
  function blockiereSeite(featureKey) {
    if (hatFeature(featureKey)) return; // alles ok

    // DOM noch nicht bereit? Warten.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        _blockiereSeiteNow(featureKey);
      });
    } else {
      _blockiereSeiteNow(featureKey);
    }
  }

  function _blockiereSeiteNow(featureKey) {
    injectCSS();
    // Seiteninhalt ausblenden (verhindert kurzes Aufblitzen)
    var main = document.querySelector('main, .main-content, #main, body > *:not(script):not(style)');
    if (main) main.style.visibility = 'hidden';
    zeigeUpgradeOverlay(featureKey, function () {
      window.location.href = 'dashboard.html';
    });
  }

  /* ══════════════════════════════════════════════════════════
     AUTO-INIT: data-paket-feature Attribute
     
     HTML-Verwendung (kein JS nötig):
     <button data-paket-feature="ki_foto_analyse">KI-Analyse starten</button>
     <section data-paket-feature="baubegleitung" data-paket-typ="teaser" data-paket-container="bau-teaser">
       <div id="bau-teaser"></div>
     </section>
  ══════════════════════════════════════════════════════════ */
  function autoInit() {
    var els = document.querySelectorAll('[data-paket-feature]');
    els.forEach(function (el) {
      var feature = el.getAttribute('data-paket-feature');
      var typ     = el.getAttribute('data-paket-typ') || 'badge';
      if (hatFeature(feature)) return; // nichts tun

      if (typ === 'badge') {
        zeigeBadge(el, feature);
      } else if (typ === 'teaser') {
        var containerId = el.getAttribute('data-paket-container');
        if (containerId) zeigeTeaser(containerId, feature);
      } else if (typ === 'lock') {
        el.classList.add('pg-feature-locked');
        el.setAttribute('title', 'Nur im Team-Paket verfügbar');
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          zeigeUpgradeOverlay(feature);
        });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     SERVER-SIDE GUARD HELPER
     Für Netlify Functions: Paket aus App-Metadata prüfen
     
     // In ki-proxy.js:
     const { checkFeatureServer } = require('./paket-guard-server');
     if (!checkFeatureServer(context, 'ki_foto_analyse')) {
       return { statusCode: 403, body: JSON.stringify({ error: 'Feature nicht in deinem Paket' }) };
     }
  ══════════════════════════════════════════════════════════ */
  var SERVER_FEATURE_MAP = {
    Solo: ['ki_diktat', 'ki_fachurteil', 'ki_qualitaet', 'jveg', 'normen', 'rechnungen'],
    Team: ['ki_diktat', 'ki_fachurteil', 'ki_qualitaet', 'ki_foto_analyse', 'jveg', 'normen',
           'rechnungen', 'zugferd', 'xrechnung', 'baubegleitung', 'docestate'],
    // Enterprise: [...] — wenn 3. Paket kommt
  };

  /* ══════════════════════════════════════════════════════════
     STATUS-INFO (für Einstellungen / Dashboard)
  ══════════════════════════════════════════════════════════ */
  function getPaketInfo() {
    var paket  = getPaket();
    var status = localStorage.getItem('prova_status') || 'Trial';
    var trialStart  = localStorage.getItem('prova_trial_start');
    var trialDays   = parseInt(localStorage.getItem('prova_trial_days') || '14', 10);
    var verbleibend = null;

    if (trialStart && status === 'Trial') {
      var diff = Date.now() - new Date(trialStart).getTime();
      verbleibend = Math.max(0, trialDays - Math.floor(diff / 86400000));
    }

    return {
      paket:       paket,
      status:      status,
      isTrial:     status === 'Trial',
      isAktiv:     status === 'Aktiv' || status === 'aktiv',
      isGruenderkreis: localStorage.getItem('prova_gruenderkreis') === '1',
      isTestpilot: localStorage.getItem('prova_testpilot') === '1',
      trialVerbleibend: verbleibend,
      features:    FEATURE_MAP[paket] || FEATURE_MAP.Solo,
    };
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */
  var PaketGuard = {
    /** Gibt true zurück wenn Feature erlaubt, sonst Overlay + false */
    pruefeFeature:      pruefeFeature,
    /** Gibt true/false zurück (kein UI) */
    hatFeature:         hatFeature,
    /** Numerisches Limit lesen (z.B. max_svs, textbausteine) */
    getLimit:           getLimit,
    /** Ganzte Seite blockieren (Aufruf in logic.js ganz oben) */
    blockiereSeite:     blockiereSeite,
    /** Lock-Badge an Element anhängen */
    zeigeBadge:         zeigeBadge,
    /** Inline-Teaser-Box rendern */
    zeigeTeaser:        zeigeTeaser,
    /** Upgrade-Overlay manuell öffnen */
    zeigeUpgrade:       zeigeUpgradeOverlay,
    /** Aktuelles Paket lesen */
    getPaket:           getPaket,
    /** Vollständige Paket-Info (für Einstellungen/Dashboard) */
    getPaketInfo:       getPaketInfo,
    /** Feature-Map (für Debugging) */
    FEATURE_MAP:        FEATURE_MAP,
    /** Server-Feature-Map (für Netlify Functions) */
    SERVER_FEATURE_MAP: SERVER_FEATURE_MAP,
  };

  /* Global exponieren */
  global.PaketGuard = PaketGuard;

  /* Auto-Init nach DOM-Ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

}(typeof window !== 'undefined' ? window : global));

/* ══════════════════════════════════════════════════════════════
   TRIAL-ENDE ENFORCEMENT
   Prüft ob Trial abgelaufen ist → zeigt Sperrscreen
   Wird beim Laden jeder App-Seite ausgeführt
══════════════════════════════════════════════════════════════ */
(function provaTrialCheck() {
  var status    = localStorage.getItem('prova_status')    || '';
  var paket     = localStorage.getItem('prova_paket')     || '';
  var trialEnd  = localStorage.getItem('prova_trial_end') || '';

  // Nur prüfen wenn Trial-Status
  if (status !== 'Trial' && status !== 'trial') return;

  // Kein Ablaufdatum → noch ok
  if (!trialEnd) return;

  var ablauf = new Date(trialEnd);
  var jetzt  = new Date();

  if (jetzt <= ablauf) return; // Trial noch aktiv

  // ── Trial abgelaufen ──────────────────────────────────────
  // Whitelist: diese Seiten bleiben immer zugänglich
  var erlaubt = ['app-login.html','app-register.html','index.html',
                 'agb.html','datenschutz.html','impressum.html','avv.html'];
  var seite   = window.location.pathname.split('/').pop() || 'index.html';
  if (erlaubt.indexOf(seite) >= 0) return;

  // Sperrscreen anzeigen
  document.addEventListener('DOMContentLoaded', function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;background:rgba(11,13,17,.97)',
      'z-index:99999;display:flex;align-items:center;justify-content:center',
      'font-family:var(--font-ui,system-ui,sans-serif)'
    ].join(';');
    overlay.innerHTML = [
      '<div style="background:#1c2537;border:1px solid rgba(255,255,255,.08);',
      'border-radius:16px;padding:40px;max-width:440px;text-align:center;">',
      '<div style="font-size:48px;margin-bottom:16px;">⏰</div>',
      '<h2 style="color:#e8eaf0;font-size:22px;margin:0 0 12px;">Trial abgelaufen</h2>',
      '<p style="color:#9da3b4;font-size:14px;line-height:1.7;margin:0 0 28px;">',
      'Ihr 14-tägiger Testzeitraum ist beendet. Upgraden Sie jetzt um ',
      'PROVA weiterhin zu nutzen.</p>',
      '<a href="portal.html" style="display:inline-block;background:#4f8ef7;color:#fff;',
      'padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;',
      'font-size:15px;margin-bottom:12px;">Jetzt upgraden → Solo 149€/Monat</a>',
      '<br><a href="app-login.html?logout=1" style="font-size:12px;color:#6b7280;',
      'text-decoration:none;">Abmelden</a>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    // Alle Interaktionen blockieren
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'auto';
  });
})();
