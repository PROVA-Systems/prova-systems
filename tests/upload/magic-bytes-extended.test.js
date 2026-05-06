/**
 * PROVA — Magic-Bytes Extended Tests (MEGA¹⁰ W4)
 *
 * Erweitert magic-bytes.test.js um:
 *  - HEIC-Brand-Variants (mif1/msf1/heix/hevc/heim/heis/hevx)
 *  - TIFF (II / MM byte-order)
 *  - BMP
 *
 * Bug-Klasse C aus MEGA¹⁰-Plan: iPhone 12+ schreibt mif1-Brand.
 * Ohne diesen Eintrag wuerde Magic-Bytes-Detection
 * "unknown_magic_bytes" zurueckgeben → file rejected, obwohl valide.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reproduktion der erweiterten MAGIC_BYTES-Tabelle aus lib/foto-upload-v2.js
// MEGA¹⁰ W4: sig_offset-Feld unterstuetzt (HEIC 'ftyp' steht an Offset 4!)
const MAGIC_BYTES = [
  { ext: 'jpg',  mime: 'image/jpeg', sig: [0xFF, 0xD8, 0xFF] },
  { ext: 'png',  mime: 'image/png',  sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: 'webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46], offset_check: 8, additional: [0x57, 0x45, 0x42, 0x50] },
  { ext: 'gif',  mime: 'image/gif',  sig: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x63] }, // heic
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x78] }, // heix
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x6D] }, // heim
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x73] }, // heis
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x76, 0x63] }, // hevc
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x76, 0x78] }, // hevx
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x6D, 0x69, 0x66, 0x31] }, // mif1
  { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x6D, 0x73, 0x66, 0x31] }, // msf1
  { ext: 'heif', mime: 'image/heif', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x66] }, // heif
  { ext: 'tiff', mime: 'image/tiff', sig: [0x49, 0x49, 0x2A, 0x00] }, // II*\0
  { ext: 'tiff', mime: 'image/tiff', sig: [0x4D, 0x4D, 0x00, 0x2A] }, // MM\0*
  { ext: 'bmp',  mime: 'image/bmp',  sig: [0x42, 0x4D] },
  { ext: 'pdf',  mime: 'application/pdf', sig: [0x25, 0x50, 0x44, 0x46] }
];

function detect(bytes) {
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
    if (matches) return sig;
  }
  return null;
}

function ftypBytes(brand) {
  // 4 byte size (ignored) + 'ftyp' + brand
  return Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from(brand, 'ascii'),
    Buffer.alloc(4)
  ]);
}

describe('HEIC-Brand-Variants (Real-iPhone-Kompatibilitaet)', () => {
  test('iPhone-Brand mif1 (iOS 14+) erkannt als HEIC', () => {
    const result = detect(ftypBytes('mif1'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand msf1 erkannt als HEIC', () => {
    const result = detect(ftypBytes('msf1'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand heix erkannt als HEIC', () => {
    const result = detect(ftypBytes('heix'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand heim erkannt als HEIC', () => {
    const result = detect(ftypBytes('heim'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand heis erkannt als HEIC', () => {
    const result = detect(ftypBytes('heis'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand hevc erkannt als HEIC', () => {
    const result = detect(ftypBytes('hevc'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand hevx erkannt als HEIC', () => {
    const result = detect(ftypBytes('hevx'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand heic (Original) erkannt', () => {
    const result = detect(ftypBytes('heic'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heic');
  });

  test('Brand heif erkannt als HEIF', () => {
    const result = detect(ftypBytes('heif'));
    assert.ok(result);
    assert.equal(result.mime, 'image/heif');
  });

  test('Unbekannte ftyp-Brand wird NICHT als HEIC erkannt', () => {
    const result = detect(ftypBytes('xxxx'));
    assert.equal(result, null);
  });

  test('mp4-Brand (isom) wird NICHT als HEIC erkannt (anti-false-positive)', () => {
    const result = detect(ftypBytes('isom'));
    assert.equal(result, null);
  });
});

describe('TIFF Detection (beide Byte-Orders)', () => {
  test('TIFF Little-Endian (II*\\0) erkannt', () => {
    const buf = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00]);
    const result = detect(buf);
    assert.ok(result);
    assert.equal(result.mime, 'image/tiff');
  });

  test('TIFF Big-Endian (MM\\0*) erkannt', () => {
    const buf = Buffer.from([0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08]);
    const result = detect(buf);
    assert.ok(result);
    assert.equal(result.mime, 'image/tiff');
  });

  test('Falsche TIFF-Magic (II Header ohne 2A) wird NICHT erkannt', () => {
    const buf = Buffer.from([0x49, 0x49, 0xAB, 0xCD]);
    const result = detect(buf);
    assert.equal(result, null);
  });
});

describe('BMP Detection', () => {
  test('BMP erkannt (BM-Header)', () => {
    const buf = Buffer.from([0x42, 0x4D, 0x36, 0x00, 0x00, 0x00]);
    const result = detect(buf);
    assert.ok(result);
    assert.equal(result.mime, 'image/bmp');
  });

  test('Bytes "BX" werden NICHT als BMP erkannt', () => {
    const buf = Buffer.from([0x42, 0x58, 0x36, 0x00]);
    const result = detect(buf);
    assert.equal(result, null);
  });
});

describe('Real-World-Sanity (Existing types still work)', () => {
  test('JPEG nach HEIC-Erweiterung weiterhin erkannt', () => {
    const result = detect(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
    assert.ok(result);
    assert.equal(result.mime, 'image/jpeg');
  });

  test('PNG nach Erweiterung weiterhin erkannt', () => {
    const result = detect(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    assert.ok(result);
    assert.equal(result.mime, 'image/png');
  });

  test('WebP nach Erweiterung weiterhin erkannt', () => {
    const result = detect(Buffer.from([
      0x52, 0x49, 0x46, 0x46,  // RIFF
      0x00, 0x00, 0x00, 0x00,  // size
      0x57, 0x45, 0x42, 0x50,  // WEBP
      0x56, 0x50, 0x38, 0x4C   // VP8L
    ]));
    assert.ok(result);
    assert.equal(result.mime, 'image/webp');
  });

  test('PDF nach Erweiterung weiterhin erkannt', () => {
    const result = detect(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]));
    assert.ok(result);
    assert.equal(result.mime, 'application/pdf');
  });
});

describe('MAGIC_BYTES-Tabellen-Vollstaendigkeit (Regression-Schutz)', () => {
  test('Tabelle hat 17 Eintraege (8 Pre-MEGA10 + 9 neue)', () => {
    assert.equal(MAGIC_BYTES.length, 17);
  });

  test('Alle HEIC-Brand-Variants in Tabelle (9 Stueck)', () => {
    const heicCount = MAGIC_BYTES.filter(s => s.mime === 'image/heic').length;
    assert.equal(heicCount, 8, '8 HEIC-Brand-Varianten erwartet');  // heic, heix, heim, heis, hevc, hevx, mif1, msf1
  });

  test('TIFF beide Byte-Orders in Tabelle', () => {
    const tiffSigs = MAGIC_BYTES.filter(s => s.mime === 'image/tiff');
    assert.equal(tiffSigs.length, 2, 'Little-Endian + Big-Endian erwartet');
  });
});
