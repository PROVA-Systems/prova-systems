/**
 * PROVA Fragment-Marker (MEGA⁶⁴ Item 2.8)
 *
 * Inline-Mark fuer Text aus befund_fragmente (HERZSTUECK-Integration aus MEGA⁶³).
 *
 * Attribute:
 *   - fragmentId (uuid)
 *   - quelle (diktat|foto|skizze|notiz|manuell)
 *   - timestamp (optional ISO)
 *
 * Klick: dispatcht CustomEvent('prova:fragment-clicked', {detail:{fragmentId}}).
 * Sidebar (Item 2.10) faengt das Event ab.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-fragment-marker-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-fragment-marker-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-fragment-marker.css';
    document.head.appendChild(link);
  }

  const VALID_QUELLEN = ['diktat', 'foto', 'skizze', 'notiz', 'manuell'];

  function ProvaFragmentMarkerFactory(modules) {
    _injectStyle();
    if (!modules?.Mark || !modules?.mergeAttributes) {
      console.warn('[prova-fragment-marker] modules.Mark/mergeAttributes missing');
      return null;
    }
    const { Mark, mergeAttributes } = modules;

    return Mark.create({
      name: 'provaFragmentMarker',
      inclusive: false,
      spanning: false,

      addAttributes() {
        return {
          fragmentId: {
            default: null,
            parseHTML: el => el.getAttribute('data-fragment-id'),
            renderHTML: attrs => attrs.fragmentId ? { 'data-fragment-id': attrs.fragmentId } : {}
          },
          quelle: {
            default: 'manuell',
            parseHTML: el => {
              const q = el.getAttribute('data-quelle') || 'manuell';
              return VALID_QUELLEN.includes(q) ? q : 'manuell';
            },
            renderHTML: attrs => ({ 'data-quelle': attrs.quelle })
          },
          timestamp: {
            default: null,
            parseHTML: el => el.getAttribute('data-timestamp'),
            renderHTML: attrs => attrs.timestamp ? { 'data-timestamp': attrs.timestamp } : {}
          }
        };
      },

      parseHTML() {
        return [{ tag: 'span.prova-fragment-marker' }];
      },

      renderHTML({ mark, HTMLAttributes }) {
        const q = mark.attrs.quelle || 'manuell';
        return [
          'span',
          mergeAttributes(
            {
              class: `prova-fragment-marker prova-fragment-marker--${q}`,
              title: `aus ${q}${mark.attrs.timestamp ? ' · ' + mark.attrs.timestamp : ''}`
            },
            HTMLAttributes
          ),
          0
        ];
      },

      addCommands() {
        return {
          setFragmentMarker: (attrs) => ({ commands }) =>
            commands.setMark('provaFragmentMarker', attrs),
          unsetFragmentMarker: () => ({ commands }) =>
            commands.unsetMark('provaFragmentMarker')
        };
      },

      onCreate() {
        // Global Click-Handler einmal pro Editor-Instanz registrieren
        const editorEl = this.editor.options.element;
        if (editorEl._provaFragmentClickRegistered) return;
        editorEl._provaFragmentClickRegistered = true;
        editorEl.addEventListener('click', (e) => {
          const marker = e.target.closest('.prova-fragment-marker');
          if (!marker) return;
          const fragmentId = marker.dataset.fragmentId;
          if (!fragmentId) return;
          document.dispatchEvent(new CustomEvent('prova:fragment-clicked', {
            detail: { fragmentId, quelle: marker.dataset.quelle, source: 'editor' }
          }));
        });
      }
    });
  }

  global.ProvaFragmentMarkerFactory = ProvaFragmentMarkerFactory;
})(typeof window !== 'undefined' ? window : globalThis);
