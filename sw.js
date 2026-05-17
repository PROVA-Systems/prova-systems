/* ============================================================
   PROVA Systems — Service Worker v60 (Sprint K1)
   Strategie: Network-First für HTML (kein Zwischenbild mehr!)
              Cache-First für Assets (Fonts, JS, CSS)
              Network-Only für APIs
============================================================ */

const CACHE_VERSION = 'prova-v3550-mega84-85-pass2b-compliance-search';   // MEGA⁸⁴/⁸⁵ Pass 2b 2026-05-17: Block D PDF-Compliance LG-Disclosure (Liquid-Block-Doku fuer F-04/F-09/F-15 + freigabe-wizard Pre-Render-Check ki_anzeige_datum Pflicht) + Block E Trial-Guard (lib/trial-banner.js mit 14T/3T/expired-States + Coupon-UI in app-register fuer FOUNDING-99/FRIEND-50/WERBER-MONAT-FREI) + Block F Global-Search 360 (Migration 59 global_search_v2 RPC mit per-source-limit + lib/prova-global-search.js auf v2 mit v1-Fallback). Sprint-Historie: docs/SW-VERSION-HISTORY.md.
const SYNC_TAG = 'prova-sync-queue';

const APP_SHELL = [
  '/',
  '/login.html',                        // APP-LANDING-SPLIT: kanonische Login-Page
  '/app-login.html',
  '/auth-supabase.html',                // K-1.4 B12: Supabase-Login parallel
  '/onboarding-supabase.html',          // K-1.3 A6: Workspace-Onboarding
  '/app-register.html',
  '/onboarding.html',
  '/onboarding-schnellstart.html',
  '/dashboard.html',
  '/pilot.html',                        // Catch-Up C1: Founding-Pilot-Programm
  '/archiv.html',
  '/akte.html',
  '/app.html',
  '/freigabe.html',
  '/fachurteil.html',
  '/briefvorlagen.html',
  '/rechnungen.html',
  '/termine.html',
  '/kalender.html',
  '/jveg.html',
  '/einstellungen.html',
  '/kontakte.html',
  '/kostenermittlung.html',
  '/textbausteine.html',
  '/normen.html',
  '/positionen.html',
  '/baubegleitung.html',
  '/nav.js',
  // K-1.0 + K-1.3 lib-Stack (Supabase-Foundation)
  '/lib/prova-config.js',
  '/lib/edge-shim.js',                  // MEGA⁴⁴: Frontend → Edge auto-reroute fetch-Shim
  '/lib/sso-landing-redirect.js',       // MEGA⁴⁷: Auto-Forward auf Landing wenn schon eingeloggt
  '/lib/beweisbeschluss-upload.js',     // MEGA²³ Block 1: Beweisbeschluss-PDF-Upload-Library
  '/lib/archiv-filter.js',              // MEGA²⁸ V3.2-W2 KORR-10: Archiv-Filter-Library
  '/lib/global-search-engine.js',       // MEGA²⁸ V3.2-W2 KORR-7: Cmd+K Search-Engine (pure-fn)
  '/lib/admin-ki-stats-frontend.js',    // MEGA²³ Block 4: KI-Stats Frontend-Charts
  '/lib/prova-disclaimer.js',           // MEGA²¹+²² W110: §407a-Disclaimer-Lib
  '/schadensfaelle.html',               // MEGA²⁸ P1-I1: Übersicht-Liste Flow A
  '/schadensfaelle-logic.js',
  '/neuer-fall.html',                   // MEGA²⁸ V3.2-W2 KORR-8: Wizard-Landing-Page
  '/bescheinigungen.html',              // MEGA²⁸ V3.2-W3-I3 KORR-9: 11 Korrespondenz-Briefe Übersicht
  '/admin-cockpit.html',                // MEGA²⁸ V3.2-W5-I9 KORR-23: 12-Sektionen-Übersicht (6 live, 6 skeleton)
  '/lib/referral-system.js',            // MEGA²⁷: Referral-Foundation
  '/lib/referral-ui.js',                // MEGA²⁷: Dashboard-Karte + Modals
  '/lib/referral-redemption.js',        // MEGA²⁷: Pricing-Page Code-Detection
  '/lib/supabase-client.js',
  '/lib/data-store.js',
  '/lib/template-registry.js',
  '/lib/auth-guard.js',
  '/lib/sentry-init.js',                // M3: Sentry Browser-SDK-Init
  '/lib/mobile-polish.css',             // MEGA⁴ Q2: Mobile-Polish CSS
  '/lib/mobile-polish.js',              // MEGA⁴ Q3: Mobile-Polish JS (Lazy/Offline/Camera/Geo)
  '/lib/foto-upload-v2.js',             // MEGA⁹ W1: Magic-Bytes + EXIF-Strip + Image-Optimize
  '/lib/foto-upload-mobile.js',         // MEGA³² C2 P4: Mobile-Foto-Upload mit EXIF-Strip + Geo-Tag
  '/lib/whisper-chunker.js',            // MEGA³² D1: Whisper-Chunker für >25MB Audio
  '/lib/honorar-rechner.js',            // MEGA³² D2: JVEG/BVS/Streitwert Multi-Modus
  '/lib/wizard-live-save.js',           // MEGA³² A1: Wizard-Save + Skip-Logic
  '/lib/dokument-templates-cache.js',   // MEGA³⁶ W6.1: DB-Lookup-Cache für Templates
  '/lib/service-endpoints-cache.js',    // MEGA³⁷ C4: DB-Lookup-Cache für Make-Webhooks
  '/lib/skizzen-canvas.js',             // MEGA³⁹ P3: Skizzen-Canvas Tier 1+2
  '/lib/bibliothek-pattern.js',         // MEGA³⁹ P5: Universal-Toolbar 6 Kategorien
  '/lib/ki-werkzeug-stufen.js',         // MEGA³⁹ P6: KI-Werkzeug-Stufen S1/S2/S3
  '/lib/wertgutachten-verfahren.js',    // MEGA³² A2: Sachwert/Vergleich/Ertrag (ImmoWertV)
  '/diktat-mobile.html',                // MEGA³² C2 P3: Mobile-Diktat-First-UX
  '/honorar-rechner.html',              // MEGA³² D2: Honorar-Rechner UI
  '/bescheinigung-erstellen.html',      // MEGA³² B3: 8-Card-Selector
  '/demo.html',                         // MEGA³² E1: Sandbox-Demo /demo
  '/cookie-einstellungen.html',         // MEGA³⁴ A1: Cookie-Settings-Page (DSGVO § 25 TTDSG)
  '/public-status.html',                // MEGA³⁴ B3: Public Status-Page /status
  '/lib/foto-upload-v2.css',            // MEGA⁹ W1: Drop-Zone + Item-Card Styles
  '/lib/foto-upload-v2-ui.js',          // MEGA⁹ W1: ProvaUploadUI DOM-Helper
  '/lib/public-status-widget.js',       // MEGA¹¹ W6: Footer-Status-Widget
  '/lib/analytics-plausible.js',        // MEGA¹¹ W7: Plausible-Wrapper
  '/lib/prova-alert.js',                // MEGA¹¹ W8: provaAlert-DRY-Helper
  '/lib/ki-cost-display.js',            // MEGA¹¹ W9: KI-Cost-Modal
  '/lib/pwa-install-prompt.js',         // MEGA¹¹ W10: PWA-Install-Banner
  '/offline.html',                      // MEGA¹¹ W10: PWA-Offline-Fallback
  '/lib/ki-fallback-badge.js',          // MEGA¹² W12: Anthropic-Fallback-Badge
  '/lib/ki-confidence-badge.js',        // MEGA¹² W13: KI-Confidence-Badge
  '/lib/safe-area-helper.css',          // MEGA¹² W14: iOS-Safe-Area-Helper-CSS
  '/lib/pull-to-refresh.js',            // MEGA¹² W14: Pull-to-Refresh
  '/lib/admin-drilldown.js',            // MEGA¹² W15: Drilldown-Modal
  '/lib/ki-history-frontend.js',        // MEGA¹³ W18: KI-Historie-Modal
  '/lib/ki-autosuggest.js',             // MEGA¹³ W18: KI-Autosuggest Ghost-Text
  '/lib/hamburger-menu.js',             // MEGA¹³ W19: Hamburger-Menu
  '/lib/bottom-sheet.js',               // MEGA¹³ W19: Bottom-Sheet Modal
  '/lib/admin-bulk.js',                 // MEGA¹³ W21: Bulk-Operations
  '/lib/swipe-gestures.js',             // MEGA¹⁴ W24: Touch-Swipe-Detection
  '/lib/native-share.js',               // MEGA¹⁴ W24: Web-Share-API + Clipboard-Fallback
  '/lib/workflow-mode-router.js',       // MEGA¹⁴-Ext W28: Triple-Mode-Router (Foundation)
  '/lib/prova-editor.js',               // MEGA¹⁵ W32: TipTap-Wrapper (Mode B Editor) + MEGA⁴⁰ P1.2: Underline+Align Extensions
  '/lib/prova-editor.css',              // MEGA¹⁵ W32: Editor-Styles
  '/lib/editor-tiptap.js',              // MEGA⁴⁰ P1.2 + P2: High-Level-Wrapper mit Backend-Sync + Extended-Toolbar
  '/lib/editor-tiptap.css',             // MEGA⁴⁰ P1.2 + P2: Status-Bar + Versions-Panel + Extended-Toolbar + Footnote/PageBreak CSS
  '/lib/editor-extensions.js',          // MEGA⁴⁰ P2: Custom Footnote/PageBreak/CrossRef + Helpers
  '/lib/document-mode-modal.js',        // MEGA⁴⁰ P3: 3-Wege-Auswahl-Modal
  '/lib/document-mode-modal.css',       // MEGA⁴⁰ P3: Modal-CSS (Karten-Grid, Animations)
  '/lib/docx-import.js',                // MEGA⁴⁰ P4: DOCX-Import via mammoth.js
  '/lib/docx-export.js',                // MEGA⁴⁰ P5: HTML/MD/DOCX-Export
  '/lib/editor-spell-layer.js',         // MEGA⁴⁰ P6: Spell+Konjunktiv-II Layer
  '/lib/editor-bibliothek-adapter.js',  // MEGA⁴⁰ P8: Bibliothek-TipTap-Adapter
  '/lib/editor-locked-sections.js',     // MEGA⁴⁰ P9: 4 Compliance-Sektionen (weg_c)
  '/lib/editor-pdf-generator.js',       // MEGA⁴⁰ P9: Browser-Print PDF-Generator IHK
  '/lib/import-format-detector.js',     // MEGA⁴¹ P1: 4 Format-Signatures + CSV/JSON-Parser
  '/lib/aktenzeichen-normalizer.js',    // MEGA⁴¹ P1: AZ-Format-Vereinheitlichung
  '/lib/import-assistent-supabase.js',  // MEGA⁴¹ P1: Bridge zu Backend-Lambdas
  '/lib/audit-source-tracker.js',       // MEGA⁴¹ P2: KI-vs-SV-Frontend-Tracker (EU AI Act)
  '/audit-trail.html',                  // MEGA⁴¹ P2: Audit-Trail-Viewer-Page
  '/support.html',                      // MEGA⁴¹ P5: Support + FAQ-Search + Ticket-Form
  '/lib/cmd-k-modal.js',                // MEGA⁴¹ P6: Cmd+K Drilldown-Modal global
  '/kontakt-detail.html',               // MEGA⁴¹ P7: Kontakt-360-View 9 Tabs
  '/lib/wizard-stepper.js',             // MEGA⁴¹ P8: Workflow-Stepper-Pattern-Lib
  '/lib/wizard-stepper.css',            // MEGA⁴¹ P8: Stepper-CSS
  '/lib/wizard-flow-configs.js',        // MEGA⁴² P2: Flow-Configs A/B/C/D (Source-of-Truth)
  '/lib/workflow-stepper-bridge.js',    // MEGA⁴² P2: Bridge prova-wizard ↔ wizard-stepper
  '/lib/workflow-stepper-bridge.css',   // MEGA⁴² P2: Bridge-Stepper-Header-Styles
  '/push-setup.html',                   // MEGA⁴² P5: Push-Alerts Setup-Wizard 3 Steps
  '/health-test-down.html',             // MEGA⁴² P5: Manueller Health-Check-Trigger (Test-Tool)
  '/pilot-tutorial.html',               // MEGA⁴² P10: 12-Step Pilot-Tutorial mit Resume
  '/lib/sync-conflict-resolver.js',     // MEGA⁴¹ P10: Sync-Konflikt-Resolver
  '/lib/offline-sync-status.js',        // MEGA⁴¹ P10: Offline-Sync-Status-Icon
  '/wiederherstellbare-entwuerfe.html', // MEGA⁴¹ P10: Recovery-Page für Drafts
  '/editor-demo.html',                  // MEGA⁴⁰ P1.2: Editor-Demo-Page (Pattern A volle Page-Width)
  '/dokument-neu.html',                 // MEGA⁴⁰ P3: Neues-Dokument Entry-Page (Modal-First)
  '/dokument-import.html',              // MEGA⁴⁰ P4: DOCX-Import-Page (Drag&Drop)
  '/dokument-vorlagen.html',            // MEGA⁴⁰ P7: Vorlagen-Page Karten-Grid
  // Legacy auth (Hybrid-Modus, bleibt bis Cutover-Phase 5 cleanup)
  '/prova-fetch-auth.js',
  '/prova-notifications.js',
  '/page-template.css',
  '/stellungnahme.css',                 // MEGA²⁸ V3.2-W3-I4 KORR-24: Inline-CSS Extract
  '/app.css',                           // MEGA²⁸ V3.2-W3-I4 KORR-24: Inline-CSS Extract
  '/kurzstellungnahme.html',
  '/kurzstellungnahme-logic.js',
  '/onboarding-supabase-logic.js',
  '/auth-supabase-logic.js',
  '/app-login-logic.js',
  '/auftragstyp.js',
  '/diktat-parser.js',
  '/compliance-check.js',
  '/paragraph-generator.js',
  '/fachurteil-logic.js',
  '/beratung.html',
  '/beratung-logic.js',
  '/baubegleitung-polish.js',
  '/wertgutachten.html',
  '/wertgutachten-logic.js',
  '/theme.js',
  '/trial-guard.js',
  '/prova-status-hydrate.js',
  '/prova-sanitize.js',
  '/prova-pseudo.js',
  '/prova-pseudo-send.js',
  '/prova-preise.js',
  '/paket-guard.js',
  '/ortstermin-modus.html',
  '/frist-guard.js',
  '/honorar-tracker.js',
  '/ki-lernpool.js',
  '/rechtspruefung.js',

  // ── Sprint K1 Files (20.04.2026, Fix) ──
  '/zpo-anzeige.html',
  '/widerrufs-flow.js',
  '/fab.js',
  '/gericht-auftrag-logic.js',

  // ── Sprint K-UI (27.04.2026): Profil-Briefkopf + Kontakte + Briefe ──
  '/profil-supabase.html',
  '/profil-supabase-logic.js',
  '/kontakte-supabase.html',
  '/kontakte-supabase-logic.js',
  '/briefe.html',
  '/briefe-logic.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {
          console.warn('[SW] Konnte nicht cachen:', url);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
    // S-SICHER UI-FIX1.6: Clients über neue SW-Version informieren, damit
    // die Page-Seite (optional) ein sanftes Reload triggern kann. Der
    // Client-Handler wird in einem Folge-Sprint in sw-register.js ergänzt.
    // skipWaiting() ist bereits im install-Handler aktiv → neuer SW
    // übernimmt sofort, clients.claim() greift auf alle offenen Tabs.
    .then(() => self.clients.matchAll({ includeUncontrolled: true }))
    .then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.startsWith('/cdn-cgi/') ||
    url.hostname.includes('make.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('pdfmonkey.io') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Google Fonts → KEIN Cache (CSP erlaubt kein fetch aus SW)
  // Browser lädt Fonts direkt über <link>-Tag — SW darf nicht eingreifen
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return; // SW ignoriert diese Requests — Browser handelt sie nativ
  }

  // HTML → Network-First: immer frisch, kein Zwischenbild
  // Icons: ewig cachen (ändern sich nie → maximale Performance)
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/favicon/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) { const ri = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, ri)); }
          return res;
        }).catch(() => new Response('', {status: 404}));
      })
    );
    return;
  }

  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) { const rc = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, rc)); }
          return res;
        })
        .catch(() => caches.match(event.request).then(cached =>
          cached || new Response('<h1>Offline</h1><p>Bitte Internetverbindung prüfen.</p>',
            { headers: { 'Content-Type': 'text/html' } })
        ))
    );
    return;
  }

  // PROVA Core JS (nav, theme, trial-guard) → Network-First
  // Diese Dateien ändern sich häufig → immer frisch holen
  const isCoreJs = ['/nav.js','/theme.js','/trial-guard.js','/sw-register.js','/mobile.css',
  '/prova-wizard.js'].includes(url.pathname)
    || url.pathname.endsWith('.css')
    || (url.pathname.endsWith('.js') && !url.pathname.includes('netlify'));
  if (isCoreJs) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) { const rj = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, rj)); }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Andere JS/CSS/Assets → Cache-First mit Background-Update
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        // Background-Revalidation (kein Clone-Konflikt da nicht im critical path)
        fetch(event.request).then(res => {
          if (res && res.ok) cache.put(event.request, res.clone());
        }).catch(() => {});
        // Sofort aus Cache liefern wenn vorhanden
        if (cached) return cached;
        // Sonst Netz
        return fetch(event.request).then(res => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    )
  );
});

self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) event.waitUntil(verarbeiteOfflineQueue());
});

async function verarbeiteOfflineQueue() {
  const db = await openDB();
  const alle = await getAllFromStore(db.transaction('offline_queue', 'readwrite').objectStore('offline_queue'));
  for (const e of alle) {
    try {
      const res = await fetch(e.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e.payload) });
      if (res.ok) {
        const tx2 = db.transaction('offline_queue', 'readwrite');
        tx2.objectStore('offline_queue').delete(e.id);
        notifiziereClients({ type: 'SYNC_SUCCESS', id: e.id });
      }
    } catch (err) { console.warn('[SW] Retry:', e.id); }
  }
}

self.addEventListener('message', event => {
  if ((event.data&&event.data.type) === 'SKIP_WAITING') self.skipWaiting();
  if ((event.data&&event.data.type) === 'TRIGGER_SYNC') {
    self.registration.sync.register(SYNC_TAG).catch(() => verarbeiteOfflineQueue());
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('prova_offline', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entwuerfe')) db.createObjectStore('entwuerfe', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('offline_queue')) db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}
function notifiziereClients(msg) {
  self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage(msg)));
}
