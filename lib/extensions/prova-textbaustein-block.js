/**
 * PROVA Textbaustein-Block (MEGA⁶⁴ Item 2.9)
 *
 * Atomic Block-Node, nicht editierbar inline. Cmd: ⇄ Austausch, 🔒 Lock-Icon.
 * Storage: bausteinId aus textbausteine-Tabelle.
 *
 * Bezug zu editor-locked-sections.js: Diese hier ist die NEUE Block-Variante
 * für Textbausteine. editor-locked-sections.js bleibt fuer Section-Locking
 * im Whole-Document zustaendig (anderer Use-Case).
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-textbaustein-block-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-textbaustein-block-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-textbaustein-block.css';
    document.head.appendChild(link);
  }

  function ProvaTextbausteinBlockFactory(modules, opts = {}) {
    _injectStyle();
    if (!modules?.Node || !modules?.mergeAttributes) {
      console.warn('[prova-textbaustein-block] modules.Node missing');
      return null;
    }
    const { Node, mergeAttributes } = modules;

    return Node.create({
      name: 'provaTextbausteinBlock',
      group: 'block',
      atom: true,
      selectable: true,
      draggable: false,

      addAttributes() {
        return {
          bausteinId:    { default: null, parseHTML: el => el.getAttribute('data-baustein-id'), renderHTML: a => ({ 'data-baustein-id': a.bausteinId }) },
          version:       { default: 1,    parseHTML: el => parseInt(el.getAttribute('data-version') || '1', 10), renderHTML: a => ({ 'data-version': String(a.version) }) },
          einfuegeZeit:  { default: null, parseHTML: el => el.getAttribute('data-einfuege-zeit'), renderHTML: a => a.einfuegeZeit ? { 'data-einfuege-zeit': a.einfuegeZeit } : {} },
          content:       { default: '',   parseHTML: el => el.querySelector('.baustein-content')?.textContent || '', renderHTML: () => ({}) }
        };
      },

      parseHTML() {
        return [{ tag: 'div.prova-textbaustein-block' }];
      },

      renderHTML({ node, HTMLAttributes }) {
        return [
          'div',
          mergeAttributes(
            {
              class: 'prova-textbaustein-block',
              contenteditable: 'false',
              'data-baustein-id': node.attrs.bausteinId || '',
              'data-version': String(node.attrs.version || 1)
            },
            HTMLAttributes
          ),
          ['div', { class: 'baustein-content' }, node.attrs.content || ''],
          ['button', { class: 'baustein-tausch-btn', type: 'button', title: 'Austauschen', 'aria-label': 'Textbaustein austauschen' }, '⇄'],
          ['span', { class: 'baustein-lock-icon', 'aria-hidden': 'true', title: 'Gesperrt' }, '🔒']
        ];
      },

      addCommands() {
        return {
          insertTextbaustein: (attrs) => ({ commands }) =>
            commands.insertContent({
              type: 'provaTextbausteinBlock',
              attrs: {
                bausteinId: attrs.bausteinId,
                version: attrs.version || 1,
                einfuegeZeit: attrs.einfuegeZeit || new Date().toISOString(),
                content: attrs.content || ''
              }
            })
        };
      },

      onCreate() {
        // Klick-Handler fuer Tausch-Button
        const editorEl = this.editor.options.element;
        if (editorEl._provaBausteinClickRegistered) return;
        editorEl._provaBausteinClickRegistered = true;
        editorEl.addEventListener('click', (e) => {
          const btn = e.target.closest('.baustein-tausch-btn');
          if (!btn) return;
          e.preventDefault();
          const block = btn.closest('.prova-textbaustein-block');
          if (!block) return;
          const bausteinId = block.dataset.bausteinId;
          document.dispatchEvent(new CustomEvent('prova:textbaustein-tausch', {
            detail: { bausteinId, blockEl: block }
          }));
        });
      }
    });
  }

  global.ProvaTextbausteinBlockFactory = ProvaTextbausteinBlockFactory;
})(typeof window !== 'undefined' ? window : globalThis);
