/**
 * PROVA Editor-Extensions (MEGA⁴⁰ P2)
 *
 * Custom TipTap-Extensions:
 *   - Footnote (Mark)         → Auto-Numerierung beim Insert
 *   - PageBreak (Node)        → DIN-A4-Seitenumbruch (Print + PDF)
 *   - CrossRef (Mark)         → Querverweise auf Heading-IDs
 *
 * Helpers (kein TipTap-Plugin, sondern Funktionen über editor.getJSON()):
 *   - generateToC(json)       → ToC-JSON-Block aus Headings
 *   - autoNumberFootnotes(json) → Re-Numerierung [1] [2] [3] auf Save
 *   - resolveCrossRefs(json, headingMap) → "siehe Abschnitt §X.Y" Auflösung
 *
 * Public API (via window.ProvaEditorExtensions):
 *   create(modules) → { Footnote, PageBreak, CrossRef }
 *   generateToC(json) → { type: 'doc', content: [...] }
 *   autoNumberFootnotes(json) → modified json
 *   collectHeadings(json) → [{ id, level, text }]
 *
 * USAGE:
 *   const ext = ProvaEditorExtensions.create(tiptapModules);
 *   editor.extensionManager.extensions.push(ext.Footnote, ext.PageBreak, ext.CrossRef);
 *
 *   const tocDoc = ProvaEditorExtensions.generateToC(editor.getJSON());
 */
'use strict';

