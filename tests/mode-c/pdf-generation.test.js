/**
 * PROVA — Mode-C PDF-Generation Tests
 * MEGA¹⁷-PERFECTION W62 (2026-05-08)
 *
 * Coverage:
 *   - lib/prova-pdf-mode-c.js Library-Struktur
 *   - generate-pdf-mode-c.js Backend-Endpoint
 *   - buildDataContext (akte/kunde/sv/system)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const PDF_LIB = fs.readFileSync(path.join(ROOT, 'lib', 'prova-pdf-mode-c.js'), 'utf8');
const PDF_BACKEND = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'generate-pdf-mode-c.js'), 'utf8');
const PdfGen = require(path.join(ROOT, 'netlify', 'functions', 'generate-pdf-mode-c.js'));

describe('lib/prova-pdf-mode-c.js — Browser PDF-Library (W59)', () => {
  test('CDN-URLs definiert (esm.sh)', () => {
    assert.match(PDF_LIB, /https:\/\/esm\.sh\/jspdf@/);
    assert.match(PDF_LIB, /https:\/\/esm\.sh\/html2canvas-pro@/);
  });

  test('Lazy-Load via dynamic import', () => {
    assert.match(PDF_LIB, /import\(JSPDF_CDN\)/);
    assert.match(PDF_LIB, /import\(HTML2CANVAS_CDN\)/);
  });

  test('Cached Promise (kein Re-Load)', () => {
    assert.match(PDF_LIB, /_libsPromise/);
    assert.match(PDF_LIB, /if \(_libsPromise\) return _libsPromise/);
  });

  test('Public API: generateAndDownload + isAvailable', () => {
    assert.match(PDF_LIB, /window\.ProvaPdfModeC\s*=/);
    assert.match(PDF_LIB, /generateAndDownload:/);
    assert.match(PDF_LIB, /isAvailable:/);
  });

  test('Multi-Page PDF-Logic (heightLeft, addPage)', () => {
    assert.match(PDF_LIB, /pdf\.addPage\(\)/);
    assert.match(PDF_LIB, /heightLeft -=/);
  });

  test('A4-Format + portrait + mm', () => {
    assert.match(PDF_LIB, /format:\s*['"]a4['"]/);
    assert.match(PDF_LIB, /orientation:\s*['"]portrait['"]/);
    assert.match(PDF_LIB, /unit:\s*['"]mm['"]/);
  });

  test('Offscreen-Container wird wieder entfernt (finally)', () => {
    assert.match(PDF_LIB, /document\.body\.removeChild\(container\)/);
    assert.match(PDF_LIB, /} finally \{/);
  });

  test('Empty-HTML throws statt silent fail', () => {
    assert.match(PDF_LIB, /HTML-Content leer/);
  });
});

describe('generate-pdf-mode-c.js — Backend', () => {
  test('GET-only handler', () => {
    assert.match(PDF_BACKEND, /event\.httpMethod !== ['"]GET['"]/);
  });

  test('UUID-Validation auftrag_id', () => {
    assert.match(PDF_BACKEND, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(auftragId\)/);
  });

  test('Migration-Pending-Detection (column.*vorlage_id)', () => {
    assert.match(PDF_BACKEND, /09_auftraege_vorlage\.sql/);
  });

  test('Vorlage-Load mit user_id RLS', () => {
    assert.match(PDF_BACKEND, /\.from\(['"]user_vorlagen['"]\)/);
    assert.match(PDF_BACKEND, /\.eq\(['"]user_id['"],\s*userId\)/);
    assert.match(PDF_BACKEND, /\.eq\(['"]is_active['"],\s*true\)/);
  });

  test('Interpolation via lib/prova-mode-c.js', () => {
    assert.match(PDF_BACKEND, /lib\.interpolateHtml/);
  });

  test('Returnt interpolated_html + applied + missing', () => {
    assert.match(PDF_BACKEND, /interpolated_html:\s*result\.html/);
    assert.match(PDF_BACKEND, /applied:\s*result\.applied/);
    assert.match(PDF_BACKEND, /missing:\s*result\.missing/);
  });

  test('TODO-Marker fuer alternative Service-Wahl', () => {
    assert.match(PDF_BACKEND, /pdf_service_options/);
  });
});

describe('buildDataContext — Pure-Function-Tests', () => {
  test('akte/kunde/sv/system structure', () => {
    const ctx = PdfGen._test.buildDataContext(
      { az: 'X', titel: 'T', objekt: { plz: '12345' } },
      { name: 'K', email: 'k@x' },
      { name: 'SV' }
    );
    assert.equal(ctx.akte.az, 'X');
    assert.equal(ctx.kunde.name, 'K');
    assert.equal(ctx.sv.name, 'SV');
    assert.match(ctx.system.heute, /^\d{2}\.\d{2}\.\d{4}$/);
    assert.equal(ctx.akte.objekt.plz, '12345');
  });

  test('kunde=null und svUser=null sicher (defensive defaults)', () => {
    const ctx = PdfGen._test.buildDataContext({ az: 'X' }, null, null);
    assert.equal(ctx.kunde.name, '');
    assert.equal(ctx.kunde.email, '');
    assert.equal(ctx.sv.name, '');
  });

  test('Kosten-Formatierung mit € und 2 Decimals', () => {
    const ctx = PdfGen._test.buildDataContext(
      { az: 'X', kosten_geschaetzt_brutto: 1234.5, kosten_geschaetzt_netto: 1000 },
      null, null
    );
    assert.match(ctx.akte.kosten_geschaetzt_brutto, /1234\.50.*€/);
    assert.match(ctx.akte.kosten_geschaetzt_netto, /1000\.00.*€/);
  });

  test('Kosten=null → Leerer String', () => {
    const ctx = PdfGen._test.buildDataContext(
      { az: 'X', kosten_geschaetzt_brutto: null },
      null, null
    );
    assert.equal(ctx.akte.kosten_geschaetzt_brutto, '');
  });

  test('system.jahr ist 4-stelliger String', () => {
    const ctx = PdfGen._test.buildDataContext({ az: 'X' }, null, null);
    assert.match(ctx.system.jahr, /^\d{4}$/);
  });
});

describe('akte.html — modeCDownloadPdf integration (W60)', () => {
  const AKTE = fs.readFileSync(path.join(ROOT, 'akte.html'), 'utf8');

  test('lib/prova-pdf-mode-c.js eingebunden', () => {
    assert.match(AKTE, /<script src="\/lib\/prova-pdf-mode-c\.js"/);
  });

  test('PDF-Button onclick=modeCDownloadPdf', () => {
    assert.match(AKTE, /onclick="modeCDownloadPdf\(\)"/);
  });

  test('Confirmation bei missing variables', () => {
    assert.match(AKTE, /data\.missing.*length > 0/);
    assert.match(AKTE, /trotzdem PDF generieren/i);
  });

  test('Filename basiert auf az + vorlage_name', () => {
    assert.match(AKTE, /\.replace\(\/\[\^a-zA-Z0-9_-\]\/g, ['"]_['"]\)/);
    assert.match(AKTE, /\.pdf['"]/);
  });

  test('Status-Update wahrend PDF-Gen', () => {
    assert.match(AKTE, /Generiere PDF/);
    assert.match(AKTE, /PDF heruntergeladen/);
  });
});
