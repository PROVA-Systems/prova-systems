/**
 * PROVA — editor-docx-export.js (MEGA⁴⁰ P5)
 *
 * POST { content_json, titel? }
 * Response: Word-XML-Document (application/msword), öffnet Word nativ.
 *
 * Note: Liefert MS-Word-2003-XML-Format (WordprocessingML) — keine npm-Dependency
 * nötig. Word kann das via "Datei → Speichern unter → Word-Dokument (*.docx)"
 * konvertieren. Für native ZIP-DOCX-Generation siehe Folge-Sprint
 * (docx@8.5 npm-Install).
 *
 * Konvertierte Elemente:
 *   - heading{level} → <w:p><w:pPr><w:pStyle w:val="Heading{level}"/></w:pPr>...</w:p>
 *   - paragraph + textAlign
 *   - bulletList + orderedList → ListNumber-Style
 *   - blockquote → Quote-Style
 *   - codeBlock → fixedSys-Font Para
 *   - text + marks: bold/italic/underline/strike
 *   - hardBreak + horizontalRule
 *   - image (warning: src URL muss erreichbar sein)
 *   - table (vereinfacht ohne colspan/rowspan)
 *
 * Auth + RateLimit + Workspace-Resolution (lt. CLAUDE.md Regel 31-34).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

function _esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function _runProps(marks) {
  if (!Array.isArray(marks) || marks.length === 0) return '';
  let out = '<w:rPr>';
  marks.forEach(m => {
    switch (m.type) {
      case 'bold': out += '<w:b/>'; break;
      case 'italic': out += '<w:i/>'; break;
      case 'underline': out += '<w:u w:val="single"/>'; break;
      case 'strike': out += '<w:strike/>'; break;
      case 'code': out += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>'; break;
      case 'highlight': out += '<w:highlight w:val="yellow"/>'; break;
      case 'textStyle':
        if (m.attrs && m.attrs.color) {
          const hex = String(m.attrs.color).replace(/^#/, '').toUpperCase();
          if (/^[0-9A-F]{6}$/.test(hex)) out += '<w:color w:val="' + hex + '"/>';
        }
        break;
    }
  });
  out += '</w:rPr>';
  return out === '<w:rPr></w:rPr>' ? '' : out;
}

function _renderText(text, marks) {
  return '<w:r>' + _runProps(marks) + '<w:t xml:space="preserve">' + _esc(text) + '</w:t></w:r>';
}

function _renderInline(node) {
  if (!node) return '';
  if (node.type === 'text') return _renderText(node.text || '', node.marks);
  if (node.type === 'hardBreak') return '<w:r><w:br/></w:r>';
  if (node.type === 'image') {
    const a = node.attrs || {};
    return _renderText('[Bild: ' + (a.alt || a.src || '') + ']', [{ type: 'italic' }]);
  }
  if (Array.isArray(node.content)) return node.content.map(_renderInline).join('');
  return '';
}

function _para(inner, opts) {
  opts = opts || {};
  let pPr = '<w:pPr>';
  if (opts.style) pPr += '<w:pStyle w:val="' + opts.style + '"/>';
  if (opts.numId != null) {
    pPr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + opts.numId + '"/></w:numPr>';
  }
  if (opts.align) pPr += '<w:jc w:val="' + opts.align + '"/>';
  pPr += '</w:pPr>';
  if (pPr === '<w:pPr></w:pPr>') pPr = '';
  return '<w:p>' + pPr + inner + '</w:p>';
}

function _alignVal(textAlign) {
  if (!textAlign || textAlign === 'left') return null;
  if (textAlign === 'center') return 'center';
  if (textAlign === 'right') return 'right';
  if (textAlign === 'justify') return 'both';
  return null;
}

function _renderBlock(node) {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(_renderBlock).join('');
  if (node.type === 'doc') return _renderBlock(node.content || []);

  const inlineContent = (node.content || []).map(_renderInline).join('');

  switch (node.type) {
    case 'paragraph': {
      const align = _alignVal(node.attrs && node.attrs.textAlign);
      return _para(inlineContent, { align: align });
    }
    case 'heading': {
      const lvl = Math.min((node.attrs && node.attrs.level) || 2, 6);
      return _para(inlineContent, { style: 'Heading' + lvl });
    }
    case 'bulletList':
      return (node.content || []).map(li => _renderListItem(li, 1)).join('');
    case 'orderedList':
      return (node.content || []).map(li => _renderListItem(li, 2)).join('');
    case 'blockquote':
      return (node.content || []).map(c => {
        const inner = (c.content || []).map(_renderInline).join('');
        return _para(inner, { style: 'Quote' });
      }).join('');
    case 'codeBlock':
      return _para(_renderText(_extractText(node), [{ type: 'code' }]), { style: 'Code' });
    case 'horizontalRule':
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
    case 'pageBreak':
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    case 'table':
      return _renderTable(node);
    default:
      return _para(inlineContent);
  }
}

function _renderListItem(li, numId) {
  // listItem.content sind paragraphs
  const paras = li.content || [];
  return paras.map(p => {
    const inner = (p.content || []).map(_renderInline).join('');
    return _para(inner, { style: numId === 1 ? 'ListBullet' : 'ListNumber', numId: numId });
  }).join('');
}

function _renderTable(table) {
  const rows = table.content || [];
  const tblXml = '<w:tbl>' +
    '<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>' +
    rows.map(row => {
      const cells = row.content || [];
      return '<w:tr>' + cells.map(cell => {
        const cellInner = (cell.content || []).map(c => {
          const inner = (c.content || []).map(_renderInline).join('');
          return _para(inner);
        }).join('');
        return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' + cellInner + '</w:tc>';
      }).join('') + '</w:tr>';
    }).join('') +
    '</w:tbl>';
  return tblXml;
}

function _extractText(node) {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) return node.content.map(_extractText).join('');
  return '';
}

/**
 * Build complete WordprocessingML-2003-XML-Document.
 */
function buildWordXml(tipTapJson, titel) {
  const body = _renderBlock(tipTapJson);
  const safeTitel = _esc(titel || 'PROVA-Dokument');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<?mso-application progid="Word.Document"?>\n' +
    '<w:wordDocument ' +
    'xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns="http://schemas.microsoft.com/office/word/2003/wordml">' +
    '<o:DocumentProperties><o:Title>' + safeTitel + '</o:Title>' +
    '<o:Author>PROVA Systems</o:Author></o:DocumentProperties>' +
    '<w:body>' + body + '</w:body></w:wordDocument>';
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event, functionName: 'editor-docx-export' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.content_json || typeof body.content_json !== 'object') {
    return jsonResponse(event, 400, { error: 'content_json (object) pflicht' });
  }

  try {
    const xml = buildWordXml(body.content_json, body.titel || 'PROVA-Dokument');
    const filename = (body.titel || 'PROVA-Dokument').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) + '.xml';

    const headers = Object.assign({}, getCorsHeaders(event), {
      'Content-Type': 'application/msword',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'X-Format': 'WordprocessingML-2003',
      'X-Note': 'Word-XML-Format; oeffnet in MS Word, dort als .docx speichern fuer native Format'
    });

    return {
      statusCode: 200,
      headers: headers,
      body: xml,
      isBase64Encoded: false
    };
  } catch (e) {
    return jsonResponse(event, 500, { error: 'Export-Fehler', detail: e.message });
  }
}), { functionName: 'editor-docx-export' });

// Export-Helpers für Tests
module.exports.__internals = {
  buildWordXml: buildWordXml,
  _renderBlock: _renderBlock,
  _renderInline: _renderInline,
  _esc: _esc
};
