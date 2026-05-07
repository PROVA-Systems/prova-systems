'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Chunker = require('../../lib/whisper-chunker');
const chunkerSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'whisper-chunker.js'), 'utf8');
const whisperSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'whisper-diktat.js'), 'utf8');

test('D1: lib/whisper-chunker.js API surface', () => {
  assert.strictEqual(Chunker.MAX_CHUNK_BYTES, 20 * 1024 * 1024);
  assert.strictEqual(Chunker.CHUNK_DURATION_SEC, 240);
  assert.strictEqual(typeof Chunker.estimateChunkCount, 'function');
  assert.strictEqual(typeof Chunker.estimateMaxDurationSec, 'function');
  assert.strictEqual(typeof Chunker.RecordingChunker, 'function');
  assert.strictEqual(typeof Chunker.transcribeAndJoin, 'function');
  assert.strictEqual(typeof Chunker.shouldChunk, 'function');
});

test('D1: estimateChunkCount für 50MB Blob → 3 Chunks', () => {
  const fakeBlob = { size: 50 * 1024 * 1024 };
  assert.strictEqual(Chunker.estimateChunkCount(fakeBlob), 3);
});

test('D1: shouldChunk: true bei >20MB, false bei kleiner', () => {
  assert.strictEqual(Chunker.shouldChunk({ size: 25 * 1024 * 1024 }), true);
  assert.strictEqual(Chunker.shouldChunk({ size: 5 * 1024 * 1024 }), false);
  assert.strictEqual(Chunker.shouldChunk(null), false);
});

test('D1: estimateMaxDurationSec ist >300s (>= 5min Chunk)', () => {
  const sec = Chunker.estimateMaxDurationSec();
  assert.ok(sec > 300, 'Chunk-Dauer sollte mind. 5 Min erlauben, war: ' + sec);
});

test('D1: RecordingChunker constructor + start/stop API', () => {
  const fakeStream = {};
  const c = new Chunker.RecordingChunker(fakeStream, { chunkDurationSec: 60 });
  assert.strictEqual(c.chunkDurationSec, 60);
  assert.strictEqual(typeof c.start, 'function');
  assert.strictEqual(typeof c.stop, 'function');
  assert.deepStrictEqual(c.chunks, []);
});

test('D1: transcribeAndJoin konkateniert mehrere Chunks', async () => {
  const fakeBlob = (text) => ({
    size: 1000,
    type: 'audio/webm',
    arrayBuffer: async () => {
      const b = Buffer.from(text);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
  });
  const fakeFetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const decoded = Buffer.from(body.audioBase64, 'base64').toString();
    return {
      ok: true,
      json: async () => ({ transkript: 'Transkript-' + decoded }),
    };
  };
  const text = await Chunker.transcribeAndJoin(
    [fakeBlob('A'), fakeBlob('B'), fakeBlob('C')],
    { fetchImpl: fakeFetch }
  );
  assert.match(text, /Transkript-A/);
  assert.match(text, /Transkript-B/);
  assert.match(text, /Transkript-C/);
  assert.match(text, /\n\n/);
});

test('D1: transcribeAndJoin onProgress wird pro Chunk aufgerufen', async () => {
  const fakeBlob = { size: 100, type: 'audio/webm', arrayBuffer: async () => new ArrayBuffer(10) };
  const fakeFetch = async () => ({ ok: true, json: async () => ({ transkript: 'x' }) });
  let calls = 0;
  await Chunker.transcribeAndJoin([fakeBlob, fakeBlob], { fetchImpl: fakeFetch, onProgress: () => calls++ });
  assert.strictEqual(calls, 2);
});

test('D1: Pseudonymisierung-Coverage in whisper-diktat.js (Regel 17)', () => {
  // Transkript pseudonymisiert vor Rückgabe
  assert.match(whisperSrc, /ProvaPseudo\.apply\(transkript\)/);
  // Segmente einzeln pseudonymisiert
  assert.match(whisperSrc, /ProvaPseudo\.apply\(\(s\.text/);
  // Audit-Log-Eintrag mit Pseudo-Counts
  assert.match(whisperSrc, /AUDIT-DSGVO/);
  assert.match(whisperSrc, /pseudo_counts/);
});

test('D1: 25MB-Limit-Validierung in whisper-diktat.js (Pre-Chunker-Hinweis)', () => {
  assert.match(whisperSrc, /33 \* 1024 \* 1024/);
  assert.match(whisperSrc, /Audio zu groß \(max 25MB\)/);
});

test('D1: UMD-Pattern (Browser + Node compatibility)', () => {
  assert.match(chunkerSrc, /typeof module === 'object' && module\.exports/);
  assert.match(chunkerSrc, /WhisperChunker = factory/);
});
