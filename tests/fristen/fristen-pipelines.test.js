'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Pipelines = require('../../lib/fristen-pipelines');
const { __daysDiff } = require('../../netlify/functions/fristen-reminder-cron');
const { __FRIST_TYPEN } = require('../../netlify/functions/fristen-create');

test('Pipelines: 5 Templates registriert', () => {
  const list = Pipelines.listPipelines();
  assert.strictEqual(list.length, 5);
  const keys = list.map(p => p.key);
  assert.deepStrictEqual(keys.sort(), ['bauabnahme', 'beweissicherung', 'schadensgutachten', 'schiedsgutachten', 'wertgutachten']);
});

test('Pipelines: Schadensgutachten hat 5 Fristen', () => {
  const pl = Pipelines.getPipeline('schadensgutachten');
  assert.strictEqual(pl.fristen.length, 5);
  assert.match(pl.fristen[3].rechtsgrundlage, /§ 411/);
});

test('Pipelines: Bauabnahme hat 5J-Verjährung BGB § 638', () => {
  const pl = Pipelines.getPipeline('bauabnahme');
  const long = pl.fristen.find(f => f.offset_tage > 1000);
  assert.ok(long);
  assert.match(long.rechtsgrundlage, /§ 638/);
});

test('Pipelines: Schiedsgutachten erwähnt § 1029 ZPO + § 317 BGB', () => {
  const pl = Pipelines.getPipeline('schiedsgutachten');
  const haupt = pl.fristen.find(f => f.typ === 'gutachten-erstattung');
  assert.match(haupt.rechtsgrundlage, /§ 1029|§ 317/);
});

test('applyPipeline: berechnet Datum aus Stichtag + Offset', () => {
  const fristen = Pipelines.applyPipeline('schadensgutachten', { stichtag: '2026-01-01' });
  assert.ok(fristen);
  assert.strictEqual(fristen.length, 5);
  assert.strictEqual(fristen[0].datum_soll, '2026-01-15'); // T+14
  assert.strictEqual(fristen[3].datum_soll, '2026-02-26'); // T+56
});

test('applyPipeline: ungültiger Key → null', () => {
  assert.strictEqual(Pipelines.applyPipeline('nonexistent', { stichtag: '2026-01-01' }), null);
});

test('applyPipeline: ungültiges Datum → null', () => {
  assert.strictEqual(Pipelines.applyPipeline('schadensgutachten', { stichtag: 'not-a-date' }), null);
});

test('applyPipeline: default reminder_pattern [14,7,3,1]', () => {
  const fr = Pipelines.applyPipeline('wertgutachten', { stichtag: '2026-01-01' });
  assert.deepStrictEqual(fr[0].erinnerung_tage_vor, [14, 7, 3, 1]);
});

test('applyPipeline: custom reminder_pattern', () => {
  const fr = Pipelines.applyPipeline('wertgutachten', { stichtag: '2026-01-01', reminder_pattern: [30, 7] });
  assert.deepStrictEqual(fr[0].erinnerung_tage_vor, [30, 7]);
});

test('daysDiff: 0 Tage = heute', () => {
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  assert.strictEqual(__daysDiff(today.toISOString().slice(0, 10), today), 0);
});

test('daysDiff: +14 Tage', () => {
  const today = new Date('2026-01-01T00:00:00Z');
  assert.strictEqual(__daysDiff('2026-01-15', today), 14);
});

test('daysDiff: -3 (überfällig)', () => {
  const today = new Date('2026-01-15T00:00:00Z');
  assert.strictEqual(__daysDiff('2026-01-12', today), -3);
});

test('FRIST_TYPEN: alle 8 ENUM-Werte exportiert', () => {
  assert.strictEqual(__FRIST_TYPEN.length, 8);
  assert.ok(__FRIST_TYPEN.indexOf('gericht') >= 0);
  assert.ok(__FRIST_TYPEN.indexOf('honorar') >= 0);
});
