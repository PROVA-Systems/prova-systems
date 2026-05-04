/**
 * PROVA — W25 Bug-Fix-Sweep Tests (aus W18-W21 Brutal-Critique)
 * MEGA¹⁴ W25 (2026-05-06)
 *
 * Pre-Post-Pattern: Test-Code prueft dass das alte Bug-Verhalten weg ist.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('Bug 1+2: Hamburger + Bottom-Sheet Focus-Trap', () => {

  test('hamburger-menu.js hat _onTabKey Funktion (Focus-Trap)', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /function _onTabKey/);
  });

  test('hamburger-menu.js: Shift+Tab am ersten wrapt zu letztem', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /e\.shiftKey/);
    assert.match(src, /document\.activeElement === first/);
    assert.match(src, /last\.focus\(\)/);
  });

  test('hamburger-menu.js: Tab am letzten wrapt zu erstem', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /document\.activeElement === last/);
    assert.match(src, /first\.focus\(\)/);
  });

  test('hamburger-menu.js: _onTabKey-Listener registriert in open()', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /addEventListener\(['"]keydown['"], _onTabKey\)/);
  });

  test('hamburger-menu.js: _onTabKey-Listener removed in close()', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /removeEventListener\(['"]keydown['"], _onTabKey\)/);
  });

  test('bottom-sheet.js hat _onTabKey Funktion', () => {
    const src = read('lib/bottom-sheet.js');
    assert.match(src, /function _onTabKey/);
  });

  test('bottom-sheet.js: Focus-Trap-Listener in open()', () => {
    const src = read('lib/bottom-sheet.js');
    assert.match(src, /addEventListener\(['"]keydown['"], _onTabKey\)/);
  });

  test('bottom-sheet.js: Focus-Trap-Listener removed in close()', () => {
    const src = read('lib/bottom-sheet.js');
    assert.match(src, /removeEventListener\(['"]keydown['"], _onTabKey\)/);
  });
});

describe('Bug 3: KI-History Refresh-Button + Pagination-Hint', () => {
  const src = read('lib/ki-history-frontend.js');

  test('Refresh-Button im Toolbar gerendert', () => {
    assert.match(src, /id="prova-kih-refresh"/);
    assert.match(src, /aria-label="Aktualisieren"/);
  });

  test('Refresh-Button-Handler ruft _loadAndRender', () => {
    assert.match(src, /refreshBtn\.addEventListener\(['"]click['"], function \(\) \{ _loadAndRender\(\); \}\)/);
  });

  test('Pagination-Hint bei 200 Records', () => {
    assert.match(src, /_allRecords\.length >= 200/);
    assert.match(src, /Zeige 200 neueste|⚠️/);
  });

  test('Pagination-Hint role=note (Accessibility)', () => {
    assert.match(src, /role="note"/);
    assert.match(src, /200 neueste/);
  });
});

describe('Bug 4: Admin-Bulk MutationObserver-Throttle + Toast-Stack-Cleanup', () => {
  const src = read('lib/admin-bulk.js');

  test('MutationObserver throttled via requestAnimationFrame', () => {
    assert.match(src, /throttlePending/);
    assert.match(src, /requestAnimationFrame\(\(\) => \{[\s\S]{0,200}throttlePending = false/);
  });

  test('Throttle-Pattern: skip wenn pending', () => {
    assert.match(src, /if \(throttlePending\) return;/);
  });

  test('Undo-Toast-Stack-Cleanup: alte Toasts werden removed', () => {
    assert.match(src, /querySelectorAll\(['"]\.prova-bulk-undo-toast['"]\)/);
    assert.match(src, /oldToast\.parentNode\.removeChild\(oldToast\)/);
  });
});

describe('W25 Regression-Schutz: bestehende W18-W21 Tests muessen weiter passen', () => {

  test('hamburger-menu Public-API unveraendert', () => {
    const src = read('lib/hamburger-menu.js');
    assert.match(src, /window\.ProvaHamburger\s*=/);
    assert.ok(src.includes('bind: bind'));
    assert.ok(src.includes('open: open'));
  });

  test('bottom-sheet Public-API unveraendert', () => {
    const src = read('lib/bottom-sheet.js');
    assert.match(src, /window\.ProvaBottomSheet\s*=/);
    assert.ok(src.includes('open: open'));
  });

  test('ki-history Public-API unveraendert', () => {
    const src = read('lib/ki-history-frontend.js');
    assert.match(src, /window\.ProvaKIHistory\s*=/);
    assert.ok(src.includes('openForAuftrag: openForAuftrag'));
  });

  test('admin-bulk Public-API unveraendert', () => {
    const src = read('lib/admin-bulk.js');
    assert.match(src, /window\.ProvaBulk\s*=/);
    assert.ok(src.includes('attach: attach'));
  });
});
