'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { __validateSvg } = require('../../netlify/functions/skizzen-save');

test('SVG-Validate: leerer String → Fehler', () => {
  assert.match(__validateSvg(''), /leer/);
  assert.match(__validateSvg(null), /leer/);
});

test('SVG-Validate: > 200KB → Fehler', () => {
  const big = '<svg>' + 'x'.repeat(210 * 1024) + '</svg>';
  assert.match(__validateSvg(big), /200KB/);
});

test('SVG-Validate: kein <svg>-Tag → Fehler', () => {
  assert.match(__validateSvg('<div>foo</div>'), /<svg>-Tag/);
});

test('SVG-Validate: <script> blockiert (XSS-Schutz)', () => {
  assert.match(__validateSvg('<svg><script>alert(1)</script></svg>'), /<script>/);
});

test('SVG-Validate: onclick blockiert (XSS-Schutz)', () => {
  assert.match(__validateSvg('<svg onclick="evil()">x</svg>'), /on\*-Handler/);
});

test('SVG-Validate: onload blockiert', () => {
  assert.match(__validateSvg('<svg onload="evil()">x</svg>'), /on\*-Handler/);
});

test('SVG-Validate: gültige Skizze passiert', () => {
  const valid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0 L100 100" stroke="#000"/></svg>';
  assert.strictEqual(__validateSvg(valid), null);
});

test('SVG-Validate: SVG mit rect + line passiert', () => {
  const valid = '<svg><rect x="10" y="10" width="50" height="30" stroke="#000"/><line x1="0" y1="0" x2="100" y2="100"/></svg>';
  assert.strictEqual(__validateSvg(valid), null);
});

test('SVG-Validate: 199KB SVG passiert', () => {
  const ok = '<svg>' + 'x'.repeat(199 * 1024) + '</svg>';
  assert.strictEqual(__validateSvg(ok), null);
});
