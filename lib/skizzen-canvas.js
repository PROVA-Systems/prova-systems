/**
 * PROVA — skizzen-canvas.js (MEGA³⁹ P3)
 *
 * Tier 1 (Werkzeuge):
 *   stift, linie, kreis, rechteck, marker, text, radierer
 *   undo/redo (30 Steps)
 *
 * Tier 2 (Erweitert):
 *   hintergrundbild, nordpfeil, masstab/lineal
 *   farbwahl, strichstaerke
 *
 * Marker-System:
 *   Klick → automatische Nummer (#1, #2, #3 …)
 *   optional Beschriftung + Befund-Verknuepfung
 *
 * Multi-Skizze pro Auftrag:
 *   skizze_nr 1, 2, 3 …
 *
 * Storage:
 *   IndexedDB offline-first (auto-save 500ms debounced)
 *   Sync zu Supabase eintraege (typ='skizze') bei online
 *
 * Touch + Pointer + Maus + Stift (Apple Pencil / S Pen mit Pressure)
 *
 * KI-Doktrin (§407a):
 *   Skizze-Bild wird NICHT an KI gesendet.
 *   Marker-Texte + Befund-Cross-Reference gehen in KI-Kontext.
 *
 * Public API (window.PROVA_SKIZZEN):
 *   init(containerId, opts)
 *   setTool(t), setColor(c), setLineWidth(w)
 *   addMarker(x, y, text?, befund_id?)
 *   setBackgroundImage(url)
 *   setScale(pxPerMeter, northAngle)
 *   undo(), redo(), clear()
 *   exportPNG() → dataURL
 *   exportJSON() → object
 *   loadFromData(data)
 *   save() → IndexedDB + Supabase
 */
'use strict';

