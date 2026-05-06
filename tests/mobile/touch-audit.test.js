/**
 * PROVA — Touch-Audit-Tool Tests
 * MEGA¹² W14 (2026-05-05)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { audit } = require('../../tools/touch-audit');

describe('touch-audit — Width/Height Detection', () => {

  test('Button mit width:30px = Warning', () => {
    const html = '<html><body><button style="width:30px;height:30px">X</button></body></html>';
    const findings = audit(html, 'test.html');
    assert.ok(findings.some(f => f.message.includes('width=30px')));
    assert.ok(findings.some(f => f.message.includes('height=30px')));
  });

  test('Button mit width:48px+ = kein Warning', () => {
    const html = '<html><body><button style="width:48px;height:48px">X</button></body></html>';
    const findings = audit(html, 'test.html');
    assert.equal(findings.length, 0);
  });

  test('Anchor mit height:20px = Warning', () => {
    const html = '<html><body><a href="#" style="height:20px">X</a></body></html>';
    const findings = audit(html, 'test.html');
    assert.ok(findings.some(f => f.message.includes('height=20px')));
  });

  test('Mini-Button mit padding:1px + kurzem Content = Warning', () => {
    const html = '<html><body><button style="padding:2px">✕</button></body></html>';
    const findings = audit(html, 'test.html');
    assert.ok(findings.some(f => f.message.includes('Mini-Button')));
  });

  test('Button ohne style = kein Warning', () => {
    const html = '<html><body><button>Speichern</button></body></html>';
    const findings = audit(html, 'test.html');
    assert.equal(findings.length, 0);
  });
});

describe('safe-area-helper.css — File-Existence + Critical-Classes', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'safe-area-helper.css'), 'utf8');

  test('Datei existiert + nicht leer', () => {
    assert.ok(css.length > 100);
  });

  test('psa-pt-safe class definiert mit env(safe-area-inset-top)', () => {
    assert.match(css, /\.psa-pt-safe[\s\S]*env\(safe-area-inset-top\)/);
  });

  test('psa-pb-safe class definiert', () => {
    assert.match(css, /\.psa-pb-safe[\s\S]*env\(safe-area-inset-bottom\)/);
  });

  test('psa-px-safe class fuer left+right', () => {
    assert.match(css, /\.psa-px-safe[\s\S]*safe-area-inset-left/);
    assert.match(css, /\.psa-px-safe[\s\S]*safe-area-inset-right/);
  });

  test('psa-min-h-screen mit dvh-Fallback (iOS 100vh-Bug-Fix)', () => {
    assert.match(css, /\.psa-min-h-screen[\s\S]*100dvh/);
  });

  test('psa-touch-target mit min-width/min-height 48px', () => {
    assert.match(css, /\.psa-touch-target[\s\S]*min-width:\s*48px[\s\S]*min-height:\s*48px/);
  });

  test('psa-no-input-zoom mit font-size: 16px (iOS-Fix)', () => {
    assert.match(css, /\.psa-no-input-zoom[\s\S]*font-size:\s*16px/);
  });

  test('psa-momentum-scroll mit -webkit-overflow-scrolling', () => {
    assert.match(css, /\.psa-momentum-scroll[\s\S]*-webkit-overflow-scrolling/);
  });

  test('Max-Function als Fallback (Defense bei alten Browsern)', () => {
    // max() returns max of args — bei alten Browsern OHNE env() = padding-Default
    assert.match(css, /max\([^)]*env\(/);
  });
});

describe('pull-to-refresh.js — API + Konstanten', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'pull-to-refresh.js'), 'utf8');

  test('window.ProvaPullToRefresh exposed', () => {
    assert.match(src, /window\.ProvaPullToRefresh\s*=/);
  });

  test('Public API: bind + unbind', () => {
    assert.ok(src.includes('bind: bind'));
    assert.ok(src.includes('unbind: unbind'));
  });

  test('triggerDistance default = 80px', () => {
    assert.match(src, /triggerDistance:\s*80/);
  });

  test('maxPullDistance default = 120px', () => {
    assert.match(src, /maxPullDistance:\s*120/);
  });

  test('Touch-Events: touchstart, touchmove, touchend, touchcancel', () => {
    assert.ok(src.includes("'touchstart'"));
    assert.ok(src.includes("'touchmove'"));
    assert.ok(src.includes("'touchend'"));
    assert.ok(src.includes("'touchcancel'"));
  });

  test('touchmove ist non-passive (preventDefault Pflicht)', () => {
    assert.match(src, /touchmove[\s\S]{0,50}passive:\s*false/);
  });

  test('aria-busy fuer Screen-Reader bei Refresh-Pending', () => {
    assert.match(src, /setAttribute\(['"]aria-busy['"]/);
  });

  test('prefers-reduced-motion respektiert', () => {
    assert.ok(src.includes('prefers-reduced-motion'));
  });

  test('WeakMap fuer State (Memory-Leak-Defense)', () => {
    assert.match(src, /new WeakMap\(\)/);
  });

  test('unbind entfernt alle Event-Listener (kein Memory-Leak)', () => {
    assert.match(src, /removeEventListener\(['"]touchstart['"]/);
    assert.match(src, /removeEventListener\(['"]touchmove['"]/);
    assert.match(src, /removeEventListener\(['"]touchend['"]/);
    assert.match(src, /removeEventListener\(['"]touchcancel['"]/);
  });
});

describe('archiv.html — Pull-to-Refresh-Integration', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'archiv.html'), 'utf8');

  test('safe-area-helper.css geladen', () => {
    assert.match(html, /\/lib\/safe-area-helper\.css/);
  });

  test('pull-to-refresh.js geladen', () => {
    assert.match(html, /\/lib\/pull-to-refresh\.js/);
  });

  test('PTR-Bind-Code im DOMContentLoaded', () => {
    assert.match(html, /ProvaPullToRefresh\.bind/);
  });

  test('Touch-Detection (ontouchstart) vor Bind', () => {
    assert.match(html, /'ontouchstart' in window/);
  });

  test('Bind callbackt ladeFaelle()', () => {
    assert.match(html, /await ladeFaelle\(\)/);
  });
});
