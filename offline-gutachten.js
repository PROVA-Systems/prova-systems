/* ============================================================
   PROVA — offline-gutachten.js
   IndexedDB-Modul für Offline-Gutachtenerstellung
   
   Architektur:
   - IndexedDB Store "entwuerfe": Gutachten-Entwürfe (persistent, auch offline)
   - IndexedDB Store "offline_queue": Sync-Warteschlange (via Service Worker)
   - Background Sync: automatisches Hochladen wenn wieder online
   
   Nutzung:
   - window.ProvaOffline.speichern(data) → lokaler Entwurf
   - window.ProvaOffline.laden(id) → Entwurf laden
   - window.ProvaOffline.alle() → alle Entwürfe
   - window.ProvaOffline.loeschen(id) → Entwurf löschen
   - window.ProvaOffline.sync() → manuell synchronisieren
   - window.ProvaOffline.isOffline() → true wenn offline
============================================================ */

window.ProvaOffline = (function() {
  'use strict';

  const DB_NAME    = 'prova_offline';
  const DB_VERSION = 2;
  const STORE_ENT  = 'entwuerfe';
  const STORE_QUE  = 'offline_queue';

  let _db = null;

  /* ── Datenbank öffnen ── */
  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_ENT)) {
          db.createObjectStore(STORE_ENT, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUE)) {
          db.createObjectStore(STORE_QUE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function(e) {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = function(e) {
        reject(e.target.error);
      };
    });
  }

  /* ── Entwurf speichern (IndexedDB) ── */
  function speichern(data) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var id = data.id || 'entwurf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        var entwurf = Object.assign({}, data, {
          id: id,
          _offline: true,
          _gespeichert_am: new Date().toISOString(),
          _synced: false
        });

        var tx = db.transaction(STORE_ENT, 'readwrite');
        var req = tx.objectStore(STORE_ENT).put(entwurf);
        req.onsuccess = function() {
          console.log('[ProvaOffline] Entwurf gespeichert:', id);
          _zeigeOfflineBanner();
          resolve(entwurf);
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  /* ── Entwurf laden ── */
  function laden(id) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_ENT, 'readonly');
        var req = tx.objectStore(STORE_ENT).get(id);
        req.onsuccess = function(e) { resolve(e.target.result || null); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  /* ── Alle Entwürfe laden ── */
  function alle() {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_ENT, 'readonly');
        var req = tx.objectStore(STORE_ENT).getAll();
        req.onsuccess = function(e) {
          var list = (e.target.result || []).sort(function(a, b) {
            return new Date(b._gespeichert_am) - new Date(a._gespeichert_am);
          });
          resolve(list);
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  /* ── Entwurf löschen ── */
  function loeschen(id) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_ENT, 'readwrite');
        var req = tx.objectStore(STORE_ENT).delete(id);
        req.onsuccess = function() {
          console.log('[ProvaOffline] Entwurf gelöscht:', id);
          resolve(true);
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  /* ── Zur Sync-Queue hinzufügen ── */
  function queueSync(url, payload) {
    return openDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(STORE_QUE, 'readwrite');
        var req = tx.objectStore(STORE_QUE).add({
          url: url,
          payload: payload,
          timestamp: new Date().toISOString()
        });
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  /* ── Manuell synchronisieren (alle ungesyncten Entwürfe) ── */
  function sync() {
    if (!navigator.onLine) {
      console.log('[ProvaOffline] Offline — sync wird aufgeschoben');
      return Promise.resolve({ synced: 0, offline: true });
    }

    return alle().then(function(entwuerfe) {
      var unsynced = entwuerfe.filter(function(e) { return !e._synced; });
      if (!unsynced.length) return { synced: 0, total: 0 };

      var syncPromises = unsynced.map(function(entwurf) {
        return _syncEntwurf(entwurf);
      });

      return Promise.allSettled(syncPromises).then(function(results) {
        var synced = results.filter(function(r) { return r.status === 'fulfilled' && r.value; }).length;
        var failed = results.length - synced;
        console.log('[ProvaOffline] Sync: ' + synced + ' erfolgreich, ' + failed + ' fehlgeschlagen');

        if (synced > 0 && typeof showToast === 'function') {
          showToast('✅ ' + synced + ' Entwurf' + (synced > 1 ? 'e' : '') + ' synchronisiert');
        }
        return { synced: synced, failed: failed, total: unsynced.length };
      });
    });
  }

  /* ── Einzelnen Entwurf synchronisieren ── */
  function _syncEntwurf(entwurf) {
    var svEmail = localStorage.getItem('prova_sv_email') || '';
    if (!svEmail) return Promise.resolve(false);

    var payload = Object.assign({}, entwurf);
    delete payload._offline;
    delete payload._gespeichert_am;
    delete payload._synced;
    delete payload.id;

    return fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0',
        payload: {
          records: [{ fields: Object.assign({}, payload, { sv_email: svEmail }) }]
        }
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.records && data.records[0]) {
        // Entwurf als synced markieren dann löschen
        return loeschen(entwurf.id).then(function() { return true; });
      }
      return false;
    })
    .catch(function(e) {
      console.warn('[ProvaOffline] Sync-Fehler:', entwurf.id, e.message);
      return false;
    });
  }

  /* ── Online/Offline prüfen ── */
  function isOffline() {
    return !navigator.onLine;
  }

  /* ── Offline-Banner anzeigen ── */
  function _zeigeOfflineBanner() {
    var vorhandenBanner = document.getElementById('prova-offline-banner');
    if (vorhandenBanner) return;

    var banner = document.createElement('div');
    banner.id = 'prova-offline-banner';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
      'background:#f59e0b', 'color:#1c0a00', 'padding:8px 16px',
      'font-size:12px', 'font-weight:600', 'text-align:center',
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:12px'
    ].join(';');
    banner.innerHTML = '⚡ Offline-Modus — Entwurf lokal gespeichert. Wird automatisch synchronisiert wenn online.' +
      '<button onclick="ProvaOffline.sync().then(function(r){document.getElementById(\'prova-offline-banner\').remove();})' +
      '" style="background:rgba(0,0,0,.15);border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-weight:700;color:inherit;">Jetzt sync →</button>';
    document.body.insertBefore(banner, document.body.firstChild);

    // Banner nach 8s ausblenden
    setTimeout(function() {
      if (vorhandenBanner) return;
      var b = document.getElementById('prova-offline-banner');
      if (b) b.style.opacity = '0.7';
    }, 8000);
  }

  /* ── Auto-Sync wenn wieder online ── */
  window.addEventListener('online', function() {
    console.log('[ProvaOffline] Wieder online — starte Sync');
    sync().then(function(result) {
      if (result.synced > 0) {
        var b = document.getElementById('prova-offline-banner');
        if (b) b.remove();
      }
    });

    // Service Worker Background Sync triggern
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
    }
  });

  window.addEventListener('offline', function() {
    console.log('[ProvaOffline] Offline — speichere-Modus aktiv');
    if (typeof showToast === 'function') {
      showToast('⚡ Offline — Entwürfe werden lokal gespeichert', 'warning');
    }
  });

  /* ── Auto-Sync beim Laden wenn online ── */
  if (navigator.onLine) {
    setTimeout(function() { sync(); }, 3000);
  }

  /* ── Public API ── */
  return {
    speichern:  speichern,
    laden:      laden,
    alle:       alle,
    loeschen:   loeschen,
    sync:       sync,
    queueSync:  queueSync,
    isOffline:  isOffline,
    DB_NAME:    DB_NAME
  };

})();


