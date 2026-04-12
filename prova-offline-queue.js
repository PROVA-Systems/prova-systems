/**
 * PROVA — Offline Queue & IndexedDB Manager (prova-offline-queue.js)
 * 
 * Speichert Fotos, Audio-Diktate und Skizzen sicher im Browser (IndexedDB).
 * Synchronisiert automatisch wenn Internet wieder vorhanden ist.
 * 
 * IndexedDB: bis zu 500MB je nach Gerät — localStorage war zu klein für Fotos.
 */
(function(window) {
  'use strict';

  var DB_NAME    = 'prova_offline_v1';
  var DB_VERSION = 1;
  var STORES     = {
    fotos:    'fotos',    // { id, az, blob, mimeType, timestamp, synced, beschreibung }
    diktate:  'diktate', // { id, az, blob, mimeType, transkript, timestamp, synced }
    skizzen:  'skizzen', // { id, az, dataUrl, timestamp, synced }
    queue:    'queue'    // { id, az, typ, status, timestamp }
  };

  var _db = null;

  /* ── Datenbank öffnen ── */
  function oeffneDB() {
    return new Promise(function(resolve, reject) {
      if (_db) { resolve(_db); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORES.fotos)) {
          var fs = db.createObjectStore(STORES.fotos, { keyPath: 'id', autoIncrement: true });
          fs.createIndex('az', 'az', { unique: false });
          fs.createIndex('synced', 'synced', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.diktate)) {
          var ds = db.createObjectStore(STORES.diktate, { keyPath: 'id', autoIncrement: true });
          ds.createIndex('az', 'az', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.skizzen)) {
          var ss = db.createObjectStore(STORES.skizzen, { keyPath: 'id', autoIncrement: true });
          ss.createIndex('az', 'az', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.queue)) {
          db.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function(e) { _db = e.target.result; resolve(_db); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  }

  /* ── FOTO SPEICHERN ── */
  async function fotoSpeichern(az, blob, mimeType, dateiname) {
    var db = await oeffneDB();
    return new Promise(function(resolve, reject) {
      var tx = db.transaction([STORES.fotos], 'readwrite');
      var store = tx.objectStore(STORES.fotos);
      var eintrag = {
        az:          az || '',
        blob:        blob,
        mimeType:    mimeType || 'image/jpeg',
        dateiname:   dateiname || ('foto_' + Date.now() + '.jpg'),
        timestamp:   new Date().toISOString(),
        synced:      0,
        beschreibung: ''
      };
      var req = store.add(eintrag);
      req.onsuccess = function(e) {
        eintrag.id = e.target.result;
        zeigeOfflineStatus(az);
        resolve(eintrag);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  /* ── DIKTAT SPEICHERN ── */
  async function diktatSpeichern(az, blob, mimeType, transkript) {
    var db = await oeffneDB();
    return new Promise(function(resolve, reject) {
      var tx = db.transaction([STORES.diktate], 'readwrite');
      var eintrag = {
        az:         az || '',
        blob:       blob,
        mimeType:   mimeType || 'audio/webm',
        transkript: transkript || '',
        timestamp:  new Date().toISOString(),
        synced:     0
      };
      var req = tx.objectStore(STORES.diktate).add(eintrag);
      req.onsuccess = function(e) { eintrag.id = e.target.result; resolve(eintrag); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  }

  /* ── SKIZZE SPEICHERN ── */
  async function skizzeSpeichern(az, dataUrl) {
    var db = await oeffneDB();
    return new Promise(function(resolve, reject) {
      var tx = db.transaction([STORES.skizzen], 'readwrite');
      var eintrag = {
        az:        az || '',
        dataUrl:   dataUrl,
        timestamp: new Date().toISOString(),
        synced:    0
      };
      var req = tx.objectStore(STORES.skizzen).add(eintrag);
      req.onsuccess = function(e) { eintrag.id = e.target.result; resolve(eintrag); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  }

  /* ── ALLE FOTOS FÜR AZ LADEN ── */
  async function fotosLaden(az) {
    var db = await oeffneDB();
    return new Promise(function(resolve) {
      var tx    = db.transaction([STORES.fotos], 'readonly');
      var index = tx.objectStore(STORES.fotos).index('az');
      var req   = index.getAll(az);
      req.onsuccess = function(e) { resolve(e.target.result || []); };
      req.onerror   = function()  { resolve([]); };
    });
  }

  /* ── SKIZZE FÜR AZ LADEN ── */
  async function skizzeLaden(az) {
    var db = await oeffneDB();
    return new Promise(function(resolve) {
      var tx    = db.transaction([STORES.skizzen], 'readonly');
      var index = tx.objectStore(STORES.skizzen).index('az');
      var req   = index.getAll(az);
      req.onsuccess = function(e) {
        var alle = e.target.result || [];
        resolve(alle.length ? alle[alle.length - 1] : null);
      };
      req.onerror = function() { resolve(null); };
    });
  }

  /* ── FOTO ALS SYNCED MARKIEREN ── */
  async function fotoAlsSyncedMarkieren(id) {
    var db = await oeffneDB();
    return new Promise(function(resolve) {
      var tx  = db.transaction([STORES.fotos], 'readwrite');
      var req = tx.objectStore(STORES.fotos).get(id);
      req.onsuccess = function(e) {
        var rec = e.target.result;
        if (rec) { rec.synced = 1; tx.objectStore(STORES.fotos).put(rec); }
        resolve();
      };
    });
  }

  /* ── SYNC: Alle ungesyncten Fotos hochladen ── */
  async function syncStarten(az) {
    if (!navigator.onLine) return 0;
    var db = await oeffneDB();
    var fotos = await new Promise(function(resolve) {
      var tx    = db.transaction([STORES.fotos], 'readonly');
      var index = tx.objectStore(STORES.fotos).index('synced');
      var req   = index.getAll(0);
      req.onsuccess = function(e) { resolve((e.target.result || []).filter(function(f){ return !az || f.az === az; })); };
      req.onerror   = function()  { resolve([]); };
    });

    if (!fotos.length) return 0;

    var synced = 0;
    for (var i = 0; i < fotos.length; i++) {
      var foto = fotos[i];
      try {
        // Blob → Base64
        var b64 = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload  = function(e) { resolve(e.target.result.split(',')[1]); };
          reader.onerror = reject;
          reader.readAsDataURL(foto.blob instanceof Blob ? foto.blob : new Blob([foto.blob], { type: foto.mimeType }));
        });

        var headers = Object.assign(
          { 'Content-Type': 'application/json' },
          window.provaAuthHeaders ? window.provaAuthHeaders() : {}
        );

        var res = await fetch('/.netlify/functions/ki-proxy', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            action: 'foto_analyse',
            imageBase64: b64,
            mimeType: foto.mimeType,
            az: foto.az,
            offline_id: foto.id,
            dateiname: foto.dateiname
          })
        });

        if (res.ok) {
          var data = await res.json();
          await fotoAlsSyncedMarkieren(foto.id);
          // Beschreibung zurückschreiben
          if (data.befund) {
            var tx2 = db.transaction([STORES.fotos], 'readwrite');
            var req2 = tx2.objectStore(STORES.fotos).get(foto.id);
            req2.onsuccess = function(e2) {
              var r = e2.target.result;
              if (r) { r.beschreibung = data.befund; r.synced = 1; tx2.objectStore(STORES.fotos).put(r); }
            };
          }
          synced++;
        }
      } catch(e) {
        console.warn('PROVA Offline-Sync: Foto', foto.id, 'Fehler:', e);
      }
    }

    zeigeOfflineStatus(az);
    return synced;
  }

  /* ── STORAGE-NUTZUNG ANZEIGEN ── */
  async function speicherInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      var est = await navigator.storage.estimate();
      return {
        genutzt: Math.round(est.usage / 1024 / 1024 * 10) / 10,
        gesamt:  Math.round(est.quota  / 1024 / 1024),
        prozent: Math.round(est.usage / est.quota * 100)
      };
    }
    return null;
  }

  /* ── OFFLINE-STATUS-BADGE ── */
  async function zeigeOfflineStatus(az) {
    var badge = document.getElementById('ot-offline-queue-badge');
    if (!badge) return;
    if (!az) { badge.style.display = 'none'; return; }
    var fotos = await fotosLaden(az);
    var unsynced = fotos.filter(function(f){ return !f.synced; });
    if (!unsynced.length) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'flex';
      badge.textContent = '💾 ' + unsynced.length + ' Foto' + (unsynced.length > 1 ? 's' : '') + ' gespeichert';
    }
  }

  /* ── ALLE DATEN FÜR AZ LÖSCHEN (nach erfolgreichem Gutachten) ── */
  async function datenLoeschen(az) {
    var db = await oeffneDB();
    var stores = [STORES.fotos, STORES.diktate, STORES.skizzen];
    for (var s = 0; s < stores.length; s++) {
      await new Promise(function(resolve) {
        var tx    = db.transaction([stores[s]], 'readwrite');
        var index = tx.objectStore(stores[s]).index('az');
        var req   = index.getAllKeys(az);
        req.onsuccess = function(e) {
          var keys = e.target.result || [];
          keys.forEach(function(key) { tx.objectStore(stores[s]).delete(key); });
          resolve();
        };
        req.onerror = resolve;
      });
    }
    console.log('PROVA: Offline-Daten für', az, 'gelöscht');
  }

  /* ── AUTO-SYNC wenn Online ── */
  window.addEventListener('online', function() {
    var az = localStorage.getItem('prova_aktiver_fall');
    if (az) {
      syncStarten(az).then(function(n) {
        if (n > 0) {
          var el = document.getElementById('ot-sync-badge');
          if (el) {
            el.textContent = '✅ ' + n + ' Foto' + (n > 1 ? 's' : '') + ' synchronisiert';
            el.classList.add('show');
            setTimeout(function(){ el.classList.remove('show'); }, 4000);
          }
        }
      });
    }
  });

  /* ── EXPORT ── */
  window.PROVA_OFFLINE = {
    fotoSpeichern:           fotoSpeichern,
    diktatSpeichern:         diktatSpeichern,
    skizzeSpeichern:         skizzeSpeichern,
    fotosLaden:              fotosLaden,
    skizzeLaden:             skizzeLaden,
    syncStarten:             syncStarten,
    datenLoeschen:           datenLoeschen,
    zeigeOfflineStatus:      zeigeOfflineStatus,
    speicherInfo:            speicherInfo,
    fotoAlsSyncedMarkieren:  fotoAlsSyncedMarkieren
  };

})(window);
