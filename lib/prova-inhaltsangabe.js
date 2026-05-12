/**
 * PROVA Inhaltsangabe-Generator (MEGA⁶⁸ Item 6.7)
 *
 * Generiert Table-of-Contents aus Editor-Heading-Hierarchy.
 * Trigger: Cmd+K Command "Inhaltsangabe einfügen".
 *
 * API:
 *   ProvaInhaltsangabe.insert(editor) → fügt TOC am Anfang ein
 *   ProvaInhaltsangabe.generate(editor) → liefert TOC-Markdown
 */
'use strict';

(function (global) {

  const ProvaInhaltsangabe = {
    /**
     * Sammelt alle Heading-Nodes mit Hierarchie.
     * Liefert: [{ level, text, anchor }]
     */
    collect(editor) {
      if (!editor) return [];
      const out = [];
      let counter = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          const text = (node.textContent || '').trim();
          if (!text) return;
          counter++;
          out.push({
            level: node.attrs?.level || 1,
            text,
            anchor: `heading-${counter}`
          });
        }
      });
      return out;
    },

    /**
     * Generiert Markdown-TOC.
     */
    generate(editor) {
      const headings = this.collect(editor);
      if (headings.length === 0) return '';
      const lines = ['## Inhaltsverzeichnis', ''];
      for (const h of headings) {
        const indent = '  '.repeat(Math.max(0, h.level - 1));
        lines.push(`${indent}- ${h.text}`);
      }
      return lines.join('\n');
    },

    /**
     * Fügt TOC als prova-toc-block am Anfang des Dokuments ein.
     * Falls vorhanden: ersetzt existierenden TOC.
     */
    insert(editor) {
      const headings = this.collect(editor);
      if (headings.length === 0) {
        if (typeof window !== 'undefined' && window.alert) window.alert('Noch keine Überschriften vorhanden. Erst H1/H2/H3 einfügen.');
        return;
      }
      const tocNode = this._buildTocNode(headings);

      // Existing TOC entfernen (heading "Inhaltsverzeichnis" + folgende Liste)
      const doc = editor.state.doc;
      let removeFrom = -1;
      let removeTo = -1;
      doc.descendants((node, pos) => {
        if (removeFrom >= 0) return false;
        if (node.type.name === 'heading' && /^inhaltsverzeichnis\b/i.test(node.textContent || '')) {
          removeFrom = pos;
          // Suche bis zum nächsten heading
          let scanPos = pos + node.nodeSize;
          while (scanPos < doc.content.size) {
            const next = doc.nodeAt(scanPos);
            if (!next) break;
            if (next.type.name === 'heading') break;
            scanPos += next.nodeSize;
          }
          removeTo = scanPos;
          return false;
        }
      });

      const chain = editor.chain().focus();
      if (removeFrom >= 0) {
        chain.deleteRange({ from: removeFrom, to: removeTo });
      }
      chain.insertContentAt(removeFrom >= 0 ? removeFrom : 0, tocNode).run();
    },

    _buildTocNode(headings) {
      const tocHeading = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Inhaltsverzeichnis' }] };
      const items = headings.map(h => ({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: `${'  '.repeat(Math.max(0, h.level - 1))}${h.text}` }]
        }]
      }));
      return [tocHeading, { type: 'bulletList', content: items }];
    }
  };

  global.ProvaInhaltsangabe = ProvaInhaltsangabe;
})(typeof window !== 'undefined' ? window : globalThis);
