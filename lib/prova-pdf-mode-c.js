/**
 * PROVA PDF-Generation Mode-C (Browser-Side)
 * MEGA¹⁷-PERFECTION W59 (2026-05-08)
 *
 * Strategie: KEINE Server-Dependency (kein DocRaptor-Account, kein
 * Browserless-Token noetig). Nutzt jsPDF + html2canvas via CDN-Lazy-Load.
 * Wird nur geladen wenn User wirklich PDF generiert (kein eager-Load).
 *
 * Trade-Offs vs Server-Side:
 *   + kein Service-Token, kein Account, kein Marcel-Decision noetig
 *   + Pilot-tauglich aus dem Stand
 *   + Funktioniert offline (PWA-tauglich)
 *   - PDF-Qualitaet etwas niedriger als headless-Chrome
 *   - bei sehr langen Vorlagen (>50 Seiten) langsamer
 *   - bei komplexen Tabellen können Render-Glitches auftreten
 *
 * Bei Marcel-Decision spaeter (DocRaptor/Gotenberg/Cloud-Puppeteer):
 *   generate-pdf-mode-c.js Server-Endpoint zur POST-Variant erweitern,
 *   Frontend ruft dort statt diese Library.
 *
 * Public API (browser via window.ProvaPdfModeC):
 *   ProvaPdfModeC.generateAndDownload({ html, filename }) → Promise<void>
 *   ProvaPdfModeC.isAvailable() → bool (true wenn CDN-Load moeglich)
 */
'use strict';

(function () {
  const JSPDF_CDN = 'https://esm.sh/jspdf@2';
  const HTML2CANVAS_CDN = 'https://esm.sh/html2canvas-pro@1';

  let _libsPromise = null;
  let _libsFailed = false;

  async function _loadLibs() {
    if (_libsPromise) return _libsPromise;
    if (_libsFailed) throw new Error('PDF-libs zuvor fehlgeschlagen');

    _libsPromise = (async () => {
      try {
        const [jspdfMod, h2cMod] = await Promise.all([
          import(JSPDF_CDN),
          import(HTML2CANVAS_CDN)
        ]);
        const jsPDF = jspdfMod.jsPDF || jspdfMod.default;
        const html2canvas = h2cMod.default || h2cMod.html2canvas || h2cMod;
        if (!jsPDF || typeof jsPDF !== 'function') {
          throw new Error('jsPDF konnte nicht geladen werden (CDN)');
        }
        if (!html2canvas || typeof html2canvas !== 'function') {
          throw new Error('html2canvas konnte nicht geladen werden (CDN)');
        }
        return { jsPDF: jsPDF, html2canvas: html2canvas };
      } catch (e) {
        _libsFailed = true;
        throw new Error('PDF-Libraries-Load fehlgeschlagen: ' + e.message);
      }
    })();
    return _libsPromise;
  }

  function isAvailable() {
    return !_libsFailed;
  }

  /**
   * Erstellt einen offscreen-Container fuer das HTML, rendert ihn
   * via html2canvas und packt ihn in eine PDF.
   *
   * @param {object} opts
   * @param {string} opts.html — interpoliertes HTML
   * @param {string} opts.filename — Default 'gutachten.pdf'
   * @param {string} [opts.title] — PDF-Metadata-Title
   * @returns {Promise<void>}
   */
  async function generateAndDownload(opts) {
    opts = opts || {};
    const html = String(opts.html || '');
    const filename = opts.filename || 'gutachten.pdf';
    const title = opts.title || filename.replace(/\.pdf$/i, '');

    if (!html.trim()) {
      throw new Error('HTML-Content leer — keine PDF erzeugt');
    }

    const { jsPDF, html2canvas } = await _loadLibs();

    // Offscreen-Container — A4-Breite (210mm = ~794px @ 96 DPI)
    const container = document.createElement('div');
    container.style.cssText = [
      'position: absolute',
      'top: -10000px',
      'left: 0',
      'width: 794px',  // A4 width in px @ 96 DPI
      'padding: 60px 50px',  // 16mm Rand
      'background: #ffffff',
      'color: #000000',
      'font-family: "Helvetica", "Arial", sans-serif',
      'font-size: 11pt',
      'line-height: 1.5'
    ].join(';');
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      // Render mit html2canvas (skaliert fuer Schaerfe)
      const canvas = await html2canvas(container, {
        scale: 2,  // 2x fuer hochaufloesende PDF
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // PDF-Doc erstellen, multi-page-aware
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.setProperties({ title: title });

      const imgData = canvas.toDataURL('image/png');
      const pdfPageHeight = 297;  // A4 height mm
      const pdfPageWidth = 210;   // A4 width mm
      const imgWidth = pdfPageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Multi-Page Split
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfPageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;  // negativer Offset
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfPageHeight;
      }

      pdf.save(filename);
    } finally {
      document.body.removeChild(container);
    }
  }

  window.ProvaPdfModeC = {
    generateAndDownload: generateAndDownload,
    isAvailable: isAvailable,
    _CDNS: { JSPDF_CDN: JSPDF_CDN, HTML2CANVAS_CDN: HTML2CANVAS_CDN }
  };
})();
