/**
 * PROVA Wikilink (MEGA⁶⁵ Item 3.7)
 *
 * Trigger: `[[` am Zeilenanfang öffnet Picker für 5 Target-Typen:
 *   - Heading-Link    📌  → springt zu Heading-Text
 *   - Anhang-Link     📎  → öffnet Anhang-Lightbox (CustomEvent)
 *   - Baustein-Link   📦  → fügt Baustein ein (CustomEvent)
 *   - Fragment-Link   🎤  → springt zu Fragment in Sidebar
 *   - Akten-Link      📁  → öffnet anderen Auftrag
 *
 * Nutzt @tiptap/extension-mention aus dem Bundle (MEGA⁶⁵).
 * Search-Sources über opts.searchSources() — async, parallel.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-wikilink-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-wikilink-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-wikilink.css';
    document.head.appendChild(link);
  }

  const TYPE_ICONS = {
    heading:  '📌',
    anhang:   '📎',
    baustein: '📦',
    fragment: '🎤',
    auftrag:  '📁',
    norm:     '📐'
  };

  function ProvaWikilinkFactory(modules, opts = {}) {
    _injectStyle();
    if (!modules?.Mention) {
      console.warn('[prova-wikilink] modules.Mention missing — Bundle hat @tiptap/extension-mention nicht?');
      return null;
    }
    const { Mention } = modules;

    const sources = opts.searchSources || (() => Promise.resolve([]));

    return Mention.configure({
      HTMLAttributes: { class: 'prova-wikilink' },
      renderText({ node }) {
        const t = node.attrs.targetType || 'heading';
        const label = node.attrs.label || node.attrs.id || '';
        return `[[${label}]]`;
      },
      renderHTML({ options, node }) {
        const t = node.attrs.targetType || 'heading';
        const icon = TYPE_ICONS[t] || '🔗';
        return [
          'a',
          {
            class: `prova-wikilink prova-wikilink--${t}`,
            href: '#',
            'data-target-type': t,
            'data-target-id': node.attrs.id || '',
            'data-target-label': node.attrs.label || ''
          },
          `${icon} ${node.attrs.label || node.attrs.id || ''}`
        ];
      },
      suggestion: {
        char: '[[',
        startOfLine: false,
        allowSpaces: true,
        items: async ({ query }) => {
          try {
            const all = await sources(query);
            if (!Array.isArray(all)) return [];
            const q = (query || '').toLowerCase();
            return all
              .filter(it => !q || (it.label || '').toLowerCase().includes(q) || (it.id || '').toLowerCase().includes(q))
              .slice(0, 12);
          } catch (e) {
            console.warn('[prova-wikilink] searchSources failed', e);
            return [];
          }
        },
        render: () => {
          let popup;
          let selectedIdx = 0;
          let items = [];
          let props = null;

          function show() {
            popup = document.createElement('div');
            popup.className = 'prova-wikilink-popup';
            document.body.appendChild(popup);
            update();
          }

          function update() {
            if (!popup) return;
            popup.innerHTML = '';
            if (!items.length) {
              popup.innerHTML = '<div class="prova-wikilink-empty">Keine Treffer</div>';
            } else {
              items.forEach((it, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'prova-wikilink-item' + (idx === selectedIdx ? ' is-selected' : '');
                const icon = TYPE_ICONS[it.targetType] || '🔗';
                btn.innerHTML = `<span class="wl-icon">${icon}</span> <span class="wl-label">${_esc(it.label || it.id)}</span><span class="wl-type">${_esc(it.targetType || '')}</span>`;
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => select(idx));
                popup.appendChild(btn);
              });
            }
            position();
          }

          function position() {
            if (!props?.clientRect || !popup) return;
            const rect = props.clientRect();
            if (!rect) return;
            popup.style.left = `${rect.left + window.scrollX}px`;
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
          }

          function select(idx) {
            const item = items[idx];
            if (!item) return;
            props.command({ id: item.id, label: item.label, targetType: item.targetType });
          }

          return {
            onStart(p) { props = p; items = p.items || []; selectedIdx = 0; show(); },
            onUpdate(p) { props = p; items = p.items || []; selectedIdx = 0; update(); },
            onKeyDown(p) {
              if (p.event.key === 'ArrowDown') { selectedIdx = (selectedIdx + 1) % items.length; update(); return true; }
              if (p.event.key === 'ArrowUp')   { selectedIdx = (selectedIdx - 1 + items.length) % items.length; update(); return true; }
              if (p.event.key === 'Enter')     { select(selectedIdx); return true; }
              if (p.event.key === 'Escape')    { onExit(); return true; }
              return false;
            },
            onExit() {
              if (popup?.parentNode) popup.parentNode.removeChild(popup);
              popup = null;
            }
          };
        }
      }
    }).extend({
      name: 'provaWikilink',
      addAttributes() {
        return {
          id:         { default: null, parseHTML: el => el.getAttribute('data-target-id'),    renderHTML: a => ({ 'data-target-id': a.id || '' }) },
          label:      { default: null, parseHTML: el => el.getAttribute('data-target-label'), renderHTML: a => ({ 'data-target-label': a.label || '' }) },
          targetType: { default: 'heading', parseHTML: el => el.getAttribute('data-target-type'), renderHTML: a => ({ 'data-target-type': a.targetType || 'heading' }) }
        };
      }
    });
  }

  /**
   * Default searchSources: durchsucht Headings im Editor + via API Anhänge/Bausteine/Fragmente/Aufträge.
   * Frontend kann eigene Variante übergeben.
   */
  async function defaultSearchSources(editor, query) {
    const items = [];
    if (editor) {
      const doc = editor.state.doc;
      doc.descendants((node) => {
        if (node.type.name === 'heading') {
          const t = node.textContent.trim();
          if (t) items.push({ id: 'heading:' + t, label: t, targetType: 'heading' });
        }
      });
    }
    // TODO MEGA⁶⁶: Anhänge/Bausteine/Fragmente/Aufträge via API
    return items;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  global.ProvaWikilinkFactory = ProvaWikilinkFactory;
  global.ProvaWikilinkDefaultSources = defaultSearchSources;

  // Click-Handler: Wikilink-Click → CustomEvent
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.prova-wikilink');
      if (!a) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('prova:wikilink-clicked', {
        detail: {
          targetType: a.dataset.targetType,
          targetId: a.dataset.targetId,
          targetLabel: a.dataset.targetLabel
        }
      }));
    });
  }

})(typeof window !== 'undefined' ? window : globalThis);
