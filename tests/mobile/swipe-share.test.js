/**
 * PROVA — W24 Swipe-Gestures + Native-Share + PTR-Sweep Tests
 * MEGA¹⁴ W24 (2026-05-06)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('lib/swipe-gestures.js — Library', () => {
  const src = read('lib/swipe-gestures.js');

  test('window.ProvaSwipe exposed', () => {
    assert.match(src, /window\.ProvaSwipe\s*=/);
  });

  test('Public API: bind + unbind', () => {
    assert.ok(src.includes('bind: bind'));
    assert.ok(src.includes('unbind: unbind'));
  });

  test('Multi-Touch (Pinch) ignoriert in touchstart', () => {
    assert.match(src, /e\.touches\.length > 1/);
  });

  test('WeakMap fuer State (Memory-Leak-Defense)', () => {
    assert.match(src, /new WeakMap\(\)/);
  });

  test('Aspect-Ratio-Check (Vertical vs Horizontal)', () => {
    assert.match(src, /aspectRatio/);
    assert.match(src, /Math\.abs\(dy\) \* opts\.aspectRatio > Math\.abs\(dx\)/);
  });

  test('Threshold-Schutz gegen kurze Tap-Falsch-Trigger', () => {
    assert.match(src, /threshold:\s*80/);
    assert.match(src, /dx <= -opts\.threshold/);
    assert.match(src, /dx >= opts\.threshold/);
  });

  test('Visuelles Feedback mit Opacity-Gradient', () => {
    assert.match(src, /prova-swipe-feedback/);
    assert.match(src, /Math\.min\(1, Math\.abs\(dx\) \/ opts\.threshold\)/);
  });

  test('prefers-reduced-motion respektiert', () => {
    assert.match(src, /prefers-reduced-motion/);
  });

  test('Touch-Events: touchstart, touchmove, touchend, touchcancel', () => {
    assert.match(src, /touchstart/);
    assert.match(src, /touchmove/);
    assert.match(src, /touchend/);
    assert.match(src, /touchcancel/);
  });

  test('Try/Catch um Callback (Defense bei User-Code-Error)', () => {
    assert.match(src, /try \{ opts\.onSwipeLeft\(/);
    assert.match(src, /try \{ opts\.onSwipeRight\(/);
  });

  test('aria-hidden auf Feedback-Overlays (visual only)', () => {
    assert.match(src, /setAttribute\(['"]aria-hidden['"], ['"]true['"]\)/);
  });

  test('CSS-Defense: touch-action pan-y (kein horizontal browser-scroll)', () => {
    assert.match(src, /touch-action:\s*pan-y/);
  });
});

describe('lib/native-share.js — Library', () => {
  const src = read('lib/native-share.js');

  test('window.ProvaShare exposed', () => {
    assert.match(src, /window\.ProvaShare\s*=/);
  });

  test('Public API: share + shareFiles + canShare + canShareFiles', () => {
    assert.ok(src.includes('share: share'));
    assert.ok(src.includes('shareFiles: shareFiles'));
    assert.ok(src.includes('canShare: canShare'));
    assert.ok(src.includes('canShareFiles: canShareFiles'));
  });

  test('Web-Share-API Detection via typeof navigator.share', () => {
    assert.match(src, /typeof navigator\.share === ['"]function['"]/);
  });

  test('Cancel-by-User wird NICHT als Error gewertet', () => {
    assert.match(src, /AbortError/);
    assert.match(src, /method:\s*['"]cancelled['"]/);
  });

  test('Clipboard-Fallback wenn Web-Share fehlt', () => {
    assert.match(src, /_clipboardFallback/);
    assert.match(src, /navigator\.clipboard\.writeText/);
  });

  test('Toast-Helpers nutzen prova-alert (W12 Defense-in-Depth)', () => {
    assert.match(src, /window\.provaAlert/);
    assert.match(src, /window\.ProvaUI && window\.ProvaUI\.toast/);
  });

  test('shareFiles prueft canShare({files}) vor Aufruf', () => {
    assert.match(src, /navigator\.canShare\(data\)/);
  });

  test('Returnt strukturiertes Result-Object {shared, method}', () => {
    assert.match(src, /shared:\s*true/);
    assert.match(src, /shared:\s*false/);
    assert.match(src, /method:\s*['"]share['"]/);
    assert.match(src, /method:\s*['"]clipboard['"]/);
    assert.match(src, /method:\s*['"]unsupported['"]/);
  });
});

describe('PTR-Sweep: 3 Pages haben Pull-to-Refresh', () => {
  const dashboard = read('dashboard.html');
  const kontakte = read('kontakte.html');
  const briefvorlagen = read('briefvorlagen.html');

  test('dashboard.html laedt pull-to-refresh.js', () => {
    assert.match(dashboard, /\/lib\/pull-to-refresh\.js/);
  });

  test('dashboard.html bind PTR auf #recent-list', () => {
    assert.match(dashboard, /ProvaPullToRefresh\.bind/);
    assert.match(dashboard, /'recent-list'|"recent-list"/);
  });

  test('kontakte.html laedt pull-to-refresh.js', () => {
    assert.match(kontakte, /\/lib\/pull-to-refresh\.js/);
  });

  test('kontakte.html bind PTR auf Kontakte-Grid', () => {
    assert.match(kontakte, /ProvaPullToRefresh\.bind/);
  });

  test('briefvorlagen.html laedt pull-to-refresh.js', () => {
    assert.match(briefvorlagen, /\/lib\/pull-to-refresh\.js/);
  });

  test('briefvorlagen.html bind PTR auf Vorlagen-Grid', () => {
    assert.match(briefvorlagen, /ProvaPullToRefresh\.bind/);
  });

  test('Alle 3 Pages: Touch-Detection (ontouchstart) vor Bind', () => {
    for (const html of [dashboard, kontakte, briefvorlagen]) {
      assert.match(html, /'ontouchstart' in window/);
    }
  });

  test('Alle 3 Pages: Refresh-Callback definiert', () => {
    for (const html of [dashboard, kontakte, briefvorlagen]) {
      // Entweder echte Reload-Funktion oder Window-Reload-Fallback
      assert.match(html, /window\.location\.reload\(\)|ladeDashboard|ladeKontakte|render\(\)/);
    }
  });
});
