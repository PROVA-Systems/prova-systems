/**
 * PROVA Cheat-Sheet (MEGA⁶⁵ Item 3.6)
 *
 * Trigger: ? Taste außerhalb Editor (window-level keydown) + via Command-Palette.
 * 4-Spalten-Modal: Global · Editor · KI · Navigation
 * Plattform-aware: ⌘ vs Ctrl via ProvaPlatform.fmt()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-cheat-sheet-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-cheat-sheet-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-cheat-sheet.css';
    document.head.appendChild(link);
  }

  function fmt(key, opts) {
    if (!window.ProvaPlatform) return key;
    return window.ProvaPlatform.fmt(key, opts || {});
  }

  function buildSections() {
    return [
      {
        title: 'Global',
        items: [
          { shortcut: fmt('K', { mod: true }), label: 'Befehls-Palette öffnen' },
          { shortcut: '?',                     label: 'Diese Übersicht öffnen' },
          { shortcut: fmt('S', { mod: true }), label: 'Speichern' },
          { shortcut: 'Escape',                label: 'Modal/Bubble schließen' }
        ]
      },
      {
        title: 'Editor',
        items: [
          { shortcut: fmt('B', { mod: true }),                label: 'Fett' },
          { shortcut: fmt('I', { mod: true }),                label: 'Kursiv' },
          { shortcut: fmt('U', { mod: true }),                label: 'Unterstrichen' },
          { shortcut: fmt('1', { mod: true, alt: true }),     label: 'Überschrift 1' },
          { shortcut: fmt('2', { mod: true, alt: true }),     label: 'Überschrift 2' },
          { shortcut: fmt('3', { mod: true, alt: true }),     label: 'Überschrift 3' },
          { shortcut: '/',                                    label: 'Slash-Menü (Blöcke)' },
          { shortcut: '[[',                                   label: 'Wikilink-Picker' },
          { shortcut: '@',                                    label: 'Zeitstempel-Referenz' },
          { shortcut: fmt('F', { mod: true, shift: true }),   label: 'Focus-Mode-Zyklus' }
        ]
      },
      {
        title: 'KI-Aktionen',
        items: [
          { shortcut: fmt('K', { mod: true, alt: true }),     label: 'Konjunktiv-Vorschlag' },
          { shortcut: fmt('V', { mod: true, alt: true }),     label: '§-Verweis-Vorschlag' },
          { shortcut: fmt('N', { mod: true, alt: true }),     label: 'Norm-Zitat suchen' },
          { shortcut: fmt('J', { mod: true }),                label: 'KI-Panel öffnen' },
          { shortcut: '↩',                                    label: 'KI-Vorschlag übernehmen (in Bubble)' },
          { shortcut: 'Escape',                               label: 'KI-Vorschlag ablehnen (in Bubble)' }
        ]
      },
      {
        title: 'Navigation',
        items: [
          { shortcut: '/h1 .. /h3',  label: 'Heading einfügen' },
          { shortcut: '/liste',      label: 'Aufzählung' },
          { shortcut: '/nummer',     label: 'Nummerierung' },
          { shortcut: '/zitat',      label: 'Zitat-Block' },
          { shortcut: '/tabelle',    label: 'Tabelle 3×3' },
          { shortcut: '/foto',       label: 'Foto einfügen' },
          { shortcut: '/mangel',     label: 'Roter Mangel-Callout' },
          { shortcut: '/klaeren',    label: 'Gelber Klären-Callout' },
          { shortcut: '/ok',         label: 'Grüner OK-Callout' }
        ]
      }
    ];
  }

  class ProvaCheatSheet {
    constructor() {
      _injectStyle();
      this._buildModal();
      this._registerKey();
    }

    show() {
      if (this.overlay.style.display !== 'none') return;
      this.overlay.style.display = 'flex';
      this._render();
    }

    hide() {
      this.overlay.style.display = 'none';
    }

    toggle() {
      if (this.overlay.style.display === 'none') this.show();
      else this.hide();
    }

    _buildModal() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'prova-cheat-sheet-overlay';
      this.overlay.style.display = 'none';
      this.overlay.innerHTML = `
        <div class="prova-cheat-sheet-modal">
          <header class="cs-header">
            <h2>Tastenkürzel</h2>
            <button type="button" class="cs-close" aria-label="Schließen">✕</button>
          </header>
          <div class="cs-grid"></div>
          <footer class="cs-footer">
            ${window.ProvaPlatform?.isMac ? 'macOS' : window.ProvaPlatform?.isWindows ? 'Windows' : 'Linux'}-Tastatur ·
            Esc oder ✕ zum Schließen
          </footer>
        </div>
      `;
      document.body.appendChild(this.overlay);
      this.overlay.querySelector('.cs-close').addEventListener('click', () => this.hide());
      this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.hide(); });
    }

    _render() {
      const grid = this.overlay.querySelector('.cs-grid');
      const sections = buildSections();
      grid.innerHTML = '';
      sections.forEach(sec => {
        const col = document.createElement('div');
        col.className = 'cs-column';
        col.innerHTML = `
          <h3>${sec.title}</h3>
          <ul>
            ${sec.items.map(it => `
              <li>
                <span class="cs-label">${it.label}</span>
                <kbd>${this._esc(it.shortcut)}</kbd>
              </li>
            `).join('')}
          </ul>
        `;
        grid.appendChild(col);
      });
    }

    _registerKey() {
      this._onKey = (e) => {
        // ? = Shift+/ — nur außerhalb Editor + nicht in Inputs
        if (e.key === '?' && !this._inEditableContext(e.target)) {
          e.preventDefault();
          this.toggle();
        } else if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
          e.preventDefault();
          this.hide();
        }
      };
      document.addEventListener('keydown', this._onKey, true);
    }

    _inEditableContext(target) {
      if (!target) return false;
      if (target.isContentEditable) return true;
      if (target.closest && target.closest('input, textarea, [contenteditable="true"], .ProseMirror')) return true;
      return false;
    }

    _esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }
  }

  global.ProvaCheatSheet = ProvaCheatSheet;
})(typeof window !== 'undefined' ? window : globalThis);
