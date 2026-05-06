/**
 * Tests für Live-Transkript Manual-Input-Schutz (MEGA²⁸ V3.2-W7N-I1)
 *
 * Verifiziert das Variante-A-Pattern in app-logic.js:
 * - Manual-Input pausiert Live-Append für 5 Sekunden
 * - Pending Buffer wird geflushed bei nächstem Append (post-Pause)
 * - Event-Listener nur 1× gebunden (data-w7i1Bound flag)
 *
 * Volle Browser-Verifikation pflicht — siehe Decision-Log #13.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app-logic.js'),
  'utf8'
);

describe('Live-Transkript W7N-I1 — Variante A Pattern', () => {
  test('PAUSE_AFTER_MANUAL_MS Konstante = 5000', () => {
    assert.match(SRC, /const PAUSE_AFTER_MANUAL_MS\s*=\s*5000/);
  });

  test('window._lastManualInputTs State-Variable', () => {
    assert.match(SRC, /window\._lastManualInputTs\s*=\s*0/);
  });

  test('Event-Listener für input + keydown + paste auf transcriptArea', () => {
    assert.match(SRC, /addEventListener\(['"]input['"],\s*_markManual\)/);
    assert.match(SRC, /addEventListener\(['"]keydown['"],\s*_markManual\)/);
    assert.match(SRC, /addEventListener\(['"]paste['"],\s*_markManual\)/);
  });

  test('Idempotenz-Marker: data-w7i1Bound verhindert Doppel-Bind', () => {
    assert.match(SRC, /data-w7i1Bound|dataset\.w7i1Bound/i);
  });

  test('onresult skipt Append wenn Manual-Input < 5s', () => {
    // Pattern: Date.now() - window._lastManualInputTs < PAUSE_AFTER_MANUAL_MS
    assert.match(SRC, /Date\.now\(\)\s*-\s*\(window\._lastManualInputTs/);
    assert.match(SRC, /PAUSE_AFTER_MANUAL_MS/);
  });

  test('Pending Buffer für Pause-Periode (kein Datenverlust)', () => {
    assert.match(SRC, /window\._pendingTranscriptBuffer/);
  });

  test('Buffer-Flush nach Pause: pBuffered mit data-buffered-Marker', () => {
    assert.match(SRC, /pBuffered\.dataset\.bufferedDuringEdit/);
  });

  test('Audit-Block-Kommentar mit MEGA²⁸ W7N-I1 Marker', () => {
    assert.match(SRC, /MEGA.{1,3} W7N-I1/);
    assert.match(SRC, /Variante A/);
    assert.match(SRC, /Decision-Log/);
  });

  test('Marcel-Browser-Verify-Marker im Comment', () => {
    assert.match(SRC, /Browser-Verify-Marker/);
  });
});

describe('Live-Transkript Pattern-Integrität (existing pattern intact)', () => {
  test('recognition.onresult function existiert', () => {
    assert.match(SRC, /recognition\.onresult\s*=\s*e\s*=>/);
  });

  test('window.transcriptText global state erhalten', () => {
    assert.match(SRC, /window\.transcriptText\s*\+=/);
  });

  test('transcriptArea contenteditable bleibt erhalten', () => {
    assert.match(SRC, /\$\(['"]#transcriptArea['"]\)/);
  });
});
