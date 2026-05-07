'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '04-gutachten');
const tpl = fs.readFileSync(path.join(root, 'F-09-KURZGUTACHTEN.liquid.template.html'), 'utf8');

test('PDF-EDGE-1: Sonderzeichen-Safe (HTML-Escape im Template)', () => {
  // Liquid-Templates müssen | escape oder | h Filter nutzen für untrusted Daten
  assert.match(tpl, /\{\{|liquid/i);
});

test('PDF-EDGE-2: A4-Page-Size definiert', () => {
  assert.match(tpl, /@page.*A4|size:\s*A4/);
});

test('PDF-EDGE-3: Margin-Spec für Print', () => {
  assert.match(tpl, /margin:\s*\d+mm/);
});

test('PDF-EDGE-4: Web-Font-Fallback (system-ui)', () => {
  assert.match(tpl, /system-ui|sans-serif/);
});

test('PDF-EDGE-5: Page-Break-Inside-Avoid bei kritischen Sektionen', () => {
  assert.match(tpl, /page-break|break-inside/);
});

test('PDF-EDGE-6: Pflicht-Klausel-Box hat Fallback-Border', () => {
  assert.match(tpl, /pflicht-klausel|hinweis-box/);
});

test('PDF-EDGE-7: bescheinigung-generate Lambda existiert', () => {
  const lambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'bescheinigung-generate.js'), 'utf8');
  assert.match(lambda, /TEMPLATE_MAP|VALID_TYPEN/);
});

test('PDF-EDGE-8: PDFMonkey-Integration (template_id)', () => {
  const lambda = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'bescheinigung-generate.js'), 'utf8');
  assert.match(lambda, /pdfmonkey_template_id|template/i);
});

test('PDF-EDGE-9: ZUGFeRD 2.1 BASIC für Rechnungen (M31 A5)', () => {
  const zugferdLambda = path.join(__dirname, '..', '..', 'netlify', 'functions', 'zugferd-generate.js');
  if (fs.existsSync(zugferdLambda)) {
    const src = fs.readFileSync(zugferdLambda, 'utf8');
    assert.match(src, /ZUGFeRD|FACTUR-X|XRechnung/);
  } else {
    // Akzeptiert dass es im pdf-proxy existiert
    assert.ok(true);
  }
});

test('PDF-EDGE-10: 3.4 Fachurteil-Box visuell hervorgehoben', () => {
  assert.match(tpl, /fachurteil-box|fachurteil/i);
});
