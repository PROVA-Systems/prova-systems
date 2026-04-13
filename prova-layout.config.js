/**
 * PROVA Layout Configuration — Single Source of Truth
 * ════════════════════════════════════════════════════
 * Diese Datei definiert für JEDE Seite den Layout-Typ.
 * nav.js liest diese Config → rendert automatisch das richtige Layout.
 * prova-check.sh prüft → jede neue Seite MUSS hier eingetragen werden.
 *
 * Layout-Typen:
 *   shell    → Sidebar (nav.js) + Topbar — Standard für alle App-Seiten
 *   wizard   → Eigener Flow-Header, keine Sidebar (Stripe-Prinzip: Fokus bei kritischen Aktionen)
 *   mobile   → Tab-Navigation, keine Sidebar (Vor-Ort im Feld)
 *   preauth  → Kein Navigation (Login, Onboarding)
 *   admin    → Admin-only Shell
 *   print    → Druckvorlagen, Briefe — heller Hintergrund, keine App-Navigation
 *
 * Bei neuer Seite: hier eintragen, dann deployen. prova-check.sh blockiert sonst.
 */

(function() {
  'use strict';

  var PROVA_LAYOUT_CONFIG = {

    /* ── SHELL: Sidebar + Topbar ──────────────────────────────────
       Standard für alle Verwaltungs- und Listen-Seiten.
       nav.js injiziert Sidebar automatisch wenn id="sidebar" vorhanden.
    ── */
    shell: [
      'dashboard.html',
      'vor-ort.html',
      'akte.html',
      'archiv.html',
      'termine.html',
      'rechnungen.html',
      'jveg.html',
      'mahnwesen.html',
      'erechnung.html',
      'kontakte.html',
      'briefvorlagen.html',
      'textbausteine.html',
      'normen.html',
      'positionen.html',
      'einstellungen.html',
      'statistiken.html',
      'jahresbericht.html',
      'import-assistent.html',
      'hilfe.html',
      'app.html',
      'baubegleitung.html',
      'ergaenzung.html',
      'freigabe-queue.html',
      'schiedsgutachten.html',
      'gericht-auftrag.html',
      'portal.html',
      'smtp-einrichtung.html',
      'benachrichtigungen.html',
      'kostenermittlung.html',
      'schnelle-rechnung.html',
      'mahnung.html',
      'effizienz.html',
      'begehungsprotokoll.html',
      'stellungnahme-gate.html',
      'stellungnahme-gegengutachten.html',
      'widerspruch-gutachten.html',
      'widerspruch-gegengutachten.html',
      'rechnungskorrektur.html',
      'abnahmeprotokoll-formal.html',
      'vollmacht-sv.html',
      'maengelanzeige.html',
      'terminabsage.html',
      'datenschutz-einwilligung-gericht.html',
      'app-pro.html',
      'integration-template.html',
    ],

    /* ── WIZARD/FLOW: Eigener Header, keine Sidebar ───────────────
       Stripe-Prinzip: Kritische Aktionen (§407a Freigabe, Fachurteil
       schreiben) brauchen maximalen Fokus ohne Ablenkung.
       Eigener Step-Indicator im Header statt Standard-Topbar.
    ── */
    wizard: [
      'freigabe.html',        // §407a Freigabe + PDF-Versand — kritischste Aktion
      'stellungnahme.html',   // §6 Fachurteil schreiben — Fokus-Schreibmodus
      'stellungnahme-v3.1.html',
    ],

    /* ── MOBILE/FIELD: Tab-Navigation, keine Sidebar ─────────────
       SV steht mit Handy im Keller oder auf dem Dach.
       Sidebar = Platzverschwendung. Tabs = touch-optimiert.
    ── */
    mobile: [
      'ortstermin-modus.html', // Vor-Ort: Fotos, Skizzen, Diktat, Messungen
    ],

    /* ── PRE-AUTH: Kein Navigation ────────────────────────────────
       Login, Registrierung, Onboarding, Fehlerseiten.
       Kein Sidebar, kein Topbar — der User ist noch nicht drin.
    ── */
    preauth: [
      'app-login.html',
      'app-register.html',
      'onboarding.html',
      'onboarding-welcome.html',
      'onboarding-schnellstart.html',
      'account-gesperrt.html',
      'offline.html',
      'index.html',
      '404.html',
      'app-starter.html',
      'app-enterprise.html',
    ],

    /* ── ADMIN: Admin-only Shell ──────────────────────────────────
       Nur für PROVA-Admins zugänglich. Eigene Auth.
    ── */
    admin: [
      'admin-dashboard.html',
      'admin-login.html',
    ],

    /* ── PRINT/BRIEF: Druckvorlagen ───────────────────────────────
       Hellhintergrund, keine App-Navigation.
       Werden aus der App heraus geöffnet/gedruckt.
       DM Sans Schrift eingebunden, sonst eigenständig.
    ── */
    print: [
      // Gutachten-Formulare
      'vorlage-01-standard.html',
      'vorlage-02-kurzgutachten.html',
      'vorlage-03-beweissicherung.html',
      'vorlage-04-gerichtsgutachten.html',
      'vorlage-05-brandschaden.html',
      'vorlage-06-feuchteschimmel.html',
      'vorlage-07-elementarschaden.html',
      'vorlage-08-baumaengel.html',
      'vorlage-09-ergaenzungsgutachten.html',
      'vorlage-10-schiedsgutachten.html',
      'vorlage-11-bauabnahmeprotokoll.html',
      // Briefe & Checklisten
      'auftragsbestaetigung.html',
      'beauftragungsbestaetigung-gericht.html',
      'deckungsanfrage.html',
      'einladung-ortstermin.html',
      'einladung-ortstermin-gericht.html',
      'einverstaendnis-dsgvo.html',
      'fristverlaengerungsantrag.html',
      'ergaenzungsfragen-antwort.html',
      'erinnerungsschreiben.html',
      'erstbericht-versicherung.html',
      'honorarvereinbarung.html',
      'kostenvorschuss-gericht.html',
      'kuendigung-auftrag.html',
      'nachforderung-unterlagen.html',
      'ortsbesichtigung-protokoll-gericht.html',
      'ortstermin-protokoll.html',
      'ortstermin-arbeitsblatt.html',
      'schlussrechnung-aufstellung.html',
      'sicherheitsbedenken.html',
      'terminsbestaetigung.html',
      'terminsverlegung-antrag.html',
      'umladebrief-ortstermin.html',
      'verguetungsanzeige.html',
      'datenschutz-mandant.html',
      'aktennotiz.html',
      'auftrag-ablehnen.html',
      'angebot-gutachten.html',
      'abschlussbericht-versicherung.html',
      'akteneinsicht-antrag.html',
      'kostenrahmen-erhoehung.html',
      'kostenvoranschlag-sanierung.html',
      'maengelruege.html',
      'checkliste-brandschaden.html',
      'checkliste-sturmschaden.html',
      'checkliste-wasserschaden.html',
      'messprotokoll-feuchte.html',
      'messprotokoll-risse.html',
      'pdfmonkey-brief-template.html',
      'pdfmonkey-messprotokoll-template.html',
      // Rechtliches
      'agb.html',
      'datenschutz.html',
      'impressum.html',
      'avv.html',
      'gutachten-zusammenfassung.html',
      'auftrag-ablehnung.html',
    ],
  };

  /* ── Layout-Typ für aktuelle Seite ermitteln ── */
  window.PROVA_LAYOUT = {
    config: PROVA_LAYOUT_CONFIG,

    getType: function() {
      var page = window.location.pathname.split('/').pop() || 'dashboard.html';
      // Subdirectory-Seiten (formulare/, briefe/) → immer print
      if (window.location.pathname.includes('/formulare/') ||
          window.location.pathname.includes('/briefe/')) {
        return 'print';
      }
      for (var type in PROVA_LAYOUT_CONFIG) {
        if (PROVA_LAYOUT_CONFIG[type].indexOf(page) !== -1) return type;
      }
      return 'shell'; // Default: Shell für unbekannte Seiten
    },

    isShell:   function() { return this.getType() === 'shell'; },
    isWizard:  function() { return this.getType() === 'wizard'; },
    isMobile:  function() { return this.getType() === 'mobile'; },
    isPreauth: function() { return this.getType() === 'preauth'; },
    isPrint:   function() { return this.getType() === 'print'; },
    isAdmin:   function() { return this.getType() === 'admin'; },
  };

})();
