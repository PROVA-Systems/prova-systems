/* PROVA — Service Worker v92 (App-Shell Caching + Offline-First) */
const CACHE_NAME = 'prova-v124';

/* App-Shell: alle statischen Kern-Dateien */
const APP_SHELL = [
  '/', '/dashboard.html', '/archiv.html', '/termine.html',
  '/app-login.html', '/app.html', '/app-starter.html',
  '/vor-ort.html', '/ortstermin-modus.html',
  '/normen.html', '/textbausteine.html', '/positionen.html',
  '/rechnungen.html', '/jveg.html', '/einstellungen.html',
  '/hilfe.html', '/briefvorlagen.html', '/freigabe.html',
  '/stellungnahme.html', '/kontakte.html', '/statistiken.html',
  '/nav.js', '/theme.js', '/prova-design.css', '/mobile.css',
  '/prova-airtable-api.js',
  '/prova-api.js',
  '/prova-layout.config.js', '/prova-auth-api.js',
  '/prova-sv-airtable.js', '/prova-account-gate.js',
  '/frist-guard.js', '/support-chat.js', '/sw-register.js',
  '/manifest.json', '/offline.html'
];

/* Install: App-Shell sofort cachen */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.warn('PROVA SW: Teilweise Cache-Fehler (normal bei erstem Install)', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* Activate: alten Cache löschen */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k) {
          if (k !== CACHE_NAME) {
            console.log('PROVA SW: Alter Cache gelöscht:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* Fetch: Stale-While-Revalidate für App-Shell, Network-First für APIs */
self.addEventListener('fetch', function(e) {
  const url = e.request.url;

  /* Netlify Functions + externe APIs: IMMER Network, kein Cache */
  if (url.indexOf('/.netlify/') !== -1 ||
      url.indexOf('api.airtable.com') !== -1 ||
      url.indexOf('api.openai.com') !== -1 ||
      url.indexOf('hook.eu1.make.com') !== -1 ||
      url.indexOf('api.stripe.com') !== -1) {
    return; /* Browser übernimmt — kein SW-Eingriff */
  }

  /* Nur GET-Requests cachen */
  if (e.request.method !== 'GET') return;

  /* App-Shell: Cache-First mit Netzwerk-Fallback */
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        const networkFetch = fetch(e.request).then(function(response) {
          /* Nur erfolgreiche Responses cachen */
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(function() {
          /* Offline: cached Version zurückgeben */
          return cached;
        });

        /* Cached Version sofort zurückgeben (schnell),
           im Hintergrund aktualisieren (frisch) */
        return cached || networkFetch;
      });
    })
  );
});

/* Push-Benachrichtigungen */
self.addEventListener('push', function(e) {
  let data = { title: 'PROVA Systems', body: 'Neue Benachrichtigung' };
  try { data = e.data ? e.data.json() : data; } catch(x) {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'PROVA Systems', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'prova-push',
      data: { url: data.url || '/dashboard.html' }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/dashboard.html';
  e.waitUntil(clients.openWindow(target));
});