/* ============================================================
   Integration in app.html Auto-Save
   Wird automatisch aktiv wenn app-logic.js lädt
============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  var AUTOSAVE_KEY = 'prova_offline_autosave';
  var autosaveTimer = null;

  /* Formularfelder beobachten — bei Änderung offline speichern */
  function startOfflineAutosave() {
    var felder = document.querySelectorAll('.form-input, .form-textarea, select.form-input');
    felder.forEach(function(el) {
      el.addEventListener('input', function() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function() {
          _sammleFormularDaten().then(function(data) {
            if (Object.keys(data).length > 2) { // mehr als nur Pflichtfelder
              window.ProvaOffline.speichern(data).catch(function(e) {
                console.warn('[ProvaOffline] Autosave-Fehler:', e);
              });
            }
          });
        }, 2000); // 2s Debounce
      });
    });
  }

  /* Formulardaten sammeln */
  function _sammleFormularDaten() {
    return new Promise(function(resolve) {
      try {
        var data = {
          _typ: 'gutachten_entwurf',
          _seite: 'app.html',
          sv_email: localStorage.getItem('prova_sv_email') || ''
        };

        var felder = {
          'f-auftragsart':    'auftragsart',
          'f-schadensart':    'schadensart',
          'f-vorgangsnr':     'aktenzeichen',
          'f-schadensdatum':  'schadensdatum',
          'f-ortstermin':     'ortstermin',
          'f-ag-typ':         'auftraggeber_typ',
          'f-ag-name':        'auftraggeber_name',
          'f-ansprechpartner':'ansprechpartner',
          'f-ag-email':       'auftraggeber_email',
          'f-ag-telefon':     'auftraggeber_telefon',
          'f-schadensnummer': 'schadensnummer_versicherung',
          'f-strasse':        'schaden_strasse',
          'f-plz':            'plz_text',
          'f-ort':            'ort_text',
          'f-baujahr':        'baujahr',
          'f-etage':          'etage',
          'f-beschreibung':   'notizen',
          'f-diktat':         'sprachnotiz_transkript'
        };

        Object.keys(felder).forEach(function(elId) {
          var el = document.getElementById(elId);
          if (el && el.value && el.value.trim()) {
            data[felder[elId]] = el.value.trim();
          }
        });

        resolve(data);
      } catch(e) {
        resolve({ _typ: 'gutachten_entwurf', _fehler: e.message });
      }
    });
  }

  /* Prüfe ob offline Entwürfe vorhanden → Banner gg zeigen */
  function pruefeOfflineEntwuerfe() {
    window.ProvaOffline.alle().then(function(entwuerfe) {
      var unsynced = entwuerfe.filter(function(e) { return !e._synced; });
      if (unsynced.length > 0) {
        _zeigeWiederherstellungBanner(unsynced);
      }
    }).catch(function() {});
  }

  function _zeigeWiederherstellungBanner(entwuerfe) {
    // Nur auf app.html zeigen
    if (!window.location.pathname.includes('app.html')) return;
    if (document.getElementById('prova-restore-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'prova-restore-banner';
    banner.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:20px', 'z-index:9998',
      'background:var(--surface,#1e2330)', 'border:1px solid var(--accent,#4f8ef7)',
      'border-radius:12px', 'padding:14px 18px', 'font-size:12px',
      'color:var(--text,#e8eaf0)', 'box-shadow:0 4px 20px rgba(0,0,0,.4)',
      'max-width:280px'
    ].join(';');

    var letzter = entwuerfe[0];
    var wann = letzter._gespeichert_am ?
      new Date(letzter._gespeichert_am).toLocaleString('de-DE') : '—';

    banner.innerHTML = [
      '<div style="font-weight:700;margin-bottom:6px;">💾 ' + entwuerfe.length + ' Offline-Entwurf' + (entwuerfe.length > 1 ? 'e' : '') + '</div>',
      '<div style="color:var(--text3,rgba(255,255,255,.5));margin-bottom:10px;">Zuletzt: ' + wann + '</div>',
      '<div style="display:flex;gap:8px;">',
        '<button id="prova-restore-btn" style="flex:1;background:var(--accent,#4f8ef7);color:#fff;border:none;',
          'padding:6px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;">Wiederherstellen</button>',
        '<button onclick="document.getElementById(\'prova-restore-banner\').remove()" ',
          'style="background:transparent;border:1px solid var(--border,rgba(255,255,255,.1));color:var(--text3);',
          'padding:6px 10px;border-radius:7px;cursor:pointer;font-size:11px;">✕</button>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);

    document.getElementById('prova-restore-btn').addEventListener('click', function() {
      window.ProvaOffline.laden(letzter.id).then(function(entwurf) {
        if (!entwurf) return;
        // Felder befüllen
        var feldMap = {
          'auftragsart':              'f-auftragsart',
          'schadensart':              'f-schadensart',
          'aktenzeichen':             'f-vorgangsnr',
          'schadensdatum':            'f-schadensdatum',
          'auftraggeber_name':        'f-ag-name',
          'ansprechpartner':          'f-ansprechpartner',
          'auftraggeber_email':       'f-ag-email',
          'auftraggeber_telefon':     'f-ag-telefon',
          'schadensnummer_versicherung': 'f-schadensnummer',
          'schaden_strasse':          'f-strasse',
          'plz_text':                 'f-plz',
          'ort_text':                 'f-ort',
          'baujahr':                  'f-baujahr',
          'notizen':                  'f-beschreibung'
        };
        var befuellt = 0;
        Object.keys(feldMap).forEach(function(key) {
          if (entwurf[key]) {
            var el = document.getElementById(feldMap[key]);
            if (el) { el.value = entwurf[key]; befuellt++; }
          }
        });
        banner.remove();
        if (typeof showToast === 'function') {
          showToast('✅ Entwurf wiederhergestellt (' + befuellt + ' Felder)');
        }
      });
    });
  }

  // Starte Beobachtung nach kurzem Delay (DOM muss fertig sein)
  setTimeout(function() {
    if (window.location.pathname.includes('app.html')) {
      startOfflineAutosave();
      pruefeOfflineEntwuerfe();
    }
  }, 1500);
});
