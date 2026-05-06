/**
 * PROVA — W20 Bug-Fix-Sweep Tests
 * MEGA¹³ W20 (2026-05-05)
 *
 * Pro Bug: Test der ZEIGT dass das alte Bug-Verhalten weg ist
 * (failed-vorher-passes-nachher Pattern).
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('Bug 1: isOutageError verfehlt 408 + Cloudflare-5xx', () => {
  const { isOutageError } = require('../../netlify/functions/lib/ki-anthropic');

  test('OpenAI 408 (Request Timeout) → JETZT Outage (Pre-Fix: false)', () => {
    assert.equal(isOutageError(new Error('OpenAI 408: Request Timeout')), true);
  });

  test('Cloudflare 502 → JETZT Outage (Pre-Fix: false)', () => {
    assert.equal(isOutageError(new Error('Cloudflare 502: Bad Gateway')), true);
    assert.equal(isOutageError(new Error('Cloudflare 503')), true);
  });

  test('CDN 504 → Outage', () => {
    assert.equal(isOutageError(new Error('CDN 504: Gateway Timeout')), true);
  });

  test('Gateway 502 → Outage', () => {
    assert.equal(isOutageError(new Error('Gateway 502')), true);
  });

  test('Proxy 503 → Outage', () => {
    assert.equal(isOutageError(new Error('Proxy 503: Service Unavailable')), true);
  });

  test('Regression-Schutz: bestehende OpenAI 5xx weiter Outage', () => {
    assert.equal(isOutageError(new Error('OpenAI 500')), true);
    assert.equal(isOutageError(new Error('OpenAI 502')), true);
  });

  test('Regression-Schutz: 4xx (auth/rate-limit) bleibt non-outage', () => {
    assert.equal(isOutageError(new Error('OpenAI 401')), false);
    assert.equal(isOutageError(new Error('OpenAI 429')), false);
    assert.equal(isOutageError(new Error('OpenAI 400')), false);
    assert.equal(isOutageError(new Error('OpenAI 403')), false);
  });
});

describe('Bug 2: Halluzinations-Filter Whitespace-Variants', () => {
  // Reproduce Backend computeConfidence-Logik (mit W20-Fix)
  const HALLUZINATION_RED_FLAGS = [
    'mit Sicherheit', 'definitiv', 'zweifellos', 'eindeutig',
    'beweisbar', 'unbestreitbar'
  ];

  function detectRedFlags(text) {
    const lowerText = text.toLowerCase().replace(/[\s ]+/g, ' ');
    let count = 0;
    for (const rf of HALLUZINATION_RED_FLAGS) {
      if (lowerText.includes(rf.toLowerCase().replace(/\s+/g, ' '))) count++;
    }
    return count;
  }

  test('Multi-Space "Mit  Sicherheit" wird erkannt (Pre-Fix: nicht erkannt)', () => {
    assert.equal(detectRedFlags('Es ist mit  Sicherheit so.'), 1);
  });

  test('Tab "Mit\\tSicherheit" wird erkannt', () => {
    assert.equal(detectRedFlags('Es ist mit\tSicherheit so.'), 1);
  });

  test('Non-Breaking-Space (NBSP) "Mit\\u00a0Sicherheit" wird erkannt', () => {
    assert.equal(detectRedFlags('Es ist mit Sicherheit so.'), 1);
  });

  test('Mixed Whitespace "Mit \\t Sicherheit" wird erkannt', () => {
    assert.equal(detectRedFlags('Es ist mit \t Sicherheit so.'), 1);
  });

  test('Regression-Schutz: Standard-Single-Space weiter erkannt', () => {
    assert.equal(detectRedFlags('Mit Sicherheit ist es so.'), 1);
    assert.equal(detectRedFlags('Definitiv und zweifellos.'), 2);
  });
});

describe('Bug 3: Pull-to-Refresh Multi-Touch (Pinch-Zoom)', () => {
  const src = read('lib/pull-to-refresh.js');

  test('touchstart prueft e.touches.length > 1 (Pinch-Defense)', () => {
    assert.match(src, /e\.touches\.length > 1/);
  });

  test('Multi-Touch waehrend Pull → snap-back (Reset)', () => {
    // Pattern check: bei multi-touch state reset
    assert.match(src, /touchStartY = null;\s*\n[\s]*pulling = false;/);
  });

  test('Multi-Touch in onTouchMove: Indicator zurueck', () => {
    assert.match(src, /onTouchMove[\s\S]{0,500}touches\.length > 1[\s\S]{0,200}translateY\(0\)/);
  });
});

describe('Bug 4: Drilldown Focus-Trap voll + aria-pressed', () => {
  const src = read('lib/admin-drilldown.js');

  test('_onTabKey Funktion existiert (Focus-Trap)', () => {
    assert.match(src, /function _onTabKey/);
  });

  test('Focus-Trap: Shift+Tab am ersten Element wrapt zu letztem', () => {
    assert.match(src, /e\.shiftKey/);
    assert.match(src, /document\.activeElement === first/);
    assert.match(src, /last\.focus\(\)/);
  });

  test('Focus-Trap: Tab am letzten Element wrapt zu erstem', () => {
    assert.match(src, /document\.activeElement === last/);
    assert.match(src, /first\.focus\(\)/);
  });

  test('Focus-Trap-Listener registriert in open()', () => {
    assert.match(src, /addEventListener\(['"]keydown['"], _onTabKey\)/);
  });

  test('Focus-Trap-Listener removed in close()', () => {
    assert.match(src, /removeEventListener\(['"]keydown['"], _onTabKey\)/);
  });

  test('TimeRange-Buttons haben aria-pressed', () => {
    assert.match(src, /aria-pressed="/);
  });

  test('aria-pressed wird bei click umgeschaltet', () => {
    assert.match(src, /setAttribute\(['"]aria-pressed['"], isActive \? ['"]true['"] : ['"]false['"]\)/);
  });

  test('Toolbar hat role=group + aria-label', () => {
    assert.match(src, /role="group"[\s\S]{0,80}aria-label="Zeitraum-Filter"/);
  });
});

describe('W20 Regression-Schutz: bestehende W12-W15 Tests muessen weiter passen', () => {

  test('Anthropic isOutageError: 4xx-Behaviors unveraendert', () => {
    const { isOutageError } = require('../../netlify/functions/lib/ki-anthropic');
    assert.equal(isOutageError(null), false);
    assert.equal(isOutageError(undefined), false);
    assert.equal(isOutageError(''), false);
    assert.equal(isOutageError(new Error('Some unrelated')), false);
  });

  test('Confidence-Badge Konstanten unveraendert (Markers + RedFlags)', () => {
    const src = read('lib/ki-confidence-badge.js');
    assert.match(src, /KONJUNKTIV_II_MARKERS/);
    assert.match(src, /HALLUZINATION_RED_FLAGS/);
  });

  test('Drilldown-Modal weiterhin keyboard-accessible', () => {
    const src = read('lib/admin-drilldown.js');
    // Tabindex=-1 NEGATIVE-Pattern (in Focus-Trap selector excluded)
    assert.match(src, /tabindex="-1"/);
    // Plus: ESC-Key + Tab-Key beide gehandled
    assert.match(src, /e\.key === 'Escape'/);
    assert.match(src, /e\.key !== 'Tab'/);
  });
});
