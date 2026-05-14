/**
 * PROVA Skizze-Editor (MEGA⁶⁹-FINAL-2 Items 7.2-7.5)
 *
 * SVG-basierte Zeichen-Engine für SV-Skizzen. NinjaAI Session 5 Spec.
 *
 * 9 Tools: Auswahl · Linie · Pfeil · Rechteck · Kreis · Text · Maß · Eraser · Foto-Overlay
 * Maßstab-Manager: Click+Click → Modal → "5m" → px_per_unit persist, alle weiteren Maße live
 * Foto-Overlay-Layer: ProvaFotoPicker-Integration, exif_stripped=true DSGVO-Filter
 * Undo/Redo: 30 JSON-State-Snapshots (Marcel-Direktive ≥20)
 * Export: serialize() → SVG-String (skizzen.svg_content), deserialize(svg) → State
 *
 * Public API:
 *   ProvaSkizzeEditor.openModal({ auftragId, skizzeId?, initialSvg?, onSave })
 *   ProvaSkizzeEditor.close()
 *
 * Persistenz: Edge Function `skizzen-save` (existing 87631182)
 *   Body: { titel, svg_content, foto_referenz_id, massstab, notiz, auftrag_id, pseudonymisiert:true }
 *
 * Asset-Event: nach Save dispatched ProvaAssetEventBus.emit('skizze', skizzeId, auftragId)
 *
 * Bundle: ~10 KB gzipped (vanilla SVG, keine Foreign-Deps)
 */
'use strict';

