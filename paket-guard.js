/**
 * PROVA — Feature-Gating: nur Solo | Team (Legacy: Starter/Pro → Solo, Enterprise → Team).
 * prova-account-gate.js: Trial separat.
 */
(function () {
  window.PROVA = window.PROVA || {};
  var raw = (localStorage.getItem('prova_paket') || 'Solo').trim();
  PROVA.paket = raw;

  var LEGACY_TO_TIER = { Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team', Solo: 'Solo', Team: 'Team' };
  PROVA.tier = LEGACY_TO_TIER[raw] || 'Solo';

  var FEATURE_MAP = {
    Solo: {
      ki_diktat: true,
      ki_fachurteil: true,
      ki_qualitaet: true,
      ki_normen: true,
      ki_foto_analyse: false,
      ki_beweisfragen: false,
      ki_credits: 200,
      gutachten: true,
      gutachten_gericht: true,
      gutachten_ergaenz: true,
      gutachten_schieds: true,
      jveg: true,
      normen: true,
      freigabe: true,
      ortstermin: true,
      import_assistent: true,
      baubegleitung: false,
      briefvorlagen: 15,
      textbausteine: 20,
      positionen: true,
      briefe_senden: true,
      kontakte: true,
      rechnungen: true,
      schnellrechnung: true,
      mahnwesen: true,
      jveg_rechnung: true,
      jahresbericht: true,
      zugferd: false,
      xrechnung: false,
      datev_export: false,
      termine: true,
      archiv: true,
      benachrichtigungen: true,
      statistiken: true,
      max_svs: 1,
      team_dashboard: false,
      einladen: false,
      effizienz: false,
      unterlagen_tracking: false,
      kv_tracker: false,
      support_email: true,
      support_chat: false,
      api_zugang: false
    },
    Team: {
      ki_diktat: true,
      ki_fachurteil: true,
      ki_qualitaet: true,
      ki_normen: true,
      ki_foto_analyse: true,
      ki_beweisfragen: true,
      ki_credits: 1000,
      gutachten: true,
      gutachten_gericht: true,
      gutachten_ergaenz: true,
      gutachten_schieds: true,
      jveg: true,
      normen: true,
      freigabe: true,
      ortstermin: true,
      import_assistent: true,
      baubegleitung: true,
      briefvorlagen: 999,
      textbausteine: 999,
      positionen: true,
      briefe_senden: true,
      kontakte: true,
      rechnungen: true,
      schnellrechnung: true,
      mahnwesen: true,
      jveg_rechnung: true,
      jahresbericht: true,
      zugferd: true,
      xrechnung: true,
      datev_export: true,
      termine: true,
      archiv: true,
      benachrichtigungen: true,
      statistiken: true,
      max_svs: 5,
      team_dashboard: true,
      einladen: true,
      effizienz: true,
      unterlagen_tracking: true,
      kv_tracker: true,
      support_email: true,
      support_chat: true,
      api_zugang: false
    }
  };

  /** Alte Feature-Strings aus HTML/JS → Schlüssel in FEATURE_MAP oder Team-only-Legacy */
  var LEGACY_ALIAS = {
    erechnung: 'zugferd',
    ki_brieftext: 'ki_qualitaet',
    paragraph_407a: 'gutachten_gericht',
    auto_erstbericht: 'gutachten',
    chef_freigabe: 'einladen',
    auftraggeber_db: 'kontakte',
    foto_erweitert: 'ki_foto_analyse',
    foto_forensik: 'ki_foto_analyse',
    audit_trail: 'unterlagen_tracking',
    jahresbericht: 'jahresbericht',
    '3_seats': 'einladen'
  };

  /** Nicht in FEATURE_MAP-Literal genannt, aber Team-only (Schnittstellen) */
  var TEAM_ONLY_EXTRA = ['outbound_webhook', 'whitelabel'];

  PROVA.UPGRADE_TEXTE = {
    ki_foto_analyse: {
      icon: '📷',
      title: 'KI-Foto-Analyse',
      text: 'Fotos vom Ortstermin automatisch analysieren — KI erkennt Schadensart, schätzt Maße und schlägt passende Normen vor. Spart bis zu 45 Minuten pro Gutachten.'
    },
    ki_beweisfragen: {
      icon: '⚖️',
      title: 'Beweisfragen-Extraktor',
      text: 'Gerichtsbeschluss als PDF hochladen — KI extrahiert alle Beweisfragen nach §411 ZPO und strukturiert das Gutachten automatisch danach.'
    },
    baubegleitung: {
      icon: '🏗️',
      title: 'Baubegleitung',
      text: 'Projekte, Bauphasen und Zwischenrechnungen pro Phase — für SVs die laufende Baubegleitung anbieten.'
    },
    zugferd: {
      icon: '🧾',
      title: 'ZUGFeRD / XRechnung',
      text: 'Elektronische Rechnungen nach EN 16931 — Pflicht für Behörden und öffentliche Auftraggeber ab 2025.'
    },
    xrechnung: {
      icon: '🧾',
      title: 'ZUGFeRD / XRechnung',
      text: 'Elektronische Rechnungen nach EN 16931 — Pflicht für Behörden und öffentliche Auftraggeber ab 2025.'
    },
    datev_export: {
      icon: '📊',
      title: 'DATEV-Export',
      text: 'Rechnungen direkt als DATEV-Buchungsstapel exportieren — fertig für den Steuerberater.'
    },
    effizienz: {
      icon: '⚡',
      title: 'Effizienz-Dashboard',
      text: 'Honorar pro Stunde, durchschnittliche Bearbeitungszeit und Top-Auftraggeber — Zahlen die zeigen wo dein Büro Geld liegen lässt.'
    },
    team_dashboard: {
      icon: '👥',
      title: 'Team-Dashboard',
      text: 'Auslastung aller SVs auf einen Blick — wer hat wie viele offene Fälle, wer ist verfügbar.'
    },
    support_chat: {
      icon: '💬',
      title: 'Live-Chat Support',
      text: 'Direkter Chat-Support mit dem PROVA-Team — Antwort innerhalb von 2 Stunden an Werktagen.'
    },
    outbound_webhook: {
      icon: '🔗',
      title: 'Outbound-Webhook',
      text: 'Automatischer JSON-Push bei Gutachten-Freigabe an Ihre Systeme — nur im Team-Paket.'
    },
    whitelabel: {
      icon: '🎨',
      title: 'White-Label',
      text: 'Eigenes Logo und Farben in PDFs und E-Mails — im Team-Paket.'
    },
    erechnung: {
      icon: '📄',
      title: 'E-Rechnung (ZUGFeRD / XRechnung)',
      text: 'Elektronische Rechnungen nach EN 16931 — Pflicht für Behörden und öffentliche Auftraggeber.'
    },
    einladen: {
      icon: '👤',
      title: 'Team & Einladungen',
      text: 'Mehrere Sachverständige, Rollen und Chef-Freigabe — mit dem Team-Paket.'
    },
    kv_tracker: {
      icon: '📌',
      title: 'Kostenvorschuss-Tracker',
      text: 'Strukturiertes Tracking von Kostenvorschüssen pro Akte — im Team-Paket.'
    },
    unterlagen_tracking: {
      icon: '📎',
      title: 'Unterlagen-Tracking',
      text: 'Nachweise und fehlende Unterlagen im Blick — im Team-Paket.'
    }
  };

  function mapForTier(tier) {
    return tier === 'Team' ? FEATURE_MAP.Team : FEATURE_MAP.Solo;
  }

  function resolveKey(feature) {
    if (LEGACY_ALIAS[feature]) return LEGACY_ALIAS[feature];
    return feature;
  }

  PROVA.featureValue = function (feature) {
    var key = resolveKey(feature);
    var m = mapForTier(PROVA.tier);
    if (Object.prototype.hasOwnProperty.call(m, key)) return m[key];
    return undefined;
  };

  PROVA.canUse = function (feature) {
    var key = resolveKey(feature);
    var m = mapForTier(PROVA.tier);
    if (!Object.prototype.hasOwnProperty.call(m, key)) {
      if (TEAM_ONLY_EXTRA.indexOf(key) >= 0) return PROVA.tier === 'Team';
      return true;
    }
    var v = m[key];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v > 0;
    return !!v;
  };

  PROVA.requirePaket = function (feature) {
    if (PROVA.canUse(feature)) return true;
    var key = resolveKey(feature);
    var u = PROVA.UPGRADE_TEXTE[feature] || PROVA.UPGRADE_TEXTE[key];
    var msg = u
      ? u.icon + ' ' + u.title + '\n\n' + u.text + '\n\nTeam-Paket unter Einstellungen oder kontakt@prova-systems.de'
      : 'Diese Funktion ist im Team-Paket enthalten.\n\nPaket upgraden unter Einstellungen.';
    alert(msg);
    return false;
  };

  PROVA.paketLabel = function () {
    if (raw === 'Enterprise') return 'Team';
    if (raw === 'Starter' || raw === 'Pro') return 'Solo';
    return raw;
  };

  PROVA.paketColor = function () {
    if (PROVA.tier === 'Team') return '#a78bfa';
    return '#4f8ef7';
  };

  window.PaketGuard = window.PaketGuard || {};
  PaketGuard.blockiereSeite = function (feature) {
    if (PROVA.canUse(feature)) return false;
    var key = resolveKey(feature);
    var u = PROVA.UPGRADE_TEXTE[feature] || PROVA.UPGRADE_TEXTE[key];
    var title = u ? u.title : 'Team-Funktion';
    var text = u ? u.text : 'Diese Seite ist im Team-Paket verfügbar.';
    var inner =
      '<div style="max-width:520px;margin:0 auto;padding:32px 20px;text-align:center;">' +
      '<h1 style="font-size:1.35rem;margin-bottom:12px;color:#e8eaf0;">' +
      title +
      '</h1>' +
      '<p style="color:#9da3b4;line-height:1.6;margin-bottom:20px;">' +
      text +
      '</p>' +
      '<button type="button" style="padding:10px 20px;border-radius:10px;border:1px solid rgba(79,142,247,0.4);background:rgba(79,142,247,0.25);color:#e8eaf0;font-weight:700;cursor:pointer;" onclick="PROVA.requirePaket(\'' +
      String(feature).replace(/'/g, "\\'") +
      '\')">Upgrade-Infos</button> ' +
      '<a href="einstellungen.html" style="margin-left:12px;color:#4f8ef7;">Einstellungen</a>' +
      '</div>';
    var mainEl = document.querySelector('main');
    if (mainEl) mainEl.innerHTML = inner;
    else document.body.innerHTML = inner;
    return true;
  };
  PaketGuard.zeigeUpgrade = function (feature) {
    var f = feature;
    if (f === 'erechnung') f = 'zugferd';
    if (window.PROVA && typeof PROVA.requirePaket === 'function') {
      return PROVA.requirePaket(f);
    }
    alert('Team-Paket unter Einstellungen oder kontakt@prova-systems.de');
    return false;
  };
})();
