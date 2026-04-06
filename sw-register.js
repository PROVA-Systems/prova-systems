/* ============================================================
   PROVA Systems — Service Worker Registration + Offline Utils
   Einbinden in: app-starter.html (und alle anderen App-Pages)
   <script src="/sw-register.js"></script>
============================================================ */

(function() {
  'use strict';

  /* ── 1. Service Worker registrieren ──────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          // Auf neue SW-Version prüfen (im Hintergrund)
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Neue Version verfügbar — stiller Update, kein auto-reload
                // SW übernimmt beim nächsten Seitenaufruf
                console.info('[PROVA SW] Update verfügbar — wird beim nächsten Start aktiv');
              }
            });
          });
        })
        .catch(err => console.warn('[PROVA SW] Registrierung fehlgeschlagen:', err));

      // SW-Nachrichten empfangen (z.B. Sync-Erfolg)
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SYNC_SUCCESS') {
          window.dispatchEvent(new CustomEvent('prova:sync_success', { detail: event.data }));
        }
      });
    });
  }

  /* ── 2. Safari Privat-Modus Detection ────────────────────── */
  function prüfeSafariPrivatModus() {
    if (!window.indexedDB) {
      zeigeSafariHinweis();
      return;
    }
    const testKey = '__prova_idb_test__';
    const req = indexedDB.open(testKey);
    req.onerror = () => zeigeSafariHinweis();
    req.onsuccess = e => {
      e.target.result.close();
      indexedDB.deleteDatabase(testKey);
    };
  }

  function zeigeSafariHinweis() {
    // Nur einmal pro Session anzeigen
    if (sessionStorage.getItem('prova_safari_warn')) return;
    sessionStorage.setItem('prova_safari_warn', '1');
    const hint = document.createElement('div');
    hint.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
      'background:#92400e;color:#fef3c7;padding:12px 18px;border-radius:10px',
      'font-size:.8125rem;font-family:system-ui,sans-serif;z-index:9999',
      'max-width:340px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)',
      'line-height:1.5'
    ].join(';');
    hint.innerHTML = '⚠️ <strong>Safari Privat-Modus erkannt</strong><br>Entwürfe können nicht lokal gespeichert werden. Bitte normales Fenster verwenden.';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 8000);
  }

  // Nach DOM-Ready prüfen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prüfeSafariPrivatModus);
  } else {
    setTimeout(prüfeSafariPrivatModus, 500);
  }

})();
