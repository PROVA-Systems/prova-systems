/* ============================================================
   PROVA Systems — Service Worker v44
   Strategie: Network-First für HTML (kein Zwischenbild mehr!)
              Cache-First für Assets (Fonts, JS, CSS)
              Network-Only für APIs
============================================================ */

const CACHE_VERSION = 'prova-v44';
const SYNC_TAG = 'prova-sync-queue';

const APP_SHELL = [
  '/',
  '/app-login.html',
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
  '/theme.js',
  '/trial-guard.js',
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
    ).then(() => self.clients.claim())
    .then(() => {
      // Alle offenen Tabs nach Update benachrichtigen → auto-reload
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
      });
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

  // Google Fonts → Cache-First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, resClone));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
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
