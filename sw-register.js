/* ============================================================
   PROVA Systems — Service Worker Registration + Update-Handling
   Einbinden in: alle App-Pages via <script src="/sw-register.js">
============================================================ */

(function() {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  /* ── 1. Service Worker registrieren ────────────────────────── */
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {

        /* ── Auf neue Version prüfen (alle 60 Minuten) ── */
        setInterval(function() { reg.update(); }, 60 * 60 * 1000);

        /* ── Neue SW-Version erkannt ── */
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', function() {
            /* Neue Version installiert → User informieren */
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              zeigeUpdateToast();
            }
          });
        });

      })
      .catch(function(err) {
        console.warn('[PROVA SW] Registrierung fehlgeschlagen:', err);
      });

    /* ── Wenn SW die Kontrolle übernimmt → Seite neu laden ──── */
    /* Das passiert nach skipWaiting() + clients.claim() im neuen SW */
    var _refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (_refreshing) return;
      _refreshing = true;
      /* Seite neu laden um frische Assets vom neuen Cache zu holen */
      window.location.reload();
    });

    /* ── SW-Nachrichten empfangen ───────────────────────────── */
    navigator.serviceWorker.addEventListener('message', function(event) {
      var data = event.data || {};
      if (data.type === 'SYNC_SUCCESS') {
        window.dispatchEvent(new CustomEvent('prova:sync_success', { detail: data }));
      }
    });
  });

  /* ── Update-Toast: Nutzer über neue Version informieren ────── */
  function zeigeUpdateToast() {
    /* Kein doppelter Toast */
    if (document.getElementById('prova-update-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'prova-update-toast';
    toast.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
      'background:#1e293b;border:1px solid rgba(79,142,247,.3)',
      'color:#e2e8f0;padding:12px 18px;border-radius:12px',
      'font-size:13px;font-family:system-ui,sans-serif;z-index:99999',
      'display:flex;align-items:center;gap:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:280px'
    ].join(';');

    toast.innerHTML =
      '<span style="font-size:18px">🚀</span>' +
      '<span>Neue Version verfügbar</span>' +
      '<button onclick="window.location.reload()" style="' +
        'background:#4f8ef7;color:#fff;border:none;padding:6px 14px;' +
        'border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;' +
        'font-family:inherit;white-space:nowrap' +
      '">Jetzt aktualisieren</button>' +
      '<button onclick="this.parentNode.remove()" style="' +
        'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:0 4px' +
      '">✕</button>';

    document.body.appendChild(toast);

    /* Nach 30 Sekunden automatisch neu laden wenn Toast noch da */
    setTimeout(function() {
      if (document.getElementById('prova-update-toast')) {
        window.location.reload();
      }
    }, 30000);
  }

  /* ── Safari Privat-Modus Detection ─────────────────────────── */
  function pruefeSafariPrivatModus() {
    if (!window.indexedDB) { zeigeSafariHinweis(); return; }
    var testKey = '__prova_idb_test__';
    var req = indexedDB.open(testKey);
    req.onerror = function() { zeigeSafariHinweis(); };
    req.onsuccess = function(e) {
      e.target.result.close();
      indexedDB.deleteDatabase(testKey);
    };
  }

  function zeigeSafariHinweis() {
    if (sessionStorage.getItem('prova_safari_warn')) return;
    sessionStorage.setItem('prova_safari_warn', '1');
    var hint = document.createElement('div');
    hint.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
      'background:#92400e;color:#fef3c7;padding:12px 18px;border-radius:10px',
      'font-size:.8125rem;font-family:system-ui,sans-serif;z-index:9999',
      'max-width:340px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);line-height:1.5'
    ].join(';');
    hint.innerHTML = '<b>Safari Privat-Modus erkannt</b><br>Bitte normales Fenster verwenden.';
    document.body.appendChild(hint);
    setTimeout(function() { hint.remove(); }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pruefeSafariPrivatModus);
  } else {
    setTimeout(pruefeSafariPrivatModus, 500);
  }

})();
