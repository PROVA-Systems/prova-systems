/**
 * PROVA Floating-Menu (MEGA⁶⁴ Item 2.4)
 *
 * +-Button links neben leeren Zeilen — Notion-Stil.
 * Klick öffnet Slash-Menu (Item 2.5).
 *
 * Public API:
 *   new ProvaFloatingMenu(editor, { onTrigger? })
 *     → instance mit destroy()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-floating-menu-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-floating-menu-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-floating-menu.css';
    document.head.appendChild(link);
  }

  class ProvaFloatingMenu {
    constructor(editor, opts = {}) {
      this.editor = editor;
      this.opts = opts;
      this.container = null;

      _injectStyle();
      this._buildButton();
      this._registerEvents();
    }

    _buildButton() {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prova-floating-btn';
      btn.setAttribute('aria-label', 'Block einfügen');
      btn.title = 'Block einfügen (/)';
      btn.innerHTML = '+';
      btn.style.display = 'none';
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._trigger();
      });
      document.body.appendChild(btn);
      this.container = btn;
    }

    _trigger() {
      if (typeof this.opts.onTrigger === 'function') {
        this.opts.onTrigger(this.editor);
        return;
      }
      // Default: focus + insert "/" to trigger Slash-Menu
      this.editor.commands.focus();
      this.editor.commands.insertContent('/');
    }

    _registerEvents() {
      const ed = this.editor;
      this._onSelectionUpdate = () => {
        const { from, to } = ed.state.selection;
        if (from !== to) return this._hide();
        // Check if current line is empty paragraph
        const $pos = ed.state.doc.resolve(from);
        const node = $pos.parent;
        if (node?.type?.name !== 'paragraph') return this._hide();
        if (node.textContent.length > 0) return this._hide();
        this._showAtCursor();
      };
      ed.on('selectionUpdate', this._onSelectionUpdate);
      ed.on('update', this._onSelectionUpdate);
      ed.on('blur', () => setTimeout(() => this._hide(), 150));
    }

    _showAtCursor() {
      try {
        const ed = this.editor;
        const { from } = ed.state.selection;
        const coords = ed.view.coordsAtPos(from);
        const editorRect = ed.options.element.getBoundingClientRect();
        const c = this.container;
        c.style.display = 'flex';
        // Position: links vom Editor + auf Höhe des Cursors
        const left = editorRect.left - c.offsetWidth - 8 + window.scrollX;
        const top = coords.top + window.scrollY;
        c.style.left = `${Math.max(8, left)}px`;
        c.style.top = `${top}px`;
      } catch (e) {
        this._hide();
      }
    }

    _hide() {
      this.container.style.display = 'none';
    }

    destroy() {
      this.editor.off('selectionUpdate', this._onSelectionUpdate);
      this.editor.off('update', this._onSelectionUpdate);
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  global.ProvaFloatingMenu = ProvaFloatingMenu;
})(typeof window !== 'undefined' ? window : globalThis);
