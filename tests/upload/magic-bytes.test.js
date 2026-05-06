/**
 * PROVA — Foto-Upload Magic-Bytes-Validation Tests
 * MEGA⁹ W1 (04.05.2026)
 *
 * Tests die Magic-Bytes-Detection-Logic isoliert.
 * (Browser-only Library lib/foto-upload-v2.js — wir reproduzieren die
 * MAGIC_BYTES Tabelle hier, damit node-tests laufen.)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reproduktion der MAGIC_BYTES Tabelle aus lib/foto-upload-v2.js
// MEGA¹⁰ W4: HEIC-Eintraege jetzt mit sig_offset=4 (Box-Size davor)
const MAGIC_BYTES = [
  { ext: 'jpg',  mime: 'image/jpeg', sig: [0xFF, 0xD8, 0xFF] },
  { ext: 'png',  mime: 'image/png',  sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: 'webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46], offset_check: 8, additional: [0x57, 0x45, 0x42, 0x50] },
  { ext: 'gif',  mime: 'image/gif',  sig: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x63] },
  { ext: 'heif', mime: 'image/heif', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x66] },
  { ext: 'pdf',  mime: 'application/pdf', sig: [0x25, 0x50, 0x44, 0x46] }
];

function detectMime(bytes) {
  for (const sig of MAGIC_BYTES) {
    const primaryOffset = sig.sig_offset || 0;
    let matches = true;
    for (let i = 0; i < sig.sig.length; i++) {
      if (bytes[primaryOffset + i] !== sig.sig[i]) { matches = false; break; }
    }
    if (!matches) continue;
    if (sig.offset_check && sig.additional) {
      for (let i = 0; i < sig.additional.length; i++) {
        if (bytes[sig.offset_check + i] !== sig.additional[i]) { matches = false; break; }
      }
    }
    if (matches) return sig.mime;
  }
  return null;
}

describe('Magic-Bytes File-Type-Detection', () => {
  test('JPEG erkannt (FF D8 FF)', () => {
    const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    assert.equal(detectMime(bytes), 'image/jpeg');
  });

  test('PNG erkannt (89 50 4E 47 0D 0A 1A 0A)', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    assert.equal(detectMime(bytes), 'image/png');
  });

  test('WebP erkannt (RIFF + WEBP)', () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(detectMime(bytes), 'image/webp');
  });

  test('RIFF ohne WEBP-Tag NICHT als WebP', () => {
    // RIFF + WAV (Audio)
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(detectMime(bytes), null);
  });

  test('HEIC erkannt (ftyp heic an Offset 4)', () => {
    // MEGA¹⁰ W4: Realistische HEIC-Header (Box-Size + ftyp + Brand)
    // Vorher (MEGA⁹): Test war kuenstlich, hatte sig ab Offset 0 — Production-Bug!
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(detectMime(bytes), 'image/heic');
  });

  test('HEIF erkannt (ftyp heif an Offset 4)', () => {
    // MEGA¹⁰ W4: Realistische HEIF-Header
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(detectMime(bytes), 'image/heif');
  });

  test('GIF erkannt', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    assert.equal(detectMime(bytes), 'image/gif');
  });

  test('PDF erkannt', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]);
    assert.equal(detectMime(bytes), 'application/pdf');
  });

  test('Random Bytes NICHT als Image erkannt', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x12, 0x34]);
    assert.equal(detectMime(bytes), null);
  });

  test('EXE-Header NICHT als Image (MIME-Spoofing-Detection)', () => {
    // PE-Executable-Header
    const bytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03]);
    assert.equal(detectMime(bytes), null);
  });

  test('Empty Bytes', () => {
    const bytes = new Uint8Array(0);
    assert.equal(detectMime(bytes), null);
  });

  test('Truncated JPEG (nur 2 Bytes) NICHT erkannt', () => {
    const bytes = new Uint8Array([0xFF, 0xD8]);
    assert.equal(detectMime(bytes), null);
  });
});
