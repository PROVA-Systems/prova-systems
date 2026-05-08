'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const FotoUpload = require('../../lib/foto-upload-mobile');
const fotoSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'foto-upload-mobile.js'), 'utf8');
const diktatHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'diktat-mobile.html'), 'utf8');

// === P3 Mobile-Diktat (5 Tests) ===

test('C2 P3: diktat-mobile.html existiert + viewport-fit cover', () => {
  assert.match(diktatHtml, /viewport-fit=cover/);
  assert.match(diktatHtml, /<title>[^<]*Diktat[^<]*PROVA Mobile<\/title>/);
});

test('C2 P3: Round-Record-Button als Primary-Action (140x140)', () => {
  assert.match(diktatHtml, /\.dm-record-btn\{[^}]*width:140px[^}]*height:140px/);
  assert.match(diktatHtml, /id="dm-record-btn"/);
});

test('C2 P3: MediaRecorder + getUserMedia für Audio', () => {
  assert.match(diktatHtml, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(diktatHtml, /new MediaRecorder/);
});

test('C2 P3: Pause + Speichern Buttons mit min-height 44px', () => {
  assert.match(diktatHtml, /id="dm-pause-btn"/);
  assert.match(diktatHtml, /id="dm-save-btn"/);
  assert.match(diktatHtml, /min-height:\s*44px/);
});

test('C2 P3: Auth-Guard + Safe-Area-Insets', () => {
  assert.match(diktatHtml, /prova_auth_token/);
  assert.match(diktatHtml, /safe-area-inset-top/);
  assert.match(diktatHtml, /safe-area-inset-bottom/);
});

// === P4 Mobile-Foto-Upload (5 Tests) ===

test('C2 P4: lib/foto-upload-mobile.js exportiert API', () => {
  assert.strictEqual(typeof FotoUpload.compressImage, 'function');
  assert.strictEqual(typeof FotoUpload.getCurrentGeo, 'function');
  assert.strictEqual(typeof FotoUpload.uploadOne, 'function');
  assert.strictEqual(typeof FotoUpload.uploadMany, 'function');
});

test('C2 P4: MAX_WIDTH 1920px + QUALITY 0.85 (DSGVO + Bandbreite)', () => {
  assert.strictEqual(FotoUpload.MAX_WIDTH, 1920);
  assert.strictEqual(FotoUpload.QUALITY, 0.85);
});

test('C2 P4: EXIF-Strip via Canvas Re-Encoding', () => {
  // Canvas-toBlob/convertToBlob hat KEINE EXIF-Section → Strip ist implizit
  assert.match(fotoSrc, /OffscreenCanvas|canvas/i);
  assert.match(fotoSrc, /convertToBlob.*image\/jpeg/);
  assert.match(fotoSrc, /EXIF/i);
});

test('C2 P4: Geo-Tag opt-in (Browser-Geolocation, nicht aus EXIF)', () => {
  assert.match(fotoSrc, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(fotoSrc, /enableHighAccuracy/);
});

test('C2 P4: uploadMany sequenziell + onProgress-Callback', async () => {
  let progressCalls = 0;
  const fakeFiles = [
    new Blob(['a-data'], { type: 'image/jpeg' }),
    new Blob(['b-data'], { type: 'image/jpeg' }),
  ];
  fakeFiles[0].name = 'a.jpg';
  fakeFiles[1].name = 'b.jpg';
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ foto_id: 'fake-id' }),
  });
  const results = await FotoUpload.uploadMany(
    fakeFiles,
    { auftrag_id: 'test-auftrag', withGeo: false, fetchImpl: fakeFetch },
    () => { progressCalls++; }
  );
  assert.strictEqual(results.length, 2);
  assert.strictEqual(progressCalls, 2);
  assert.ok(results[0].ok);
});
