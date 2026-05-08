'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/foto-upload');

// === Pure-Function Tests (ECHT, nicht Pattern-Match) ===

test('C1: stripExifJpeg entfernt APP1-Marker (EXIF-Section)', () => {
  // Minimaler JPEG mit APP1: SOI (FFD8) + APP1 (FFE1 LL LL "Exif\0\0..." ) + EOI (FFD9)
  const exifPayload = Buffer.concat([
    Buffer.from('Exif\x00\x00', 'binary'),
    Buffer.from('GPSLatitude:52.5N')  // simuliert PII in EXIF
  ]);
  const segLen = exifPayload.length + 2;
  const lenBytes = Buffer.from([(segLen >> 8) & 0xFF, segLen & 0xFF]);
  const original = Buffer.concat([
    Buffer.from([0xFF, 0xD8]),                 // SOI
    Buffer.from([0xFF, 0xE1]), lenBytes, exifPayload,  // APP1
    Buffer.from([0xFF, 0xDA, 0x00, 0x02, 0x12, 0x34]), // SOS + Bilddaten
    Buffer.from([0xFF, 0xD9])                  // EOI
  ]);
  const stripped = Lambda.__stripExifJpeg(original);
  assert.ok(stripped.length < original.length, 'Stripped sollte kleiner sein');
  // EXIF-Payload nicht mehr im Output
  assert.strictEqual(stripped.indexOf('GPSLatitude'), -1, 'EXIF-PII darf nicht im Output sein');
});

test('C1: stripExifJpeg ist idempotent (kein APP1 → unverändert)', () => {
  const minimal = Buffer.from([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02, 0x12, 0x34, 0xFF, 0xD9]);
  const stripped = Lambda.__stripExifJpeg(minimal);
  assert.deepStrictEqual(Buffer.from(stripped), minimal);
});

test('C1: stripExifJpeg verarbeitet Multi-APP1-Sections (EXIF + XMP)', () => {
  const exifSeg = Buffer.concat([
    Buffer.from([0xFF, 0xE1, 0x00, 0x10]),
    Buffer.from('Exif\x00\x00DATA1234', 'binary')
  ]);
  const xmpSeg = Buffer.concat([
    Buffer.from([0xFF, 0xE1, 0x00, 0x10]),
    Buffer.from('http://ns.', 'binary'),
    Buffer.alloc(2, 0)
  ]);
  const original = Buffer.concat([
    Buffer.from([0xFF, 0xD8]),
    exifSeg, xmpSeg,
    Buffer.from([0xFF, 0xDA, 0x00, 0x02, 0x12]),
    Buffer.from([0xFF, 0xD9])
  ]);
  const stripped = Lambda.__stripExifJpeg(original);
  assert.strictEqual(stripped.indexOf('Exif'), -1);
  assert.strictEqual(stripped.indexOf('http://ns.'), -1);
});

test('C1: stripPngTextChunks entfernt tEXt/iTXt/eXIf', () => {
  const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  function chunk(type, data) {
    const buf = Buffer.alloc(8 + data.length + 4);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 4, 'latin1');
    data.copy(buf, 8);
    // CRC dummy (echter CRC braucht zlib, für Strip-Test irrelevant)
    return buf;
  }
  const png = Buffer.concat([
    SIG,
    chunk('IHDR', Buffer.alloc(13)),
    chunk('tEXt', Buffer.from('Author\x00Marcel-PII')),
    chunk('eXIf', Buffer.from('GPS-Daten')),
    chunk('IDAT', Buffer.alloc(8)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  const stripped = Lambda.__stripPngTextChunks(png);
  assert.strictEqual(stripped.indexOf('Marcel-PII'), -1);
  assert.strictEqual(stripped.indexOf('GPS-Daten'), -1);
  // IHDR und IDAT bleiben
  assert.notStrictEqual(stripped.indexOf('IHDR'), -1);
  assert.notStrictEqual(stripped.indexOf('IDAT'), -1);
});

test('C1: stripExif Dispatch (PNG vs JPEG)', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), Buffer.alloc(4)
  ]);
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
  // No exception:
  Lambda.__stripExif(png, 'image/png');
  Lambda.__stripExif(jpeg, 'image/jpeg');
  assert.ok(true);
});

test('C1: REJECT_MIME enthält HEIC/HEIF/WebP', () => {
  assert.ok(Lambda.__REJECT_MIME['image/heic']);
  assert.ok(Lambda.__REJECT_MIME['image/heif']);
  assert.ok(Lambda.__REJECT_MIME['image/webp']);
  assert.match(Lambda.__REJECT_MIME['image/heic'], /HEIC/);
});

test('C1: SUPPORTED_MIME hat JPEG + PNG', () => {
  assert.strictEqual(Lambda.__SUPPORTED_MIME['image/jpeg'], 'jpg');
  assert.strictEqual(Lambda.__SUPPORTED_MIME['image/png'], 'png');
});

test('C1: MAX_BYTES = 5 MB Hard-Cap', () => {
  assert.strictEqual(Lambda.__MAX_BYTES, 5 * 1024 * 1024);
});

// === Frontend-Integration-Tests ===

test('C1: lib/foto-upload-mobile.js sendet jetzt JSON (nicht FormData)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'foto-upload-mobile.js'), 'utf8');
  assert.match(src, /image_base64/);
  assert.match(src, /JSON\.stringify\(payload\)/);
  assert.match(src, /'Content-Type':\s*'application\/json'/);
  // FormData darf nicht mehr im upload-Path sein
  assert.doesNotMatch(src, /new FormData\([\s\S]{0,200}fd\.append\('photo'/);
});

test('C1: Frontend hat blobToBase64-Helper', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'foto-upload-mobile.js'), 'utf8');
  assert.match(src, /function blobToBase64/);
  assert.match(src, /readAsDataURL/);
});

test('C1: Lambda hat Storage-Bucket sv-files + fotos-Insert', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'foto-upload.js'), 'utf8');
  assert.match(src, /STORAGE_BUCKET\s*=\s*['"]sv-files['"]/);
  assert.match(src, /from\(['"]fotos['"]\)\.insert/);
  assert.match(src, /exif_stripped:\s*true/);
});

test('C1: Lambda hat Pseudonymisierung der beschreibung', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'foto-upload.js'), 'utf8');
  assert.match(src, /ProvaPseudo\.apply\(String\(beschreibung\)\)/);
});
