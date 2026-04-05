/* ============================================================
   PROVA prova-preise.js — Zentrale Preiskonfiguration
   
   PROBLEM GELÖST: Preise standen an 3+ Stellen inkonsistent:
   - trial-guard.js: Solo 89€, Team 179€ (FALSCH)
   - stripe-checkout.js: Solo 149€, Team 349€ (RICHTIG)
   - index.html/Landingpage: eigene Preise
   
   LÖSUNG: Eine einzige Quelle der Wahrheit.
   Alle UI-Komponenten lesen aus PROVA_PREISE.
   
   EINBINDEN (ganz früh im <head>):
   <script src="prova-preise.js"></script>
============================================================ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     HIER NUR EINMAL ÄNDERN — gilt für ALLES
  ══════════════════════════════════════════════════════════ */
  var PREISE = {

    Solo: {
      name:              'Solo',
      tagline:           'Für den selbstständigen Sachverständigen',
      preis_monatlich:   149,          // €/Monat bei Monatszahlung
      preis_jaehrlich:   119,           // €/Monat bei Jahreszahlung
      preis_jahr_total:  1428,         // 119 × 12
      ersparnis_jahr:    360,          // (149-119) × 12
      onboarding:        149,          // Einmalige Onboarding-Gebühr
      stripe_price_abo:  'price_1TEHG68d1CNm0HvYFNx99Tq6',
      stripe_price_jahr: '',           // → Stripe Jahres-Price-ID eintragen
      trial_tage:        14,
      farbe:             '#4f8ef7',
      farbe_rgb:         '79,142,247',
      kontingent_gutachten: null,      // unbegrenzt
      max_svs:           1,
      features: [
        '1 Sachverständiger',
        'Unbegrenzte Gutachten',
        'KI-Diktat + §407a ZPO',
        'JVEG-Rechner & Abrechnung',
        'Normen-Datenbank (DIN/WTA/VOB)',
        '20 persönliche Textbausteine',
        'Rechnungen & Archiv',
        'Kalender & Termine',
        'Briefvorlagen (15+)',
        'Offline-Modus (PWA)',
        'E-Mail-Support (24h)',
      ],
      nicht_enthalten: [
        'Team-Dashboard',
        'KI-Foto-Analyse',
        'XRechnung / ZUGFeRD',
        'Baubegleitung (Projekte)',
        'DocEstate-Integration',
        'API-Zugang',
      ]
    },

    Team: {
      name:              'Team',
      tagline:           'Für Büros mit mehreren Sachverständigen',
      preis_monatlich:   279,          // €/Monat bei Monatszahlung
      preis_jaehrlich:   219,           // €/Monat bei Jahreszahlung
      preis_jahr_total:  2628,         // 219 × 12
      ersparnis_jahr:    720,          // (279-219) × 12
      onboarding:        349,          // Einmalige Onboarding-Gebühr
      stripe_price_abo:  'price_1TEHH68d1CNm0HvYLeG1Or7T',
      stripe_price_jahr: '',           // → Stripe Jahres-Price-ID eintragen
      trial_tage:        14,
      farbe:             '#a78bfa',
      farbe_rgb:         '167,139,250',
      kontingent_gutachten: null,      // unbegrenzt
      max_svs:           5,
      badge:             'Beliebt',
      features: [
        'Bis 5 Sachverständige',
        'Alle Solo-Features',
        'Team-Dashboard & Übersicht',
        'KI-Foto-Analyse (Schadenserkennung)',
        'XRechnung / ZUGFeRD (E-Rechnung)',
        'Baubegleitung (Projekte & Mängel)',
        'DocEstate-Integration',
        'Gemeinsame Kontakte & Normen',
        'Rollenmanagement (Admin/SV)',
        'Unbegrenzte Textbausteine',
        'API-Zugang (REST)',
        'Priority-Support (4h)',
      ],
      nicht_enthalten: []
    }

  };

  /* ── Hilfsfunktionen ── */

  function getPreis(paket) {
    return PREISE[paket] || PREISE.Solo;
  }

  function formatPreis(euro) {
    return euro.toLocaleString('de-DE') + ' €';
  }

  /* ── Trial-Overlay HTML generieren (ersetzt hardcoded HTML in trial-guard.js) ── */
  function buildTrialOverlayHTML() {
    var solo = PREISE.Solo;
    var team = PREISE.Team;

    return [
      '<div class="trial-dialog">',
        '<div style="font-size:40px;margin-bottom:12px;">⏰</div>',
        '<h2>Ihr Testzeitraum ist abgelaufen</h2>',
        '<p>Wählen Sie jetzt Ihr Paket und legen Sie direkt weiter los:</p>',
        '<div class="trial-prices">',

          '<div class="trial-price-card">',
            '<h3>' + solo.name + '</h3>',
            '<div class="price">' + solo.preis_monatlich + '€</div>',
            '<div class="per">pro Monat</div>',
            '<div style="font-size:10px;color:#6b7280;margin-top:2px;">oder ' + solo.preis_jaehrlich + '\u20ac/Mo j\u00e4hrlich</div>',
            '<button class="stripe-overlay-btn" data-paket="Solo" style="width:100%;margin-top:10px;padding:8px;border-radius:6px;border:none;background:#4f8ef7;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Solo wählen →</button>',
          '</div>',

          '<div class="trial-price-card" style="border-color:rgba(167,139,250,.3);position:relative;">',
            '<div style="position:absolute;top:-8px;right:8px;background:#a78bfa;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:.05em;">' + (team.badge || 'BELIEBT') + '</div>',
            '<h3>' + team.name + '</h3>',
            '<div class="price" style="color:#a78bfa;">' + team.preis_monatlich + '€</div>',
            '<div class="per">pro Monat · bis ' + team.max_svs + ' SVs</div>',
            '<div style="font-size:10px;color:#6b7280;margin-top:2px;">oder ' + team.preis_jaehrlich + '€/Mo jährlich</div>',
            '<button class="stripe-overlay-btn" data-paket="Team" style="width:100%;margin-top:10px;padding:8px;border-radius:6px;border:none;background:#a78bfa;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Team wählen →</button>',
          '</div>',

        '</div>',
        '<div style="margin-top:8px;">',
          '<a href="archiv.html" class="trial-btn trial-btn-ghost">Nur Archiv ansehen</a>',
        '</div>',
        '<p style="margin-top:16px;font-size:11px;color:#6b7280;">Ihre Daten bleiben 30 Tage gespeichert. Fragen: kontakt@prova-systems.de</p>',
      '</div>'
    ].join('');
  }

  /* ── Preiskarten für Einstellungen/Landingpage ── */
  function buildPreiskarteHTML(paketName, opts) {
    opts = opts || {};
    var p = PREISE[paketName];
    if (!p) return '';
    var istAktuell = opts.aktuell || false;
    var zahlung    = opts.zahlung || 'monatlich'; // 'monatlich' | 'jaehrlich'
    var preis      = zahlung === 'jaehrlich' ? p.preis_jaehrlich : p.preis_monatlich;

    return [
      '<div class="preis-karte" style="',
        'background:var(--surface,#161b2e);',
        'border:1px solid ' + (istAktuell ? 'rgba(' + p.farbe_rgb + ',.4)' : 'rgba(255,255,255,.08)') + ';',
        'border-radius:16px;padding:24px;position:relative;',
        istAktuell ? 'box-shadow:0 0 0 1px rgba(' + p.farbe_rgb + ',.15);' : '',
      '">',

        p.badge && !istAktuell ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:' + p.farbe + ';color:#fff;font-size:10px;font-weight:700;padding:3px 12px;border-radius:10px;white-space:nowrap;">' + p.badge + '</div>' : '',
        istAktuell ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:rgba(' + p.farbe_rgb + ',.15);border:1px solid rgba(' + p.farbe_rgb + ',.3);color:' + p.farbe + ';font-size:10px;font-weight:700;padding:3px 12px;border-radius:10px;white-space:nowrap;">✓ Ihr aktuelles Paket</div>' : '',

        '<div style="font-size:16px;font-weight:800;color:var(--text,#eaecf4);margin-bottom:4px;">' + p.name + '</div>',
        '<div style="font-size:11px;color:var(--text3);margin-bottom:16px;">' + p.tagline + '</div>',

        '<div style="margin-bottom:20px;">',
          '<span style="font-size:32px;font-weight:800;color:' + p.farbe + ';">' + preis + '€</span>',
          '<span style="font-size:12px;color:var(--text3);">/Monat</span>',
          zahlung === 'jaehrlich' ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">bei Jahreszahlung · ' + formatPreis(p.preis_jahr_total) + '/Jahr</div>' : '',
        '</div>',

        '<ul style="list-style:none;padding:0;margin:0 0 20px;display:flex;flex-direction:column;gap:7px;">',
          p.features.map(function (f) {
            return '<li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text2,#8b93ab);">' +
              '<span style="color:' + p.farbe + ';flex-shrink:0;margin-top:1px;">✓</span>' + f + '</li>';
          }).join(''),
          p.nicht_enthalten.map(function (f) {
            return '<li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(255,255,255,.2);">' +
              '<span style="flex-shrink:0;margin-top:1px;">✗</span>' + f + '</li>';
          }).join(''),
        '</ul>',

        !istAktuell ? [
          '<button onclick="provaStarteCheckout(\'' + paketName + '\')" style="',
            'width:100%;padding:11px;border-radius:10px;border:none;',
            'background:' + p.farbe + ';color:#fff;',
            'font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);',
            'transition:opacity .15s;" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">',
            'Jetzt ' + p.name + ' wählen →',
          '</button>',
          '<div style="text-align:center;margin-top:8px;font-size:10px;color:var(--text3);">',
            p.trial_tage + ' Tage kostenlos testen · Onboarding ' + p.onboarding + '€',
          '</div>'
        ].join('') : '<div style="text-align:center;padding:11px;border-radius:10px;background:rgba(' + p.farbe_rgb + ',.08);color:' + p.farbe + ';font-size:13px;font-weight:700;">Aktives Abonnement</div>',

      '</div>'
    ].join('');
  }

  /* ── Checkout starten (nutzt bestehende stripe-checkout.js) ── */
  window.provaStarteCheckout = async function (paketName) {
    var email = localStorage.getItem('prova_sv_email') || localStorage.getItem('prova_email') || '';
    if (!email) {
      if (typeof showToast === 'function') showToast('⚠️ Bitte zuerst anmelden.', 'warning');
      return;
    }
    try {
      var res = await fetch('/.netlify/functions/stripe-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paket: paketName, email: email })
      });
      var data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Fehler');
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Checkout-Fehler: ' + e.message, 'error');
    }
  };

  /* ── Globales Export ── */
  global.PROVA_PREISE          = PREISE;
  global.provaGetPreis         = getPreis;
  global.provaFormatPreis      = formatPreis;
  global.provaBuildTrialOverlay = buildTrialOverlayHTML;
  global.provaBuildPreiskarte  = buildPreiskarteHTML;

  // PROVA-Objekt erweitern falls vorhanden
  if (global.PROVA) {
    global.PROVA.preise = PREISE;
    global.PROVA.getPreis = getPreis;
  }

})(window);