/**
 * PROVA — MODE_C_GENERIC Template Tests
 * MEGA¹⁸ W72 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TPL = fs.readFileSync(path.join(ROOT, 'pdf-templates', 'MODE_C_GENERIC.template.html'), 'utf8');
const PAYLOAD = JSON.parse(fs.readFileSync(path.join(ROOT, 'pdf-templates', 'MODE_C_GENERIC.payload.example.json'), 'utf8'));

describe('MODE_C_GENERIC — Template-Struktur', () => {
  test('Identifier-Comment im Header', () => {
    assert.match(TPL, /MODE_C_GENERIC/);
  });

  test('Inter + JetBrains Mono', () => {
    assert.match(TPL, /family=Inter/);
    assert.match(TPL, /JetBrains\+Mono/);
  });

  test('Design-System Farben', () => {
    assert.match(TPL, /--primary:\s*#1a3a6b/);
    assert.match(TPL, /--accent:\s*#3b82f6/);
  });
});

describe('MODE_C_GENERIC — Pflicht-Variablen', () => {
  test('html_content (User-Content)', () => {
    assert.match(TPL, /\{\{ html_content \}\}/);
  });

  test('title mit Default', () => {
    assert.match(TPL, /\{\{ title \| default: ['"]Mode C Dokument['"] \}\}/);
  });

  test('footer_text (Akten-Nr) im @page bottom-left', () => {
    assert.match(TPL, /\{\{ footer_text \| default: ['"]['"] \}\}/);
  });

  test('custom_css (User-Override)', () => {
    assert.match(TPL, /\{\{ custom_css \}\}/);
  });
});

describe('MODE_C_GENERIC — Optionale Variablen', () => {
  test('cover_meta-Felder optional', () => {
    assert.match(TPL, /\{% if cover_meta_az or cover_meta_datum or cover_meta_auftraggeber %\}/);
  });

  test('show_ai_box steuert AI-Box-Sichtbarkeit', () => {
    assert.match(TPL, /\{% if show_ai_box %\}/);
  });

  test('ai_box_text mit Default-Compliance-Hinweis', () => {
    assert.match(TPL, /ai_box_text \| default:/);
    assert.match(TPL, /§ 407a Abs\. 3 ZPO/);
    assert.match(TPL, /EU AI Act Art\. 50/);
  });
});

describe('MODE_C_GENERIC — User-Content-Wrapper', () => {
  test('h1/h2/h3 styling fuer User-HTML', () => {
    assert.match(TPL, /\.user-content h1/);
    assert.match(TPL, /\.user-content h2/);
    assert.match(TPL, /\.user-content h3/);
  });

  test('table-styling im User-Content', () => {
    assert.match(TPL, /\.user-content table/);
    assert.match(TPL, /\.user-content th/);
  });

  test('blockquote, code, pre Support', () => {
    assert.match(TPL, /\.user-content blockquote/);
    assert.match(TPL, /\.user-content code/);
    assert.match(TPL, /\.user-content pre/);
  });
});

describe('MODE_C_GENERIC — DSGVO + @page', () => {
  test('DSGVO-Footer auf letzter Seite', () => {
    assert.match(TPL, /\.dsgvo-footer/);
    assert.match(TPL, /personenbezogene Daten/);
    assert.match(TPL, /DSGVO/);
  });

  test('Header ab Seite 2 (first hat empty)', () => {
    assert.match(TPL, /@page :first/);
  });

  test('Footer mit Seitenzahl', () => {
    assert.match(TPL, /counter\(page\) " \/ " counter\(pages\)/);
  });
});

describe('MODE_C_GENERIC — Beispiel-Payload validate', () => {
  test('Payload hat alle Pflicht-Felder', () => {
    assert.ok(PAYLOAD.title);
    assert.ok(PAYLOAD.html_content);
    assert.ok(typeof PAYLOAD.show_ai_box === 'boolean');
  });

  test('Beispiel-html_content enthaelt h1+ul (Render-Test)', () => {
    assert.match(PAYLOAD.html_content, /<h1>/);
    assert.match(PAYLOAD.html_content, /<ul>/);
  });
});
