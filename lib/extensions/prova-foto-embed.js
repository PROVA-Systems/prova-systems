/**
 * PROVA Foto-Embed (MEGA⁶⁴ Item 2.12a)
 *
 * Block-Node: Foto aus Auftrag im Editor. Atomic, mit Caption.
 * Slash /foto öffnet Foto-Picker (Callback aus opts.onFotoPick).
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-foto-embed-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-foto-embed-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-foto-embed.css';
    document.head.appendChild(link);
  }

  function ProvaFotoEmbedFactory(modules) {
    _injectStyle();
    if (!modules?.Node || !modules?.mergeAttributes) return null;
    const { Node, mergeAttributes } = modules;

    return Node.create({
      name: 'provaFotoEmbed',
      group: 'block',
      atom: true,
      selectable: true,
      draggable: false,

      addAttributes() {
        return {
          fotoId:     { default: null, parseHTML: el => el.getAttribute('data-foto-id'),     renderHTML: a => ({ 'data-foto-id': a.fotoId || '' }) },
          src:        { default: null, parseHTML: el => el.querySelector('img')?.getAttribute('src'), renderHTML: () => ({}) },
          caption:    { default: '',   parseHTML: el => el.querySelector('figcaption')?.textContent || '', renderHTML: () => ({}) },
          aufnahme:   { default: null, parseHTML: el => el.getAttribute('data-aufnahme'),    renderHTML: a => a.aufnahme ? { 'data-aufnahme': a.aufnahme } : {} },
          gps:        { default: null, parseHTML: el => el.getAttribute('data-gps'),         renderHTML: a => a.gps ? { 'data-gps': a.gps } : {} },
          bausteinOrt:{ default: null, parseHTML: el => el.getAttribute('data-baustein-ort'),renderHTML: a => a.bausteinOrt ? { 'data-baustein-ort': a.bausteinOrt } : {} }
        };
      },

      parseHTML() {
        return [{ tag: 'figure.prova-foto-embed' }];
      },

      renderHTML({ node, HTMLAttributes }) {
        const parts = [
          'figure',
          mergeAttributes({ class: 'prova-foto-embed', 'data-foto-id': node.attrs.fotoId || '' }, HTMLAttributes),
          ['img', { src: node.attrs.src || '', alt: node.attrs.caption || 'Foto', loading: 'lazy' }]
        ];
        const captionParts = [node.attrs.caption || ''];
        if (node.attrs.aufnahme) captionParts.push(node.attrs.aufnahme);
        if (node.attrs.bausteinOrt) captionParts.push(node.attrs.bausteinOrt);
        const caption = captionParts.filter(Boolean).join(' · ');
        if (caption) parts.push(['figcaption', {}, caption]);
        return parts;
      },

      addCommands() {
        return {
          insertFoto: (attrs) => ({ commands }) => commands.insertContent({
            type: 'provaFotoEmbed',
            attrs: {
              fotoId: attrs.fotoId,
              src: attrs.src,
              caption: attrs.caption || '',
              aufnahme: attrs.aufnahme || null,
              gps: attrs.gps || null,
              bausteinOrt: attrs.bausteinOrt || null
            }
          })
        };
      }
    });
  }

  global.ProvaFotoEmbedFactory = ProvaFotoEmbedFactory;
})(typeof window !== 'undefined' ? window : globalThis);
