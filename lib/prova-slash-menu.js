/**
 * PROVA Slash-Menu (MEGA⁶⁴ Item 2.5)
 *
 * 12 Grund-Items in 3 Gruppen (Struktur / Inhalt / Prüf-Marker).
 * Fuzzy-Match via .includes(), Vanilla-DOM (KEIN React).
 *
 * Public API:
 *   new ProvaSlashMenu(editor, { onFotoPick? })
 *     → instance mit destroy()
 *
 * Activation: '/' am Zeilenanfang öffnet das Menü.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-slash-menu-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-slash-menu-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-slash-menu.css';
    document.head.appendChild(link);
  }

  // 12 Items in 3 Gruppen
  function buildItems(editor, opts) {
    return [
      // Gruppe A — Struktur
      { id: 'h1',      group: 'Struktur',    title: 'Überschrift 1', hint: 'H1 großes Kapitel', icon: 'H1',  keywords: ['h1','heading','ueberschrift'], cmd: () => editor.chain().focus().setNode('heading', { level: 1 }).run() },
      { id: 'h2',      group: 'Struktur',    title: 'Überschrift 2', hint: 'H2 Abschnitt',     icon: 'H2',  keywords: ['h2','heading'],                cmd: () => editor.chain().focus().setNode('heading', { level: 2 }).run() },
      { id: 'h3',      group: 'Struktur',    title: 'Überschrift 3', hint: 'H3 Unter-Abschnitt', icon: 'H3', keywords: ['h3','heading'],              cmd: () => editor.chain().focus().setNode('heading', { level: 3 }).run() },
      { id: 'divider', group: 'Struktur',    title: 'Trennlinie',    hint: '──────',          icon: '—',   keywords: ['divider','hr','trennlinie','linie'], cmd: () => editor.chain().focus().setHorizontalRule().run() },
      // Gruppe B — Inhalt
      { id: 'liste',   group: 'Inhalt',      title: 'Aufzählung',    hint: 'Bullet-List',     icon: '•',  keywords: ['liste','bullet','aufzaehlung'], cmd: () => editor.chain().focus().toggleBulletList().run() },
      { id: 'nummer',  group: 'Inhalt',      title: 'Nummerierung',  hint: '1. 2. 3.',        icon: '1.', keywords: ['nummer','ordered','number'],    cmd: () => editor.chain().focus().toggleOrderedList().run() },
      { id: 'zitat',   group: 'Inhalt',      title: 'Zitat',         hint: 'Blockquote',      icon: '”',  keywords: ['zitat','quote','blockquote'],   cmd: () => editor.chain().focus().toggleBlockquote().run() },
      { id: 'tabelle', group: 'Inhalt',      title: 'Tabelle 3×3',   hint: 'Mit Header',      icon: '⊞',  keywords: ['tabelle','table'],              cmd: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { id: 'foto',    group: 'Inhalt',      title: 'Foto einfügen', hint: 'Aus Auftrag',     icon: '📷', keywords: ['foto','bild','image','photo'],  cmd: () => (typeof opts.onFotoPick === 'function' ? opts.onFotoPick(editor) : null) },
      { id: 'skizze',  group: 'Inhalt',      title: 'Skizze einfügen', hint: 'SVG-Editor',    icon: '✏',  keywords: ['skizze','sketch','zeichnen','svg'], cmd: () => {
        if (typeof opts.onSkizzeCreate === 'function') return opts.onSkizzeCreate(editor);
        // Fallback: dispatch prova:skizze-create — global Listener in prova-skizze-embed.js öffnet Editor
        const aid = opts.auftragId || (window.location.search.match(/[?&](az|auftrag_id|auftrag)=([^&]+)/) || [])[2] || null;
        document.dispatchEvent(new CustomEvent('prova:skizze-create', { detail: { auftragId: aid ? decodeURIComponent(aid) : null, editor } }));
      } },
      // Gruppe C — Prüf-Marker
      { id: 'mangel',  group: 'Prüf-Marker', title: 'Mangel-Callout',  hint: 'Rot',            icon: '⚠',  keywords: ['mangel','error','rot'],         cmd: () => editor.commands.setCallout?.({ severity: 'error' }) },
      { id: 'klaeren', group: 'Prüf-Marker', title: 'Klären-Callout',  hint: 'Gelb',           icon: '⚠',  keywords: ['klaeren','warning','gelb'],     cmd: () => editor.commands.setCallout?.({ severity: 'warning' }) },
      { id: 'ok',      group: 'Prüf-Marker', title: 'OK-Callout',      hint: 'Grün',           icon: '✓',  keywords: ['ok','passt','gruen'],           cmd: () => editor.commands.setCallout?.({ severity: 'ok' }) }
    ];
  }

  class ProvaSlashMenu {
    constructor(editor, opts = {}) {
      this.editor = editor;
      this.opts = opts;
      this.allItems = buildItems(editor, opts);
      this.container = null;
      this.filtered = [];
      this.selectedIdx = 0;
      this.query = '';
      this.isOpen = false;

      _injectStyle();
      this._buildContainer();
      this._registerEvents();
    }

    _buildContainer() {
      const el = document.createElement('div');
      el.className = 'prova-slash-menu';
      el.setAttribute('role', 'menu');
      el.setAttribute('aria-label', 'Block einfügen');
      el.style.display = 'none';
      document.body.appendChild(el);
      this.container = el;
    }

    _registerEvents() {
      const ed = this.editor;
      this._onUpdate = () => {
        const { from } = ed.state.selection;
        const $pos = ed.state.doc.resolve(from);
        const node = $pos.parent;
        if (!node) return;
        const text = node.textContent || '';
        // Slash am Anfang → öffnen + Query
        if (text.startsWith('/')) {
          this.query = text.slice(1).toLowerCase();
          this._open();
          this._filter();
        } else {
          this._close();
        }
      };
      ed.on('selectionUpdate', this._onUpdate);
      ed.on('update', this._onUpdate);
      ed.on('blur', () => setTimeout(() => this._close(), 150));

      this._onKey = (e) => {
        if (!this.isOpen) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._navigate(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._navigate(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this._activate();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this._close();
        }
      };
      document.addEventListener('keydown', this._onKey, true);
    }

    _filter() {
      const q = this.query;
      this.filtered = q.length === 0
        ? this.allItems
        : this.allItems.filter(it => {
            if (it.id.includes(q)) return true;
            if (it.title.toLowerCase().includes(q)) return true;
            if (it.keywords.some(k => k.includes(q))) return true;
            return false;
          });
      this.selectedIdx = 0;
      this._render();
    }

    _render() {
      const el = this.container;
      el.innerHTML = '';
      if (this.filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'prova-slash-empty';
        empty.textContent = 'Keine Treffer';
        el.appendChild(empty);
        return;
      }
      let lastGroup = null;
      this.filtered.forEach((it, idx) => {
        if (it.group !== lastGroup) {
          const h = document.createElement('div');
          h.className = 'prova-slash-group';
          h.textContent = it.group;
          el.appendChild(h);
          lastGroup = it.group;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prova-slash-item' + (idx === this.selectedIdx ? ' is-selected' : '');
        btn.dataset.idx = String(idx);
        btn.setAttribute('role', 'menuitem');
        btn.innerHTML = `
          <span class="prova-slash-icon" aria-hidden="true">${it.icon}</span>
          <span class="prova-slash-body">
            <span class="prova-slash-title">${it.title}</span>
            <span class="prova-slash-hint">${it.hint}</span>
          </span>
        `;
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('mouseenter', () => {
          this.selectedIdx = idx;
          this._updateSelection();
        });
        btn.addEventListener('click', () => this._activate());
        el.appendChild(btn);
      });
    }

    _navigate(dir) {
      if (this.filtered.length === 0) return;
      this.selectedIdx = (this.selectedIdx + dir + this.filtered.length) % this.filtered.length;
      this._updateSelection();
      const sel = this.container.querySelector('.prova-slash-item.is-selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    _updateSelection() {
      this.container.querySelectorAll('.prova-slash-item').forEach((b, i) => {
        b.classList.toggle('is-selected', i === this.selectedIdx);
      });
    }

    _activate() {
      const item = this.filtered[this.selectedIdx];
      if (!item) return;
      // Slash + Query aus aktueller Zeile entfernen, dann Command ausführen
      const ed = this.editor;
      const { from } = ed.state.selection;
      const $pos = ed.state.doc.resolve(from);
      const start = $pos.start();
      const lineEnd = start + $pos.parent.textContent.length;
      ed.chain().focus().setTextSelection({ from: start, to: lineEnd }).deleteSelection().run();
      try { item.cmd?.(); } catch (e) { console.warn('[prova-slash] cmd failed:', e); }
      this._close();
    }

    _open() {
      if (this.isOpen) {
        this._position();
        return;
      }
      this.isOpen = true;
      this.container.style.display = 'block';
      this._position();
    }

    _close() {
      this.isOpen = false;
      this.container.style.display = 'none';
      this.query = '';
    }

    _position() {
      try {
        const ed = this.editor;
        const { from } = ed.state.selection;
        const coords = ed.view.coordsAtPos(from);
        const c = this.container;
        c.style.left = `${coords.left + window.scrollX}px`;
        c.style.top = `${coords.bottom + window.scrollY + 6}px`;
      } catch (e) { /* noop */ }
    }

    destroy() {
      this.editor.off('selectionUpdate', this._onUpdate);
      this.editor.off('update', this._onUpdate);
      document.removeEventListener('keydown', this._onKey, true);
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  global.ProvaSlashMenu = ProvaSlashMenu;
})(typeof window !== 'undefined' ? window : globalThis);