(function () {

  /**
   * Erstelle Footnote/PageBreak/CrossRef Extensions aus dem geladenen
   * @tiptap/core Module. Wird zur Laufzeit aus modules._coreModule aufgerufen.
   *
   * @param {Object} core - das @tiptap/core Module (mit Mark.create, Node.create)
   */
  function createFromCore(core) {
    if (!core || typeof core.Mark === 'undefined' || typeof core.Node === 'undefined') {
      console.warn('[ProvaEditorExtensions] core.Mark / core.Node fehlen — Extensions deaktiviert');
      return { Footnote: null, PageBreak: null, CrossRef: null };
    }

    const Footnote = core.Mark.create({
      name: 'footnote',
      inclusive: false,
      addAttributes() {
        return {
          number: { default: null, parseHTML: el => parseInt(el.getAttribute('data-footnote-nr'), 10) || null,
                     renderHTML: attrs => attrs.number == null ? {} : { 'data-footnote-nr': String(attrs.number) } },
          text:   { default: null, parseHTML: el => el.getAttribute('data-footnote-text') || null,
                     renderHTML: attrs => attrs.text ? { 'data-footnote-text': attrs.text, 'title': attrs.text } : {} }
        };
      },
      parseHTML() { return [{ tag: 'sup[data-footnote-nr]' }]; },
      renderHTML({ HTMLAttributes }) {
        return ['sup', Object.assign({ class: 'prova-editor-footnote' }, HTMLAttributes), 0];
      },
      addCommands() {
        return {
          setFootnote: (attrs) => ({ commands }) => commands.setMark(this.name, attrs),
          unsetFootnote: () => ({ commands }) => commands.unsetMark(this.name)
        };
      }
    });

    const PageBreak = core.Node.create({
      name: 'pageBreak',
      group: 'block',
      atom: true,
      selectable: true,
      parseHTML() {
        return [
          { tag: 'div[data-page-break]' },
          { tag: 'hr[data-page-break]' }
        ];
      },
      renderHTML() {
        return ['div', { 'data-page-break': 'true', class: 'prova-editor-pagebreak', 'aria-label': 'Seitenumbruch' }];
      },
      addCommands() {
        return {
          insertPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name })
        };
      }
    });

    const CrossRef = core.Mark.create({
      name: 'crossRef',
      inclusive: false,
      addAttributes() {
        return {
          targetId: { default: null,
                      parseHTML: el => el.getAttribute('data-xref-target'),
                      renderHTML: attrs => attrs.targetId ? { 'data-xref-target': attrs.targetId } : {} },
          label:    { default: null,
                      parseHTML: el => el.getAttribute('data-xref-label'),
                      renderHTML: attrs => attrs.label ? { 'data-xref-label': attrs.label } : {} }
        };
      },
      parseHTML() { return [{ tag: 'span[data-xref-target]' }]; },
      renderHTML({ HTMLAttributes }) {
        return ['span', Object.assign({ class: 'prova-editor-xref' }, HTMLAttributes), 0];
      },
      addCommands() {
        return {
          setCrossRef: (attrs) => ({ commands }) => commands.setMark(this.name, attrs),
          unsetCrossRef: () => ({ commands }) => commands.unsetMark(this.name)
        };
      }
    });

    return { Footnote, PageBreak, CrossRef };
  }

  // ─────────────────────────────────────────────────────────────────
  //  Helper-Functions (kein TipTap-State, nur JSON-Walks)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Walks JSON-Tree, sammelt alle headings als { level, text, id }.
   * Heading-IDs werden aus text generiert (slugified) wenn keine vorhanden.
   */
  function collectHeadings(json) {
    if (!json || typeof json !== 'object') return [];
    const out = [];
    const counter = { i: 1 };

    function walk(node) {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === 'heading') {
        const level = (node.attrs && node.attrs.level) || 1;
        const text = _extractText(node);
        let id = (node.attrs && node.attrs.id) || _slugify(text) || ('h' + counter.i);
        counter.i++;
        out.push({ id, level, text });
      }
      if (Array.isArray(node.content)) walk(node.content);
    }
    walk(json);
    return out;
  }

  /**
   * Generiere TipTap-JSON-ToC-Block aus Headings.
   *  → { type: 'doc', content: [{ type: 'heading', level: 2, content: [{ type: 'text', text: 'Inhaltsverzeichnis' }] },
   *                              { type: 'bulletList', content: [...]} ] }
   *
   * Pragmatisch: keine Auto-Update-Logic im Editor — wird beim Save aufgerufen + manuell eingefügt.
   */
  function generateToC(json) {
    const headings = collectHeadings(json);
    if (headings.length === 0) {
      return {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Inhaltsverzeichnis' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Keine Überschriften vorhanden.' }] }
        ]
      };
    }
    const items = headings.map(h => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          marks: [{ type: 'crossRef', attrs: { targetId: h.id, label: h.text } }],
          text: '§ ' + h.level + ' · ' + h.text
        }]
      }]
    }));
    return {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Inhaltsverzeichnis' }] },
        { type: 'bulletList', content: items }
      ]
    };
  }

  /**
   * Walk JSON, finde alle footnote-Marks, re-numbere [1], [2], [3]
   * (in Reihenfolge ihres ersten Vorkommens) — modifiziert JSON in-place.
   *
   * @returns {Object} new JSON (deep-copy mit aktualisierten Nummern)
   */
  function autoNumberFootnotes(json) {
    if (!json) return json;
    const cloned = JSON.parse(JSON.stringify(json));
    let nr = 1;

    function walk(node) {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (Array.isArray(node.marks)) {
        node.marks.forEach(m => {
          if (m.type === 'footnote') {
            m.attrs = m.attrs || {};
            m.attrs.number = nr++;
          }
        });
      }
      if (Array.isArray(node.content)) walk(node.content);
    }
    walk(cloned);
    return cloned;
  }

  /**
   * Resolve cross-refs: find all crossRef-marks, populate label aus headingMap.
   *
   * @param {Object} json
   * @param {Object} headingMap — { headingId: 'Heading Text' }
   * @returns {Object} new JSON
   */
  function resolveCrossRefs(json, headingMap) {
    if (!json) return json;
    const cloned = JSON.parse(JSON.stringify(json));
    function walk(node) {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (Array.isArray(node.marks)) {
        node.marks.forEach(m => {
          if (m.type === 'crossRef' && m.attrs && m.attrs.targetId) {
            const label = headingMap[m.attrs.targetId];
            if (label) m.attrs.label = label;
          }
        });
      }
      if (Array.isArray(node.content)) walk(node.content);
    }
    walk(cloned);
    return cloned;
  }

  // ─── Internals ───

  function _extractText(node) {
    if (!node) return '';
    if (typeof node.text === 'string') return node.text;
    if (Array.isArray(node.content)) {
      return node.content.map(_extractText).join('');
    }
    return '';
  }

  function _slugify(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  // ─── Public API ───

  const api = {
    createFromCore: createFromCore,
    generateToC: generateToC,
    collectHeadings: collectHeadings,
    autoNumberFootnotes: autoNumberFootnotes,
    resolveCrossRefs: resolveCrossRefs,
    _slugify: _slugify,
    _extractText: _extractText
  };

  if (typeof window !== 'undefined') {
    window.ProvaEditorExtensions = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
