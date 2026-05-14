/**
 * PROVA Skizze-Embed (MEGA⁶⁴ Item 2.12b)
 *
 * Block-Node: Skizze aus skizzen-Tabelle. SVG-render inline.
 * Klick öffnet Skizzen-Editor (existing skizzen.html via Lightbox/Tab).
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-skizze-embed-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-skizze-embed-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-skizze-embed.css';
    document.head.appendChild(link);
  }

  function ProvaSkizzeEmbedFactory(modules) {
    _injectStyle();
    if (!modules?.Node || !modules?.mergeAttributes) return null;
    const { Node, mergeAttributes } = modules;

    return Node.create({
      name: 'provaSkizzeEmbed',
      group: 'block',
      atom: true,
      selectable: true,
      draggable: false,

      addAttributes() {
        return {
          skizzeId:    { default: null, parseHTML: el => el.getAttribute('data-skizze-id'),    renderHTML: a => ({ 'data-skizze-id': a.skizzeId || '' }) },
          svgContent:  { default: '',   parseHTML: el => el.querySelector('.prova-skizze-svg')?.innerHTML || '', renderHTML: () => ({}) },
          titel:       { default: '',   parseHTML: el => el.querySelector('figcaption')?.textContent || '', renderHTML: () => ({}) },
          massstab:    { default: null, parseHTML: el => el.getAttribute('data-massstab'),     renderHTML: a => a.massstab ? { 'data-massstab': a.massstab } : {} }
        };
      },

      parseHTML() {
        return [{ tag: 'figure.prova-skizze-embed' }];
      },

      renderHTML({ node, HTMLAttributes }) {
        const captionParts = [node.attrs.titel || 'Skizze'];
        if (node.attrs.massstab) captionParts.push(`Maßstab ${node.attrs.massstab}`);
        // SVG-Content wird vom Editor via Decoration eingehängt (sicher),
        // hier rendert TipTap nur das Markup-Skelett. SVG via Plugin oder
        // separate Render-Pass in FragmentSidebar/View.
        return [
          'figure',
          mergeAttributes({ class: 'prova-skizze-embed', 'data-skizze-id': node.attrs.skizzeId || '' }, HTMLAttributes),
          ['div', { class: 'prova-skizze-svg' }, 0],
          ['figcaption', {}, captionParts.join(' · ')]
        ];
      },

      addCommands() {
        return {
          insertSkizze: (attrs) => ({ commands }) => commands.insertContent({
            type: 'provaSkizzeEmbed',
            attrs: {
              skizzeId: attrs.skizzeId,
              svgContent: attrs.svgContent || '',
              titel: attrs.titel || '',
              massstab: attrs.massstab || null
            }
          })
        };
      },

      onCreate() {
        // Klick → CustomEvent fuer Skizzen-Editor (MEGA⁶⁹-FINAL-2 ProvaSkizzeEditor)
        const editorEl = this.editor.options.element;
        if (editorEl._provaSkizzeClickRegistered) return;
        editorEl._provaSkizzeClickRegistered = true;
        editorEl.addEventListener('click', (e) => {
          const embed = e.target.closest('.prova-skizze-embed');
          if (!embed) return;
          const skizzeId = embed.dataset.skizzeId;
          if (!skizzeId) return;
          document.dispatchEvent(new CustomEvent('prova:skizze-open', {
            detail: { skizzeId, embedEl: embed }
          }));
        });
      }
    });
  }

  // ─── MEGA⁶⁹-FINAL-2: Global Listener für Re-Open + /skizze Create ───
  // Hört auf prova:skizze-open (von Embed-Click) und prova:skizze-create (vom Slash-Menü)
  // und öffnet ProvaSkizzeEditor falls geladen.
  if (typeof document !== 'undefined' && !document.__provaSkizzeListenerInstalled) {
    document.__provaSkizzeListenerInstalled = true;

    document.addEventListener('prova:skizze-open', async (e) => {
      const { skizzeId, embedEl } = e.detail || {};
      if (!skizzeId || !window.ProvaSkizzeEditor) return;
      // Lade initialSvg aus Backend (skizzen-list mit id-Filter)
      try {
        const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
        const sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
        const { data, error } = await sb.from('skizzen').select('id,auftrag_id,titel,svg_content,massstab,foto_referenz_id').eq('id', skizzeId).single();
        if (error || !data) { console.warn('[prova-skizze] load failed:', error); return; }
        window.ProvaSkizzeEditor.openModal({
          auftragId: data.auftrag_id,
          skizzeId: data.id,
          titel: data.titel,
          initialSvg: data.svg_content,
          onSave: (result) => {
            // Update inline-SVG im Embed
            if (embedEl) {
              const svgWrap = embedEl.querySelector('.prova-skizze-svg');
              if (svgWrap) svgWrap.innerHTML = result.svg;
            }
          }
        });
      } catch (err) { console.error('[prova-skizze] re-open error:', err); }
    });

    document.addEventListener('prova:skizze-create', (e) => {
      const { auftragId, editor } = e.detail || {};
      if (!window.ProvaSkizzeEditor) return;
      window.ProvaSkizzeEditor.openModal({
        auftragId,
        onSave: (result) => {
          if (!editor || !result.skizzeId) return;
          try {
            editor.chain().focus().insertContent({
              type: 'provaSkizzeEmbed',
              attrs: {
                skizzeId: result.skizzeId,
                svgContent: result.svg,
                titel: result.titel,
                massstab: result.massstab ? JSON.stringify(result.massstab) : null
              }
            }).run();
          } catch (err) { console.error('[prova-skizze] insert failed:', err); }
        }
      });
    });
  }

  global.ProvaSkizzeEmbedFactory = ProvaSkizzeEmbedFactory;
})(typeof window !== 'undefined' ? window : globalThis);
