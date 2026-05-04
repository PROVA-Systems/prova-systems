/**
 * PROVA — prova-disclaimer.js Tests (MEGA²¹+²² W110)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Disclaimer = require(path.join(ROOT, 'lib', 'prova-disclaimer.js'));

describe('prova-disclaimer — Public API', () => {
  test('html() returnt String', () => {
    assert.equal(typeof Disclaimer.html(), 'string');
  });

  test('tooltipText returnt Plain-Text', () => {
    const t = Disclaimer.tooltipText();
    assert.ok(t.length > 30);
    assert.match(t, /§407a/);
    assert.doesNotMatch(t, /<.*>/);  // kein HTML
  });

  test('short() returnt Kurzform mit 📌-Emoji', () => {
    assert.match(Disclaimer.short(), /📌/);
    assert.match(Disclaimer.short(), /§407a/);
  });

  test('beweisbeschluss() returnt Pattern-Matching-Hint', () => {
    assert.match(Disclaimer.beweisbeschluss(), /STRUKTURIERUNGS-HILFE/);
    assert.match(Disclaimer.beweisbeschluss(), /§407a/);
  });
});

describe('prova-disclaimer — html() Variants', () => {
  test('Standard-Variant enthaelt §407a + Konjunktiv', () => {
    const html = Disclaimer.html();
    assert.match(html, /§407a/);
    assert.match(html, /eigenverantwortlich/);
    assert.match(html, /class="prova-ki-disclaimer"/);
  });

  test('Standard mit 📌-Emoji', () => {
    assert.match(Disclaimer.html(), /📌/);
  });

  test('Foto-Variant mit 📷-Emoji', () => {
    assert.match(Disclaimer.html({ variant: 'foto' }), /📷/);
    assert.match(Disclaimer.html({ variant: 'foto' }), /Foto-KI/i);
  });

  test('Beweisbeschluss-Variant mit ⚖️-Emoji', () => {
    assert.match(Disclaimer.html({ variant: 'beweisbeschluss' }), /⚖️/);
    assert.match(Disclaimer.html({ variant: 'beweisbeschluss' }), /STRUKTURIERUNGS-HILFE/);
  });

  test('ARIA: role=note + aria-label', () => {
    const html = Disclaimer.html();
    assert.match(html, /role="note"/);
    assert.match(html, /aria-label="KI-Hinweis"/);
  });

  test('Custom-Style ueberschreibt Default', () => {
    const html = Disclaimer.html({ style: 'background:red;' });
    assert.match(html, /style="background:red;"/);
  });
});

describe('prova-disclaimer — aiBoxHtml (EU AI Act Box)', () => {
  test('Standard-AI-Box enthaelt EU AI Act + § 407a', () => {
    const html = Disclaimer.aiBoxHtml();
    assert.match(html, /EU AI Act/);
    assert.match(html, /§ 407a Abs\. 3 ZPO/);
    assert.match(html, /EU AI Act Art\. 50/);
  });

  test('Context-Param wird embedded', () => {
    const html = Disclaimer.aiBoxHtml({ context: 'Gutachten' });
    assert.match(html, /Dieses Gutachten wurde/);
  });

  test('Default-Context = "Dokument"', () => {
    const html = Disclaimer.aiBoxHtml();
    assert.match(html, /Dieses Dokument wurde/);
  });

  test('Marker-Badge mit blauer Farbe', () => {
    assert.match(Disclaimer.aiBoxHtml(), /background:#3b82f6/);
  });

  test('ARIA: role=note', () => {
    assert.match(Disclaimer.aiBoxHtml(), /role="note"/);
  });

  test('Context wird HTML-escaped (XSS)', () => {
    const html = Disclaimer.aiBoxHtml({ context: '<script>alert(1)</script>' });
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
  });
});

describe('prova-disclaimer — escapeHtml (XSS-Defense)', () => {
  test('< > & " werden escaped', () => {
    assert.equal(Disclaimer.escapeHtml('<script>'), '&lt;script&gt;');
    assert.equal(Disclaimer.escapeHtml('A&B'), 'A&amp;B');
    assert.equal(Disclaimer.escapeHtml('"x"'), '&quot;x&quot;');
  });

  test('null/undefined → leerer String', () => {
    assert.equal(Disclaimer.escapeHtml(null), '');
    assert.equal(Disclaimer.escapeHtml(undefined), '');
  });
});

describe('prova-disclaimer — _texts Coverage', () => {
  test('Alle 5 Text-Konstanten exposed', () => {
    const t = Disclaimer._texts;
    assert.ok(t.STANDARD_TEXT);
    assert.ok(t.SHORT_TEXT);
    assert.ok(t.TOOLTIP_TEXT);
    assert.ok(t.BEWEISBESCHLUSS_TEXT);
    assert.ok(t.FOTO_KI_TEXT);
  });

  test('Alle Texte erwaehnen §407a oder ZPO', () => {
    const t = Disclaimer._texts;
    [t.STANDARD_TEXT, t.TOOLTIP_TEXT, t.BEWEISBESCHLUSS_TEXT, t.FOTO_KI_TEXT].forEach(text => {
      assert.match(text, /§407a|ZPO/);
    });
  });
});
