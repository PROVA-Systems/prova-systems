/* ============================================================
   PROVA Systems — Service Worker v60 (Sprint K1)
   Strategie: Network-First für HTML (kein Zwischenbild mehr!)
              Cache-First für Assets (Fonts, JS, CSS)
              Network-Only für APIs
============================================================ */

const CACHE_VERSION = 'prova-v243';   // APP-LANDING-SPLIT 3d: /login als kanonische Login-URL + login.html
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
  '/archiv.html',
  '/akte.html',
  '/app.html',
  '/freigabe.html',
  '/stellungnahme.html',
  '/briefvorlagen.html',
  '/rechnungen.html',
  '/termine.html',
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
  '/lib/supabase-client.js',
  '/lib/data-store.js',
  '/lib/template-registry.js',
  '/lib/auth-guard.js',
  // Legacy auth (Hybrid-Modus, bleibt bis Cutover-Phase 5 cleanup)
  '/prova-fetch-auth.js',
  '/prova-notifications.js',
  '/page-template.css',
  '/gutachterliche-stellungnahme.html',
  '/gutachterliche-stellungnahme-logic.js',
  '/onboarding-supabase-logic.js',
  '/auth-supabase-logic.js',
  '/app-login-logic.js',
  '/auftragstyp.js',
  '/diktat-parser.js',
  '/compliance-check.js',
  '/paragraph-generator.js',
  '/stellungnahme-logic.js',
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
    url.hostname.includes('airtable.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('pdfmonkey.io') ||
    url.hostname.includes('stripe.com') ||
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
