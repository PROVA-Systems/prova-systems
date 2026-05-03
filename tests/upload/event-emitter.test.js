/**
 * PROVA — EventEmitter Logic Tests
 * MEGA⁹ W1 (04.05.2026)
 *
 * Reproduktion der EventEmitter-Class aus lib/foto-upload-v2.js
 * (Original ist Browser-only wegen window.addEventListener — hier
 * isolieren wir nur die Emit/On/Off-Logik).
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

class EventEmitter {
  constructor() { this._handlers = {}; }
  on(event, fn) { (this._handlers[event] = this._handlers[event] || []).push(fn); return this; }
  off(event, fn) {
    if (!this._handlers[event]) return this;
    this._handlers[event] = this._handlers[event].filter(h => h !== fn);
    return this;
  }
  emit(event, ...args) {
    (this._handlers[event] || []).forEach(fn => {
      try { fn(...args); } catch (e) { /* swallowed in real impl */ }
    });
  }
}

describe('EventEmitter (foto-upload-v2)', () => {
  test('on() registriert Handler, emit() triggert ihn', () => {
    const e = new EventEmitter();
    let called = 0;
    e.on('progress', () => { called++; });
    e.emit('progress');
    assert.equal(called, 1);
  });

  test('emit() uebergibt Argumente korrekt', () => {
    const e = new EventEmitter();
    let received = null;
    e.on('progress', (item, percent) => { received = { item, percent }; });
    e.emit('progress', { name: 'foo.jpg' }, 42);
    assert.deepEqual(received.item, { name: 'foo.jpg' });
    assert.equal(received.percent, 42);
  });

  test('mehrere Handler auf gleichem Event', () => {
    const e = new EventEmitter();
    let a = 0, b = 0;
    e.on('x', () => a++);
    e.on('x', () => b++);
    e.emit('x');
    assert.equal(a, 1);
    assert.equal(b, 1);
  });

  test('off() entfernt Handler', () => {
    const e = new EventEmitter();
    let called = 0;
    const fn = () => { called++; };
    e.on('progress', fn);
    e.emit('progress'); // 1
    e.off('progress', fn);
    e.emit('progress'); // sollte nicht mehr triggern
    assert.equal(called, 1);
  });

  test('off() auf unbekanntem Event ist no-op', () => {
    const e = new EventEmitter();
    e.off('nope', () => {});  // sollte nicht throwen
    assert.equal(e._handlers['nope'], undefined);
  });

  test('emit() auf unbekanntem Event ist no-op', () => {
    const e = new EventEmitter();
    e.emit('nope', 1, 2, 3);  // sollte nicht throwen
    assert.ok(true);
  });

  test('Handler-Exception bricht Emit-Loop NICHT', () => {
    const e = new EventEmitter();
    let later = 0;
    e.on('x', () => { throw new Error('boom'); });
    e.on('x', () => { later++; });
    e.emit('x');
    assert.equal(later, 1, 'zweiter Handler wurde trotz Exception aufgerufen');
  });

  test('Chaining: on() returnt this', () => {
    const e = new EventEmitter();
    const ret = e.on('a', () => {}).on('b', () => {});
    assert.equal(ret, e);
  });

  test('Chaining: off() returnt this', () => {
    const e = new EventEmitter();
    const fn = () => {};
    const ret = e.on('a', fn).off('a', fn);
    assert.equal(ret, e);
  });
});

// ─── Config-Defaults aus ProvaUpload-Class ──────────────────────────
function getProvaUploadConfig(userConfig) {
  return Object.assign({
    endpoint: '/.netlify/functions/foto-upload',
    stripExif: true,
    optimize: { maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp' },
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxFileSize: 25 * 1024 * 1024,
    chunkSize: 0,
    concurrency: 2
  }, userConfig || {});
}

describe('ProvaUpload Config-Defaults', () => {
  test('endpoint default = /.netlify/functions/foto-upload', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.endpoint, '/.netlify/functions/foto-upload');
  });

  test('stripExif default = true (DSGVO-Pflicht)', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.stripExif, true);
  });

  test('maxFileSize default = 25MB', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.maxFileSize, 25 * 1024 * 1024);
  });

  test('allowedTypes enthaelt JPEG, PNG, WebP, HEIC, HEIF', () => {
    const cfg = getProvaUploadConfig();
    assert.ok(cfg.allowedTypes.includes('image/jpeg'));
    assert.ok(cfg.allowedTypes.includes('image/png'));
    assert.ok(cfg.allowedTypes.includes('image/webp'));
    assert.ok(cfg.allowedTypes.includes('image/heic'));
    assert.ok(cfg.allowedTypes.includes('image/heif'));
  });

  test('User-Override schlaegt Default', () => {
    const cfg = getProvaUploadConfig({ maxFileSize: 10 * 1024 * 1024, stripExif: false });
    assert.equal(cfg.maxFileSize, 10 * 1024 * 1024);
    assert.equal(cfg.stripExif, false);
    // andere Defaults bleiben
    assert.equal(cfg.endpoint, '/.netlify/functions/foto-upload');
  });

  test('optimize.prefer = webp (kleinere Dateien)', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.optimize.prefer, 'webp');
  });

  test('optimize.maxWidth = 2048 (vernuenftiger Default fuer Schaden-Fotos)', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.optimize.maxWidth, 2048);
  });

  test('concurrency default = 2 (parallele Uploads)', () => {
    const cfg = getProvaUploadConfig();
    assert.equal(cfg.concurrency, 2);
  });
});
