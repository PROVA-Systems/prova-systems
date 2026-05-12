/**
 * PROVA Command-Palette (MEGA⁶⁵ Item 3.2)
 *
 * Linear-Style Cmd+K für Actions (NICHT Content — das macht das Slash-Menu).
 *
 * ABGRENZUNG zu existing lib/cmd-k-modal.js:
 *   cmd-k-modal.js = globaler Cross-Type-Search (Akten/Kontakte/Termine/...)
 *   prova-command-palette.js = editor-Context-aware Actions (KI/Editor/Export/...)
 *
 * Aktivierung: nur wenn ?editor=mega65 Flag UND ProvaEditor aktiv ist.
 * Sonst übernimmt cmd-k-modal.js den Cmd+K-Shortcut.
 *
 * Public API:
 *   new ProvaCommandPalette({ editor, getContext, commands })
 *   palette.show() / hide() / toggle()
 *   palette.register(cmds[])
 *   palette.search(query) → filtered array
 *
 * Recent-Tracking: localStorage.prova_cmdpalette_recent (max 20 IDs)
 */
'use strict';

(function (global) {

  const RECENT_KEY = 'prova_cmdpalette_recent';
  const MAX_RECENT = 20;
  const STYLE_ID = 'prova-command-palette-style';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/lib/prova-command-palette.css';
    document.head.appendChild(link);
  }

  function _loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function _saveRecent(ids) {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
    } catch (_) { /* noop */ }
  }

  function _trackUsage(id) {
    const recent = _loadRecent();
    const filtered = recent.filter(x => x !== id);
    filtered.unshift(id);
    _saveRecent(filtered);
  }

  class ProvaCommandPalette {
    constructor(opts = {}) {
      this.editor = opts.editor || null;
      this.getContext = opts.getContext || (() => ({}));
      this.commands = Array.isArray(opts.commands) ? opts.commands.slice() : [];
      this.isOpen = false;
      this.query = '';
      this.filtered = [];
      this.selectedIdx = 0;

      _injectStyle();
      this._buildContainer();
      this._registerEvents();
    }

    register(cmds) {
      const arr = Array.isArray(cmds) ? cmds : [cmds];
      arr.forEach(c => {
        if (!c?.id) return;
        const existingIdx = this.commands.findIndex(x => x.id === c.id);
        if (existingIdx >= 0) this.commands[existingIdx] = c;
        else this.commands.push(c);
      });
    }

    show() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.query = '';
      this.overlay.style.display = 'flex';
      this.input.value = '';
      this._search('');
      // Async focus to bypass modal-animation
      requestAnimationFrame(() => this.input.focus());
    }

    hide() {
      this.isOpen = false;
      this.overlay.style.display = 'none';
    }

    toggle() {
      if (this.isOpen) this.hide();
      else this.show();
    }

    search(query) {
      this.query = String(query || '').trim();
      this._search(this.query);
      return this.filtered;
    }

    _buildContainer() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'prova-cmdpalette-overlay';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-label', 'Befehls-Palette');
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = `
        <div class="prova-cmdpalette-modal">
          <input type="text" class="prova-cmdpalette-input" placeholder="Was möchtest du tun? · Tipp: ⇧ Use / for blocks" aria-label="Befehl suchen">
          <div class="prova-cmdpalette-list" role="listbox"></div>
          <div class="prova-cmdpalette-footer">
            <span><kbd>↑↓</kbd> Navigieren</span>
            <span><kbd>↩</kbd> Auswählen</span>
            <span><kbd>esc</kbd> Schließen</span>
          </div>
        </div>
      `;
      document.body.appendChild(this.overlay);
      this.input = this.overlay.querySelector('.prova-cmdpalette-input');
      this.list = this.overlay.querySelector('.prova-cmdpalette-list');

      this.input.addEventListener('input', (e) => {
        this.query = e.target.value;
        this._search(this.query);
      });

      this.overlay.addEventListener('mousedown', (e) => {
        if (e.target === this.overlay) this.hide();
      });
    }

    _registerEvents() {
      this._onKey = (e) => {
        const isMod = window.ProvaPlatform
          ? window.ProvaPlatform.isModPressed(e)
          : (e.metaKey || e.ctrlKey);

        // Cmd+K / Ctrl+K → toggle (im Editor-Kontext)
        if (isMod && (e.key === 'k' || e.key === 'K')) {
          // Nur abfangen wenn Editor-Kontext (Marker auf body) aktiv
          if (document.body.dataset.provaEditorMega65 === '1') {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
          }
        }

        if (!this.isOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.hide();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._navigate(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._navigate(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this._activate();
        }
      };
      document.addEventListener('keydown', this._onKey, true);
    }

    _search(query) {
      const cs = (window.TipTapBundle && window.TipTapBundle.commandScore) || null;
      const recent = _loadRecent();
      const ctx = this.getContext();
      const sectionHint = ctx?.section || null;
      const q = query.trim().toLowerCase();

      const scored = this.commands.map(cmd => {
        if (cmd.hidden && !q) return null;
        const hay = [
          cmd.title || '',
          cmd.subtitle || '',
          ...(cmd.aliases || []),
          cmd.category || ''
        ].join(' ');
        let score;
        if (q.length === 0) {
          score = 1;
        } else if (cs) {
          score = cs(hay, q);
        } else {
          score = hay.toLowerCase().includes(q) ? 0.6 : 0;
        }
        if (score === 0) return null;
        // Boost
        const recentIdx = recent.indexOf(cmd.id);
        if (recentIdx === 0) score += 0.50;
        else if (recentIdx > 0 && recentIdx < 5) score += 0.20;
        if (sectionHint && cmd.sections?.includes?.(sectionHint)) score += 0.30;
        if (q && (cmd.aliases || []).some(a => a.toLowerCase() === q)) score += 0.20;
        return { cmd, score };
      }).filter(Boolean);

      scored.sort((a, b) => b.score - a.score);
      this.filtered = scored.slice(0, 50).map(s => s.cmd);
      this.selectedIdx = 0;
      this._render();
    }

    _render() {
      const list = this.list;
      list.innerHTML = '';
      if (this.filtered.length === 0) {
        list.innerHTML = `<div class="prova-cmdpalette-empty">Keine Treffer · Tipp: <kbd>/</kbd> öffnet das Block-Menü im Editor</div>`;
        return;
      }
      let lastCat = null;
      this.filtered.forEach((cmd, idx) => {
        if (cmd.category !== lastCat) {
          const h = document.createElement('div');
          h.className = 'prova-cmdpalette-category';
          h.textContent = cmd.category || 'Allgemein';
          list.appendChild(h);
          lastCat = cmd.category;
        }
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'prova-cmdpalette-item' + (idx === this.selectedIdx ? ' is-selected' : '');
        item.dataset.idx = String(idx);
        item.setAttribute('role', 'option');
        const shortcut = cmd.shortcut || '';
        item.innerHTML = `
          <span class="prova-cmdpalette-item-icon" aria-hidden="true">${cmd.icon || '·'}</span>
          <span class="prova-cmdpalette-item-body">
            <span class="prova-cmdpalette-item-title">${this._esc(cmd.title || cmd.id)}</span>
            ${cmd.subtitle ? `<span class="prova-cmdpalette-item-sub">${this._esc(cmd.subtitle)}</span>` : ''}
          </span>
          ${shortcut ? `<span class="prova-cmdpalette-item-shortcut">${this._esc(shortcut)}</span>` : ''}
        `;
        item.addEventListener('mousedown', (e) => e.preventDefault());
        item.addEventListener('mouseenter', () => {
          this.selectedIdx = idx;
          this._updateSelection();
        });
        item.addEventListener('click', () => this._activate());
        list.appendChild(item);
      });
    }

    _navigate(dir) {
      if (this.filtered.length === 0) return;
      this.selectedIdx = (this.selectedIdx + dir + this.filtered.length) % this.filtered.length;
      this._updateSelection();
      const el = this.list.querySelector('.prova-cmdpalette-item.is-selected');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    _updateSelection() {
      this.list.querySelectorAll('.prova-cmdpalette-item').forEach((b, i) => {
        b.classList.toggle('is-selected', i === this.selectedIdx);
      });
    }

    _activate() {
      const cmd = this.filtered[this.selectedIdx];
      if (!cmd) return;
      _trackUsage(cmd.id);
      this.hide();
      try {
        cmd.handler?.({ editor: this.editor, palette: this });
      } catch (e) {
        console.error('[ProvaCommandPalette]', cmd.id, e);
      }
    }

    _esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }

    destroy() {
      document.removeEventListener('keydown', this._onKey, true);
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }
  }

  global.ProvaCommandPalette = ProvaCommandPalette;
})(typeof window !== 'undefined' ? window : globalThis);
