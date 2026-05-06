/**
 * PROVA — EXIF-Strip JPEG-Marker-Parser Tests
 * MEGA⁹ W1 (04.05.2026)
 *
 * Tests die Logic des EXIF-Strippers (lib/foto-upload-v2.js stripExif()).
 *
 * Reproduktion der Logic mit Buffer statt Blob fuer Node-Tests.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Reproduziert die stripExif-Logik aus lib/foto-upload-v2.js (Buffer-basiert).
 * Returns: Buffer ohne APP1 (EXIF), APP2 (FlashPix), APP13 (IPTC) Marker.
 */
function stripExifBuffer(buf) {
  // SOI-Check
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
    throw new Error('not a JPEG');
  }

  let offset = 2;
  const segments = [];

  while (offset < buf.length) {
    if (buf[offset] !== 0xFF) break;
    const marker = (buf[offset] << 8) | buf[offset + 1];

    // EOI / SOS reached
    if (marker === 0xFFD9 || marker === 0xFFDA) {
      segments.push(buf.slice(offset));
      break;
    }

    const segmentLength = (buf[offset + 2] << 8) | buf[offset + 3];

    // Skip APP1 (EXIF), APP2 (FlashPix), APP13 (IPTC)
    if (marker === 0xFFE1 || marker === 0xFFE2 || marker === 0xFFED) {
      offset += 2 + segmentLength;
      continue;
    }

    segments.push(buf.slice(offset, offset + 2 + segmentLength));
    offset += 2 + segmentLength;
  }

  // Rebuild
  const totalLen = 2 + segments.reduce((a, s) => a + s.length, 0);
  const out = Buffer.alloc(totalLen);
  out[0] = 0xFF; out[1] = 0xD8;
  let pos = 2;
  for (const s of segments) { s.copy(out, pos); pos += s.length; }
  return out;
}

// Helper: minimaler JPEG ohne EXIF
function buildJpegWithoutExif() {
  return Buffer.from([
    0xFF, 0xD8,                           // SOI
    0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00,  // DQT (5 bytes incl length-bytes)
    0xFF, 0xD9                            // EOI
  ]);
}

// Helper: JPEG mit APP1-EXIF-Segment
function buildJpegWithExif() {
  // SOI + APP1 (EXIF, 100 bytes payload) + DQT + EOI
  const exifPayload = Buffer.alloc(100);
  exifPayload.write('Exif\0\0', 0);  // EXIF-Header
  return Buffer.concat([
    Buffer.from([0xFF, 0xD8]),                                  // SOI
    Buffer.from([0xFF, 0xE1, 0x00, 102]),                        // APP1 marker + length (102 = 2-byte-length + 100 payload)
    exifPayload,
    Buffer.from([0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00]),    // DQT
    Buffer.from([0xFF, 0xD9])                                    // EOI
  ]);
}

// Helper: JPEG mit APP2 (FlashPix)
function buildJpegWithApp2() {
  const payload = Buffer.alloc(50);
  return Buffer.concat([
    Buffer.from([0xFF, 0xD8]),
    Buffer.from([0xFF, 0xE2, 0x00, 52]),  // APP2 length 52
    payload,
    Buffer.from([0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00]),
    Buffer.from([0xFF, 0xD9])
  ]);
}

describe('EXIF-Strip JPEG', () => {
  test('JPEG ohne EXIF bleibt unveraendert (Inhalt)', () => {
    const original = buildJpegWithoutExif();
    const stripped = stripExifBuffer(original);
    assert.deepEqual(stripped, original);
  });

  test('JPEG mit APP1-EXIF wird kleiner', () => {
    const original = buildJpegWithExif();
    const stripped = stripExifBuffer(original);
    assert.ok(stripped.length < original.length, 'gestripped sollte kleiner sein');
  });

  test('JPEG mit APP1-EXIF: APP1-Marker wird entfernt', () => {
    const original = buildJpegWithExif();
    const stripped = stripExifBuffer(original);

    // Original hat 0xFFE1 nach SOI
    assert.equal(original[2], 0xFF);
    assert.equal(original[3], 0xE1);

    // Stripped hat 0xFFDB (DQT) direkt nach SOI
    assert.equal(stripped[2], 0xFF);
    assert.equal(stripped[3], 0xDB);
  });

  test('JPEG mit APP2 wird gestrippt', () => {
    const original = buildJpegWithApp2();
    const stripped = stripExifBuffer(original);
    assert.ok(stripped.length < original.length);
    assert.equal(stripped[3], 0xDB);  // DQT statt APP2
  });

  test('JPEG-Output beginnt immer mit SOI 0xFFD8', () => {
    const original = buildJpegWithExif();
    const stripped = stripExifBuffer(original);
    assert.equal(stripped[0], 0xFF);
    assert.equal(stripped[1], 0xD8);
  });

  test('Non-JPEG (PNG-Header) wird abgelehnt', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
    assert.throws(() => stripExifBuffer(png), /not a JPEG/);
  });

  test('JPEG mit mehreren EXIF-Segmenten — alle entfernt', () => {
    const exifPayload = Buffer.alloc(20);
    const buf = Buffer.concat([
      Buffer.from([0xFF, 0xD8]),
      Buffer.from([0xFF, 0xE1, 0x00, 22]), exifPayload,    // APP1 #1
      Buffer.from([0xFF, 0xE1, 0x00, 22]), exifPayload,    // APP1 #2
      Buffer.from([0xFF, 0xDB, 0x00, 0x05, 0x00, 0x00, 0x00]),
      Buffer.from([0xFF, 0xD9])
    ]);
    const stripped = stripExifBuffer(buf);
    // Pruefen: kein 0xFFE1 mehr drin
    let found = false;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i] === 0xFF && stripped[i + 1] === 0xE1) { found = true; break; }
    }
    assert.equal(found, false, 'kein APP1 mehr im Output');
  });

  test('Ende mit EOI 0xFFD9', () => {
    const original = buildJpegWithExif();
    const stripped = stripExifBuffer(original);
    assert.equal(stripped[stripped.length - 2], 0xFF);
    assert.equal(stripped[stripped.length - 1], 0xD9);
  });
});
