/**
 * PROVA Editor-PDF-Generator (MEGA⁴⁰ P9)
 *
 * Client-side PDF-Generation via Browser-Print-API (window.print() in
 * neuem Window mit IHK-konformem CSS).
 *
 * Performance: <1s für Render (Browser-Print + DOMParser); User
 * speichert dann via Browser-Print-Dialog "Als PDF speichern".
 *
 * Hybrid-Modus (weg_c): Locked-Sections werden VOR Render injiziert
 * (Deckblatt + §407a + EU AI Act + Unterschrift).
 *
 * Public API (window.ProvaEditorPdfGenerator):
 *   generate(tipTapJson, opts) — opens print-window
 *   buildPrintHtml(tipTapJson, opts) — returns full HTML (testbar)
 *
 * IHK-konform:
 *   - DIN A4 (@page size: A4)
 *   - 25mm Margins (DIN 5008)
 *   - Times New Roman 11pt (Standard-Gutachten)
 *   - Header/Footer mit Seitenzahl + Aktenzeichen
 */
'use strict';

(function () {

  /**
   * Build complete HTML-Document (mit IHK-konformem CSS) für Print.
   *
   * @param {Object} tipTapJson
   * @param {Object} opts - { titel, weg, vars?, lockedSections?: boolean }
   * @returns {string}
   */
  function buildPrintHtml(tipTapJson, opts) {
    opts = opts || {};
    const titel = opts.titel || 'PROVA-Gutachten';
    const vars = opts.vars || {};

    // Locked-Sections injizieren bei weg_c (Hybrid)
    let json = tipTapJson;
    if (opts.weg === 'weg_c' && window.ProvaEditorLockedSections) {
      json = window.ProvaEditorLockedSections.injectAll(tipTapJson, vars);
    }

    // HTML-Body via ProvaDocxExport.exportHtml (kompletter Renderer)
    let bodyHtml = '';
    if (window.ProvaDocxExport && typeof window.ProvaDocxExport.exportHtml === 'function') {
      bodyHtml = window.ProvaDocxExport.exportHtml(json, { wrap: false });
    } else {
      bodyHtml = '<p>(PDF-Export nicht verfügbar — lib/docx-export.js fehlt)</p>';
    }

    return _printEnvelope(bodyHtml, titel, vars);
  }

  function _printEnvelope(bodyHtml, titel, vars) {
    const headerAz = _esc(vars.Aktenzeichen || titel);
    return '<!DOCTYPE html>\n<html lang="de"><head><meta charset="UTF-8">' +
      '<title>' + _esc(titel) + '</title>' +
      '<style>' +
      '@page { size: A4; margin: 25mm 25mm 25mm 25mm; ' +
      '@top-right { content: "' + headerAz + '"; font-size: 9pt; color: #666; } ' +
      '@bottom-right { content: "Seite " counter(page) " / " counter(pages); font-size: 9pt; color: #666; } }\n' +
      'html, body { background: #fff; color: #000; font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; margin: 0; padding: 0; }\n' +
      'h1 { font-size: 16pt; font-weight: bold; margin: 18pt 0 10pt; page-break-after: avoid; }\n' +
      'h2 { font-size: 13pt; font-weight: bold; margin: 14pt 0 8pt; page-break-after: avoid; }\n' +
      'h3 { font-size: 11.5pt; font-weight: bold; margin: 12pt 0 6pt; page-break-after: avoid; }\n' +
      'h4 { font-size: 11pt; font-weight: bold; margin: 10pt 0 4pt; page-break-after: avoid; }\n' +
      'p { margin: 0 0 8pt; text-align: justify; widows: 3; orphans: 3; }\n' +
      'ul, ol { margin: 0 0 10pt 18pt; padding: 0; }\n' +
      'li { margin-bottom: 3pt; }\n' +
      'blockquote { margin: 10pt 0 10pt 12pt; padding-left: 10pt; border-left: 2pt solid #1a3a6b; font-style: italic; }\n' +
      'pre, code { font-family: "Courier New", monospace; font-size: 10pt; }\n' +
      'pre { padding: 8pt; background: #f4f4f4; border-radius: 3pt; overflow: hidden; }\n' +
      'table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 10pt; }\n' +
      'table th, table td { border: 0.5pt solid #888; padding: 4pt 6pt; text-align: left; vertical-align: top; }\n' +
      'table th { background: #f4f4f4; font-weight: bold; }\n' +
      'img { max-width: 100%; height: auto; }\n' +
      'sup.prova-editor-footnote { font-size: 0.78em; color: #1a3a6b; }\n' +
      'sup.prova-editor-footnote::before { content: "["; }\n' +
      'sup.prova-editor-footnote::after { content: "]"; }\n' +
      'div[data-page-break] { page-break-before: always; break-before: page; height: 0; margin: 0; padding: 0; border: none; background: none; }\n' +
      'div[data-page-break]::after { display: none; }\n' +
      '@media print { @page :first { @top-right { content: ""; } } }\n' +
      '</style></head><body>' + bodyHtml + '</body></html>';
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Open Print-Window mit Editor-Inhalt.
   *
   * @param {Object} tipTapJson
   * @param {Object} opts - { titel, weg, vars }
   */
  function generate(tipTapJson, opts) {
    if (typeof window === 'undefined') return;
    const html = buildPrintHtml(tipTapJson, opts);
    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Bitte Pop-up-Blocker für PROVA deaktivieren.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Auto-Print nach Render
    setTimeout(() => {
      try { w.focus(); w.print(); } catch (_) {}
    }, 800);
  }

  // Public API
  const api = {
    generate: generate,
    buildPrintHtml: buildPrintHtml,
    _esc: _esc
  };

  if (typeof window !== 'undefined') {
    window.ProvaEditorPdfGenerator = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
