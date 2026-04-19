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
      faelle_monat:       25,      // max. Fälle pro Monat

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
      faelle_monat:       0,       // 0 = unbegrenzt

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
      faelle_monat:       0,       // 0 = unbegrenzt
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
     KONTINGENT: Fälle pro Monat zählen + Add-ons
     
     Speicherung: localStorage
       prova_faelle_monat       → Zahl der Fälle diesen Monat
       prova_faelle_reset       → ISO-Datum letztes Reset (YYYY-MM)
       prova_faelle_zusatz      → Zusatz-Fälle aus Add-on-Kauf
     
     Airtable ist die Quelle der Wahrheit beim Login.
     localStorage ist der schnelle lokale Cache.
  ══════════════════════════════════════════════════════════ */

  var KONTINGENT_KEY       = 'prova_faelle_monat';
  var KONTINGENT_RESET_KEY = 'prova_faelle_reset';
  var ZUSATZ_KEY           = 'prova_faelle_zusatz';

  /* Aktuellen Monat als String (YYYY-MM) */
  function aktuellerMonat() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /* Monat gewechselt? → Counter zurücksetzen */
  function pruefeMonatsReset() {
    var gespeicherterMonat = localStorage.getItem(KONTINGENT_RESET_KEY);
    var monat = aktuellerMonat();
    if (gespeicherterMonat !== monat) {
      localStorage.setItem(KONTINGENT_KEY, '0');
      localStorage.setItem(KONTINGENT_RESET_KEY, monat);
      // Zusatz-Fälle bleiben erhalten — werden beim Kauf gesetzt und manuell verbraucht
    }
  }

  /* Kontingent-Status lesen */
  function getKontingentStatus() {
    pruefeMonatsReset();
    var paket     = getPaket();
    var limit     = FEATURE_MAP[paket] ? FEATURE_MAP[paket].faelle_monat : 25;
    var verbraucht = parseInt(localStorage.getItem(KONTINGENT_KEY) || '0', 10);
    var zusatz     = parseInt(localStorage.getItem(ZUSATZ_KEY)     || '0', 10);
    var gesamtLimit = limit === 0 ? 0 : limit + zusatz; // 0 = unbegrenzt (Team)
    var verbleibend = limit === 0 ? null : Math.max(0, gesamtLimit - verbraucht);

    return {
      paket:       paket,
      limit:       limit,          // Basis-Limit (25 Solo, 0=∞ Team)
      verbraucht:  verbraucht,     // diesen Monat
      zusatz:      zusatz,         // gekaufte Zusatz-Fälle
      gesamtLimit: gesamtLimit,    // limit + zusatz
      verbleibend: verbleibend,    // null = unbegrenzt
      istUnbegrenzt: limit === 0,
      istVoll: limit !== 0 && verbraucht >= gesamtLimit,
      monat:   aktuellerMonat(),
    };
  }

  /* Einen neuen Fall registrieren (Aufruf in app-logic.js beim Anlegen) */
  function registriereNeuenFall() {
    pruefeMonatsReset();
    var status = getKontingentStatus();
    if (status.istUnbegrenzt) return true; // Team: immer OK
    if (status.istVoll) return false;      // Limit erreicht

    // Erst Zusatz-Fälle verbrauchen
    var zusatz = parseInt(localStorage.getItem(ZUSATZ_KEY) || '0', 10);
    var basis  = parseInt(localStorage.getItem(KONTINGENT_KEY) || '0', 10);
    var paket  = getPaket();
    var limit  = FEATURE_MAP[paket] ? FEATURE_MAP[paket].faelle_monat : 25;

    if (basis >= limit && zusatz > 0) {
      // Basis aufgebraucht → Zusatz verbrauchen
      localStorage.setItem(ZUSATZ_KEY, String(Math.max(0, zusatz - 1)));
    } else {
      localStorage.setItem(KONTINGENT_KEY, String(basis + 1));
    }
    return true;
  }

  /* Zusatz-Fälle nach Add-on-Kauf gutschreiben */
  function gutschreibeZusatzFaelle(menge) {
    var aktuell = parseInt(localStorage.getItem(ZUSATZ_KEY) || '0', 10);
    localStorage.setItem(ZUSATZ_KEY, String(aktuell + menge));
    console.log('[PaketGuard] Zusatz-Fälle gutgeschrieben: +' + menge + ' → ' + (aktuell + menge));
  }

  /* Kontingent prüfen — gibt false + Overlay wenn voll */
  function pruefeKontingent(opts) {
    var status = getKontingentStatus();
    if (!status.istVoll) return true;

    injectCSS();
    opts = opts || {};
    var old = document.getElementById('pg-overlay-kontingent');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'pg-overlay';
    overlay.id = 'pg-overlay-kontingent';
    overlay.innerHTML = [
      '<div class="pg-modal">',
        '<div class="pg-icon">📋</div>',
        '<h2>Monatliches Kontingent erreicht</h2>',
        '<p>Sie haben diesen Monat alle <strong>' + status.gesamtLimit + ' Fälle</strong> verbraucht. ',
        'Kaufen Sie ein Zusatz-Paket oder warten Sie auf das Monats-Reset.</p>',
        '<div class="pg-btns">',
          '<button class="pg-btn-upgrade" onclick="window.location.href=\"app.html#addon\"">',
            '➕ Zusatz-Fälle kaufen',
          '</button>',
          '<button class="pg-btn-back" id="pg-back-kontingent">← Zurück</button>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);
    var back = document.getElementById('pg-back-kontingent');
    if (back) back.addEventListener('click', function() {
      overlay.remove();
      if (typeof opts.onAbbruch === 'function') opts.onAbbruch();
      else history.back();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); if (typeof opts.onAbbruch === 'function') opts.onAbbruch(); }
    });
    return false;
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
    /** Kontingent-Status lesen (verbraucht, verbleibend, zusatz) */
    getKontingentStatus:  getKontingentStatus,
    /** Neuen Fall registrieren — gibt false wenn Limit erreicht */
    registriereNeuenFall: registriereNeuenFall,
    /** Kontingent prüfen + ggf. Overlay anzeigen */
    pruefeKontingent:     pruefeKontingent,
    /** Zusatz-Fälle nach Kauf gutschreiben */
    gutschreibeZusatzFaelle: gutschreibeZusatzFaelle,
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