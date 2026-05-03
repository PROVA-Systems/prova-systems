/**
 * PROVA — EXIF-Orientation-Reader Tests
 * MEGA¹⁰ W4 (2026-05-04)
 *
 * Reproduziert die readExifOrientation-Logik aus lib/foto-upload-v2.js
 * (Buffer-Variante fuer Node-Tests, da Browser-Blob fehlt).
 *
 * Bug-Klasse A aus MEGA¹⁰-Plan: ohne diese Funktion wuerde
 * stripExif() den Orientation-Tag entfernen und Hochformat-Fotos
 * vom iPhone landeten quer im KI-Captioning.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Buffer-basierte Reproduktion von readExifOrientation.
 * Browser-Code nutzt Blob.slice + arrayBuffer; Tests nutzen direktes Buffer.
 */
function readExifOrientationBuffer(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) !== 0xFF) break;
    const marker = view.getUint16(offset);

    if (marker === 0xFFD9 || marker === 0xFFDA) return 1;

    const segLen = view.getUint16(offset + 2);

    if (marker === 0xFFE1) {
      if (offset + 4 + 6 > view.byteLength) return 1;
      const exifMarker = view.getUint32(offset + 4);
      if (exifMarker !== 0x45786966) {  // not "Exif"
        offset += 2 + segLen;
        continue;
      }
      const tiffStart = offset + 10;
      if (tiffStart + 8 > view.byteLength) return 1;
      const byteOrder = view.getUint16(tiffStart);
      const littleEndian = (byteOrder === 0x4949);
      if (!littleEndian && byteOrder !== 0x4D4D) return 1;
      const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
      const ifdStart = tiffStart + ifd0Offset;
      if (ifdStart + 2 > view.byteLength) return 1;
      const tagCount = view.getUint16(ifdStart, littleEndian);
      if (ifdStart + 2 + tagCount * 12 > view.byteLength) return 1;
      for (let i = 0; i < tagCount; i++) {
        const entryStart = ifdStart + 2 + i * 12;
        const tag = view.getUint16(entryStart, littleEndian);
        if (tag === 0x0112) {
          const orientation = view.getUint16(entryStart + 8, littleEndian);
          if (orientation >= 1 && orientation <= 8) return orientation;
          return 1;
        }
      }
      return 1;
    }
    offset += 2 + segLen;
  }
  return 1;
}

/**
 * Helper: konstruiert minimal-validen JPEG mit EXIF-APP1 + Orientation-Tag.
 *
 * Layout APP1:
 *   FF E1 [LL LL] "Exif\0\0" [TIFF-Header] [IFD0]
 *
 * TIFF-Header (Little-Endian "II"):
 *   49 49 2A 00 [IFD0-Offset 4 byte LE]
 *
 * IFD0:
 *   [tag-count 2 byte LE]
 *   pro Entry: [tag 2 byte] [type 2 byte] [count 4 byte] [value 4 byte]
 */
function buildJpegWithOrientation(orientation, byteOrderMark) {
  const isLE = byteOrderMark !== 'MM';
  // Build IFD0 with single Orientation-Tag
  const ifd = Buffer.alloc(2 + 12 + 4);  // count + 1 entry + nextIFDPointer
  ifd.writeUInt16LE(1, 0);  // entry-count = 1 (LE for simplicity, but write as per byte-order)
  // Re-write with proper byte-order
  const ifdView = new DataView(ifd.buffer);
  ifdView.setUint16(0, 1, isLE);                 // tag-count
  ifdView.setUint16(2, 0x0112, isLE);            // tag = Orientation
  ifdView.setUint16(4, 3, isLE);                 // type = SHORT
  ifdView.setUint32(6, 1, isLE);                 // count = 1
  ifdView.setUint16(10, orientation, isLE);      // value (SHORT)
  ifdView.setUint16(12, 0, isLE);                // value padding (LSB ignored)
  ifdView.setUint32(14, 0, isLE);                // next IFD = 0

  // TIFF-Header: 8 byte
  const tiff = Buffer.alloc(8);
  if (isLE) {
    tiff[0] = 0x49; tiff[1] = 0x49;  // 'II'
    new DataView(tiff.buffer).setUint16(2, 0x002A, true);  // 42 = TIFF magic
    new DataView(tiff.buffer).setUint32(4, 8, true);       // IFD0 offset = 8 (right after header)
  } else {
    tiff[0] = 0x4D; tiff[1] = 0x4D;
    new DataView(tiff.buffer).setUint16(2, 0x002A, false);
    new DataView(tiff.buffer).setUint32(4, 8, false);
  }

  // Exif-Header: "Exif\0\0" (6 byte) + TIFF + IFD
  const exifPayload = Buffer.concat([
    Buffer.from('Exif\0\0', 'binary'),
    tiff,
    ifd
  ]);

  // APP1: FF E1 [length 2 byte BE] payload
  // Length includes the 2 length bytes
  const app1Length = exifPayload.length + 2;
  const app1Header = Buffer.from([0xFF, 0xE1, (app1Length >> 8) & 0xFF, app1Length & 0xFF]);

  // SOI + APP1 + DQT + EOI (minimaler valider JPEG-Skeleton)
  const dqt = Buffer.from([0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00]);
  const soi = Buffer.from([0xFF, 0xD8]);
  const eoi = Buffer.from([0xFF, 0xD9]);

  return Buffer.concat([soi, app1Header, exifPayload, dqt, eoi]);
}

