/* PROVA — Service Worker v90 (Cache-Busting / PWA-Basis) */
const CACHE_NAME = 'prova-v90';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  /* Netlify-Funktionen und externe APIs nicht cachen */
  if (e.request.url.indexOf('/.netlify/') !== -1) return;
});
