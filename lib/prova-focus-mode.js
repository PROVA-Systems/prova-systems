/**
 * PROVA Focus-Mode (MEGA⁶⁴ Item 2.6)
 *
 * 3 Stufen zyklisch via Cmd+Shift+F (Mac) bzw Ctrl+Shift+F (Win/Linux):
 *   0 off → 1 sentence → 2 paragraph → 3 typewriter → 0 off
 *
 * Plattform-Awareness via ProvaPlatform (lib/prova-platform.js).
 */
'use strict';

(function (global) {

  const STAGES = ['off', 'sentence', 'paragraph', 'typewriter'];

  function _injectStyle() {
    if (document.getElementById('prova-focus-mode-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-focus-mode-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-focus-mode.css';
    document.head.appendChild(link);
  }

  class ProvaFocusMode {
    constructor(editor, opts = {}) {
      this.editor = editor;
      this.opts = opts;
      this.stageIdx = 0;
      this.editorEl = editor.options.element;

      _injectStyle();
      this._registerEvents();
      this._apply();
    }

    cycle() {
      this.stageIdx = (this.stageIdx + 1) % STAGES.length;
      this._apply();
      this._announce();
    }

    setStage(stage) {
      const idx = STAGES.indexOf(stage);
      if (idx === -1) return;
      this.stageIdx = idx;
      this._apply();
    }

    getStage() {
      return STAGES[this.stageIdx];
    }

    _apply() {
      const root = this.editorEl;
      if (!root) return;
      STAGES.forEach(s => root.classList.remove('prova-focus--' + s));
      root.classList.add('prova-focus--' + STAGES[this.stageIdx]);
      // Typewriter-Modus: Cursor in Bildschirm-Mitte via JS-Scroll
      if (STAGES[this.stageIdx] === 'typewriter') {
        this._typewriterScroll();
      }
    }

    _typewriterScroll() {
      try {
        const ed = this.editor;
        const { from } = ed.state.selection;
        const coords = ed.view.coordsAtPos(from);
        const viewportH = window.innerHeight;
        const target = viewportH / 2;
        const delta = coords.top - target;
        if (Math.abs(delta) > 4) {
          window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      } catch (e) { /* noop */ }
    }

    _announce() {
      const stage = STAGES[this.stageIdx];
      const live = document.getElementById('prova-focus-live') || (() => {
        const el = document.createElement('div');
        el.id = 'prova-focus-live';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        return el;
      })();
      live.textContent = `Fokus-Modus: ${stage}`;
    }

    _registerEvents() {
      this._onKey = (e) => {
        const isMod = window.ProvaPlatform
          ? window.ProvaPlatform.isModPressed(e)
          : (e.metaKey || e.ctrlKey);
        if (isMod && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
          e.preventDefault();
          this.cycle();
        }
      };
      document.addEventListener('keydown', this._onKey, true);

      // Typewriter-Live-Scroll bei jedem Selection-Update
      this._onSel = () => {
        if (STAGES[this.stageIdx] === 'typewriter') this._typewriterScroll();
      };
      this.editor.on('selectionUpdate', this._onSel);
    }

    destroy() {
      document.removeEventListener('keydown', this._onKey, true);
      this.editor.off('selectionUpdate', this._onSel);
      STAGES.forEach(s => this.editorEl?.classList.remove('prova-focus--' + s));
    }
  }

  global.ProvaFocusMode = ProvaFocusMode;
})(typeof window !== 'undefined' ? window : globalThis);