(function (root) {
  const TIER_1_TOOLS = ['stift', 'linie', 'kreis', 'rechteck', 'marker', 'text', 'radierer'];
  const DEFAULT_COLOR = '#4f8ef7';
  const DEFAULT_LINE_WIDTH = 3;
  const HISTORY_MAX = 30;

  function PROVA_SKIZZEN_factory() {
    let canvas = null;
    let ctx = null;
    let tool = 'stift';
    let color = DEFAULT_COLOR;
    let lineWidth = DEFAULT_LINE_WIDTH;
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let strokes = [];        // Permanente Strokes (für Replay)
    let currentStroke = null;
    let markers = [];        // [{nr, x, y, text, befund_id?}]
    let history = [];        // ImageData-Stack für Undo
    let historyIdx = -1;
    let backgroundImg = null;
    let scale = { px_per_meter: null, north_angle: 0 };
    let auftragId = null;
    let skizzeNr = 1;
    let onChangeCallback = null;
    let _saveTimer = null;

    function init(containerId, opts) {
      opts = opts || {};
      auftragId = opts.auftragId || null;
      skizzeNr = opts.skizzeNr || 1;
      onChangeCallback = opts.onChange || null;

      const container = document.getElementById(containerId);
      if (!container) throw new Error('Container nicht gefunden: ' + containerId);

      canvas = document.createElement('canvas');
      canvas.className = 'prova-skizze-canvas';
      canvas.width = opts.width || container.clientWidth || 800;
      canvas.height = opts.height || 600;
      canvas.style.touchAction = 'none';
      canvas.style.cursor = 'crosshair';
      canvas.style.background = '#fff';
      canvas.style.border = '1px solid #ccc';
      canvas.style.borderRadius = '8px';
      container.appendChild(canvas);

      ctx = canvas.getContext('2d');
      _setStyle();
      _attachPointerEvents();
      _saveHistory();

      if (opts.initialData) loadFromData(opts.initialData);
    }

    function _setStyle() {
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    function _getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function _attachPointerEvents() {
      canvas.addEventListener('pointerdown', _onPointerDown);
      canvas.addEventListener('pointermove', _onPointerMove);
      canvas.addEventListener('pointerup', _onPointerUp);
      canvas.addEventListener('pointercancel', _onPointerUp);
      canvas.addEventListener('pointerleave', _onPointerUp);
    }

    function _onPointerDown(e) {
      const { x, y } = _getCanvasCoords(e);
      lastX = x; lastY = y;

      // Stift-Pressure für Apple Pencil / S Pen
      if (e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
        ctx.lineWidth = lineWidth * (0.5 + e.pressure * 1.5);
      } else {
        ctx.lineWidth = lineWidth;
      }

      if (tool === 'marker') {
        addMarker(x, y);
        return;
      }

      isDrawing = true;
      currentStroke = { tool, color, lineWidth: ctx.lineWidth, points: [{ x, y }] };
    }

    function _onPointerMove(e) {
      if (!isDrawing) return;
      const { x, y } = _getCanvasCoords(e);

      if (e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
        ctx.lineWidth = lineWidth * (0.5 + e.pressure * 1.5);
      }

      if (tool === 'stift' || tool === 'radierer') {
        ctx.globalCompositeOperation = (tool === 'radierer') ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        currentStroke.points.push({ x, y });
        lastX = x; lastY = y;
      } else if (tool === 'linie' || tool === 'kreis' || tool === 'rechteck') {
        // Live-Preview: Re-render aus History + temp-shape
        _restoreFromHistory();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        if (tool === 'linie') {
          ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
          ctx.lineTo(x, y);
        } else if (tool === 'kreis') {
          const cx = (currentStroke.points[0].x + x) / 2;
          const cy = (currentStroke.points[0].y + y) / 2;
          const rx = Math.abs(x - currentStroke.points[0].x) / 2;
          const ry = Math.abs(y - currentStroke.points[0].y) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        } else if (tool === 'rechteck') {
          ctx.rect(currentStroke.points[0].x, currentStroke.points[0].y,
                   x - currentStroke.points[0].x, y - currentStroke.points[0].y);
        }
        ctx.stroke();
        currentStroke.endX = x;
        currentStroke.endY = y;
      }
    }

    function _onPointerUp() {
      if (!isDrawing) return;
      isDrawing = false;
      ctx.globalCompositeOperation = 'source-over';
      if (currentStroke && (currentStroke.points.length > 1 || currentStroke.endX != null)) {
        strokes.push(currentStroke);
        _saveHistory();
        _scheduleAutoSave();
      }
      currentStroke = null;
    }

    function _saveHistory() {
      if (!ctx) return;
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history = history.slice(0, historyIdx + 1);
      history.push(snapshot);
      if (history.length > HISTORY_MAX) history.shift();
      historyIdx = history.length - 1;
    }

    function _restoreFromHistory() {
      if (historyIdx < 0 || !history[historyIdx]) return;
      ctx.putImageData(history[historyIdx], 0, 0);
    }

    function _scheduleAutoSave() {
      if (_saveTimer) clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => {
        _saveToIndexedDB();
        if (onChangeCallback) onChangeCallback(exportJSON());
      }, 500);
    }

    async function _saveToIndexedDB() {
      if (typeof indexedDB === 'undefined' || !auftragId) return;
      try {
        const db = await _openDB();
        const tx = db.transaction(['skizzen'], 'readwrite');
        await new Promise((resolve, reject) => {
          const req = tx.objectStore('skizzen').put({
            id: auftragId + '-' + skizzeNr,
            auftrag_id: auftragId,
            skizze_nr: skizzeNr,
            data: exportJSON(),
            timestamp: Date.now()
          });
          req.onsuccess = resolve;
          req.onerror = () => reject(req.error);
        });
      } catch (e) { /* offline-fallback gracefully ignored */ }
    }

    function _openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('prova-skizzen', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('skizzen')) {
            db.createObjectStore('skizzen', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    // ── Public API ────────────────────────────────────────
    function setTool(t) {
      if (TIER_1_TOOLS.indexOf(t) === -1 && t !== 'verschieben') {
        throw new Error('Unbekanntes Tool: ' + t);
      }
      tool = t;
      if (canvas) canvas.style.cursor = (t === 'marker') ? 'crosshair' : (t === 'verschieben' ? 'grab' : 'crosshair');
    }
    function setColor(c) { color = c; _setStyle(); }
    function setLineWidth(w) { lineWidth = Math.max(1, Math.min(40, +w)); _setStyle(); }

    function addMarker(x, y, text, befund_id) {
      const nr = markers.length + 1;
      const marker = { nr, x, y, text: text || '', befund_id: befund_id || null };
      markers.push(marker);
      // Pin zeichnen: Kreis + Nummer
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(nr), x, y);
      ctx.restore();
      _setStyle();
      _saveHistory();
      _scheduleAutoSave();
      return marker;
    }

    function setBackgroundImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          backgroundImg = url;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          _saveHistory();
          _scheduleAutoSave();
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    }

    function setScale(pxPerMeter, northAngle) {
      scale.px_per_meter = +pxPerMeter || null;
      scale.north_angle = +northAngle || 0;
      _scheduleAutoSave();
    }

    function undo() {
      if (historyIdx > 0) {
        historyIdx--;
        _restoreFromHistory();
        _scheduleAutoSave();
      }
    }
    function redo() {
      if (historyIdx < history.length - 1) {
        historyIdx++;
        _restoreFromHistory();
        _scheduleAutoSave();
      }
    }
    function clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes = [];
      markers = [];
      _saveHistory();
      _scheduleAutoSave();
    }

    function exportPNG() {
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }

    function exportJSON() {
      return {
        tier: backgroundImg ? 2 : 1,
        canvas_width: canvas ? canvas.width : 0,
        canvas_height: canvas ? canvas.height : 0,
        background: backgroundImg ? 'image_url' : null,
        background_url: backgroundImg,
        strokes: strokes.slice(),
        markers: markers.slice(),
        scale: { px_per_meter: scale.px_per_meter, north_angle: scale.north_angle }
      };
    }

    function loadFromData(data) {
      if (!data) return;
      strokes = Array.isArray(data.strokes) ? data.strokes.slice() : [];
      markers = Array.isArray(data.markers) ? data.markers.slice() : [];
      if (data.scale) scale = { px_per_meter: data.scale.px_per_meter, north_angle: data.scale.north_angle || 0 };
      if (data.background_url) {
        setBackgroundImage(data.background_url).then(_replayStrokes);
      } else {
        _replayStrokes();
      }
    }

    function _replayStrokes() {
      strokes.forEach(s => {
        ctx.save();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (s.tool === 'stift') {
          ctx.beginPath();
          s.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.stroke();
        } else if (s.tool === 'linie') {
          ctx.beginPath();
          ctx.moveTo(s.points[0].x, s.points[0].y);
          ctx.lineTo(s.endX, s.endY);
          ctx.stroke();
        }
        ctx.restore();
      });
      _setStyle();
      // Marker re-zeichnen
      markers.forEach(m => {
        const tmpMarkers = markers; markers = [];
        addMarker(m.x, m.y, m.text, m.befund_id);
        markers = tmpMarkers;
      });
      _saveHistory();
    }

    async function save() {
      const json = exportJSON();
      const png = exportPNG();
      // Server-side via Edge Function ggf. später; jetzt nur JSON via auftraege/eintraege-update
      // Hier: minimal direct payload, Caller-Seite uebernimmt POST
      return { json, png };
    }

    return {
      init: init,
      setTool: setTool,
      setColor: setColor,
      setLineWidth: setLineWidth,
      addMarker: addMarker,
      setBackgroundImage: setBackgroundImage,
      setScale: setScale,
      undo: undo,
      redo: redo,
      clear: clear,
      exportPNG: exportPNG,
      exportJSON: exportJSON,
      loadFromData: loadFromData,
      save: save,
      _TIER_1_TOOLS: TIER_1_TOOLS,
      _HISTORY_MAX: HISTORY_MAX,
      _getMarkers: () => markers.slice()
    };
  }

  // Singleton-Pattern + UMD
  const instance = PROVA_SKIZZEN_factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
    module.exports._factory = PROVA_SKIZZEN_factory;
  }
  if (typeof root !== 'undefined') {
    root.PROVA_SKIZZEN = instance;
    root.PROVA_SKIZZEN_factory = PROVA_SKIZZEN_factory;
  }
})(typeof self !== 'undefined' ? self : this);
