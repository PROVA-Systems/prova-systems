/**
 * PROVA Bubble-Menu (MEGA⁶⁴ Item 2.3)
 *
 * Floating Bubble-Menu über Text-Selection — Craft-Stil.
 * Nutzt @tiptap/extension-bubble-menu + @floating-ui/dom aus dem Bundle.
 *
 * Public API:
 *   new ProvaBubbleMenu(editor, { container?, onLinkPrompt? })
 *     → instance mit destroy()
 *
 * Anti-Pattern: KEIN React. Vanilla-DOM, TipTap-Events.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-bubble-menu-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-bubble-menu-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-bubble-menu.css';
    document.head.appendChild(link);
  }

  const ICONS = {
    bold:      '<strong>B</strong>',
    italic:    '<em>I</em>',
    underline: '<u>U</u>',
    strike:    '<s>S</s>',
    link:      '↩',
    list:      '•',
    ordered:   '1.',
    style:     '¶ ▾'
  };

  class ProvaBubbleMenu {
    constructor(editor, opts = {}) {
      this.editor = editor;
      this.opts = opts;
      this.container = null;
      this._buttons = [];
      this._focusedIdx = 0;

      _injectStyle();
      this._buildContainer();
      this._registerEvents();
    }

    _buildContainer() {
      const el = document.createElement('div');
      el.className = 'prova-bubble-menu';
      el.setAttribute('role', 'toolbar');
      el.setAttribute('aria-label', 'Text-Formatierung');
      el.style.display = 'none';
      this.container = el;

      const items = [
        { key: 'bold',      action: () => this.editor.chain().focus().toggleBold().run(),         active: () => this.editor.isActive('bold'),         label: 'Fett (⌘B)' },
        { key: 'italic',    action: () => this.editor.chain().focus().toggleItalic().run(),       active: () => this.editor.isActive('italic'),       label: 'Kursiv (⌘I)' },
        { key: 'underline', action: () => this.editor.chain().focus().toggleUnderline().run(),    active: () => this.editor.isActive('underline'),    label: 'Unterstrichen (⌘U)' },
        { key: 'strike',    action: () => this.editor.chain().focus().toggleStrike().run(),       active: () => this.editor.isActive('strike'),       label: 'Durchgestrichen' },
        { key: 'link',      action: () => this._toggleLink(),                                     active: () => this.editor.isActive('link'),         label: 'Link' },
        { key: 'list',      action: () => this.editor.chain().focus().toggleBulletList().run(),   active: () => this.editor.isActive('bulletList'),   label: 'Aufzählung' },
        { key: 'ordered',   action: () => this.editor.chain().focus().toggleOrderedList().run(),  active: () => this.editor.isActive('orderedList'),  label: 'Nummeriert' },
        { key: 'style',     action: () => this._cycleHeading(),                                   active: () => this.editor.isActive('heading'),      label: 'Stil ändern' }
      ];

      items.forEach((it, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prova-bubble-btn';
        btn.dataset.key = it.key;
        btn.setAttribute('aria-label', it.label);
        btn.title = it.label;
        btn.innerHTML = ICONS[it.key] || it.key;
        btn.tabIndex = idx === 0 ? 0 : -1;
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          it.action();
          this._updateActiveStates();
        });
        btn._action = it.action;
        btn._isActive = it.active;
        this._buttons.push(btn);
        el.appendChild(btn);
      });

      (this.opts.container || document.body).appendChild(el);
    }

    _toggleLink() {
      if (this.editor.isActive('link')) {
        this.editor.chain().focus().unsetLink().run();
        return;
      }
      const url = typeof this.opts.onLinkPrompt === 'function'
        ? this.opts.onLinkPrompt()
        : window.prompt('Link-URL:');
      if (url) this.editor.chain().focus().setLink({ href: url }).run();
    }

    _cycleHeading() {
      // Cycle: paragraph -> h1 -> h2 -> h3 -> paragraph
      const ed = this.editor;
      if (ed.isActive('heading', { level: 1 })) ed.chain().focus().toggleHeading({ level: 2 }).run();
      else if (ed.isActive('heading', { level: 2 })) ed.chain().focus().toggleHeading({ level: 3 }).run();
      else if (ed.isActive('heading', { level: 3 })) ed.chain().focus().setParagraph().run();
      else ed.chain().focus().toggleHeading({ level: 1 }).run();
    }

    _registerEvents() {
      const ed = this.editor;
      this._onSelectionUpdate = () => {
        const { from, to } = ed.state.selection;
        if (from === to) return this._hide();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return this._hide();
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return this._hide();
        this._showAt(rect);
        this._updateActiveStates();
      };
      ed.on('selectionUpdate', this._onSelectionUpdate);
      ed.on('blur', () => setTimeout(() => {
        if (!this.container.contains(document.activeElement)) this._hide();
      }, 50));

      this._onKey = (e) => {
        if (this.container.style.display === 'none') return;
        if (e.key === 'Escape') {
          this._hide();
          ed.commands.focus();
        } else if (e.key === 'ArrowRight' && this.container.contains(document.activeElement)) {
          e.preventDefault();
          this._focusNext(1);
        } else if (e.key === 'ArrowLeft' && this.container.contains(document.activeElement)) {
          e.preventDefault();
          this._focusNext(-1);
        }
      };
      document.addEventListener('keydown', this._onKey, true);
    }

    _focusNext(dir) {
      this._focusedIdx = (this._focusedIdx + dir + this._buttons.length) % this._buttons.length;
      this._buttons.forEach((b, i) => b.tabIndex = i === this._focusedIdx ? 0 : -1);
      this._buttons[this._focusedIdx].focus();
    }

    _showAt(rect) {
      const c = this.container;
      c.style.display = 'flex';
      // Floating-UI nutzen, falls vorhanden
      const FU = window.TipTapBundle;
      if (FU?.computePosition) {
        const reference = {
          getBoundingClientRect: () => rect,
          contextElement: this.editor.options.element
        };
        FU.computePosition(reference, c, {
          placement: 'top',
          middleware: [FU.offset(8), FU.flip(), FU.shift({ padding: 8 })]
        }).then(({ x, y }) => {
          c.style.left = `${x}px`;
          c.style.top = `${y + window.scrollY}px`;
        });
      } else {
        // Fallback
        c.style.left = `${rect.left + window.scrollX}px`;
        c.style.top = `${rect.top + window.scrollY - c.offsetHeight - 8}px`;
      }
    }

    _hide() {
      this.container.style.display = 'none';
    }

    _updateActiveStates() {
      this._buttons.forEach(btn => {
        btn.classList.toggle('is-active', !!btn._isActive?.());
      });
    }

    destroy() {
      this.editor.off('selectionUpdate', this._onSelectionUpdate);
      document.removeEventListener('keydown', this._onKey, true);
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  global.ProvaBubbleMenu = ProvaBubbleMenu;
})(typeof window !== 'undefined' ? window : globalThis);
