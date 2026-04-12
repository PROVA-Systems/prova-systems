/**
 * PROVA — Skizzen-Tool (prova-sketch.js)
 * 
 * Canvas-basiertes Freihand-Zeichnen für den Ortstermin.
 * SV kann Grundriss skizzieren + Schadensstellen markieren.
 * KI analysiert Skizze + Fotos zusammen für kontextbezogene Beschriftungen.
 */
(function(window) {
  'use strict';

  var _canvas  = null;
  var _ctx     = null;
  var _drawing = false;
  var _lastX   = 0;
  var _lastY   = 0;
  var _tool    = 'stift';  // stift | radierer | text | pfeil
  var _farbe   = '#4f8ef7';
  var _staerke = 3;
  var _history = []; // Undo-Stack (ImageData)
  var _histIdx = -1;
  var _az      = '';

  var WERKZEUGE = [
    { id: 'stift',   icon: '✏️', label: 'Stift',    farbe: null },
    { id: 'rot',     icon: '🔴', label: 'Rot',       farbe: '#ef4444' },
    { id: 'gruen',   icon: '🟢', label: 'Grün',      farbe: '#10b981' },
    { id: 'gelb',    icon: '🟡', label: 'Markieren', farbe: 'rgba(251,191,36,.5)', breite: 18 },
    { id: 'pfeil',   icon: '➡️', label: 'Pfeil',     farbe: '#ef4444' },
    { id: 'text',    icon: '🔤', label: 'Text',       farbe: null },
    { id: 'radierer',icon: '⬜', label: 'Radierer',  farbe: null },
  ];

  /* ── Initialisierung ── */
  function init(containerId, az) {
    _az = az || localStorage.getItem('prova_aktiver_fall') || '';
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = skizzeHTML();
    _canvas = container.querySelector('#sketch-canvas');
    _ctx    = _canvas.getContext('2d');

    // Canvas-Größe
    var w = container.offsetWidth || 340;
    _canvas.width  = w;
    _canvas.height = Math.round(w * 0.65);
    _ctx.fillStyle = '#1a2035';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _ctx.lineCap   = 'round';
    _ctx.lineJoin  = 'round';

    historieSichern();

    // Vorhandene Skizze laden
    if (window.PROVA_OFFLINE) {
      window.PROVA_OFFLINE.skizzeLaden(_az).then(function(sk) {
        if (sk && sk.dataUrl) {
          var img = new Image();
          img.onload = function() { _ctx.drawImage(img, 0, 0); };
          img.src = sk.dataUrl;
        }
      });
    }

    // Events: Touch + Mouse
    _canvas.addEventListener('mousedown',  startZeichnen, { passive: false });
    _canvas.addEventListener('mousemove',  zeichnen,      { passive: false });
    _canvas.addEventListener('mouseup',    stopZeichnen);
    _canvas.addEventListener('mouseleave', stopZeichnen);
    _canvas.addEventListener('touchstart', function(e){ e.preventDefault(); startZeichnen(e.touches[0]); }, { passive: false });
    _canvas.addEventListener('touchmove',  function(e){ e.preventDefault(); zeichnen(e.touches[0]); }, { passive: false });
    _canvas.addEventListener('touchend',   stopZeichnen);

    // Werkzeug-Buttons
    container.querySelectorAll('[data-tool]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _tool = this.dataset.tool;
        var cfg = WERKZEUGE.find(function(w){ return w.id === _tool; });
        if (cfg && cfg.farbe) _farbe = cfg.farbe;
        if (cfg && cfg.breite) _staerke = cfg.breite;
        else _staerke = _tool === 'radierer' ? 20 : 3;
        if (_tool === 'rot') _farbe = '#ef4444';
        if (_tool === 'stift') _farbe = '#4f8ef7';
        container.querySelectorAll('[data-tool]').forEach(function(b){ b.classList.remove('aktiv'); });
        this.classList.add('aktiv');
      });
    });

    // Aktionen
    var undoBtn   = container.querySelector('#sketch-undo');
    var clearBtn  = container.querySelector('#sketch-clear');
    var saveBtn   = container.querySelector('#sketch-save');
    var exportBtn = container.querySelector('#sketch-export');

    if (undoBtn)   undoBtn.addEventListener('click', undo);
    if (clearBtn)  clearBtn.addEventListener('click', leeren);
    if (saveBtn)   saveBtn.addEventListener('click', function(){ speichern(true); });
    if (exportBtn) exportBtn.addEventListener('click', exportieren);
  }

  function skizzeHTML() {
    var werkzeugBtns = WERKZEUGE.map(function(w) {
      return '<button class="sk-tool' + (w.id === 'stift' ? ' aktiv' : '') + '" data-tool="' + w.id + '" title="' + w.label + '">' + w.icon + '</button>';
    }).join('');

    return '<div class="sk-wrap">' +
      '<div class="sk-toolbar">' +
        werkzeugBtns +
        '<div class="sk-sep"></div>' +
        '<button class="sk-action" id="sketch-undo" title="Rückgängig">↩</button>' +
        '<button class="sk-action" id="sketch-clear" title="Alles löschen">🗑</button>' +
        '<button class="sk-action sk-save" id="sketch-save" title="Speichern">💾</button>' +
        '<button class="sk-action" id="sketch-export" title="Als Bild speichern">⬇</button>' +
      '</div>' +
      '<canvas id="sketch-canvas" style="width:100%;border-radius:0 0 10px 10px;touch-action:none;cursor:crosshair;display:block;"></canvas>' +
      '<div class="sk-status" id="sketch-status" style="display:none;"></div>' +
    '</div>';
  }

  function canvasPos(e) {
    var rect = _canvas.getBoundingClientRect();
    var scaleX = _canvas.width  / rect.width;
    var scaleY = _canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    };
  }

  function startZeichnen(e) {
    _drawing = true;
    var pos  = canvasPos(e);
    _lastX   = pos.x;
    _lastY   = pos.y;

    if (_tool === 'text') {
      var txt = prompt('Text eingeben:');
      if (txt) {
        _ctx.font      = 'bold 16px -apple-system, sans-serif';
        _ctx.fillStyle = _farbe;
        _ctx.fillText(txt, pos.x, pos.y);
        historieSichern();
        speichern(false);
      }
      _drawing = false;
      return;
    }

    _ctx.beginPath();
    _ctx.moveTo(pos.x, pos.y);
  }

  function zeichnen(e) {
    if (!_drawing) return;
    var pos  = canvasPos(e);

    if (_tool === 'radierer') {
      _ctx.save();
      _ctx.globalCompositeOperation = 'destination-out';
      _ctx.beginPath();
      _ctx.arc(pos.x, pos.y, _staerke, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    } else if (_tool === 'gelb') {
      _ctx.save();
      _ctx.globalAlpha = 0.35;
      _ctx.strokeStyle = '#fbbf24';
      _ctx.lineWidth   = _staerke;
      _ctx.beginPath();
      _ctx.moveTo(_lastX, _lastY);
      _ctx.lineTo(pos.x, pos.y);
      _ctx.stroke();
      _ctx.restore();
    } else {
      _ctx.strokeStyle = _farbe;
      _ctx.lineWidth   = _staerke;
      _ctx.lineTo(pos.x, pos.y);
      _ctx.stroke();
    }

    _lastX = pos.x;
    _lastY = pos.y;
  }

  function stopZeichnen() {
    if (!_drawing) return;
    _drawing = false;
    historieSichern();
    speichern(false); // Auto-Save nach jedem Strich
  }

  function historieSichern() {
    _histIdx++;
    _history = _history.slice(0, _histIdx);
    _history.push(_ctx.getImageData(0, 0, _canvas.width, _canvas.height));
    if (_history.length > 30) { _history.shift(); _histIdx--; }
  }

  function undo() {
    if (_histIdx > 0) {
      _histIdx--;
      _ctx.putImageData(_history[_histIdx], 0, 0);
      speichern(false);
    }
  }

  function leeren() {
    if (!confirm('Skizze löschen?')) return;
    _ctx.fillStyle = '#1a2035';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    _history = [];
    _histIdx = -1;
    historieSichern();
    speichern(false);
  }

  function speichern(mitToast) {
    if (!window.PROVA_OFFLINE) return;
    var dataUrl = _canvas.toDataURL('image/png');
    window.PROVA_OFFLINE.skizzeSpeichern(_az, dataUrl).then(function() {
      if (mitToast) {
        var st = document.getElementById('sketch-status');
        if (st) {
          st.textContent = '✅ Skizze gespeichert';
          st.style.display = 'block';
          setTimeout(function(){ st.style.display = 'none'; }, 2000);
        }
      }
    });
  }

  function exportieren() {
    var link    = document.createElement('a');
    link.href   = _canvas.toDataURL('image/png');
    link.download = 'PROVA-Skizze-' + (_az || 'ortstermin') + '.png';
    link.click();
  }

  /* ── Skizze als Base64 für KI abrufen ── */
  async function skizzeAlsBase64() {
    if (!_canvas) return null;
    return _canvas.toDataURL('image/png').split(',')[1];
  }

  /* ── CSS einfügen ── */
  if (!document.getElementById('prova-sketch-css')) {
    var style = document.createElement('style');
    style.id  = 'prova-sketch-css';
    style.textContent = [
      '.sk-wrap{border-radius:10px;overflow:hidden;background:#111827;border:1px solid rgba(255,255,255,.1);}',
      '.sk-toolbar{display:flex;align-items:center;gap:4px;padding:8px 10px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;}',
      '.sk-tool{width:34px;height:34px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .12s;}',
      '.sk-tool:hover,.sk-tool.aktiv{background:rgba(79,142,247,.15);}',
      '.sk-tool.aktiv{outline:2px solid rgba(79,142,247,.5);}',
      '.sk-sep{width:1px;height:24px;background:rgba(255,255,255,.1);margin:0 4px;}',
      '.sk-action{width:32px;height:32px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:8px;cursor:pointer;font-size:14px;color:#9ca3af;display:flex;align-items:center;justify-content:center;transition:all .12s;}',
      '.sk-action:hover{background:rgba(255,255,255,.08);color:#e8eaf0;}',
      '.sk-save{background:rgba(79,142,247,.12);border-color:rgba(79,142,247,.3);color:#4f8ef7;}',
      '.sk-status{padding:6px 10px;font-size:12px;font-weight:600;color:#10b981;background:rgba(16,185,129,.1);border-top:1px solid rgba(16,185,129,.2);}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ── EXPORT ── */
  window.PROVA_SKETCH = {
    init:             init,
    speichern:        speichern,
    skizzeAlsBase64:  skizzeAlsBase64,
    exportieren:      exportieren
  };

})(window);
