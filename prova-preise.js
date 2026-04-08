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
/* ── Add-on Pakete ─────────────────────────────────────── */
window.PROVA_ADDON_PREISE = {
  FAELLE_5:  'price_1TJLnv8d1CNm0HvYy7ZrLRot',   // +5 Fälle Add-on
  FAELLE_10: 'price_1TJLpG8d1CNm0HvY69Ph6oqY',   // +10 Fälle Add-on
};


/* ════════════════════════════════════════════════════════════
   PROVA PDFMonkey Template-IDs — VOLLSTÄNDIG (alle 21 Templates)
   Nie wieder kurze IDs verwenden — nur die vollständigen UUIDs
════════════════════════════════════════════════════════════ */
window.PROVA_PDFMONKEY_TEMPLATES = {
  // ── Rechnungen ────────────────────────────────────────────
  'jveg':              'S32BEA1F-9D1D-40CE-8A84-542C50B98437',  // F-01
  'rechnung_pausch':   'B1C3E69D-6710-4123-8670-6C52BB926058',  // F-02
  'rechnung_std':      'EA5CAC85-EE15-43BC-BC25-10C2C6368572',  // F-03

  // ── Kommunikation ─────────────────────────────────────────
  'kurzstellungnahme': 'C4BB257B-2841-4AF7-93C1-0C795FCA6BBC',  // F-04
  'gutschrift':        '64BFD7F0-E90A-4F03-A65C-AE0D32DBA9C3',  // F-05

  // ── Mahnungen ─────────────────────────────────────────────
  'mahnung_1':         '8ECAC2E4-D079-4B62-871C-BE0D12BBC020',  // F-06
  'mahnung_2':         'A4E57F73-F6E6-4AEB-B48C-56A4B698026B',  // F-07
  'mahnung_3':         '6ADE8D9A-8DF4-4482-98D6-188027A4B239',  // F-08

  // ── Gutachten (Schadensart-spezifisch) ───────────────────
  'kurzgutachten':     'BA076019-40E8-41CB-82AE-08D3A77280DA',  // F-09
  'beweissicherung':   '6FF656D3-9807-4F59-9305-1338D5D1AD9A',  // F-10
  'brandschaden':      '6B85ECFF-EA82-4518-8007-F5561AE20DB4',  // F-11
  'feuchte_schimmel':  '4233F240-A3D4-4611-A787-FD8F86AACEFB',  // F-12
  'elementarschaden':  '8868A0E2-D859-4CB5-8ED9-BCE327340949',  // F-13
  'baumaengel':        '3174576E-999B-4A39-9A0C-9139AD220C9E',  // F-14
  'gericht':           '36E140DC-DD17-432F-B237-910C6462736E',  // F-15
  'ergaenzung':        'A8D05FAB-521E-43BC-A4B5-F2B5F6BFA1ED',  // F-16
  'schiedsgutachten':  '37CF6A57-F7C1-42F6-BF94-B91522615C13',  // F-17
  'bauabnahme':        '4D81616B-1D99-4B6B-8EF4-B538DF71E9A5',  // F-18

  // ── Medien & Dokumente ────────────────────────────────────
  'fotodoku':          '0383BD85-FEA6-4AED-B477-48A2AA5F1373',  // FOTODOKU
  'brief':             'BAD1170B-C2BC-4EE7-ACBB-CCBD158892C7',  // PROVA BRIEF

  // ── Paket-abhängige Gutachten-Templates ──────────────────
  // Starter → Solo (149€), Pro → Zwischenstufe, Enterprise → Team (279€)
  'solo':              'EC64C790-3E04-4C66-BFF8-4A3BB0215B5F',  // GUTACHTEN STARTER/SOLO
  'pro':               'B04958ED-39F8-433F-9A4D-E8243B5DA022',  // GUTACHTEN PRO
  'team':              'E865E0CD-535A-4A25-85A8-917AC86E84F7',  // GUTACHTEN ENTERPRISE/TEAM

  /**
   * Gibt die korrekte Template-ID zurück basierend auf:
   * 1. Schadensart (Vorrang)
   * 2. Gutachten-Typ
   * 3. Paket des SV (Solo/Team)
   */
  get: function(schadensart, typ, paket) {
    var sa = (schadensart || '').toLowerCase();
    var t  = (typ  || '').toLowerCase();
    var p  = (paket || localStorage.getItem('prova_paket') || 'Solo').toLowerCase();

    // Schadensart-basiert
    if (sa.includes('brand'))                          return this.brandschaden;
    if (sa.includes('feuchte') || sa.includes('schimmel')) return this.feuchte_schimmel;
    if (sa.includes('elementar') || sa.includes('sturm'))  return this.elementarschaden;
    if (sa.includes('mangel') || sa.includes('baumangel'))  return this.baumaengel;

    // Typ-basiert
    if (t === 'jveg')            return this.jveg;
    if (t === 'kurzgutachten')   return this.kurzgutachten;
    if (t === 'beweissicherung') return this.beweissicherung;
    if (t === 'gericht')         return this.gericht;
    if (t === 'ergaenzung')      return this.ergaenzung;
    if (t === 'schiedsgutachten')return this.schiedsgutachten;
    if (t === 'bauabnahme')      return this.bauabnahme;
    if (t === 'brief')           return this.brief;
    if (t === 'fotodoku')        return this.fotodoku;
    if (t.includes('mahnung_1')) return this.mahnung_1;
    if (t.includes('mahnung_2')) return this.mahnung_2;
    if (t.includes('mahnung_3')) return this.mahnung_3;

    // Paket-basiert (Standard-Vollgutachten)
    if (p === 'team')  return this.team;
    return this.solo; // Solo ist Standard
  }
};

