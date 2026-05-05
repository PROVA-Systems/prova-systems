/**
 * PROVA — pricing.html Mobile-Responsive Tests (MEGA²⁶ Block 3)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'pricing.html'), 'utf8');

describe('pricing.html — Viewport + Mobile-Polish', () => {
  test('Viewport-Meta-Tag mit width=device-width', () => {
    assert.match(HTML, /<meta\s+name="viewport"\s+content="width=device-width/);
  });

  test('initial-scale=1 (kein zoom-disable)', () => {
    assert.match(HTML, /initial-scale=1/);
  });

  test('Media-Query für ≤480px existiert', () => {
    assert.match(HTML, /@media\s*\(\s*max-width:\s*480px\s*\)/);
  });

  test('Media-Query für ≤720px existiert (Tablet)', () => {
    assert.match(HTML, /@media\s*\(\s*max-width:\s*720px\s*\)/);
  });
});

describe('pricing.html — Touch-Target-Sizes (≥48px Pflicht)', () => {
  test('CTA-Button hat min-height:48px im Mobile-Block', () => {
    assert.match(HTML, /\.cta\s*\{[^}]*min-height:48px/);
  });

  test('CTA-Button hat min-width:48px', () => {
    assert.match(HTML, /\.cta\s*\{[^}]*min-width:48px/);
  });

  test('CTA-Button hat touch-action:manipulation (Doppelklick-Zoom-Fix)', () => {
    assert.match(HTML, /touch-action:manipulation/);
  });
});

describe('pricing.html — Sticky Founding-CTA (Mobile)', () => {
  test('Sticky-Banner existiert mit class sticky-founding-cta', () => {
    assert.match(HTML, /class="sticky-founding-cta"/);
  });

  test('Sticky-Banner ist position:fixed', () => {
    assert.match(HTML, /\.sticky-founding-cta\s*\{[^}]*position:fixed/);
  });

  test('Sticky-Banner zeigt Founding-Member 125€', () => {
    assert.match(HTML, /Founding Member 125/);
  });

  test('Sticky-Banner verlinkt zu /pilot.html', () => {
    assert.match(HTML, /href="\/pilot\.html"[^>]*class="cta"/);
  });

  test('Sticky-Banner display:none Default (nur Mobile sichtbar)', () => {
    assert.match(HTML, /\.sticky-founding-cta\s*\{[^}]*display:none/);
  });

  test('Sticky-Banner display:block bei ≤480px', () => {
    const m = HTML.match(/@media\s*\(\s*max-width:\s*480px\s*\)\s*\{[\s\S]*?\.sticky-founding-cta\s*\{[^}]*display:block/);
    assert.ok(m, 'Sticky-Banner sollte bei ≤480px display:block werden');
  });

  test('Sticky-Banner safe-area-inset für iOS-Notch', () => {
    assert.match(HTML, /safe-area-inset-bottom/);
  });

  test('aria-label am Sticky-CTA-Container', () => {
    assert.match(HTML, /class="sticky-founding-cta"[^>]*aria-label/);
  });
});

describe('pricing.html — Mobile-Font-Sizes (Lesbarkeit ≥14px)', () => {
  test('body font-size 15px im Mobile-Block', () => {
    const m = HTML.match(/@media\s*\(\s*max-width:\s*480px\s*\)\s*\{[\s\S]*?body\s*\{[^}]*font-size:15px/);
    assert.ok(m, 'body sollte ≥15px Font-Size auf Mobile haben');
  });

  test('Liste hat ≥14px Font-Size', () => {
    const m = HTML.match(/@media\s*\(\s*max-width:\s*480px\s*\)\s*\{[\s\S]*?\.price-card ul li\s*\{[^}]*font-size:14px/);
    assert.ok(m, 'Liste sollte ≥14px Font-Size auf Mobile haben');
  });
});

describe('pricing.html — Plausible-Integration (Block 2 verify)', () => {
  test('lib/analytics-plausible.js Script-Tag', () => {
    assert.match(HTML, /\/lib\/analytics-plausible\.js/);
  });

  test('Plausible.init mit Domain prova-systems.de', () => {
    assert.match(HTML, /Plausible\.init\(['"]prova-systems\.de['"]\)/);
  });
});

describe('pricing.html — Founding-Banner sticky NICHT auf Desktop', () => {
  test('@media (max-width:481px) display:block (gilt nur Mobile)', () => {
    // Auf Desktop bleibt Banner display:none
    const css = HTML;
    const block = css.match(/\.sticky-founding-cta\s*\{[^}]*\}/);
    assert.ok(block, 'sticky-founding-cta CSS-Block fehlt');
    assert.match(block[0], /display:none/);
  });
});
