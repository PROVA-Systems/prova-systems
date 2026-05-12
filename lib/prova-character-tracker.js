/**
 * PROVA Character-Tracker (MEGA⁶⁴ Item 2.13)
 *
 * Status-Leiste unter Editor:
 *   Zeichen Total · Eigenleistung (KI-Anteil abgezogen) · Qualitäts-Marker
 *
 * KI-Anteil = Summe von:
 *   - .prova-fragment-marker (text aus befund_fragmente)
 *   - .prova-textbaustein-block (gesperrt eingefügt)
 *   - .prova-ki-suggestion     (kommt MEGA⁶⁵)
 *
 * Qualitäts-Marker via Regex:
 *   - Konjunktiv:  könnte/dürfte/wäre/sollte/läge
 *   - §-Verweis:   §\d+
 *   - Norm-Zitat:  DIN \d+ / EN \d+ / VDI \d+
 *
 * Throttle: 2 Sek max.
 * Reuse: integriert quality-markers.js / sv-eigenleistung-validator.js wo sinnvoll.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-character-tracker-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-character-tracker-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-character-tracker.css';
    document.head.appendChild(link);
  }

  const KONJUNKTIV_RE = /\b(könnte|dürfte|wäre|sollte|läge|hätte|würde)\b/i;
  const PARAGRAPH_RE  = /§\s*\d+[a-z]?/i;
  const NORM_RE       = /\b(DIN|EN|VDI|ISO|VOB)\s+\d+/i;

  class CharacterTracker {
    constructor(container, editor, opts = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.editor = editor;
      this.opts = opts;
      this.minEigenleistung = opts.minEigenleistung || 500;
      this._throttleTimer = null;

      if (!this.container) throw new Error('[CharacterTracker] container required');

      _injectStyle();
      this._render();
      this._registerEvents();
      this._update();
    }

    _render() {
      this.container.classList.add('prova-character-tracker');
      this.container.innerHTML = `
        <div class="ct-row ct-row-counts">
          <span class="ct-stat" data-id="total">Zeichen: <strong>0</strong></span>
          <span class="ct-stat" data-id="eigenleistung">Eigenleistung: <strong>0</strong> <span class="ct-target">(Min: ${this.minEigenleistung})</span></span>
          <span class="ct-stat" data-id="ki">KI-Anteil: <strong>0</strong> <span class="ct-pct">(0 %)</span></span>
        </div>
        <div class="ct-row ct-row-markers">
          <span class="ct-marker" data-marker="konjunktiv">Konjunktiv</span>
          <span class="ct-marker" data-marker="paragraph">§-Verweis</span>
          <span class="ct-marker" data-marker="norm">Norm-Zitat</span>
        </div>
      `;
      this._refs = {
        total:        this.container.querySelector('[data-id="total"] strong'),
        eigenleistung:this.container.querySelector('[data-id="eigenleistung"]'),
        ki:           this.container.querySelector('[data-id="ki"]'),
        marker:       {
          konjunktiv: this.container.querySelector('[data-marker="konjunktiv"]'),
          paragraph:  this.container.querySelector('[data-marker="paragraph"]'),
          norm:       this.container.querySelector('[data-marker="norm"]')
        }
      };
    }

    _registerEvents() {
      this._onUpdate = () => {
        if (this._throttleTimer) return;
        this._throttleTimer = setTimeout(() => {
          this._throttleTimer = null;
          this._update();
        }, 250);
      };
      this.editor.on('update', this._onUpdate);
      this.editor.on('selectionUpdate', this._onUpdate);
    }

    _update() {
      const ed = this.editor;
      const text = ed.getText();
      const total = text.length;
      const kiText = this._collectKiText();
      const kiLen = kiText.length;
      const eigenleistung = Math.max(0, total - kiLen);
      const pct = total > 0 ? Math.round((kiLen / total) * 100) : 0;

      this._refs.total.textContent = String(total);
      const eigenStrong = this._refs.eigenleistung.querySelector('strong');
      eigenStrong.textContent = String(eigenleistung);
      this._refs.eigenleistung.classList.toggle('is-ok', eigenleistung >= this.minEigenleistung);
      this._refs.eigenleistung.classList.toggle('is-warn', eigenleistung < this.minEigenleistung);
      const kiStrong = this._refs.ki.querySelector('strong');
      kiStrong.textContent = String(kiLen);
      this._refs.ki.querySelector('.ct-pct').textContent = `(${pct} %)`;

      // Qualitäts-Marker
      const m = this._refs.marker;
      m.konjunktiv.classList.toggle('is-active', KONJUNKTIV_RE.test(text));
      m.paragraph.classList.toggle('is-active', PARAGRAPH_RE.test(text));
      m.norm.classList.toggle('is-active', NORM_RE.test(text));
    }

    /**
     * Sammelt Text aller "KI-erzeugten" Inhalte aus dem Editor-DOM.
     * MARKER-Klassen:
     *   .prova-fragment-marker (Inline aus befund_fragmente)
     *   .prova-textbaustein-block (Atomic-Block aus textbausteine)
     *   .prova-ki-suggestion   (MEGA⁶⁵)
     */
    _collectKiText() {
      const editorEl = this.editor?.options?.element;
      if (!editorEl) return '';
      const selectors = [
        '.prova-fragment-marker',
        '.prova-textbaustein-block .baustein-content',
        '.prova-ki-suggestion'
      ];
      const parts = [];
      selectors.forEach(sel => {
        editorEl.querySelectorAll(sel).forEach(el => {
          parts.push(el.textContent || '');
        });
      });
      return parts.join('');
    }

    destroy() {
      this.editor.off('update', this._onUpdate);
      this.editor.off('selectionUpdate', this._onUpdate);
      if (this._throttleTimer) clearTimeout(this._throttleTimer);
      this.container.innerHTML = '';
      this.container.classList.remove('prova-character-tracker');
    }
  }

  global.CharacterTracker = CharacterTracker;
})(typeof window !== 'undefined' ? window : globalThis);
