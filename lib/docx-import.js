/**
 * PROVA DOCX-Import (MEGA⁴⁰ P4)
 *
 * Konvertiert DOCX → TipTap-JSON via mammoth.js (BSD-2-Clause, ~280 KB minified).
 * Recherche: docs/sprint-research/MEGA40-P4-DOCX-IMPORT-RECHERCHE.md
 *
 * Public API (window.ProvaDocxImport):
 *   importDocx(arrayBuffer): Promise<{
 *     html: string,
 *     tipTapJson: Object,
 *     placeholders: Array<{token, count}>,
 *     warnings: Array<string>,
 *     messages: Array<{type, message}>
 *   }>
 *
 *   extractPlaceholders(html): Array<{token, count}>
 *   htmlToTipTapJson(htmlString): Object
 *   detectWordWarnings(html, messages): Array<string>
 *
 * Style-Mapping (PROVA-Konvention):
 *   Heading 1 → h2 (PROVA Doc-Titel ist H1, nicht aus DOCX)
 *   Heading 2 → h3, Heading 3 → h4
 *   Quote → blockquote
 */
'use strict';

(function () {

  const MAMMOTH_CDN = 'https://esm.sh/mammoth@1';
  let _mammoth = null;
  let _loadPromise = null;

  // PROVA-Style-Map (mammoth.js Konvention)
  const PROVA_STYLE_MAP = [
    "p[style-name='Heading 1'] => h2:fresh",
    "p[style-name='Heading 2'] => h3:fresh",
    "p[style-name='Heading 3'] => h4:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "p[style-name='Intense Quote'] => blockquote:fresh",
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em",
    "r[style-name='Code'] => code"
  ];

  // Platzhalter-Pattern (ähnlich Mustache/Handlebars)
  const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

  async function _loadMammoth() {
    if (_mammoth) return _mammoth;
    if (_loadPromise) return _loadPromise;
    _loadPromise = (async () => {
      try {
        const m = await import(MAMMOTH_CDN);
        _mammoth = m.default || m;
        return _mammoth;
      } catch (e) {
        console.warn('[ProvaDocxImport] mammoth.js CDN-Load failed:', e.message);
        throw e;
      }
    })();
    return _loadPromise;
  }

  /**
   * Hauptfunktion: ArrayBuffer (von File.arrayBuffer()) → TipTap-Doc.
   *
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Object>}
   */
  async function importDocx(arrayBuffer) {
    if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
      throw new Error('importDocx erwartet ArrayBuffer');
    }

    const mammoth = await _loadMammoth();
    if (!mammoth || !mammoth.convertToHtml) {
      throw new Error('mammoth.js nicht verfügbar');
    }

    const result = await mammoth.convertToHtml(
      { arrayBuffer: arrayBuffer },
      { styleMap: PROVA_STYLE_MAP, includeDefaultStyleMap: true }
    );

    const html = result.value || '';
    const messages = (result.messages || []).map(m => ({
      type: m.type || 'info',
      message: m.message || String(m)
    }));

    const placeholders = extractPlaceholders(html);
    const tipTapJson = htmlToTipTapJson(html);
    const warnings = detectWordWarnings(html, messages);

    return { html, tipTapJson, placeholders, warnings, messages };
  }

  /**
   * Platzhalter-Detection: findet alle {{Token}}-Vorkommen.
   *
   * @param {string} html
   * @returns {Array<{token, count}>}
   */
  function extractPlaceholders(html) {
    if (!html || typeof html !== 'string') return [];
    const counts = {};
    let m;
    PLACEHOLDER_PATTERN.lastIndex = 0;
    while ((m = PLACEHOLDER_PATTERN.exec(html)) !== null) {
      const token = m[1];
      counts[token] = (counts[token] || 0) + 1;
    }
    return Object.keys(counts).sort().map(token => ({ token: token, count: counts[token] }));
  }

  /**
   * Detect Word-Eigenheiten die in HTML/TipTap nicht 1:1 übersetzt werden.
   *
   * @param {string} html
   * @param {Array} messages — von mammoth.js
   * @returns {Array<string>}
   */
  function detectWordWarnings(html, messages) {
    const warnings = [];
    if (!html) return warnings;

    // Page-Break-Erkennung
    if (/page-break|w:br[^>]*type=["']page["']|<br[^>]*pagebreak/i.test(html)) {
      warnings.push('Seitenumbrüche aus Word werden im PROVA-Editor nicht erhalten — bitte manuell mit dem Seitenumbruch-Button setzen.');
    }
    // Footer/Header
    if (/<footer|<header[^>]*role=["']document-header/i.test(html)) {
      warnings.push('Word-Kopf-/Fußzeilen werden ignoriert — PROVA setzt diese automatisch beim PDF-Export.');
    }
    // Tracked-Changes
    if (/data-tracked-change|w:ins|w:del/i.test(html)) {
      warnings.push('Word-Änderungsverfolgung ("Track Changes") wurde abgeflacht — Status: aktuelle Version nach allen Annahmen.');
    }
    // mammoth-Messages
    messages.forEach(m => {
      if (m.type === 'warning' || m.type === 'error') {
        warnings.push('mammoth: ' + m.message);
      }
    });
    return warnings;
  }

  /**
   * HTML → TipTap-JSON via DOMParser + Walker.
   *
   * Pragmatic: DOMParser im Browser, jsdom-fallback in Tests (wo aufgerufen
   * mit { domParser } opts).
   *
   * @param {string} html
   * @param {Object} [opts] - { domParser?: function(html) → Document }
   * @returns {Object} TipTap-Doc
   */
  function htmlToTipTapJson(html, opts) {
    opts = opts || {};
    if (!html || typeof html !== 'string') {
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }

    let doc;
    if (typeof opts.domParser === 'function') {
      doc = opts.domParser(html);
    } else if (typeof DOMParser !== 'undefined') {
      doc = new DOMParser().parseFromString('<div id="__root">' + html + '</div>', 'text/html');
    } else {
      // Node ohne DOMParser — minimale Regex-Strategie
      return _htmlToTipTapJsonRegex(html);
    }

    const root = doc.getElementById ? doc.getElementById('__root') : doc.querySelector('#__root');
    if (!root) return { type: 'doc', content: [{ type: 'paragraph' }] };

    const content = [];
    Array.from(root.childNodes).forEach(node => {
      const tipTap = _domNodeToTipTap(node);
      if (tipTap) content.push(tipTap);
    });

    return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
  }

  function _domNodeToTipTap(node) {
    if (!node) return null;
    if (node.nodeType === 3) {  // Text-Node
      const t = node.textContent || '';
      if (!t.trim()) return null;
      return { type: 'paragraph', content: [{ type: 'text', text: t }] };
    }
    if (node.nodeType !== 1) return null;  // nur Elements ab hier

    const tag = (node.tagName || '').toLowerCase();
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = parseInt(tag.charAt(1), 10) || 2;
        return { type: 'heading', attrs: { level: Math.min(level, 4) }, content: _inlineChildren(node) };
      }
      case 'p': {
        const children = _inlineChildren(node);
        return { type: 'paragraph', content: children.length > 0 ? children : [] };
      }
      case 'ul': {
        const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === 'li').map(li => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: _inlineChildren(li) }]
        }));
        return { type: 'bulletList', content: items };
      }
      case 'ol': {
        const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === 'li').map(li => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: _inlineChildren(li) }]
        }));
        return { type: 'orderedList', content: items };
      }
      case 'blockquote':
        return { type: 'blockquote', content: [{ type: 'paragraph', content: _inlineChildren(node) }] };
      case 'pre':
        return { type: 'codeBlock', content: [{ type: 'text', text: node.textContent || '' }] };
      case 'table':
        return _tableToTipTap(node);
      case 'img':
        return { type: 'image', attrs: { src: node.getAttribute('src') || '', alt: node.getAttribute('alt') || '' } };
      case 'hr':
        return { type: 'horizontalRule' };
      default: {
        // Generischer Block: Inline-Children als Paragraph
        const children = _inlineChildren(node);
        if (children.length > 0) return { type: 'paragraph', content: children };
        return null;
      }
    }
  }

  function _inlineChildren(node) {
    const out = [];
    Array.from(node.childNodes || []).forEach(child => {
      _walkInline(child, [], out);
    });
    return out;
  }

  function _walkInline(node, marks, out) {
    if (!node) return;
    if (node.nodeType === 3) {
      const t = node.textContent;
      if (t) out.push({ type: 'text', text: t, marks: marks.length > 0 ? marks.slice() : undefined });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node.tagName || '').toLowerCase();
    let nextMarks = marks;
    if (tag === 'strong' || tag === 'b') nextMarks = nextMarks.concat([{ type: 'bold' }]);
    else if (tag === 'em' || tag === 'i') nextMarks = nextMarks.concat([{ type: 'italic' }]);
    else if (tag === 'u') nextMarks = nextMarks.concat([{ type: 'underline' }]);
    else if (tag === 's' || tag === 'strike') nextMarks = nextMarks.concat([{ type: 'strike' }]);
    else if (tag === 'code') nextMarks = nextMarks.concat([{ type: 'code' }]);
    else if (tag === 'a' && node.getAttribute) {
      nextMarks = nextMarks.concat([{ type: 'link', attrs: { href: node.getAttribute('href') || '' } }]);
    } else if (tag === 'br') {
      out.push({ type: 'hardBreak' });
      return;
    } else if (tag === 'img' && node.getAttribute) {
      // Inline-Image (selten, aber valide)
      out.push({ type: 'image', attrs: { src: node.getAttribute('src') || '', alt: node.getAttribute('alt') || '' } });
      return;
    }
    Array.from(node.childNodes || []).forEach(child => _walkInline(child, nextMarks, out));
  }

  function _tableToTipTap(table) {
    const rows = [];
    Array.from(table.querySelectorAll ? table.querySelectorAll('tr') : []).forEach((tr, rowIdx) => {
      const cells = [];
      Array.from(tr.children || []).forEach(cell => {
        const cellTag = cell.tagName.toLowerCase();
        const cellType = (cellTag === 'th' || rowIdx === 0) ? 'tableHeader' : 'tableCell';
        cells.push({
          type: cellType,
          attrs: { colspan: parseInt(cell.getAttribute('colspan') || 1, 10), rowspan: parseInt(cell.getAttribute('rowspan') || 1, 10) },
          content: [{ type: 'paragraph', content: _inlineChildren(cell) }]
        });
      });
      rows.push({ type: 'tableRow', content: cells });
    });
    return { type: 'table', content: rows };
  }

  /**
   * Fallback: Naïve Regex-basierte HTML→TipTap-Konvertierung.
   * Wird in Node-ohne-DOMParser-Umgebung genutzt (z.B. Test-Suite ohne jsdom).
   */
  function _htmlToTipTapJsonRegex(html) {
    const content = [];
    // Sehr simple Heading + Paragraph-Detektion
    const blockRe = /<(h[1-4]|p|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = blockRe.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      const rawText = m[3].replace(/<[^>]+>/g, '').trim();
      if (!rawText) continue;
      if (tag.startsWith('h')) {
        content.push({ type: 'heading', attrs: { level: parseInt(tag.charAt(1), 10) || 2 }, content: [{ type: 'text', text: rawText }] });
      } else if (tag === 'blockquote') {
        content.push({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: rawText }] }] });
      } else {
        content.push({ type: 'paragraph', content: [{ type: 'text', text: rawText }] });
      }
    }
    return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
  }

  // Public API
  const api = {
    importDocx: importDocx,
    extractPlaceholders: extractPlaceholders,
    htmlToTipTapJson: htmlToTipTapJson,
    detectWordWarnings: detectWordWarnings,
    PROVA_STYLE_MAP: PROVA_STYLE_MAP,
    PLACEHOLDER_PATTERN: PLACEHOLDER_PATTERN,
    _htmlToTipTapJsonRegex: _htmlToTipTapJsonRegex,
    _domNodeToTipTap: _domNodeToTipTap
  };

  if (typeof window !== 'undefined') {
    window.ProvaDocxImport = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
