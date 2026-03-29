/* ============================================================
   PROVA Systems — Service Worker
   Version: 1.0.0
   Strategie: Cache-First für App-Shell, Network-First für API
   Background Sync für Offline-Queue (Webhook S1)
============================================================ */

const CACHE_VERSION = 'prova-v4';
const SYNC_TAG = 'prova-sync-queue';

// App-Shell: alle Dateien die gecacht werden sollen
const APP_SHELL = [
  '/',
  '/app-login.html',
  '/app-register.html',
  '/onboarding.html',
  '/dashboard.html',
  '/archiv.html',
  '/akte.html',
  '/gutachten.html',
  '/app-starter.html',
  '/app-pro.html',
  '/app-enterprise.html',
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
  '/slide-panel.js',
  '/support-chat.js',
  '/onboarding-tour.js',
  '/auftragstyp.js',
  '/sw-register.js',
];

/* ── INSTALL: App-Shell precachen ─────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Einzeln cachen — schlägt einer fehl, geht der Rest trotzdem
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {
          console.warn('[SW] Konnte nicht cachen:', url);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: Alte Caches löschen ───────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: Cache-First für HTML/Assets, Network-First für API ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Netlify Functions + Make.com Webhooks + externe APIs → nie cachen
  if (
    url.pathname.startsWith('/.netlify/') ||
    url.hostname.includes('make.com') ||
    url.hostname.includes('airtable.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('pdfmonkey.io') ||
    event.request.method !== 'GET'
  ) {
    return; // Normales Fetch, kein SW-Handling
  }

  // Google Fonts → Cache-First (kein Netz nötig nach erstem Load)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // App-Dateien → Stale-While-Revalidate:
  // 1. Sofort aus Cache antworten (schnell)
  // 2. Im Hintergrund vom Netz aktualisieren
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(networkRes => {
          if (networkRes.ok) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    )
  );
});

/* ── BACKGROUND SYNC: Offline-Queue abarbeiten ───────────── */
self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(verarbeiteOfflineQueue());
  }
});

async function verarbeiteOfflineQueue() {
  // IndexedDB aus SW-Kontext öffnen
  const db = await openDB();
  const tx = db.transaction('offline_queue', 'readwrite');
  const store = tx.objectStore('offline_queue');
  const alle = await getAllFromStore(store);

  for (const eintrag of alle) {
    try {
      const res = await fetch(eintrag.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eintrag.payload)
      });
      if (res.ok) {
        // Erfolgreich gesendet → aus Queue löschen
        const tx2 = db.transaction('offline_queue', 'readwrite');
        tx2.objectStore('offline_queue').delete(eintrag.id);
        await tx2.done;
        // App-Window benachrichtigen
        notifiziereClients({ type: 'SYNC_SUCCESS', id: eintrag.id });
      }
    } catch (err) {
      // Netz noch nicht da → beim nächsten Sync erneut versuchen
      console.warn('[SW] Sync fehlgeschlagen, retry:', eintrag.id);
    }
  }
}

/* ── PUSH: App-Window → SW Nachrichten ───────────────────── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'TRIGGER_SYNC') {
    self.registration.sync.register(SYNC_TAG).catch(() => {
      // Browser unterstützt kein Background Sync → manuell versuchen
      verarbeiteOfflineQueue();
    });
  }
});

/* ── IDB Hilfsfunktionen für SW-Kontext ──────────────────── */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('prova_offline', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entwuerfe')) {
        db.createObjectStore('entwuerfe', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
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
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage(msg));
  });
}
