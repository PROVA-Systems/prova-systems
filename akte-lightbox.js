/**
 * PROVA Systems — akte-lightbox.js  (Client-Side)
 * ══════════════════════════════════════════════════════════════════════
 * Category 5 Missing Feature — Akte Foto-Lightbox Viewer
 *
 * Lädt Fotos aus Airtable Attachments-Feld und zeigt sie in
 * einem vollbildfähigen Lightbox-Modal mit Swipe-Navigation.
 *
 * EINBINDEN: <script src="akte-lightbox.js" defer></script>
 * ══════════════════════════════════════════════════════════════════════
 */
(function(global) {
  'use strict';

  var _fotos   = [];   // [{url, filename, caption}]
  var _index   = 0;
  var _overlay = null;

  /* ── Lightbox-DOM erstellen ───────────────────────────────────── */
  function createLightbox() {
    if (_overlay) return _overlay;
    _overlay = document.createElement('div');
    _overlay.id = 'prova-lightbox';
    _overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.93);'
      + 'display:none;flex-direction:column;align-items:center;justify-content:center;'
      + 'touch-action:pan-y;user-select:none;';
    _overlay.innerHTML = [
      '<div id="lb-toolbar" style="position:absolute;top:0;left:0;right:0;padding:12px 16px;',
                                  'display:flex;align-items:center;justify-content:space-between;',
                                  'background:linear-gradient(rgba(0,0,0,.6),transparent);z-index:2;">',
        '<span id="lb-counter" style="color:#fff;font-size:13px;font-weight:700;"></span>',
        '<span id="lb-caption" style="color:rgba(255,255,255,.7);font-size:12px;flex:1;text-align:center;',
                                    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 16px;"></span>',
        '<button id="lb-close" style="background:rgba(255,255,255,.1);border:none;color:#fff;',
                                    'width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>',
      '</div>',
      '<div id="lb-img-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;',
                                   'width:100%;padding:60px 60px;">',
        '<img id="lb-img" src="" alt="" style="max-width:100%;max-height:100%;object-fit:contain;',
                                             'border-radius:4px;transition:opacity .2s;">',
      '</div>',
      '<button id="lb-prev" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);',
                                  'background:rgba(255,255,255,.1);border:none;color:#fff;',
                                  'width:44px;height:44px;border-radius:50%;font-size:20px;cursor:pointer;">‹</button>',
      '<button id="lb-next" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);',
                                  'background:rgba(255,255,255,.1);border:none;color:#fff;',
                                  'width:44px;height:44px;border-radius:50%;font-size:20px;cursor:pointer;">›</button>',
      '<div id="lb-download-wrap" style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;',
                                       'display:flex;justify-content:center;gap:12px;',
                                       'background:linear-gradient(transparent,rgba(0,0,0,.6));">',
        '<a id="lb-download" href="#" download target="_blank" rel="noopener"',
           ' style="padding:7px 16px;border-radius:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);',
                  'color:#fff;font-size:12px;font-weight:600;text-decoration:none;">⬇ Download</a>',
      '</div>',
    ].join('');
    document.body.appendChild(_overlay);

    /* Events */
    document.getElementById('lb-close').addEventListener('click', closeLightbox);
    document.getElementById('lb-prev').addEventListener('click', function() { navigate(-1); });
    document.getElementById('lb-next').addEventListener('click', function() { navigate(1); });
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeLightbox(); });
    document.addEventListener('keydown', onKeydown);

    /* Touch-Swipe */
    var touchStartX = 0;
    _overlay.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].clientX; }, {passive: true});
    _overlay.addEventListener('touchend',   function(e) {
      var diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) navigate(diff < 0 ? 1 : -1);
    }, {passive: true});

    return _overlay;
  }

  function onKeydown(e) {
    if (!_overlay || _overlay.style.display === 'none') return;
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'Escape')     closeLightbox();
  }

  function showFoto(index) {
    _index = Math.max(0, Math.min(index, _fotos.length - 1));
    var foto = _fotos[_index];
    var img  = document.getElementById('lb-img');
    var cap  = document.getElementById('lb-caption');
    var cnt  = document.getElementById('lb-counter');
    var dl   = document.getElementById('lb-download');
    if (img) { img.style.opacity = '0'; img.src = foto.url || ''; img.onload = function() { img.style.opacity = '1'; }; }
    if (cap) cap.textContent = foto.caption || foto.filename || '';
    if (cnt) cnt.textContent = (_index + 1) + ' / ' + _fotos.length;
    if (dl)  { dl.href = foto.url || '#'; dl.download = foto.filename || 'foto.jpg'; }
    var prev = document.getElementById('lb-prev');
    var next = document.getElementById('lb-next');
    if (prev) prev.style.display = _fotos.length > 1 ? 'block' : 'none';
    if (next) next.style.display = _fotos.length > 1 ? 'block' : 'none';
  }

  function navigate(dir) {
    showFoto(_index + dir);
  }

  function closeLightbox() {
    if (_overlay) _overlay.style.display = 'none';
  }

  /* ── Fotos aus Airtable-Record laden ─────────────────────────── */
  async function ladeFotosVonAirtable(recordId) {
    try {
      var path = '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0/' + recordId
        + '?fields[]=Fotos&fields[]=Foto_Captions';
      var res  = await fetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: {'Content-Type': 'application/json'},
        body:    JSON.stringify({method: 'GET', path: path})
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data   = await res.json();
      var fields = data.fields || {};
      var anhaenge = fields.Fotos || [];
      var captions = (fields.Foto_Captions || '').split('\n');
      return anhaenge.map(function(att, i) {
        return {url: att.url, filename: att.filename || ('foto_' + (i+1) + '.jpg'), caption: captions[i] || ''};
      });
    } catch(e) {
      console.warn('[AkteLightbox] Laden fehlgeschlagen:', e.message);
      return [];
    }
  }

  /* ── Öffentliche API ─────────────────────────────────────────── */
  /**
   * Öffnet Lightbox mit Fotos aus einem Airtable Record.
   * @param {string} recordId  - Airtable Record-ID
   * @param {number} startIndex - Startbild (optional, default 0)
   */
  async function openFromRecord(recordId, startIndex) {
    createLightbox();
    _overlay.style.display = 'flex';
    var img = document.getElementById('lb-img');
    if (img) { img.src = ''; img.style.opacity = '.3'; }
    var cnt = document.getElementById('lb-counter');
    if (cnt) cnt.textContent = '⏳ Fotos werden geladen…';

    _fotos = await ladeFotosVonAirtable(recordId);

    if (_fotos.length === 0) {
      if (cnt) cnt.textContent = 'Keine Fotos vorhanden';
      if (img) img.style.opacity = '0';
      return;
    }

    showFoto(startIndex || 0);
  }

  /**
   * Öffnet Lightbox mit direkten Foto-Objekten.
   * @param {Array}  fotos - [{url, filename, caption}]
   * @param {number} startIndex
   */
  function openFromArray(fotos, startIndex) {
    createLightbox();
    _fotos = fotos || [];
    if (_fotos.length === 0) return;
    _overlay.style.display = 'flex';
    showFoto(startIndex || 0);
  }

  /**
   * Patcht Foto-Klick-Handler in akte-logic.js / akte.html.
   * Sucht nach Elementen mit data-foto-record Attribut.
   */
  function patchAkteButtons() {
    /* Vorhandene Foto-Buttons wrappen */
    document.querySelectorAll('[data-foto-record], .foto-thumbnail, .dok-item-foto').forEach(function(el, i) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function() {
        var recordId = el.getAttribute('data-foto-record') || el.closest('[data-record-id]')?.getAttribute('data-record-id');
        var idx      = parseInt(el.getAttribute('data-foto-index') || '0');
        if (recordId) openFromRecord(recordId, idx);
      });
    });

    /* renderDokumente in akte-logic.js patchen */
    var origRenderDok = global.renderDokumente;
    global.renderDokumente = function(f) {
      var result = origRenderDok ? origRenderDok(f) : undefined;
      /* Nach Render: Foto-Einträge klickbar machen */
      setTimeout(function() {
        document.querySelectorAll('.dok-item[data-typ="foto"]').forEach(function(el) {
          el.style.cursor = 'pointer';
          el.title = 'Fotos anzeigen';
          el.addEventListener('click', function() {
            var rid = el.getAttribute('data-record-id') || sessionStorage.getItem('prova_record_id');
            if (rid) openFromRecord(rid, 0);
          });
        });
      }, 100);
      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchAkteButtons);
  } else {
    patchAkteButtons();
  }

  global.ProvaLightbox = {
    openFromRecord: openFromRecord,
    openFromArray:  openFromArray,
    close:          closeLightbox,
  };

})(window);