/**
 * PROVA — Disclaimer-Library (KI-Output §407a ZPO + EU AI Act)
 * MEGA²¹+²² W110 (2026-05-08)
 * Marcel-Direktive: Disclaimer-Integration MANDATORY bei jedem KI-Output.
 *
 * Rechtsgrundlagen:
 * - § 407a Abs. 3 ZPO: SV ist eigenverantwortlich. KI-Hilfe ist erlaubt
 *   aber muss offengelegt werden.
 * - EU AI Act Art. 50: Transparenz-Pflicht bei KI-generierten Inhalten.
 *
 * Public API (browser via window.ProvaDisclaimer, node via require):
 *   ProvaDisclaimer.html(opts)         — HTML-Block fuer Frontend
 *   ProvaDisclaimer.tooltipText()      — Plain-Text fuer title=""
 *   ProvaDisclaimer.short()            — Kurzform fuer Modal-Header
 *   ProvaDisclaimer.aiBoxHtml(opts)    — EU AI Act Box (analog PDF-Templates)
 *   ProvaDisclaimer.beweisbeschluss()  — Spez. Disclaimer fuer Pattern-Extraktion
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProvaDisclaimer = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const STANDARD_TEXT = 'PROVA-KI-Hinweis: Dieser Vorschlag dient als Anregung. '
    + 'Als bestellter Sachverstaendiger sind Sie nach §407a ZPO eigenverantwortlich '
    + 'fuer die fachliche Pruefung und Bewertung.';

  const SHORT_TEXT = '📌 KI-Hilfe — SV-Verantwortung gemaess §407a ZPO';

  const TOOLTIP_TEXT = 'Dieser Vorschlag stammt aus KI-Strukturierung. '
    + 'SV ist gemaess §407a ZPO Abs. 3 eigenverantwortlich.';

  const BEWEISBESCHLUSS_TEXT = 'Hinweis: Die automatische Erkennung von Hauptfragen '
    + 'ist eine ERSTE STRUKTURIERUNGS-HILFE. Bitte pruefen Sie die Vollstaendigkeit '
    + 'und Korrektheit anhand des Original-Beweisbeschlusses sorgfaeltig. Sie als '
    + 'bestellter SV bleiben nach §407a ZPO letztverantwortlich.';

  const FOTO_KI_TEXT = 'Foto-KI-Hinweis: Die Schaden-Erkennung ist ein erster '
    + 'Strukturierungs-Vorschlag. Pruefen Sie die Befunde am Ortstermin '
    + 'und konsultieren Sie ggf. Fachliteratur. Sie sind nach §407a ZPO '
    + 'letztverantwortlich fuer die Bewertung.';

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Standard-HTML-Block fuer KI-Output-Sections.
   *
   * @param {object} [opts]
   * @param {string} [opts.variant] — 'standard' | 'foto' | 'beweisbeschluss'
   * @param {string} [opts.style] — Inline-CSS-Override
   * @returns {string}
   */
  function html(opts) {
    opts = opts || {};
    let text = STANDARD_TEXT;
    let icon = '📌';
    if (opts.variant === 'foto') {
      text = FOTO_KI_TEXT;
      icon = '📷';
    } else if (opts.variant === 'beweisbeschluss') {
      text = BEWEISBESCHLUSS_TEXT;
      icon = '⚖️';
    }
    const style = opts.style || 'margin:8px 0;padding:8px 12px;background:rgba(245,158,11,0.08);'
      + 'border-left:3px solid rgba(245,158,11,0.4);border-radius:4px;font-size:11px;'
      + 'color:#92400e;line-height:1.5;font-family:inherit;';
    return '<div class="prova-ki-disclaimer" role="note" aria-label="KI-Hinweis" style="' + style + '">'
      + '<strong>' + icon + ' ' + escapeHtml(text) + '</strong>'
      + '</div>';
  }

  /**
   * Plain-Text Tooltip (fuer title="" Attribute).
   */
  function tooltipText() {
    return TOOLTIP_TEXT;
  }

  /**
   * Kurzform fuer Modal-Header oder Toast.
   */
  function short() {
    return SHORT_TEXT;
  }

  /**
   * EU AI Act Box (analog MODE_C_GENERIC PDF-Template).
   * Fuer PDF-Outputs UND Frontend-Modal-Display.
   *
   * @param {object} [opts]
   * @param {string} [opts.context] — z.B. "Gutachten" oder "Aktenauszug"
   * @returns {string}
   */
  function aiBoxHtml(opts) {
    opts = opts || {};
    const context = escapeHtml(opts.context || 'Dokument');
    return '<div class="prova-ai-box" role="note" aria-label="EU AI Act Hinweis" style="'
      + 'margin:12px 0;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;'
      + 'border-left:3px solid #3b82f6;border-radius:6px;font-size:12px;line-height:1.55;color:#0f172a;">'
      + '<span style="display:inline-block;padding:2px 8px;background:#3b82f6;color:#fff;'
      + 'font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;'
      + 'border-radius:3px;margin-bottom:6px;">EU AI Act &middot; § 407a ZPO</span><br>'
      + 'Dieses ' + context + ' wurde unter Verwendung KI-gestuetzter Strukturhilfen '
      + 'durch den Sachverstaendigen erstellt. Alle fachlichen Bewertungen, Auswahl '
      + 'der Eintraege und die Verantwortung fuer den Inhalt liegen ausschliesslich '
      + 'beim unterzeichnenden Sachverstaendigen '
      + '(<span style="font-family:ui-monospace,monospace;color:#1a3a6b;">§ 407a Abs. 3 ZPO</span>, '
      + '<span style="font-family:ui-monospace,monospace;color:#1a3a6b;">EU AI Act Art. 50</span>). '
      + 'KI dient als Hilfsmittel zur Strukturierung — keine eigenstaendigen Bewertungen.'
      + '</div>';
  }

  /**
   * Beweisbeschluss-spezifischer Disclaimer (Marcel-C1 Pattern-Matching).
   */
  function beweisbeschluss() {
    return BEWEISBESCHLUSS_TEXT;
  }

  return {
    html: html,
    tooltipText: tooltipText,
    short: short,
    aiBoxHtml: aiBoxHtml,
    beweisbeschluss: beweisbeschluss,
    escapeHtml: escapeHtml,
    _texts: {
      STANDARD_TEXT,
      SHORT_TEXT,
      TOOLTIP_TEXT,
      BEWEISBESCHLUSS_TEXT,
      FOTO_KI_TEXT
    }
  };
});
