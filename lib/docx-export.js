/**
 * PROVA DOCX/HTML/Markdown-Export (MEGA⁴⁰ P5)
 *
 * Public API (window.ProvaDocxExport):
 *   exportHtml(tipTapJson, opts?) → string (HTML mit PROVA-Wrap)
 *   exportMarkdown(tipTapJson) → string
 *   exportDocxBlob(tipTapJson, opts?) → Promise<Blob>
 *     (POSTet zu /editor-docx-export Lambda → DOCX als Blob)
 *   downloadBlob(blob, filename) → triggers download
 *
 * Roundtrip:
 *   ProvaDocxImport.importDocx(buffer) → json
 *   ProvaDocxExport.exportHtml(json) → html
 *   → strukturell ≥80% identisch zum Original-DOCX (Headings, Listen, Tabellen, Bilder)
 *
 * DOCX-Lambda: /editor-docx-export
 *   Body: { tipTapJson, titel? }
 *   Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */
'use strict';

(function () {

  const DOCX_EXPORT_ENDPOINT = '/.netlify/functions/editor-docx-export';

  /**
   * TipTap-JSON → HTML (PROVA-Wrap optional).
   *
   * @param {Object} json
   * @param {Object} [opts] - { wrap?: boolean (default true), title?: string }
   */
  function exportHtml(json, opts) {
    opts = opts || {};
    const body = _renderHtml(json);
    if (opts.wrap === false) return body;
    return _htmlEnvelope(body, opts.title || 'PROVA-Dokument');
  }

  function _htmlEnvelope(body, title) {
    return '<!DOCTYPE html>\n<html lang="de"><head><meta charset="UTF-8">' +
      '<title>' + _esc(title) + '</title>' +
      '<style>' +
      'body{font-family:Inter,-apple-system,sans-serif;max-width:780px;margin:24px auto;padding:0 20px;line-height:1.65;color:#0f172a;}' +
      'h1,h2,h3,h4{margin:18px 0 8px;color:#1a3a6b;}' +
      'p{margin:0 0 12px;}' +
      'ul,ol{margin:0 0 12px;padding-left:24px;}' +
      'blockquote{margin:12px 0;padding:8px 16px;border-left:3px solid #4f8ef7;background:#f8fafc;font-style:italic;}' +
      'pre{margin:12px 0;padding:12px;background:#f8fafc;border-radius:6px;font-family:JetBrains Mono,monospace;}' +
      'table{border-collapse:collapse;width:100%;margin:12px 0;}' +
      'table th,table td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left;}' +
      'table th{background:#f8fafc;font-weight:600;}' +
      'img{max-width:100%;height:auto;border-radius:4px;}' +
      'sup.prova-editor-footnote{font-size:0.78em;color:#4f8ef7;cursor:help;}' +
      'sup.prova-editor-footnote::before{content:"[";}sup.prova-editor-footnote::after{content:"]";}' +
      'div[data-page-break]{display:block;height:0;page-break-before:always;}' +
      '</style></head><body>' + body + '</body></html>';
  }

  function _renderHtml(node) {
    if (!node) return '';
    if (Array.isArray(node)) return node.map(_renderHtml).join('');
    if (node.type === 'doc') return _renderHtml(node.content || []);
    if (node.type === 'text') return _wrapMarks(node.text || '', node.marks || []);

    const inner = _renderHtml(node.content || []);
    switch (node.type) {
      case 'paragraph': {
        const align = node.attrs && node.attrs.textAlign;
        const styleAttr = align && align !== 'left' ? ' style="text-align:' + align + ';"' : '';
        return '<p' + styleAttr + '>' + inner + '</p>';
      }
      case 'heading': {
        const level = (node.attrs && node.attrs.level) || 2;
        return '<h' + level + '>' + inner + '</h' + level + '>';
      }
      case 'bulletList': return '<ul>' + inner + '</ul>';
      case 'orderedList': return '<ol>' + inner + '</ol>';
      case 'listItem': return '<li>' + inner + '</li>';
      case 'blockquote': return '<blockquote>' + inner + '</blockquote>';
      case 'codeBlock': return '<pre><code>' + _esc(_extractText(node)) + '</code></pre>';
      case 'horizontalRule': return '<hr>';
      case 'hardBreak': return '<br>';
      case 'image': {
        const a = node.attrs || {};
        const alt = _esc(a.alt || '');
        return '<img src="' + _esc(a.src || '') + '" alt="' + alt + '"' +
               (a.title ? ' title="' + _esc(a.title) + '"' : '') + '>';
      }
      case 'pageBreak': return '<div data-page-break="true" class="prova-editor-pagebreak"></div>';
      case 'table': return '<table>' + inner + '</table>';
      case 'tableRow': return '<tr>' + inner + '</tr>';
      case 'tableHeader': return '<th' + _cellAttrs(node) + '>' + inner + '</th>';
      case 'tableCell': return '<td' + _cellAttrs(node) + '>' + inner + '</td>';
      default: return inner;
    }
  }

  function _cellAttrs(node) {
    const a = node.attrs || {};
    let out = '';
    if (a.colspan && a.colspan > 1) out += ' colspan="' + a.colspan + '"';
    if (a.rowspan && a.rowspan > 1) out += ' rowspan="' + a.rowspan + '"';
    return out;
  }

  function _wrapMarks(text, marks) {
    let out = _esc(text);
    if (!Array.isArray(marks)) return out;
    marks.forEach(m => {
      switch (m.type) {
        case 'bold': out = '<strong>' + out + '</strong>'; break;
        case 'italic': out = '<em>' + out + '</em>'; break;
        case 'underline': out = '<u>' + out + '</u>'; break;
        case 'strike': out = '<s>' + out + '</s>'; break;
        case 'code': out = '<code>' + out + '</code>'; break;
        case 'link': {
          const href = (m.attrs && m.attrs.href) || '#';
          out = '<a href="' + _esc(href) + '" rel="noopener noreferrer">' + out + '</a>';
          break;
        }
        case 'footnote': {
          const a = m.attrs || {};
          out = '<sup class="prova-editor-footnote" data-footnote-nr="' + (a.number || '') + '" title="' +
                _esc(a.text || '') + '">' + out + '</sup>';
          break;
        }
        case 'crossRef': {
          const a = m.attrs || {};
          out = '<span class="prova-editor-xref" data-xref-target="' + _esc(a.targetId || '') + '">' + out + '</span>';
          break;
        }
        case 'highlight': {
          const c = (m.attrs && m.attrs.color) || 'yellow';
          out = '<mark style="background:' + _esc(c) + ';">' + out + '</mark>';
          break;
        }
        case 'textStyle': {
          const c = m.attrs && m.attrs.color;
          if (c) out = '<span style="color:' + _esc(c) + ';">' + out + '</span>';
          break;
        }
        case 'fontFamily': {
          const f = m.attrs && m.attrs.fontFamily;
          if (f) out = '<span style="font-family:' + _esc(f) + ';">' + out + '</span>';
          break;
        }
      }
    });
    return out;
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _extractText(node) {
    if (!node) return '';
    if (typeof node.text === 'string') return node.text;
    if (Array.isArray(node.content)) return node.content.map(_extractText).join('');
    return '';
  }

  /**
   * TipTap-JSON → Markdown.
   */
  function exportMarkdown(json) {
    return _renderMarkdown(json).trim();
  }

  function _renderMarkdown(node) {
    if (!node) return '';
    if (Array.isArray(node)) return node.map(_renderMarkdown).join('');
    if (node.type === 'doc') return _renderMarkdown(node.content || []);
    if (node.type === 'text') return _markMarkdown(node.text || '', node.marks || []);

    const inner = _renderMarkdown(node.content || []);
    switch (node.type) {
      case 'paragraph': return inner + '\n\n';
      case 'heading': {
        const lvl = (node.attrs && node.attrs.level) || 2;
        return '#'.repeat(lvl) + ' ' + inner.trim() + '\n\n';
      }
      case 'bulletList':
        return (node.content || []).map(li => '- ' + _renderMarkdown(li.content || []).trim()).join('\n') + '\n\n';
      case 'orderedList':
        return (node.content || []).map((li, i) => (i + 1) + '. ' + _renderMarkdown(li.content || []).trim()).join('\n') + '\n\n';
      case 'listItem': return inner;
      case 'blockquote': return '> ' + inner.trim().replace(/\n/g, '\n> ') + '\n\n';
      case 'codeBlock': return '```\n' + _extractText(node) + '\n```\n\n';
      case 'horizontalRule': return '\n---\n\n';
      case 'hardBreak': return '  \n';
      case 'image': {
        const a = node.attrs || {};
        return '![' + (a.alt || '') + '](' + (a.src || '') + ')\n\n';
      }
      case 'pageBreak': return '\n<!-- pagebreak -->\n\n';
      case 'table': {
        // Nimm erste Zeile als Header
        const rows = (node.content || []);
        if (rows.length === 0) return '';
        const headerCells = (rows[0].content || []).map(c => _renderMarkdown(c.content || []).trim() || ' ');
        const sep = headerCells.map(() => '---');
        const dataRows = rows.slice(1).map(r =>
          (r.content || []).map(c => _renderMarkdown(c.content || []).trim() || ' ').join(' | ')
        );
        return '| ' + headerCells.join(' | ') + ' |\n| ' + sep.join(' | ') + ' |\n' +
               (dataRows.length > 0 ? dataRows.map(r => '| ' + r + ' |').join('\n') + '\n\n' : '\n');
      }
      default: return inner;
    }
  }

  function _markMarkdown(text, marks) {
    let out = text;
    if (!Array.isArray(marks)) return out;
    marks.forEach(m => {
      switch (m.type) {
        case 'bold': out = '**' + out + '**'; break;
        case 'italic': out = '*' + out + '*'; break;
        case 'code': out = '`' + out + '`'; break;
        case 'strike': out = '~~' + out + '~~'; break;
        case 'link': {
          const href = (m.attrs && m.attrs.href) || '#';
          out = '[' + out + '](' + href + ')';
          break;
        }
        case 'footnote': {
          out = out + '[^' + ((m.attrs && m.attrs.number) || 'fn') + ']';
          break;
        }
      }
    });
    return out;
  }

  /**
   * DOCX-Export via Backend-Lambda.
   *
   * @param {Object} tipTapJson
   * @param {Object} [opts] - { titel?, filename? }
   * @returns {Promise<Blob>}
   */
  async function exportDocxBlob(tipTapJson, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    // Auth-Token wenn da
    try {
      if (window.netlifyIdentity && window.netlifyIdentity.currentUser) {
        const u = window.netlifyIdentity.currentUser();
        if (u && u.token && u.token.access_token) headers['Authorization'] = 'Bearer ' + u.token.access_token;
      }
    } catch (_) {}

    const res = await fetch(DOCX_EXPORT_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        content_json: tipTapJson,
        titel: opts.titel || 'PROVA-Dokument'
      })
    });
    if (!res.ok) {
      let err = 'HTTP ' + res.status;
      try { const j = await res.json(); err = j.error || err; } catch (_) {}
      throw new Error(err);
    }
    return await res.blob();
  }

  function downloadBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'dokument.docx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function downloadHtml(json, filename, title) {
    const html = exportHtml(json, { title: title });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, filename || 'dokument.html');
  }

  function downloadMarkdown(json, filename) {
    const md = exportMarkdown(json);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, filename || 'dokument.md');
  }

  // Public API
  const api = {
    exportHtml: exportHtml,
    exportMarkdown: exportMarkdown,
    exportDocxBlob: exportDocxBlob,
    downloadBlob: downloadBlob,
    downloadHtml: downloadHtml,
    downloadMarkdown: downloadMarkdown,
    DOCX_EXPORT_ENDPOINT: DOCX_EXPORT_ENDPOINT,
    _renderHtml: _renderHtml,
    _renderMarkdown: _renderMarkdown,
    _esc: _esc
  };

  if (typeof window !== 'undefined') {
    window.ProvaDocxExport = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
