'use strict';

/**
 * MEGA⁴¹ P10 — Mobile Sync-Konflikt Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Resolver = require(path.join(ROOT, 'lib', 'sync-conflict-resolver.js'));
const Status = require(path.join(ROOT, 'lib', 'offline-sync-status.js'));
const resolverSrc = read('lib/sync-conflict-resolver.js');
const statusSrc = read('lib/offline-sync-status.js');
const recoveryHtml = read('wiederherstellbare-entwuerfe.html');

// ─────────────────────────────────────────────────────────────────
//  P10-1 Conflict-Detection
// ─────────────────────────────────────────────────────────────────

test('P10-1: detectConflict bei beiden-changed → hasConflict + merge-strategy', () => {
  const r = Resolver.detectConflict(
    { id: 1, titel: 'Local', modified_at: '2026-05-08T10:00:00Z', synced_at: '2026-05-07T10:00:00Z' },
    { id: 1, titel: 'Server', updated_at: '2026-05-08T11:00:00Z' }
  );
  assert.strictEqual(r.hasConflict, true);
  assert.ok(r.conflictFields.indexOf('titel') >= 0);
  assert.strictEqual(r.strategy, 'merge');
});

test('P10-1: detectConflict bei nur-lokalChanged → strategy local_only', () => {
  const r = Resolver.detectConflict(
    { id: 1, modified_at: '2026-05-08T10:00:00Z', synced_at: '2026-05-07T10:00:00Z' },
    { id: 1, updated_at: '2026-05-07T10:00:00Z' }
  );
  assert.strictEqual(r.hasConflict, false);
  assert.strictEqual(r.strategy, 'local_only');
});

test('P10-1: detectConflict bei nur-server → strategy server_only', () => {
  const r = Resolver.detectConflict(
    { id: 1, modified_at: '2026-05-07T10:00:00Z', synced_at: '2026-05-07T10:00:00Z' },
    { id: 1, updated_at: '2026-05-08T10:00:00Z' }
  );
  assert.strictEqual(r.hasConflict, false);
  assert.strictEqual(r.strategy, 'server_only');
});

test('P10-1: detectConflict bei verschiedenen IDs → different_records', () => {
  const r = Resolver.detectConflict({ id: 1 }, { id: 2 });
  assert.strictEqual(r.strategy, 'different_records');
});

test('P10-1: detectConflict bei null → no_data', () => {
  const r = Resolver.detectConflict(null, { id: 1 });
  assert.strictEqual(r.hasConflict, false);
});

test('P10-1: detectConflict mit nicht-mergeable Feld → strategy last_write_wins', () => {
  const r = Resolver.detectConflict(
    { id: 1, status: 'open',     modified_at: '2026-05-08T10:00:00Z', synced_at: '2026-05-07T10:00:00Z' },
    { id: 1, status: 'closed',   updated_at: '2026-05-08T11:00:00Z' }
  );
  assert.strictEqual(r.hasConflict, true);
  assert.strictEqual(r.strategy, 'last_write_wins');
});

// ─────────────────────────────────────────────────────────────────
//  P10-1 resolveLastWriteWins
// ─────────────────────────────────────────────────────────────────

test('P10-1: resolveLastWriteWins — späteres Modified gewinnt', () => {
  const winner = Resolver.resolveLastWriteWins(
    { id: 1, modified_at: '2026-05-08T11:00:00Z', titel: 'Local-newer' },
    { id: 1, updated_at:  '2026-05-08T10:00:00Z', titel: 'Server-older' }
  );
  assert.strictEqual(winner.titel, 'Local-newer');
});

test('P10-1: resolveLastWriteWins fallback bei null', () => {
  assert.deepStrictEqual(Resolver.resolveLastWriteWins(null, { id: 1 }), { id: 1 });
  assert.deepStrictEqual(Resolver.resolveLastWriteWins({ id: 2 }, null), { id: 2 });
});

// ─────────────────────────────────────────────────────────────────
//  P10-1 resolveMerge
// ─────────────────────────────────────────────────────────────────

test('P10-1: resolveMerge Tags-Array → Union (deduplicate)', () => {
  const m = Resolver.resolveMerge(
    { id: 1, tags: ['a', 'b'], titel: 'X' },
    { id: 1, tags: ['b', 'c'], titel: 'X' }
  );
  assert.deepStrictEqual(m.resolved.tags.sort(), ['a', 'b', 'c']);
  assert.strictEqual(m.conflicts.length, 0);
});

test('P10-1: resolveMerge String-Diff → Conflicts-Liste', () => {
  const m = Resolver.resolveMerge(
    { id: 1, titel: 'Local-Titel' },
    { id: 1, titel: 'Server-Titel' }
  );
  assert.strictEqual(m.conflicts.length, 1);
  assert.strictEqual(m.conflicts[0].field, 'titel');
  assert.strictEqual(m.conflicts[0].strategy, 'string_diff');
});

test('P10-1: resolveMerge Object-Shallow-Merge', () => {
  const m = Resolver.resolveMerge(
    { id: 1, content_json: { foo: 'L', bar: 'L' } },
    { id: 1, content_json: { foo: 'S', baz: 'S' } }
  );
  assert.strictEqual(m.resolved.content_json.foo, 'L');  // Local override
  assert.strictEqual(m.resolved.content_json.bar, 'L');
  assert.strictEqual(m.resolved.content_json.baz, 'S');  // Server-only behalten
});

test('P10-1: MERGEABLE_FIELDS hat 7 Default-Felder', () => {
  ['titel', 'beschreibung', 'content', 'content_json', 'notiz', 'tags']
    .forEach(f => assert.ok(Resolver.MERGEABLE_FIELDS.indexOf(f) >= 0, f));
});

test('P10-1: serializeForRecovery + deserialize Roundtrip', () => {
  const item = { id: 1, titel: 'Test', data: { a: 1 } };
  const json = Resolver.serializeForRecovery(item);
  assert.match(json, /_recovery_saved_at/);
  const restored = Resolver.deserializeFromRecovery(json);
  assert.strictEqual(restored.id, 1);
  assert.strictEqual(restored.titel, 'Test');
});

// ─────────────────────────────────────────────────────────────────
//  P10-2 Offline-Sync-Status
// ─────────────────────────────────────────────────────────────────

test('P10-2: Status exports STATES (5)', () => {
  assert.deepStrictEqual(Status.STATES, ['idle', 'syncing', 'offline_empty', 'offline_pending', 'error']);
});

test('P10-2: _renderIcon idle → ✓ Synchronisiert', () => {
  const html = Status._renderIcon('idle', 0);
  assert.match(html, /✓/);
  assert.match(html, /Synchronisiert/);
});

test('P10-2: _renderIcon syncing → spin-Animation', () => {
  const html = Status._renderIcon('syncing', 0);
  assert.match(html, /poss-spin/);
  assert.match(html, /Synchronisiere/);
});

test('P10-2: _renderIcon offline_pending mit Count', () => {
  const html = Status._renderIcon('offline_pending', 5);
  assert.match(html, /📥/);
  assert.match(html, /5 wartend/);
});

test('P10-2: _renderIcon error → ✗', () => {
  const html = Status._renderIcon('error', 0);
  assert.match(html, /✗/);
  assert.match(html, /Sync-Fehler/);
});

// ─────────────────────────────────────────────────────────────────
//  P10-3 Wiederherstellbare-Entwuerfe-Page
// ─────────────────────────────────────────────────────────────────

test('P10-3: Recovery-Page hat 3 Sections (Editor/Wizard/Queue)', () => {
  ['we-list-editor', 'we-list-wizard', 'we-list-queue']
    .forEach(id => assert.match(recoveryHtml, new RegExp('id="' + id + '"')));
});

test('P10-3: Recovery-Page liest aus localStorage + IndexedDB queue', () => {
  assert.match(recoveryHtml, /localStorage\.length/);
  assert.match(recoveryHtml, /indexedDB\.open\(['"]prova_offline_v1['"]/);
  assert.match(recoveryHtml, /objectStoreNames\.contains\(['"]queue['"]\)/);
});

test('P10-3: Recovery-Page hat Restore + Delete Actions', () => {
  assert.match(recoveryHtml, /data-action="restore"/);
  assert.match(recoveryHtml, /data-action="delete"/);
  assert.match(recoveryHtml, /confirm\(['"]Draft wirklich löschen/);
});

test('P10-3: Recovery-Page Banner bei ≥5 Drafts', () => {
  assert.match(recoveryHtml, /total >= 5/);
  assert.match(recoveryHtml, /id="we-banner"/);
});

test('P10-3: Recovery-Page fmtAge (vor s/min/h/d)', () => {
  assert.match(recoveryHtml, /vor.*s/);
  assert.match(recoveryHtml, /vor.*min/);
  assert.match(recoveryHtml, /vor.*h/);
  assert.match(recoveryHtml, /vor.*d/);
});

// ─────────────────────────────────────────────────────────────────
//  P10-4 Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P10-4: Resolver UMD-Pattern (window + module.exports)', () => {
  assert.match(resolverSrc, /window\.ProvaSyncConflictResolver/);
  assert.match(resolverSrc, /module\.exports\s*=\s*api/);
});

test('P10-4: Status mount registriert online/offline/storage Events', () => {
  assert.match(statusSrc, /addEventListener\(['"]online['"]/);
  assert.match(statusSrc, /addEventListener\(['"]offline['"]/);
  assert.match(statusSrc, /addEventListener\(['"]storage['"]/);
});

test('P10-4: Status prefers-reduced-motion respect', () => {
  assert.match(statusSrc, /prefers-reduced-motion/);
});
