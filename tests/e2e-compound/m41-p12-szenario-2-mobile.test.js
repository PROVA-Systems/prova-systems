'use strict';

/**
 * MEGA⁴¹ P12 Szenario 2 — "Mobile Außentermin"
 *
 * Pfad: Offline → Foto/Skizze/Diktat/Notiz → Online → Sync → Aggregation → PDF
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

test('SZ2-1: Offline-PWA-Foundation (Service Worker + Manifest + offline.html)', () => {
  assert.ok(exists('sw.js'));
  assert.ok(exists('manifest.json'));
  assert.ok(exists('offline.html'));
});

test('SZ2-2: IndexedDB-Offline-Queue mit 4 Stores', () => {
  assert.ok(exists('prova-offline-queue.js'));
  const src = read('prova-offline-queue.js');
  // Multi-Line STORES-Object
  assert.match(src, /STORES\s*=/);
  ['fotos', 'diktate', 'skizzen', 'queue'].forEach(s => {
    assert.match(src, new RegExp(s + ":\\s*['\"]" + s + "['\"]"));
  });
});

test('SZ2-3: Foto-Upload + EXIF-Strip Lambda', () => {
  assert.ok(exists('netlify/functions/foto-upload.js'));
  const src = read('netlify/functions/foto-upload.js');
  assert.match(src, /stripExif/);
});

test('SZ2-4: Skizzen-Canvas mit Pressure + Marker + IndexedDB-Save', () => {
  assert.ok(exists('lib/skizzen-canvas.js'));
  const src = read('lib/skizzen-canvas.js');
  assert.match(src, /e\.pressure/);
  assert.match(src, /markers\s*=/);
});

test('SZ2-5: Diktat-Mobile-Page existiert', () => {
  assert.ok(exists('diktat-mobile.html'));
});

test('SZ2-6: Sync-Konflikt-Resolver bei Re-Connect', () => {
  assert.ok(exists('lib/sync-conflict-resolver.js'));
  const Resolver = require(path.join(ROOT, 'lib/sync-conflict-resolver.js'));
  assert.strictEqual(typeof Resolver.detectConflict, 'function');
  assert.strictEqual(typeof Resolver.resolveLastWriteWins, 'function');
  assert.strictEqual(typeof Resolver.resolveMerge, 'function');
});

test('SZ2-7: Offline-Sync-Status-Icon für Top-Bar', () => {
  assert.ok(exists('lib/offline-sync-status.js'));
});

test('SZ2-8: Recovery-Page für nicht-synchronisierte Drafts', () => {
  assert.ok(exists('wiederherstellbare-entwuerfe.html'));
  const html = read('wiederherstellbare-entwuerfe.html');
  assert.match(html, /prova_offline_v1/);
});

test('SZ2-9: PDF-Aggregation chronologisch nach Sync', () => {
  assert.ok(exists('netlify/functions/eintraege-pdf-aggregator.js'));
  const src = read('netlify/functions/eintraege-pdf-aggregator.js');
  assert.match(src, /datum.*ascending/);
});

test('SZ2-10: APP_SHELL-Caching für Offline-Pages', () => {
  const sw = read('sw.js');
  assert.match(sw, /APP_SHELL\s*=\s*\[/);
  assert.match(sw, /\/offline\.html/);
});
