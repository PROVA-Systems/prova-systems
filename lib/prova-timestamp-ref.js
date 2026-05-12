/**
 * PROVA @-Zeitstempel-Referenz (MEGA⁶⁵ Item 3.9)
 *
 * Trigger: `@HH:MM` Format-Erkennung in Editor → fügt prova-fragment-marker mit
 *   quelle='diktat' + timestamp=ISO + quelle_startzeit_ms=(HH*3600+MM*60)*1000
 *
 * Simplified-Variante (Marcel-Self-Scoping Option B):
 *   - User tippt "@14:32"
 *   - InputRule-Pattern erkennt das
 *   - Ersetzt durch Inline-Mark mit zugehörigen Attributen
 *   - audio_id wird aus Editor-Context (window.PROVA_EDITOR_CONTEXT.audio_id) gelesen
 *
 * Voll-Picker (Option A) defer auf MEGA⁶⁶.
 */
'use strict';

(function (global) {

  const TIMESTAMP_RE = /(?:^|\s)@(\d{1,2}):(\d{2})(?=\s|$)/;

  function _hhmmToMs(hh, mm) {
    return (parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60) * 1000;
  }

  /**
   * Initialisiert Listener auf Editor: bei Update prüft Text vor Cursor auf @HH:MM-Pattern.
   * Match → ersetzt Pattern durch prova-fragment-marker.
   */
  class ProvaTimestampRef {
    constructor(editor, opts = {}) {
      this.editor = editor;
      this.opts = opts;
      this._registerInputRule();
    }

    _registerInputRule() {
      const ed = this.editor;
      this._onUpdate = () => {
        const { from } = ed.state.selection;
        if (from === 0) return;
        const $pos = ed.state.doc.resolve(from);
        const node = $pos.parent;
        if (!node) return;
        const text = node.textContent || '';
        const localEnd = $pos.parentOffset;
        const localStart = Math.max(0, localEnd - 7);   // "@MM:SS " = 7 chars
        const slice = text.slice(localStart, localEnd);
        const m = slice.match(/@(\d{1,2}):(\d{2})$/);
        if (!m) return;

        const hh = m[1];
        const mm = m[2];
        const start_ms = _hhmmToMs(hh, mm);
        const audioId = window.PROVA_EDITOR_CONTEXT?.audio_id || null;

        // Replace `@HH:MM` durch Mark-Wrapped Text
        const matchStart = $pos.start() + (text.length - (text.length - (localEnd - m[0].length)));
        const replaceFrom = $pos.start() + localStart + (slice.length - m[0].length);
        const replaceTo = $pos.start() + localEnd;
        const display = `@${hh}:${mm}`;

        ed.chain()
          .focus()
          .setTextSelection({ from: replaceFrom, to: replaceTo })
          .insertContent({
            type: 'text',
            text: display,
            marks: [{
              type: 'provaFragmentMarker',
              attrs: {
                fragmentId: audioId ? `audio-ts:${audioId}:${start_ms}` : `manual-ts:${start_ms}`,
                quelle: 'diktat',
                timestamp: new Date().toISOString()
              }
            }]
          })
          .run();
      };
      ed.on('update', this._onUpdate);

      // Klick auf Timestamp-Marker → Custom-Event
      const editorEl = ed.options.element;
      if (!editorEl._provaTimestampClickRegistered) {
        editorEl._provaTimestampClickRegistered = true;
        editorEl.addEventListener('click', (e) => {
          const m = e.target.closest('.prova-fragment-marker--diktat');
          if (!m) return;
          const fragmentId = m.dataset.fragmentId || '';
          if (!fragmentId.startsWith('audio-ts:') && !fragmentId.startsWith('manual-ts:')) return;
          const parts = fragmentId.split(':');
          // audio-ts:<audio_id>:<start_ms>  OR  manual-ts:<start_ms>
          const start_ms = parseInt(parts[parts.length - 1], 10);
          const audio_id = parts[0] === 'audio-ts' ? parts[1] : null;
          document.dispatchEvent(new CustomEvent('prova:audio-seek', {
            detail: { audio_id, start_ms }
          }));
        });
      }
    }

    destroy() {
      this.editor.off('update', this._onUpdate);
    }
  }

  global.ProvaTimestampRef = ProvaTimestampRef;
})(typeof window !== 'undefined' ? window : globalThis);
