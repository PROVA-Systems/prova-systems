/**
 * PROVA Systems — ortstermin-kamera-fix.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 4 Mobile UX Fix — Rear Camera + Photo Capture
 *
 * PROBLEM:
 *   <input capture="environment"> lässt den Browser entscheiden,
 *   welche Kamera geöffnet wird. Auf vielen Android-Geräten wird
 *   die Front-Kamera geöffnet, obwohl "environment" Rückkamera bedeuten soll.
 *   Außerdem: keine explizite Auflösung → Browser wählt Thumbnail-Qualität.
 *
 * LÖSUNG:
 *   1. MediaDevices.getUserMedia() mit explizitem facingMode: {exact: "environment"}
 *   2. Auflösung: 4096×3072 (ideal) → 1920×1440 (min) mit auto-shrink
 *   3. Foto wird als Canvas-Blob mit JPEG-Qualität 0.90 gespeichert
 *   4. Fallback auf <input type="file" capture="environment"> wenn getUserMedia fehlschlägt
 *   5. Stream-Cleanup nach Aufnahme (verhindert Kamera-LED bleibt an)
 *
 * EINBINDEN (in ortstermin-modus.html):
 *   <script src="ortstermin-kamera-fix.js" defer></script>
 *   Dann: onclick="ProvaKamera.aufnehmen()" statt input.click()
 *
 * ══════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  var _stream     = null;   // Aktiver Camera-Stream
  var _videoEl    = null;   // Verstecktes Video-Element für Preview
  var _overlayEl  = null;   // Kamera-Overlay

  /* ── Kamera-Constraints (Rückkamera, maximale Qualität) ─────────── */
  var CONSTRAINTS_REAR = {
    video: {
      facingMode:  { ideal: 'environment' },  // ideal (nicht exact) für bessere Kompatibilität
      width:       { ideal: 4096, min: 1280 },
      height:      { ideal: 3072, min: 960  },
      aspectRatio: { ideal: 4/3 }
    },
    audio: false
  };

  /* Fallback für Geräte ohne facingMode-Support */
  var CONSTRAINTS_ANY = {
    video: { width: { ideal: 1920, min: 640 }, height: { ideal: 1440, min: 480 } },
    audio: false
  };

  /**
   * Erstellt Kamera-Overlay (Live-Preview + Auslöser-Button).
   */
  function createOverlay() {
    if (_overlayEl) return _overlayEl;

    _overlayEl = document.createElement('div');
    _overlayEl.id = 'prova-kamera-overlay';
    _overlayEl.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:#000', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'overflow:hidden'
    ].join(';');

    _overlayEl.innerHTML = [
      '<video id="prova-kamera-video" autoplay playsinline muted',
        ' style="width:100%;height:100%;object-fit:cover;"></video>',
      '<div style="position:absolute;bottom:0;left:0;right:0;',
                  'padding:24px 20px;background:linear-gradient(transparent,rgba(0,0,0,.8));',
                  'display:flex;align-items:center;justify-content:space-between;">',
        '<!-- Wechsel-Button: Vorder/Rück -->',
        '<button id="prova-kamera-switch"',
          ' style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.3);',
                  'background:rgba(255,255,255,.1);color:#fff;font-size:20px;',
                  'cursor:pointer;backdrop-filter:blur(8px);" title="Kamera wechseln">',
          '🔄',
        '</button>',
        '<!-- Auslöser -->',
        '<button id="prova-kamera-ausloeser"',
          ' style="width:72px;height:72px;border-radius:50%;border:4px solid #fff;',
                  'background:rgba(255,255,255,.15);cursor:pointer;',
                  'backdrop-filter:blur(4px);transition:transform .1s;"',
          ' onmousedown="this.style.transform=\'scale(.9)\'" onmouseup="this.style.transform=\'scale(1)\'">',
          '<div style="width:56px;height:56px;border-radius:50%;background:#fff;margin:auto;"></div>',
        '</button>',
        '<!-- Schließen -->',
        '<button id="prova-kamera-close"',
          ' style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.3);',
                  'background:rgba(255,255,255,.1);color:#fff;font-size:20px;',
                  'cursor:pointer;backdrop-filter:blur(8px);" title="Abbrechen">',
          '✕',
        '</button>',
      '</div>',
      '<div id="prova-kamera-flash" style="position:absolute;inset:0;background:#fff;',
                                          'opacity:0;pointer-events:none;transition:opacity .05s;"></div>',
      '<div id="prova-kamera-status" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);',
                                           'background:rgba(0,0,0,.6);color:#fff;font-size:12px;',
                                           'padding:4px 12px;border-radius:20px;white-space:nowrap;',
                                           'display:none;"></div>'
    ].join('');

    document.body.appendChild(_overlayEl);

    /* Button-Handler */
    document.getElementById('prova-kamera-close').addEventListener('click', stopKamera);
    document.getElementById('prova-kamera-switch').addEventListener('click', switchKamera);
    document.getElementById('prova-kamera-ausloeser').addEventListener('click', fotoAufnehmen);

    return _overlayEl;
  }

  var _currentFacing = 'environment';

  /**
   * Startet Kamera-Stream und zeigt Overlay.
   */
  async function startKameraStream(facing) {
    facing = facing || 'environment';
    _currentFacing = facing;

    var constraints = {
      video: {
        facingMode:  { ideal: facing },
        width:       { ideal: 4096, min: 1280 },
        height:      { ideal: 3072, min: 960  },
      },
      audio: false
    };

    try {
      if (_stream) {
        _stream.getTracks().forEach(function(t) { t.stop(); });
        _stream = null;
      }
      _stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch(e) {
      /* facingMode nicht unterstützt → Fallback ohne facingMode */
      console.warn('[ProvaKamera] facingMode fehlgeschlagen:', e.message, '— Fallback');
      try {
        _stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS_ANY);
      } catch(e2) {
        throw new Error('Kamera nicht verfügbar: ' + e2.message);
      }
    }

    var video = document.getElementById('prova-kamera-video');
    if (video) {
      video.srcObject = _stream;
      await video.play().catch(function() {});
    }

    /* Stream-Info anzeigen */
    var track = _stream.getVideoTracks()[0];
    if (track) {
      var settings = track.getSettings();
      var statusEl = document.getElementById('prova-kamera-status');
      if (statusEl) {
        statusEl.textContent = (settings.width || '?') + '×' + (settings.height || '?') + 'px';
        statusEl.style.display = 'block';
        setTimeout(function() { statusEl.style.display = 'none'; }, 2000);
      }
    }
  }

  /**
   * Wechselt zwischen Vorder- und Rückkamera.
   */
  async function switchKamera() {
    var newFacing = _currentFacing === 'environment' ? 'user' : 'environment';
    try {
      await startKameraStream(newFacing);
    } catch(e) {
      console.warn('[ProvaKamera] Kamera-Wechsel fehlgeschlagen:', e.message);
    }
  }

  /**
   * Nimmt ein Foto auf (Canvas-Snapshot vom Video).
   */
  async function fotoAufnehmen() {
    var video = document.getElementById('prova-kamera-video');
    if (!video || !video.srcObject) return;

    /* Flash-Effekt */
    var flash = document.getElementById('prova-kamera-flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(function() { flash.style.opacity = '0'; }, 80);
    }

    /* Canvas-Snapshot */
    var canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    /* JPEG mit 90% Qualität */
    var dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    var sizeMB  = Math.round(dataUrl.length * 0.00000075 * 100) / 100;

    /* Foto-Objekt erstellen */
    var foto = {
      id:        Date.now() + Math.random(),
      dataUrl:   dataUrl,
      caption:   '',
      datei:     'foto_' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg',
      groesse_kb: Math.round(sizeMB * 1024),
      breite:    canvas.width,
      hoehe:     canvas.height,
      aufnahme:  new Date().toISOString()
    };

    /* Callback aufrufen (Integration mit ortstermin-modus.html) */
    if (typeof global.onProvaKameraFoto === 'function') {
      global.onProvaKameraFoto(foto);
    }

    /* Haptic Feedback (Mobile) */
    if (navigator.vibrate) navigator.vibrate(50);

    /* Stream weiterlaufen lassen für weitere Fotos */
    /* Kamera schließen erst wenn Nutzer ✕ drückt */
  }

  /**
   * Stoppt Kamera und entfernt Overlay.
   */
  function stopKamera() {
    if (_stream) {
      _stream.getTracks().forEach(function(t) { t.stop(); });
      _stream = null;
    }
    if (_overlayEl) {
      _overlayEl.style.display = 'none';
    }
    var video = document.getElementById('prova-kamera-video');
    if (video) video.srcObject = null;
  }

  /**
   * Haupt-API: Öffnet Kamera-Overlay.
   * Wird von HTML aufgerufen statt input.click().
   *
   * Integration in ortstermin-modus.html:
   *   ALT: onclick="document.getElementById('foto-input-kamera').click()"
   *   NEU: onclick="ProvaKamera.aufnehmen()"
   */
  async function aufnehmen() {
    /* Prüfe ob getUserMedia verfügbar */
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[ProvaKamera] getUserMedia nicht verfügbar — Fallback auf file input');
      var fallback = document.getElementById('foto-input-kamera');
      if (fallback) fallback.click();
      return;
    }

    /* HTTPS-Pflicht-Check */
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('[ProvaKamera] getUserMedia erfordert HTTPS — Fallback');
      var fallback2 = document.getElementById('foto-input-kamera');
      if (fallback2) fallback2.click();
      return;
    }

    createOverlay();
    _overlayEl.style.display = 'flex';

    try {
      await startKameraStream('environment');
    } catch(e) {
      console.error('[ProvaKamera] Kamera-Start fehlgeschlagen:', e.message);
      stopKamera();
      /* Fallback auf File-Input */
      var fallback3 = document.getElementById('foto-input-kamera');
      if (fallback3) {
        fallback3.click();
      } else if (global.showToast) {
        global.showToast('⚠️ Kamera nicht verfügbar: ' + e.message, 'warn');
      }
    }
  }

  /**
   * Patch: Ersetzt den bestehenden foto-input-kamera Button-Click
   * durch ProvaKamera.aufnehmen() — kann nach DOMContentLoaded aufgerufen werden.
   */
  function patchFotoButtons() {
    /* Kamera-Button (erster .foto-camera-btn) */
    var kameraBtn = document.querySelector('.foto-camera-btn:first-of-type, [onclick*="foto-input-kamera"]');
    if (kameraBtn) {
      kameraBtn.removeAttribute('onclick');
      kameraBtn.addEventListener('click', function(e) {
        e.preventDefault();
        aufnehmen();
      });
    }

    /* onProvaKameraFoto Integration */
    global.onProvaKameraFoto = function(foto) {
      if (typeof global.fotoHinzufuegenDirekt === 'function') {
        global.fotoHinzufuegenDirekt(foto);
      } else if (global._fotos && Array.isArray(global._fotos)) {
        global._fotos.push(foto);
        if (typeof global.renderFotoGrid === 'function') global.renderFotoGrid();
        if (typeof global.fotoDBSave === 'function') global.fotoDBSave();
      }
    };
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchFotoButtons);
  } else {
    patchFotoButtons();
  }

  /* ── Öffentliche API ────────────────────────────────────────────── */
  global.ProvaKamera = {
    aufnehmen:   aufnehmen,
    stoppen:     stopKamera,
    wechseln:    switchKamera,
    istVerfuegbar: function() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
                location.protocol === 'https:' || location.hostname === 'localhost');
    }
  };

})(window);