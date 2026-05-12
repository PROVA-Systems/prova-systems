/**
 * PROVA Callout-Extension (MEGA⁶⁴ Item 2.7)
 *
 * Block-Node mit severity (error/warning/ok/info).
 * Slash-Integration: /mangel /klaeren /ok /hinweis
 *
 * Public API:
 *   ProvaCalloutFactory(modules)  → TipTap-Node
 *     modules = aus ProvaEditor.getModules() — wegen Node.create + mergeAttributes
 *
 * Verwendung:
 *   const { Node } = await ProvaEditor.getModules();
 *   editor.extensionManager.addExtensions([ProvaCalloutFactory(modules)]);
 *
 * Alternativ in extraExtensions bei create():
 *   const modules = await ProvaEditor.getModules();
 *   ProvaEditor.create({ extraExtensions: [ProvaCalloutFactory(modules)] });
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-callout-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-callout-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-callout.css';
    document.head.appendChild(link);
  }

  const VALID_SEVERITIES = ['error', 'warning', 'ok', 'info'];
  const SEVERITY_ICONS = {
    error: '⚠',
    warning: '⚠',
    ok: '✓',
    info: 'ℹ'
  };

  function ProvaCalloutFactory(modules) {
    _injectStyle();
    if (!modules?.Node || !modules?.mergeAttributes) {
      console.warn('[prova-callout] modules.Node/mergeAttributes missing');
      return null;
    }
    const { Node, mergeAttributes } = modules;

    return Node.create({
      name: 'provaCallout',
      group: 'block',
      content: 'inline*',
      defining: true,

      addAttributes() {
        return {
          severity: {
            default: 'info',
            parseHTML: el => {
              const s = el.getAttribute('data-severity') || 'info';
              return VALID_SEVERITIES.includes(s) ? s : 'info';
            },
            renderHTML: attrs => {
              return {
                'data-severity': attrs.severity,
                class: `prova-callout prova-callout--${attrs.severity}`
              };
            }
          }
        };
      },

      parseHTML() {
        return [{ tag: 'div.prova-callout' }];
      },

      renderHTML({ node, HTMLAttributes }) {
        const sev = node.attrs.severity || 'info';
        return [
          'div',
          mergeAttributes(
            { class: `prova-callout prova-callout--${sev}`, 'data-severity': sev, role: 'note' },
            HTMLAttributes
          ),
          ['span', { class: 'prova-callout-icon', 'aria-hidden': 'true' }, SEVERITY_ICONS[sev] || 'ℹ'],
          ['div', { class: 'prova-callout-content' }, 0]
        ];
      },

      addCommands() {
        return {
          setCallout: (attrs = {}) => ({ commands }) => {
            const sev = VALID_SEVERITIES.includes(attrs.severity) ? attrs.severity : 'info';
            return commands.setNode('provaCallout', { severity: sev });
          },
          toggleCallout: (attrs = {}) => ({ commands, editor }) => {
            if (editor.isActive('provaCallout')) {
              return commands.setParagraph();
            }
            const sev = VALID_SEVERITIES.includes(attrs.severity) ? attrs.severity : 'info';
            return commands.setNode('provaCallout', { severity: sev });
          },
          unsetCallout: () => ({ commands }) => commands.setParagraph()
        };
      }
    });
  }

  global.ProvaCalloutFactory = ProvaCalloutFactory;
})(typeof window !== 'undefined' ? window : globalThis);