(function (global) {

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TOOLS = ['auswahl', 'linie', 'pfeil', 'rechteck', 'kreis', 'text', 'mass', 'eraser', 'foto'];
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#4f8ef7', '#8b5cf6', '#0b2228'];
  const STROKE_WIDTHS = [1, 2, 4, 8];
  const HISTORY_MAX = 30;
  const CANVAS_W = 1200;
  const CANVAS_H = 800;

  // ──────────────────────────────────────────────────────────────
  // Editor-State
  // ──────────────────────────────────────────────────────────────
  function createState() {
    return {
      auftragId: null,
      skizzeId: null,
      titel: 'Neue Skizze',
      tool: 'linie',
      color: COLORS[3],
      strokeWidth: 2,
      shapes: [],            // [{ id, type, attrs:{x1,y1,x2,y2,...}, color, strokeWidth, ... }]
      fotoLayer: null,       // { foto_id, storage_path, signed_url, opacity }
      massstab: null,        // { px_per_unit, unit, reference_line:{x1,y1,x2,y2} }
      history: [],           // [{shapes:[], fotoLayer, massstab}]
      historyIdx: -1,
      isDrawing: false,
      activeShape: null,
      selectedId: null,
      _massStep: 0,          // Maß-Tool: 0=warte auf Click1, 1=warte auf Click2
      _massPoints: []
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Style Injection
  // ──────────────────────────────────────────────────────────────
  function _injectStyle() {
    if (document.getElementById('prova-skizze-editor-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-skizze-editor-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-skizze-editor.css';
    document.head.appendChild(link);
  }

  // ──────────────────────────────────────────────────────────────
  // SVG Helpers
  // ──────────────────────────────────────────────────────────────
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function _uid() { return 'sh-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

  function _esc(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ──────────────────────────────────────────────────────────────
  // Coordinate-Transform (Pointer → SVG-User-Space)
  // ──────────────────────────────────────────────────────────────
  function _svgCoords(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const sp = pt.matrixTransform(ctm.inverse());
    return { x: sp.x, y: sp.y };
  }

  // ──────────────────────────────────────────────────────────────
  // Shape Renderers
  // ──────────────────────────────────────────────────────────────
  function renderShape(svg, shape, state) {
    let el = null;
    const a = shape.attrs;
    const stroke = shape.color || '#000';
    const sw = shape.strokeWidth || 2;
    switch (shape.type) {
      case 'linie':
        el = svgEl('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke, 'stroke-width': sw, 'stroke-linecap': 'round' });
        break;
      case 'pfeil': {
        const g = svgEl('g', { 'data-shape-id': shape.id });
        g.appendChild(svgEl('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke, 'stroke-width': sw, 'stroke-linecap': 'round' }));
        // Pfeilkopf
        const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
        const headLen = 12;
        const hx1 = a.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const hy1 = a.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const hx2 = a.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const hy2 = a.y2 - headLen * Math.sin(angle + Math.PI / 6);
        g.appendChild(svgEl('polyline', { points: `${hx1},${hy1} ${a.x2},${a.y2} ${hx2},${hy2}`, fill: 'none', stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }));
        el = g;
        break;
      }
      case 'rechteck': {
        const x = Math.min(a.x1, a.x2), y = Math.min(a.y1, a.y2);
        const w = Math.abs(a.x2 - a.x1), h = Math.abs(a.y2 - a.y1);
        el = svgEl('rect', { x, y, width: w, height: h, stroke, 'stroke-width': sw, fill: 'none' });
        break;
      }
      case 'kreis': {
        const cx = (a.x1 + a.x2) / 2, cy = (a.y1 + a.y2) / 2;
        const rx = Math.abs(a.x2 - a.x1) / 2, ry = Math.abs(a.y2 - a.y1) / 2;
        el = svgEl('ellipse', { cx, cy, rx, ry, stroke, 'stroke-width': sw, fill: 'none' });
        break;
      }
      case 'text': {
        el = svgEl('text', { x: a.x1, y: a.y1, fill: stroke, 'font-size': a.fontSize || 16, 'font-family': 'system-ui, sans-serif' });
        el.textContent = a.text || '';
        break;
      }
      case 'mass': {
        // Maßlinie + Längen-Label
        const g = svgEl('g', { 'data-shape-id': shape.id });
        g.appendChild(svgEl('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: '#f59e0b', 'stroke-width': 1.5, 'stroke-dasharray': '6,4' }));
        // Endmarker
        g.appendChild(svgEl('circle', { cx: a.x1, cy: a.y1, r: 3, fill: '#f59e0b' }));
        g.appendChild(svgEl('circle', { cx: a.x2, cy: a.y2, r: 3, fill: '#f59e0b' }));
        // Längen-Label (live aus massstab oder direkt aus a.label)
        const labelText = a.label || _calcLengthLabel(a.x1, a.y1, a.x2, a.y2, state.massstab);
        const mx = (a.x1 + a.x2) / 2, my = (a.y1 + a.y2) / 2;
        const lbl = svgEl('text', { x: mx, y: my - 6, fill: '#f59e0b', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif' });
        lbl.textContent = labelText;
        g.appendChild(lbl);
        el = g;
        break;
      }
    }
    if (el) {
      el.setAttribute('data-shape-id', shape.id);
      if (state.selectedId === shape.id) el.setAttribute('class', 'sk-selected');
    }
    return el;
  }

  function _calcLengthLabel(x1, y1, x2, y2, massstab) {
    const px = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (!massstab || !massstab.px_per_unit) return Math.round(px) + ' px';
    const v = px / massstab.px_per_unit;
    const unit = massstab.unit || 'm';
    const decimals = unit === 'mm' ? 0 : (unit === 'cm' ? 1 : 2);
    return v.toFixed(decimals) + ' ' + unit;
  }

  // ──────────────────────────────────────────────────────────────
  // History (Undo/Redo) — JSON-Snapshots
  // ──────────────────────────────────────────────────────────────
  function _snapshotState(state) {
    return JSON.stringify({
      shapes: state.shapes,
      fotoLayer: state.fotoLayer,
      massstab: state.massstab
    });
  }
  function _saveHistory(state) {
    state.history = state.history.slice(0, state.historyIdx + 1);
    state.history.push(_snapshotState(state));
    if (state.history.length > HISTORY_MAX) state.history.shift();
    state.historyIdx = state.history.length - 1;
  }
  function _undo(state) {
    if (state.historyIdx <= 0) return false;
    state.historyIdx--;
    const snap = JSON.parse(state.history[state.historyIdx]);
    state.shapes = snap.shapes; state.fotoLayer = snap.fotoLayer; state.massstab = snap.massstab;
    return true;
  }
  function _redo(state) {
    if (state.historyIdx >= state.history.length - 1) return false;
    state.historyIdx++;
    const snap = JSON.parse(state.history[state.historyIdx]);
    state.shapes = snap.shapes; state.fotoLayer = snap.fotoLayer; state.massstab = snap.massstab;
    return true;
  }

  // ──────────────────────────────────────────────────────────────
  // Serialize / Deserialize (SVG-String)
  // ──────────────────────────────────────────────────────────────
  function serialize(state) {
    const tmpSvg = svgEl('svg', {
      xmlns: SVG_NS,
      viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}`,
      width: CANVAS_W,
      height: CANVAS_H,
      'data-prova-skizze': '1'
    });
    // Foto-Layer
    if (state.fotoLayer && state.fotoLayer.signed_url) {
      const img = svgEl('image', {
        href: state.fotoLayer.signed_url,
        x: 0, y: 0,
        width: CANVAS_W, height: CANVAS_H,
        opacity: state.fotoLayer.opacity || 0.75,
        preserveAspectRatio: 'xMidYMid meet',
        'data-foto-id': state.fotoLayer.foto_id || ''
      });
      tmpSvg.appendChild(img);
    }
    // Shapes
    state.shapes.forEach(sh => {
      const el = renderShape(tmpSvg, sh, state);
      if (el) tmpSvg.appendChild(el);
    });
    // Metadata as comment via desc-Element
    if (state.massstab) {
      const desc = svgEl('desc', {});
      desc.textContent = 'massstab=' + JSON.stringify(state.massstab);
      tmpSvg.appendChild(desc);
    }
    return new XMLSerializer().serializeToString(tmpSvg);
  }

  function deserialize(svgString, state) {
    if (!svgString) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const root = doc.documentElement;
    state.shapes = [];
    state.fotoLayer = null;
    state.massstab = null;
    // Parse massstab from <desc>
    const desc = root.querySelector('desc');
    if (desc && desc.textContent.startsWith('massstab=')) {
      try { state.massstab = JSON.parse(desc.textContent.slice('massstab='.length)); } catch (e) {}
    }
    // Parse foto-image
    const img = root.querySelector('image');
    if (img) {
      state.fotoLayer = {
        foto_id: img.getAttribute('data-foto-id') || null,
        signed_url: img.getAttribute('href') || img.getAttribute('xlink:href'),
        opacity: parseFloat(img.getAttribute('opacity')) || 0.75
      };
    }
    // Parse shapes from data-shape-id elements (groups for pfeil/mass, single elements for rest)
    const groups = root.querySelectorAll('[data-shape-id]');
    const seen = new Set();
    groups.forEach(g => {
      const id = g.getAttribute('data-shape-id');
      if (!id || seen.has(id)) return;
      seen.add(id);
      // Restore from tag-name + attrs heuristically
      const tag = g.tagName.toLowerCase();
      let shape = null;
      if (tag === 'line') {
        shape = { id, type: 'linie', color: g.getAttribute('stroke') || '#000', strokeWidth: parseFloat(g.getAttribute('stroke-width')) || 2,
          attrs: { x1: +g.getAttribute('x1'), y1: +g.getAttribute('y1'), x2: +g.getAttribute('x2'), y2: +g.getAttribute('y2') } };
      } else if (tag === 'rect') {
        const x = +g.getAttribute('x'), y = +g.getAttribute('y'), w = +g.getAttribute('width'), h = +g.getAttribute('height');
        shape = { id, type: 'rechteck', color: g.getAttribute('stroke') || '#000', strokeWidth: parseFloat(g.getAttribute('stroke-width')) || 2,
          attrs: { x1: x, y1: y, x2: x + w, y2: y + h } };
      } else if (tag === 'ellipse') {
        const cx = +g.getAttribute('cx'), cy = +g.getAttribute('cy'), rx = +g.getAttribute('rx'), ry = +g.getAttribute('ry');
        shape = { id, type: 'kreis', color: g.getAttribute('stroke') || '#000', strokeWidth: parseFloat(g.getAttribute('stroke-width')) || 2,
          attrs: { x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry } };
      } else if (tag === 'text') {
        shape = { id, type: 'text', color: g.getAttribute('fill') || '#000', strokeWidth: 1,
          attrs: { x1: +g.getAttribute('x'), y1: +g.getAttribute('y'), text: g.textContent, fontSize: parseFloat(g.getAttribute('font-size')) || 16 } };
      } else if (tag === 'g') {
        // pfeil or mass - inspect first line child
        const innerLine = g.querySelector('line');
        if (!innerLine) return;
        const dash = innerLine.getAttribute('stroke-dasharray');
        const isMass = !!dash;
        const lbl = g.querySelector('text');
        shape = {
          id,
          type: isMass ? 'mass' : 'pfeil',
          color: innerLine.getAttribute('stroke') || '#000',
          strokeWidth: parseFloat(innerLine.getAttribute('stroke-width')) || 2,
          attrs: {
            x1: +innerLine.getAttribute('x1'), y1: +innerLine.getAttribute('y1'),
            x2: +innerLine.getAttribute('x2'), y2: +innerLine.getAttribute('y2'),
            label: lbl ? lbl.textContent : undefined
          }
        };
      }
      if (shape) state.shapes.push(shape);
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Re-Render
  // ──────────────────────────────────────────────────────────────
  function _redraw(svg, state) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Foto-Layer
    if (state.fotoLayer && state.fotoLayer.signed_url) {
      svg.appendChild(svgEl('image', {
        href: state.fotoLayer.signed_url,
        x: 0, y: 0,
        width: CANVAS_W, height: CANVAS_H,
        opacity: state.fotoLayer.opacity || 0.75,
        preserveAspectRatio: 'xMidYMid meet',
        'data-foto-id': state.fotoLayer.foto_id || ''
      }));
    }
    // Shapes
    state.shapes.forEach(sh => {
      const el = renderShape(svg, sh, state);
      if (el) svg.appendChild(el);
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Editor-Modal
  // ──────────────────────────────────────────────────────────────
  const ProvaSkizzeEditor = {

    state: null,
    _overlay: null,
    _svg: null,
    _onSaveCb: null,

    async openModal(opts = {}) {
      if (this._overlay) return;
      _injectStyle();
      this.state = createState();
      this.state.auftragId = opts.auftragId || null;
      this.state.skizzeId = opts.skizzeId || null;
      this.state.titel = opts.titel || 'Neue Skizze';
      this._onSaveCb = typeof opts.onSave === 'function' ? opts.onSave : null;

      // Modal-Markup
      const overlay = document.createElement('div');
      overlay.className = 'prova-skizze-overlay';
      overlay.innerHTML = this._modalHtml();
      document.body.appendChild(overlay);
      this._overlay = overlay;

      this._svg = overlay.querySelector('.sk-svg');
      this._svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
      this._svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      this._bindUI(overlay);

      // Initial-State laden
      if (opts.initialSvg) {
        deserialize(opts.initialSvg, this.state);
        _redraw(this._svg, this.state);
      }
      _saveHistory(this.state);
      this._updateToolBar();
    },

    close() {
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      this._overlay = null;
      this._svg = null;
      this.state = null;
      this._onSaveCb = null;
    },

    _modalHtml() {
      return `
        <div class="sk-modal" role="dialog" aria-label="Skizze-Editor">
          <header class="sk-header">
            <input type="text" class="sk-titel" value="${_esc(this.state.titel)}" placeholder="Titel der Skizze">
            <div class="sk-header-actions">
              <button type="button" class="sk-btn sk-btn-ghost" data-action="undo" aria-label="Rückgängig">↶</button>
              <button type="button" class="sk-btn sk-btn-ghost" data-action="redo" aria-label="Wiederholen">↷</button>
              <button type="button" class="sk-btn sk-btn-primary" data-action="save">Speichern</button>
              <button type="button" class="sk-btn sk-btn-ghost" data-action="close" aria-label="Schließen">✕</button>
            </div>
          </header>
          <div class="sk-body">
            <aside class="sk-tools">
              ${TOOLS.map(t => `
                <button type="button" class="sk-tool" data-tool="${t}" aria-label="${this._toolLabel(t)}" title="${this._toolLabel(t)}">
                  ${this._toolIcon(t)}
                </button>
              `).join('')}
            </aside>
            <div class="sk-canvas-wrap">
              <div class="sk-topbar">
                <span class="sk-tb-label">Farbe</span>
                ${COLORS.map(c => `<button type="button" class="sk-color" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
                <span class="sk-tb-sep"></span>
                <span class="sk-tb-label">Strich</span>
                ${STROKE_WIDTHS.map(w => `<button type="button" class="sk-stroke" data-stroke="${w}">${w}px</button>`).join('')}
                <span class="sk-tb-sep"></span>
                <span class="sk-massstab-display" id="sk-massstab-display"></span>
              </div>
              <svg class="sk-svg" xmlns="${SVG_NS}"></svg>
              <div class="sk-statusbar">
                <span id="sk-status">Bereit</span>
              </div>
            </div>
            <aside class="sk-layers">
              <h4>Ebenen</h4>
              <div class="sk-layer-row" id="sk-layer-foto" style="display:none;">
                <span>📷 Foto-Layer</span>
                <input type="range" min="0" max="100" value="75" id="sk-foto-opacity" aria-label="Foto-Transparenz">
                <button type="button" class="sk-btn-ghost-mini" id="sk-foto-remove">×</button>
              </div>
              <div class="sk-layer-row">
                <span>✏ Zeichnung</span>
                <span class="sk-shape-count" id="sk-shape-count">0 Elemente</span>
              </div>
              <button type="button" class="sk-btn-ghost sk-w-full" data-action="add-foto-layer">+ Foto-Overlay</button>
              <hr class="sk-hr">
              <h4>Maßstab</h4>
              <div class="sk-mass-info" id="sk-mass-info">Kein Maßstab gesetzt. Maß-Tool wählen → 2 Punkte klicken → Längen eingeben.</div>
              <button type="button" class="sk-btn-ghost sk-w-full" data-action="clear-mass">Maßstab zurücksetzen</button>
            </aside>
          </div>
        </div>
        <!-- Text-Eingabe-Modal -->
        <div class="sk-prompt" id="sk-prompt" hidden>
          <div class="sk-prompt-inner">
            <h3 id="sk-prompt-title">Eingabe</h3>
            <input type="text" id="sk-prompt-input" placeholder="...">
            <select id="sk-prompt-unit" hidden>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m" selected>m</option>
            </select>
            <div class="sk-prompt-actions">
              <button type="button" class="sk-btn sk-btn-ghost" id="sk-prompt-cancel">Abbrechen</button>
              <button type="button" class="sk-btn sk-btn-primary" id="sk-prompt-ok">OK</button>
            </div>
          </div>
        </div>
      `;
    },

    _toolLabel(t) {
      return ({ auswahl:'Auswahl', linie:'Linie', pfeil:'Pfeil', rechteck:'Rechteck', kreis:'Kreis/Ellipse', text:'Text', mass:'Maß', eraser:'Löschen', foto:'Foto-Overlay' })[t] || t;
    },
    _toolIcon(t) {
      return ({
        auswahl:'☝',
        linie:'╱',
        pfeil:'➤',
        rechteck:'▭',
        kreis:'◯',
        text:'A',
        mass:'📏',
        eraser:'🗑',
        foto:'📷'
      })[t] || '?';
    },

    _bindUI(root) {
      const self = this;
      // Tools
      root.querySelectorAll('.sk-tool').forEach(btn => {
        btn.addEventListener('click', () => self._setTool(btn.dataset.tool));
      });
      // Colors
      root.querySelectorAll('.sk-color').forEach(btn => {
        btn.addEventListener('click', () => { self.state.color = btn.dataset.color; self._updateToolBar(); });
      });
      // Strokes
      root.querySelectorAll('.sk-stroke').forEach(btn => {
        btn.addEventListener('click', () => { self.state.strokeWidth = +btn.dataset.stroke; self._updateToolBar(); });
      });
      // Header actions
      root.querySelector('[data-action="undo"]').addEventListener('click', () => { if (_undo(self.state)) { _redraw(self._svg, self.state); self._updateToolBar(); } });
      root.querySelector('[data-action="redo"]').addEventListener('click', () => { if (_redo(self.state)) { _redraw(self._svg, self.state); self._updateToolBar(); } });
      root.querySelector('[data-action="close"]').addEventListener('click', () => self.close());
      root.querySelector('[data-action="save"]').addEventListener('click', () => self._save());
      root.querySelector('[data-action="add-foto-layer"]').addEventListener('click', () => self._addFotoLayer());
      root.querySelector('[data-action="clear-mass"]').addEventListener('click', () => { self.state.massstab = null; _saveHistory(self.state); self._updateToolBar(); _redraw(self._svg, self.state); });
      const fotoOp = root.querySelector('#sk-foto-opacity');
      if (fotoOp) fotoOp.addEventListener('input', (e) => {
        if (self.state.fotoLayer) { self.state.fotoLayer.opacity = e.target.value / 100; _redraw(self._svg, self.state); }
      });
      const fotoRm = root.querySelector('#sk-foto-remove');
      if (fotoRm) fotoRm.addEventListener('click', () => { self.state.fotoLayer = null; _saveHistory(self.state); self._updateToolBar(); _redraw(self._svg, self.state); });

      // Pointer events
      this._svg.addEventListener('pointerdown', (e) => self._onPointerDown(e));
      this._svg.addEventListener('pointermove', (e) => self._onPointerMove(e));
      this._svg.addEventListener('pointerup',   (e) => self._onPointerUp(e));
      this._svg.addEventListener('pointercancel', (e) => self._onPointerUp(e));
      // MEGA⁶⁹-FINAL-3 8.2a — Doppelklick auf Text-Shape → Inline-Edit
      this._svg.addEventListener('dblclick', (e) => {
        const id = e.target.getAttribute && e.target.getAttribute('data-shape-id');
        if (!id) return;
        const sh = self.state.shapes.find(x => x.id === id);
        if (!sh || sh.type !== 'text') return;
        self._spawnInlineTextEditor(sh.attrs.x1, sh.attrs.y1, id);
      });

      // Keyboard
      const keyHandler = (e) => {
        if (e.key === 'Escape') self.close();
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (_undo(self.state)) { _redraw(self._svg, self.state); self._updateToolBar(); } }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (_redo(self.state)) { _redraw(self._svg, self.state); self._updateToolBar(); } }
        if (e.key === 'Delete' && self.state.selectedId) {
          self.state.shapes = self.state.shapes.filter(s => s.id !== self.state.selectedId);
          self.state.selectedId = null; _saveHistory(self.state); _redraw(self._svg, self.state); self._updateToolBar();
        }
      };
      document.addEventListener('keydown', keyHandler, true);
      this._overlay._keyHandler = keyHandler;
      const origClose = this.close.bind(this);
      this.close = function() {
        document.removeEventListener('keydown', keyHandler, true);
        origClose();
      };
    },

    _setTool(t) {
      if (!TOOLS.includes(t)) return;
      this.state.tool = t;
      this.state._massStep = 0;
      this.state._massPoints = [];
      this.state.selectedId = null;
      if (t === 'foto') return this._addFotoLayer();
      this._updateToolBar();
    },

    _updateToolBar() {
      if (!this._overlay) return;
      const s = this.state;
      this._overlay.querySelectorAll('.sk-tool').forEach(b => b.classList.toggle('is-active', b.dataset.tool === s.tool));
      this._overlay.querySelectorAll('.sk-color').forEach(b => b.classList.toggle('is-active', b.dataset.color === s.color));
      this._overlay.querySelectorAll('.sk-stroke').forEach(b => b.classList.toggle('is-active', +b.dataset.stroke === s.strokeWidth));
      const cnt = this._overlay.querySelector('#sk-shape-count');
      if (cnt) cnt.textContent = s.shapes.length + ' Element' + (s.shapes.length === 1 ? '' : 'e');
      const massDisp = this._overlay.querySelector('#sk-massstab-display');
      if (massDisp) massDisp.textContent = s.massstab ? `Maßstab: ${s.massstab.px_per_unit}px = 1${s.massstab.unit}` : '';
      const massInfo = this._overlay.querySelector('#sk-mass-info');
      if (massInfo) massInfo.textContent = s.massstab
        ? `Aktiv: ${s.massstab.px_per_unit.toFixed(1)} px = 1 ${s.massstab.unit}`
        : 'Kein Maßstab gesetzt. Maß-Tool wählen → 2 Punkte klicken → Längen eingeben.';
      const fotoRow = this._overlay.querySelector('#sk-layer-foto');
      if (fotoRow) fotoRow.style.display = s.fotoLayer ? 'flex' : 'none';
    },

    _onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // only left-click for mouse
      const s = this.state;
      const pt = _svgCoords(this._svg, e);

      // MEGA⁶⁹-FINAL-3 8.2b — Resize-Handle hit-check
      if (s.tool === 'auswahl' && s.selectedId) {
        const handle = e.target.getAttribute && e.target.getAttribute('data-resize-handle');
        if (handle) {
          s._resizeHandle = handle;
          s._resizeStartPt = pt;
          s._resizeOrigAttrs = JSON.parse(JSON.stringify((s.shapes.find(sh => sh.id === s.selectedId) || {}).attrs || {}));
          s.isDrawing = true;
          return;
        }
      }

      if (s.tool === 'auswahl') {
        const id = e.target.getAttribute && e.target.getAttribute('data-shape-id');
        s.selectedId = id || null;
        _redraw(this._svg, s);
        if (s.selectedId) this._renderResizeHandles();
        return;
      }

      if (s.tool === 'eraser') {
        const id = e.target.getAttribute && e.target.getAttribute('data-shape-id');
        if (id) {
          s.shapes = s.shapes.filter(sh => sh.id !== id);
          _saveHistory(s); _redraw(this._svg, s); this._updateToolBar();
        }
        return;
      }

      if (s.tool === 'text') {
        // MEGA⁶⁹-FINAL-3 8.2a — Inline-Text-Edit statt prompt()
        this._spawnInlineTextEditor(pt.x, pt.y, null);
        return;
      }

      if (s.tool === 'mass') {
        if (s._massStep === 0) {
          s._massPoints = [pt];
          s._massStep = 1;
          this._overlay.querySelector('#sk-status').textContent = 'Maß-Tool: Endpunkt klicken…';
        } else {
          s._massPoints.push(pt);
          this._promptMass(s._massPoints);
        }
        return;
      }

      // Drawing tools (linie, pfeil, rechteck, kreis)
      if (['linie','pfeil','rechteck','kreis'].includes(s.tool)) {
        s.isDrawing = true;
        s.activeShape = {
          id: _uid(),
          type: s.tool,
          color: s.color,
          strokeWidth: s.strokeWidth,
          attrs: { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y }
        };
        // Pressure für Pen
        if (e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
          s.activeShape.strokeWidth = s.strokeWidth * (0.5 + e.pressure * 1.5);
        }
      }
    },

    _onPointerMove(e) {
      const s = this.state;

      // MEGA⁶⁹-FINAL-3 8.2b — Resize Drag
      if (s.isDrawing && s._resizeHandle && s.selectedId) {
        const pt = _svgCoords(this._svg, e);
        const dx = pt.x - s._resizeStartPt.x;
        const dy = pt.y - s._resizeStartPt.y;
        const sh = s.shapes.find(x => x.id === s.selectedId);
        if (!sh) return;
        const orig = s._resizeOrigAttrs;
        // Handle-Map: nw/n/ne/e/se/s/sw/w
        const h = s._resizeHandle;
        const a = sh.attrs;
        if (h.includes('w')) a.x1 = orig.x1 + dx;
        if (h.includes('e')) a.x2 = orig.x2 + dx;
        if (h.includes('n')) a.y1 = orig.y1 + dy;
        if (h.includes('s')) a.y2 = orig.y2 + dy;
        _redraw(this._svg, s);
        this._renderResizeHandles();
        return;
      }

      if (!s.isDrawing || !s.activeShape) return;
      const pt = _svgCoords(this._svg, e);
      s.activeShape.attrs.x2 = pt.x;
      s.activeShape.attrs.y2 = pt.y;
      // Live-Preview: append/replace active shape
      const tmp = [...s.shapes, s.activeShape];
      while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);
      if (s.fotoLayer && s.fotoLayer.signed_url) {
        this._svg.appendChild(svgEl('image', {
          href: s.fotoLayer.signed_url, x: 0, y: 0, width: CANVAS_W, height: CANVAS_H,
          opacity: s.fotoLayer.opacity || 0.75, preserveAspectRatio: 'xMidYMid meet'
        }));
      }
      tmp.forEach(sh => { const el = renderShape(this._svg, sh, s); if (el) this._svg.appendChild(el); });
    },

    _onPointerUp(e) {
      const s = this.state;
      // MEGA⁶⁹-FINAL-3 8.2b — Resize-Drag End
      if (s.isDrawing && s._resizeHandle) {
        s.isDrawing = false;
        s._resizeHandle = null;
        s._resizeStartPt = null;
        s._resizeOrigAttrs = null;
        _saveHistory(s);
        _redraw(this._svg, s);
        this._renderResizeHandles();
        return;
      }
      if (!s.isDrawing || !s.activeShape) return;
      const pt = _svgCoords(this._svg, e);
      s.activeShape.attrs.x2 = pt.x;
      s.activeShape.attrs.y2 = pt.y;
      // Discard near-zero-size shapes
      const dx = Math.abs(pt.x - s.activeShape.attrs.x1);
      const dy = Math.abs(pt.y - s.activeShape.attrs.y1);
      if (dx > 2 || dy > 2) {
        s.shapes.push(s.activeShape);
        _saveHistory(s);
      }
      s.isDrawing = false;
      s.activeShape = null;
      _redraw(this._svg, s);
      this._updateToolBar();
    },

    // ─── MEGA⁶⁹-FINAL-3 8.2b — Resize-Handles für Auswahl ───
    _renderResizeHandles() {
      const s = this.state;
      // Remove existing handles
      this._svg.querySelectorAll('.sk-resize-handle').forEach(el => el.remove());
      if (!s.selectedId) return;
      const sh = s.shapes.find(x => x.id === s.selectedId);
      if (!sh) return;
      const a = sh.attrs;
      // Bounding-Box berechnen
      const x = Math.min(a.x1, a.x2 || a.x1);
      const y = Math.min(a.y1, a.y2 || a.y1);
      const w = Math.abs((a.x2 || a.x1) - a.x1);
      const h = Math.abs((a.y2 || a.y1) - a.y1);
      const handles = [
        { id: 'nw', x: x,       y: y       },
        { id: 'n',  x: x + w/2, y: y       },
        { id: 'ne', x: x + w,   y: y       },
        { id: 'e',  x: x + w,   y: y + h/2 },
        { id: 'se', x: x + w,   y: y + h   },
        { id: 's',  x: x + w/2, y: y + h   },
        { id: 'sw', x: x,       y: y + h   },
        { id: 'w',  x: x,       y: y + h/2 }
      ];
      handles.forEach(hd => {
        const r = svgEl('rect', {
          class: 'sk-resize-handle', 'data-resize-handle': hd.id,
          x: hd.x - 5, y: hd.y - 5, width: 10, height: 10,
          fill: '#4f8ef7', stroke: '#fff', 'stroke-width': 1.5,
          style: 'cursor:' + (hd.id.length === 2 ? (hd.id === 'nw' || hd.id === 'se' ? 'nwse-resize' : 'nesw-resize') : (hd.id === 'n' || hd.id === 's' ? 'ns-resize' : 'ew-resize')) + ';'
        });
        this._svg.appendChild(r);
      });
    },

    // ─── MEGA⁶⁹-FINAL-3 8.2a — Inline-Text-Editor via foreignObject ───
    _spawnInlineTextEditor(x, y, existingShapeId) {
      const s = this.state;
      const fo = svgEl('foreignObject', { x: x, y: y - 12, width: 320, height: 40 });
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.style.cssText = 'font:14px/1.4 system-ui,sans-serif;color:' + (s.color || '#000') + ';background:rgba(255,255,255,0.9);border:1px dashed ' + s.color + ';padding:2px 6px;border-radius:4px;outline:none;min-width:80px;display:inline-block;';
      const existing = existingShapeId ? s.shapes.find(sh => sh.id === existingShapeId) : null;
      div.textContent = existing ? (existing.attrs.text || '') : '';
      fo.appendChild(div);
      this._svg.appendChild(fo);
      setTimeout(() => { div.focus(); document.execCommand && document.execCommand('selectAll', false, null); }, 50);
      const finish = (commit) => {
        if (!fo.parentNode) return;
        const text = (div.textContent || '').trim();
        fo.remove();
        if (!commit) return;
        if (existing) {
          existing.attrs.text = text;
          if (!text) s.shapes = s.shapes.filter(sh => sh.id !== existing.id);
        } else if (text) {
          s.shapes.push({ id: _uid(), type: 'text', color: s.color, strokeWidth: 1, attrs: { x1: x, y1: y, text, fontSize: 16 } });
        }
        _saveHistory(s);
        _redraw(this._svg, s);
        this._updateToolBar();
      };
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      div.addEventListener('blur', () => setTimeout(() => finish(true), 100));
    },

    _promptMass(points) {
      const s = this.state;
      const promptEl = this._overlay.querySelector('#sk-prompt');
      const inp = this._overlay.querySelector('#sk-prompt-input');
      const unit = this._overlay.querySelector('#sk-prompt-unit');
      this._overlay.querySelector('#sk-prompt-title').textContent = 'Wie lang ist diese Strecke?';
      inp.placeholder = 'z.B. 5';
      inp.value = '';
      inp.type = 'number';
      inp.step = '0.01';
      unit.hidden = false;
      promptEl.hidden = false;
      const okBtn = this._overlay.querySelector('#sk-prompt-ok');
      const caBtn = this._overlay.querySelector('#sk-prompt-cancel');
      const close = () => {
        promptEl.hidden = true;
        s._massStep = 0; s._massPoints = [];
        this._overlay.querySelector('#sk-status').textContent = 'Bereit';
      };
      const apply = () => {
        const v = parseFloat(inp.value);
        if (!v || v <= 0) { alert('Bitte gültige Zahl > 0 eingeben.'); return; }
        const u = unit.value;
        const px = Math.sqrt((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2);
        if (!s.massstab) {
          // Erste Maßstabs-Definition
          s.massstab = {
            px_per_unit: px / v,
            unit: u,
            reference_line: { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y }
          };
          this._overlay.querySelector('#sk-status').textContent = `Maßstab gesetzt: ${(px/v).toFixed(1)} px = 1 ${u}`;
        }
        // Maß-Shape (Markierung im SVG)
        const sh = {
          id: _uid(),
          type: 'mass',
          color: '#f59e0b',
          strokeWidth: 1.5,
          attrs: { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y, label: `${v.toFixed(2)} ${u}` }
        };
        s.shapes.push(sh);
        _saveHistory(s);
        _redraw(this._svg, s);
        this._updateToolBar();
        close();
      };
      okBtn.onclick = apply;
      caBtn.onclick = close;
      setTimeout(() => inp.focus(), 50);
    },

    async _addFotoLayer() {
      if (!this.state.auftragId) { alert('Auftrag-Kontext fehlt — Foto-Overlay benötigt auftragId.'); return; }
      if (!window.ProvaFotoPicker) { alert('Foto-Picker nicht verfügbar (prova-foto-picker.js fehlt).'); return; }
      const self = this;
      window.ProvaFotoPicker.open({
        auftragId: this.state.auftragId,
        // DSGVO: nur exif-strippe Fotos
        filter: { exif_stripped: true },
        onSelect: (foto) => {
          if (!foto || !foto.signed_url) return;
          self.state.fotoLayer = {
            foto_id: foto.id,
            storage_path: foto.storage_path,
            signed_url: foto.signed_url,
            opacity: 0.75
          };
          _saveHistory(self.state);
          self._updateToolBar();
          _redraw(self._svg, self.state);
        }
      });
    },

    async _save() {
      const s = this.state;
      const svg = serialize(s);
      const titelInput = this._overlay.querySelector('.sk-titel');
      const titel = titelInput ? titelInput.value.trim() : s.titel;
      const body = {
        titel: titel || 'Skizze',
        svg_content: svg,
        foto_referenz_id: s.fotoLayer ? s.fotoLayer.foto_id : null,
        massstab: s.massstab ? JSON.stringify(s.massstab) : null,
        auftrag_id: s.auftragId,
        skizze_id: s.skizzeId || null,  // existing → update
        pseudonymisiert: true  // DSGVO: SVG enthält keine Klardaten (Marker/Text vom SV manuell, keine Auto-PII)
      };
      const statusEl = this._overlay.querySelector('#sk-status');
      if (statusEl) statusEl.textContent = 'Speichere…';
      try {
        const sb = await this._getSb();
        const { data: { session } } = await sb.auth.getSession();
        const tok = session && session.access_token;
        const url = window.PROVA_CONFIG.SUPABASE_URL;
        const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
        const resp = await fetch(`${url}/functions/v1/skizzen-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        const skizzeId = data.skizze_id || data.id;
        s.skizzeId = skizzeId;
        // Audit + Asset-Event
        try {
          if (window.ProvaAssetEventBus && typeof window.ProvaAssetEventBus.emit === 'function') {
            window.ProvaAssetEventBus.emit('skizze', skizzeId, s.auftragId);
          }
        } catch (_) {}
        if (this._onSaveCb) {
          this._onSaveCb({ skizzeId, svg, titel, massstab: s.massstab, fotoRefId: body.foto_referenz_id });
        }
        if (statusEl) statusEl.textContent = '✓ Gespeichert';
        setTimeout(() => this.close(), 600);
      } catch (e) {
        if (statusEl) statusEl.textContent = '⚠ Fehler: ' + e.message;
      }
    },

    async _getSb() {
      if (this._sb) return this._sb;
      const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
      this._sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
      return this._sb;
    }
  };

  global.ProvaSkizzeEditor = ProvaSkizzeEditor;
})(typeof window !== 'undefined' ? window : globalThis);