describe('readExifOrientation — alle 8 EXIF-Orientation-Werte (Little-Endian)', () => {
  for (let o = 1; o <= 8; o++) {
    test(`Orientation = ${o} (LE) erkannt`, () => {
      const buf = buildJpegWithOrientation(o, 'II');
      assert.equal(readExifOrientationBuffer(buf), o);
    });
  }
});

describe('readExifOrientation — Big-Endian (MM byte-order)', () => {
  test('Orientation = 6 (MM) erkannt', () => {
    const buf = buildJpegWithOrientation(6, 'MM');
    assert.equal(readExifOrientationBuffer(buf), 6);
  });

  test('Orientation = 1 (MM) erkannt', () => {
    const buf = buildJpegWithOrientation(1, 'MM');
    assert.equal(readExifOrientationBuffer(buf), 1);
  });
});

describe('readExifOrientation — Defensive-Edges', () => {
  test('JPEG ohne EXIF-APP1 returns 1', () => {
    const buf = Buffer.from([
      0xFF, 0xD8,
      0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00,
      0xFF, 0xD9
    ]);
    assert.equal(readExifOrientationBuffer(buf), 1);
  });

  test('Non-JPEG (PNG-Header) returns 1', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    assert.equal(readExifOrientationBuffer(buf), 1);
  });

  test('Empty Buffer returns 1', () => {
    assert.equal(readExifOrientationBuffer(Buffer.alloc(0)), 1);
  });

  test('Truncated JPEG (nur SOI) returns 1', () => {
    assert.equal(readExifOrientationBuffer(Buffer.from([0xFF, 0xD8])), 1);
  });

  test('SOS-Marker (Bilddaten reached) returns 1', () => {
    // SOI + DQT + SOS (Start-of-Scan = Bilddaten) — kein EXIF
    const buf = Buffer.from([
      0xFF, 0xD8,
      0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00,
      0xFF, 0xDA, 0x00, 0x05, 0x00, 0x00, 0x00,  // SOS
      0xFF, 0xD9
    ]);
    assert.equal(readExifOrientationBuffer(buf), 1);
  });

  test('APP1 mit XMP statt EXIF wird ignoriert (returns 1)', () => {
    // XMP-APP1 startet mit "http..." statt "Exif"
    const xmpPayload = Buffer.from('http://ns.adobe.com/xap/1.0/\0');
    const padded = Buffer.concat([xmpPayload, Buffer.alloc(50)]);
    const app1Len = padded.length + 2;
    const buf = Buffer.concat([
      Buffer.from([0xFF, 0xD8]),
      Buffer.from([0xFF, 0xE1, (app1Len >> 8) & 0xFF, app1Len & 0xFF]),
      padded,
      Buffer.from([0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00]),
      Buffer.from([0xFF, 0xD9])
    ]);
    assert.equal(readExifOrientationBuffer(buf), 1);
  });

  test('Invalid Orientation-Wert (0 oder 99) clampes auf 1', () => {
    const buf = buildJpegWithOrientation(99, 'II');
    assert.equal(readExifOrientationBuffer(buf), 1);
  });
});

describe('Orientation-Transform-Logic (Canvas-Math-Verifikation)', () => {
  // Logik: bei Orientation 5-8 muss Canvas-Dim swapped werden,
  // damit Hochformat-Output korrekt aussieht.

  function shouldSwapDimensions(orientation) {
    return orientation >= 5 && orientation <= 8;
  }

  test('Orientation 1-4: keine Dim-Swap', () => {
    for (const o of [1, 2, 3, 4]) {
      assert.equal(shouldSwapDimensions(o), false, 'Orientation ' + o);
    }
  });

  test('Orientation 5-8: Dim-Swap noetig (Hochformat-Korrektur)', () => {
    for (const o of [5, 6, 7, 8]) {
      assert.equal(shouldSwapDimensions(o), true, 'Orientation ' + o);
    }
  });

  test('iPhone-Standard (Orientation 6) braucht Swap', () => {
    // iPhone-Hochformat-Foto: Sensor sieht Querformat (4032x3024),
    // EXIF-Orientation 6 sagt "drehe 90° CW fuer Display".
    // Output-Dim soll Hochformat sein: 3024x4032.
    assert.equal(shouldSwapDimensions(6), true);
  });
});
