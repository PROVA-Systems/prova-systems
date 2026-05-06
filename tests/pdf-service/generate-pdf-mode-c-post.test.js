/**
 * PROVA — generate-pdf-mode-c.js POST-Endpoint Tests (MEGA¹⁸ W68)
 *
 * Coverage: source-Patterns dass POST-Path PDF-Service nutzt + Audit-Log.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'generate-pdf-mode-c.js'), 'utf8');

describe('generate-pdf-mode-c.js — POST-Endpoint', () => {
  test('Allowed: GET + POST', () => {
    assert.match(SRC, /allowed:\s*\['GET',\s*'POST'\]/);
  });

  test('GET-Path liefert mode: preview', () => {
    assert.match(SRC, /mode:\s*['"]preview['"]/);
  });

  test('POST-Path nutzt PDF-Service-Interface', () => {
    assert.match(SRC, /lib\/pdf-service-interface/);
    assert.match(SRC, /\.getService\(\)/);
  });

  test('POST: pdfService.isAvailable() check', () => {
    assert.match(SRC, /pdfService\.isAvailable\(\)/);
  });

  test('POST: Hint-Message bei nicht konfiguriertem Service', () => {
    assert.match(SRC, /PDFMONKEY_API_KEY.*PDFMONKEY_MODE_C_TEMPLATE_ID/);
  });

  test('POST: pdfService.generatePdf mit title + footer_text', () => {
    assert.match(SRC, /pdfService\.generatePdf\(result\.html,\s*pdfOptions\)/);
    assert.match(SRC, /title:.*auftrag\.titel/);
    assert.match(SRC, /footer_text:.*Aktenzeichen/);
  });

  test('POST: 502 bei pdfRes.ok=false', () => {
    assert.match(SRC, /statusCode:\s*502/);
  });

  test('POST: Audit-Log in audit_trail (fire-and-forget)', () => {
    assert.match(SRC, /audit_trail/);
    assert.match(SRC, /pdf\.generated/);
  });

  test('POST: Returnt download_url + service-Name', () => {
    assert.match(SRC, /download_url:\s*pdfRes\.download_url/);
    assert.match(SRC, /service:\s*pdfService\.serviceName/);
  });

  test('POST: JSON-Body parsed mit Error-Handling', () => {
    assert.match(SRC, /JSON\.parse\(event\.body \|\| ['"]\{\}['"]\)/);
    assert.match(SRC, /invalid JSON body/);
  });
});

describe('generate-pdf-mode-c.js — Backwards-Compat GET', () => {
  test('GET-Path liefert weiterhin interpolated_html (Vorschau)', () => {
    assert.match(SRC, /interpolated_html:\s*result\.html/);
    assert.match(SRC, /applied:\s*result\.applied/);
  });
});
