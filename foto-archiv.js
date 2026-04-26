/**
 * PROVA Systems — foto-archiv.js  (Client-Side)
 * ══════════════════════════════════════════════════════════════════════
 * Category 5 Missing Feature — Photo Archiving to Airtable
 *
 * PROBLEM:
 *   Fotos existieren nur temporär in IndexedDB (_fotos Array).
 *   Bei Fall-Abschluss / Seitenreload gehen sie verloren.
 *   Airtable zeigt nur Fotos_Anzahl (Zahl) aber kein echtes Attachment.
 *
 * LÖSUNG:
 *   1. Netlify Function foto-upload.js nimmt dataUrl entgegen,
 *      lädt Bild zu einem temporären CDN hoch (via Cloudinary/S3),
 *      und schreibt die öffentliche URL als Airtable-Attachment.
 *   2. foto-archiv.js (dieser File) koordiniert Upload + Fortschritt.
 *   3. Auto-Upload beim Fall-Abschluss (zeigeAbschlussModal call-Intercept).
 *   4. Retry bei Netzwerkfehler (3 Versuche, exponentieller Backoff).
 *
 * EINBINDEN:
 *   <script src="foto-archiv.js" defer></script>
 *   In ortstermin-modus.html, vor dem schließenden </body>-Tag.
 *
 * ══════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  var UPLOAD_ENDPOINT = '/.netlify/functions/foto-upload';
  var MAX_CONCURRENT  = 2;          // Parallele Uploads (Netlify Free: max 2)
  var MAX_RETRIES     = 3;
  var RETRY_DELAYS    = [1000, 2000, 4000];
  var JPEG_QUALITY    = 0.85;       // Kompression vor Upload
  var MAX_DIMENSION   = 2400;       // Max Pixel (kürzere Seite) vor Upload

  /* ── Bild vor Upload komprimieren/skalieren ────────────────────── */
  function komprimiereFoto(dataUrl, maxDim, quality) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        /* Skalierung wenn zu groß */
        if (w > maxDim || h > maxDim) {
          var scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        var canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality || JPEG_QUALITY));
      };
      img.onerror = function() { resolve(dataUrl); }; // Fallback: Original
      img.src = dataUrl;
    });
  }

  /* ── Einzelnes Foto hochladen (mit Retry) ─────────────────────── */
  async function uploadEinesFoto(foto, recordId, aktenzeichen, attempt) {
    attempt = attempt || 0;

    /* Komprimieren */
    var compressedDataUrl = foto.dataUrl;
    if (foto.dataUrl && foto.dataUrl.startsWith('data:image')) {
      try {
        compressedDataUrl = await komprimiereFoto(foto.dataUrl, MAX_DIMENSION, JPEG_QUALITY);
      } catch(e) {
        console.warn('[FotoArchiv] Komprimierung fehlgeschlagen, nutze Original:', e.message);
      }
    }

    var payload = {
      record_id:    recordId,
      aktenzeichen: aktenzeichen,
      foto_id:      String(foto.id),
      datei:        foto.datei || ('foto_' + Date.now() + '.jpg'),
      caption:      foto.caption || '',
      data_url:     compressedDataUrl,
      aufnahme:     foto.aufnahme || new Date().toISOString(),
    };

    var controller = new AbortController();
    var timeout    = setTimeout(function() { controller.abort(); }, 30000);

    try {
      var res = await fetch(UPLOAD_ENDPOINT, {
        method:  'POST',
        headers: {'Content-Type': 'application/json'},
        body:    JSON.stringify(payload),
        signal:  controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        var errData = {};
        try { errData = await res.json(); } catch(e) {}
        throw Object.assign(new Error(errData.error || 'HTTP ' + res.status), {status: res.status, retryable: res.status >= 500 || res.status === 429});
      }

      return await res.json();

    } catch(err) {
      clearTimeout(timeout);
      var isRetryable = err.name === 'AbortError' || err.retryable || (err.status && err.status >= 500);
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        var delay = RETRY_DELAYS[attempt] || 4000;
        console.warn('[FotoArchiv] Retry ' + (attempt+1) + '/' + MAX_RETRIES + ' in ' + delay + 'ms für', foto.datei);
        await new Promise(function(r) { setTimeout(r, delay); });
        return uploadEinesFoto(foto, recordId, aktenzeichen, attempt + 1);
      }
      throw err;
    }
  }

  /* ── Alle Fotos hochladen (mit Fortschrittsanzeige) ─────────────  */
  async function uploadAlleFotos(fotos, recordId, aktenzeichen, onProgress) {
    if (!fotos || fotos.length === 0) return {success: 0, failed: 0, results: []};

    onProgress = onProgress || function() {};

    var results = [];
    var success = 0;
    var failed  = 0;
    var total   = fotos.length;

    onProgress({phase: 'start', total: total, done: 0});

    /* Semaphore für parallele Uploads */
    var queue    = fotos.slice();
    var active   = 0;
    var done     = 0;

    await new Promise(function(resolveAll) {
      function next() {
        if (queue.length === 0 && active === 0) { resolveAll(); return; }
        while (active < MAX_CONCURRENT && queue.length > 0) {
          var foto = queue.shift();
          active++;
          uploadEinesFoto(foto, recordId, aktenzeichen)
            .then(function(result) {
              success++;
              results.push({foto_id: String(foto.id), ok: true, result: result});
            })
            .catch(function(err) {
              failed++;
              results.push({foto_id: String(foto.id), ok: false, error: err.message});
              console.error('[FotoArchiv] Upload fehlgeschlagen:', foto.datei, err.message);
            })
            .finally(function() {
              active--;
              done++;
              onProgress({phase: 'progress', total: total, done: done, success: success, failed: failed});
              next();
            });
        }
      }
      next();
    });

    onProgress({phase: 'done', total: total, done: done, success: success, failed: failed});
    return {success: success, failed: failed, results: results};
  }

  /* ── Airtable Record-ID für Aktenzeichen holen ───────────────────  */
  async function getRecordId(aktenzeichen) {
    var path = '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0'
      + '?filterByFormula=' + encodeURIComponent('{Aktenzeichen}="' + aktenzeichen + '"')
      + '&maxRecords=1&fields[]=Aktenzeichen';

    var res = await provaFetch('/.netlify/functions/airtable', {
      method:  'POST',
      headers: {'Content-Type': 'application/json'},
      body:    JSON.stringify({method: 'GET', path: path})
    });
    if (!res.ok) throw new Error('Airtable ' + res.status);
    var data = await res.json();
    if (!data.records || !data.records[0]) throw new Error('Kein Record für AZ: ' + aktenzeichen);
    return data.records[0].id;
  }

  /* ── Fortschritts-Modal ──────────────────────────────────────────  */
  function zeigUploadModal(total) {
    var modal = document.getElementById('foto-upload-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'foto-upload-modal';
      modal.style.cssText = [
        'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:9998', 'background:var(--surface,#1a1a2e)', 'border:1px solid var(--border,#333)',
        'border-radius:14px', 'padding:16px 20px', 'min-width:260px',
        'box-shadow:0 8px 32px rgba(0,0,0,.5)', 'font-size:13px', 'color:var(--text,#fff)'
      ].join(';');
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div style="font-weight:700;margin-bottom:10px;">📤 Fotos werden archiviert…</div>'
      + '<div id="foto-upload-bar-wrap" style="background:rgba(255,255,255,.08);border-radius:6px;height:6px;overflow:hidden;margin-bottom:8px;">'
      + '<div id="foto-upload-bar" style="height:100%;background:#4f8ef7;width:0%;transition:width .3s;border-radius:6px;"></div></div>'
      + '<div id="foto-upload-status" style="font-size:12px;color:var(--text3,#888);">0 / '+total+' Fotos</div>';
    modal.style.display = 'block';
    return modal;
  }

  function updateUploadModal(status) {
    var bar    = document.getElementById('foto-upload-bar');
    var label  = document.getElementById('foto-upload-status');
    var modal  = document.getElementById('foto-upload-modal');
    if (!bar || !label) return;

    if (status.phase === 'progress' || status.phase === 'done') {
      var pct = status.total > 0 ? Math.round(status.done / status.total * 100) : 0;
      bar.style.width   = pct + '%';
      label.textContent = status.done + ' / ' + status.total + ' Fotos'
        + (status.failed > 0 ? ' (' + status.failed + ' Fehler)' : '');
    }
    if (status.phase === 'done') {
      bar.style.background = status.failed > 0 ? '#f59e0b' : '#10b981';
      label.textContent    = status.success + ' von ' + status.total + ' archiviert'
        + (status.failed > 0 ? ' · ' + status.failed + ' fehlgeschlagen' : ' ✓');
      setTimeout(function() {
        if (modal) modal.style.display = 'none';
      }, 3000);
    }
  }

  /* ── Haupt-API: Upload beim Fall-Abschluss ───────────────────────  */
  async function archiviereFotos(opts) {
    opts = opts || {};
    var fotos        = opts.fotos        || global._fotos || [];
    var aktenzeichen = opts.aktenzeichen || global._az    || '';
    var recordId     = opts.recordId     || null;
    var onProgress   = opts.onProgress   || updateUploadModal;

    if (!fotos.length) {
      console.log('[FotoArchiv] Keine Fotos zum Archivieren');
      return {success: 0, failed: 0};
    }

    if (!aktenzeichen) {
      console.warn('[FotoArchiv] Kein Aktenzeichen — Upload übersprungen');
      return {success: 0, failed: 0};
    }

    /* Modal anzeigen */
    zeigUploadModal(fotos.length);
    onProgress({phase: 'start', total: fotos.length, done: 0});

    try {
      /* Record-ID holen wenn nicht angegeben */
      if (!recordId) {
        try {
          recordId = await getRecordId(aktenzeichen);
        } catch(e) {
          console.warn('[FotoArchiv] Record-ID nicht gefunden:', e.message);
          /* Ohne Record-ID trotzdem versuchen (serverseite holt dann selbst) */
        }
      }

      /* Nur Fotos mit dataUrl hochladen */
      var fotozumUpload = fotos.filter(function(f) {
        return f.dataUrl && f.dataUrl.startsWith('data:image');
      });

      if (fotozumUpload.length === 0) {
        console.log('[FotoArchiv] Keine Fotos mit dataUrl');
        return {success: 0, failed: 0};
      }

      var ergebnis = await uploadAlleFotos(fotozumUpload, recordId, aktenzeichen, onProgress);

      /* Toast */
      if (typeof global.toast === 'function' || typeof global.showToast === 'function') {
        var toastFn = global.toast || global.showToast;
        if (ergebnis.failed === 0) {
          toastFn(ergebnis.success + ' Fotos archiviert ✓', 'ok');
        } else {
          toastFn(ergebnis.success + ' archiviert, ' + ergebnis.failed + ' fehlgeschlagen', 'warn');
        }
      }

      return ergebnis;

    } catch(err) {
      console.error('[FotoArchiv] Fehler:', err.message);
      if (typeof global.toast === 'function') global.toast('Foto-Archivierung fehlgeschlagen: ' + err.message, 'err');
      return {success: 0, failed: fotos.length, error: err.message};
    }
  }

  /* ── Auto-Upload-Integration ──────────────────────────────────────
   * Patcht die bestehende speichereUndAbschliessen-Funktion in
   * ortstermin-modus.html um Fotos vor dem Abschluss hochzuladen.
   */
  function patchAbschluss() {
    /* Warte bis ortstermin-modus.html geladen hat */
    var orig = global.speichereUndAbschliessen;
    global.speichereUndAbschliessen = async function() {
      /* 1. Fotos hochladen */
      if (global._fotos && global._fotos.length > 0 && global._az) {
        try {
          await archiviereFotos({
            fotos:        global._fotos,
            aktenzeichen: global._az
          });
        } catch(e) {
          console.warn('[FotoArchiv] Abschluss-Upload Fehler:', e.message);
          /* Nicht blockieren — Abschluss trotzdem fortsetzen */
        }
      }
      /* 2. Original-Abschluss aufrufen */
      if (typeof orig === 'function') {
        return orig.apply(this, arguments);
      }
    };

    /* Button-Label update */
    var abschlussBtn = document.getElementById('btn-abschliessen');
    if (abschlussBtn && global._fotos && global._fotos.length > 0) {
      var origLabel = abschlussBtn.textContent;
      abschlussBtn.title = 'Fotos werden automatisch archiviert';
    }
  }

  /* Init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchAbschluss);
  } else {
    patchAbschluss();
  }

  /* ── Öffentliche API ────────────────────────────────────────────── */
  global.ProvaFotoArchiv = {
    archivieren:     archiviereFotos,
    uploadEines:     uploadEinesFoto,
    getRecordId:     getRecordId,
  };

})(window);