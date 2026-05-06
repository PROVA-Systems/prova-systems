/**
 * Tests für lib/archiv-filter.js (MEGA²⁸ V3.2-W2 KORR-10)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const ArchivFilter = require('../../lib/archiv-filter.js');

function makeRecord(fields, id) {
  return { id: id || ('rec_' + Math.random().toString(36).slice(2)), fields: fields || {} };
}

const recBase = makeRecord({
  Aktenzeichen: 'SCH-2026-001',
  Status: 'In Bearbeitung',
  Schadensart: 'Wasserschaden',
  Schaden_Strasse: 'Hauptstr. 1',
  Ort: 'Köln',
  Auftraggeber_Name: 'Mustermann GmbH',
  Auftragstyp: 'gerichtsgutachten',
  Timestamp: new Date('2026-04-15T10:00:00Z').toISOString()
});
const recDemo = makeRecord({
  Aktenzeichen: 'SCH-DEMO-001',
  Status: 'Entwurf fertig',
  Schadensart: 'Schimmelbefall',
  Auftragstyp: 'privatgutachten',
  Timestamp: new Date('2026-05-01T10:00:00Z').toISOString()
});
const recDone = makeRecord({
  Aktenzeichen: 'SCH-2025-099',
  Status: 'Exportiert',
  Schadensart: 'Brandschaden',
  Auftragstyp: 'versicherungsgutachten',
  Timestamp: new Date('2025-06-15T10:00:00Z').toISOString()
});
const recBaubegleit = makeRecord({
  Aktenzeichen: 'BB-2026-005',
  Status: 'Versendet',
  Auftragstyp: 'baubegleitung',
  Timestamp: new Date('2026-04-30T10:00:00Z').toISOString()
});

const records = [recBase, recDemo, recDone, recBaubegleit];

test('applyFilters: leere Kriterien gibt alle zurück', () => {
  const result = ArchivFilter.applyFilters(records, {});
  assert.strictEqual(result.length, 4);
});

test('applyFilters: getDefaultCriteria liefert sinnvolle Defaults', () => {
  const c = ArchivFilter.getDefaultCriteria();
  assert.strictEqual(c.such, '');
  assert.strictEqual(c.demo, 'all');
  assert.strictEqual(c.flow, '');
});

test('applyFilters: getDefaultCriteria liefert mutable Kopie (DEFAULT_CRITERIA bleibt frozen)', () => {
  const c1 = ArchivFilter.getDefaultCriteria();
  c1.such = 'foo';
  const c2 = ArchivFilter.getDefaultCriteria();
  assert.strictEqual(c2.such, '');
});

test('applyFilters: Flow-Filter A trifft Auftragstyp gerichtsgutachten', () => {
  const result = ArchivFilter.applyFilters(records, { flow: 'A' });
  assert.deepStrictEqual(result.map(r => r.fields.Aktenzeichen).sort(),
    ['SCH-2025-099', 'SCH-2026-001', 'SCH-DEMO-001'].sort());
});

test('applyFilters: Flow-Filter D trifft Auftragstyp baubegleitung', () => {
  const result = ArchivFilter.applyFilters(records, { flow: 'D' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'BB-2026-005');
});

test('applyFilters: Status-Bucket "bearbeitung" trifft "In Bearbeitung"', () => {
  const result = ArchivFilter.applyFilters(records, { status: 'bearbeitung' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-2026-001');
});

test('applyFilters: Status-Bucket "entwurf" trifft "Entwurf fertig"', () => {
  const result = ArchivFilter.applyFilters(records, { status: 'entwurf' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-DEMO-001');
});

test('applyFilters: Status-Bucket "exportiert" trifft "Exportiert"', () => {
  const result = ArchivFilter.applyFilters(records, { status: 'exportiert' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-2025-099');
});

test('applyFilters: Demo-Toggle "only" zeigt nur SCH-DEMO-*', () => {
  const result = ArchivFilter.applyFilters(records, { demo: 'only' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-DEMO-001');
});

test('applyFilters: Demo-Toggle "hide" filtert SCH-DEMO-* raus', () => {
  const result = ArchivFilter.applyFilters(records, { demo: 'hide' });
  assert.strictEqual(result.length, 3);
  assert.ok(!result.find(r => r.fields.Aktenzeichen === 'SCH-DEMO-001'));
});

test('applyFilters: Demo-Toggle "all" gibt alle (Default)', () => {
  const result = ArchivFilter.applyFilters(records, { demo: 'all' });
  assert.strictEqual(result.length, 4);
});

test('isDemoRecord: erkennt SCH-DEMO-001 Aktenzeichen', () => {
  assert.strictEqual(ArchivFilter.isDemoRecord(recDemo), true);
  assert.strictEqual(ArchivFilter.isDemoRecord(recBase), false);
});

test('isDemoRecord: erkennt is_demo=true Field (Migration 15)', () => {
  const r = makeRecord({ Aktenzeichen: 'NORMAL-001', is_demo: true });
  assert.strictEqual(ArchivFilter.isDemoRecord(r), true);
});

test('applyFilters: Kombi Flow-A + Status-bearbeitung + Schadensart-Wasserschaden', () => {
  const result = ArchivFilter.applyFilters(records, {
    flow: 'A', status: 'bearbeitung', schadenart: 'Wasserschaden'
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-2026-001');
});

test('applyFilters: Suche trifft Aktenzeichen partial', () => {
  const result = ArchivFilter.applyFilters(records, { such: 'demo' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-DEMO-001');
});

test('applyFilters: Suche trifft Auftraggeber-Name', () => {
  const result = ArchivFilter.applyFilters(records, { such: 'mustermann' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].fields.Aktenzeichen, 'SCH-2026-001');
});

test('applyFilters: Zeitraum-Filter "30" via fixed now', () => {
  const now = new Date('2026-05-06T10:00:00Z').getTime();
  const result = ArchivFilter.applyFilters(records, { zeitraum: '30' }, { now });
  assert.deepStrictEqual(result.map(r => r.fields.Aktenzeichen).sort(),
    ['BB-2026-005', 'SCH-2026-001', 'SCH-DEMO-001'].sort(),
    'recBase 04-15 = 21d, recDemo 05-01 = 5d, recBaubegleit 04-30 = 6d. recDone 2025 raus.');
});

test('applyFilters: Zeitraum-Filter "30" filtert recDone 2025 raus', () => {
  const now = new Date('2026-05-06T10:00:00Z').getTime();
  const result = ArchivFilter.applyFilters(records, { zeitraum: '30' }, { now });
  assert.ok(!result.find(r => r.fields.Aktenzeichen === 'SCH-2025-099'));
});

test('applyFilters: Zeitraum-Filter "jahr" trifft 2026', () => {
  const now = new Date('2026-05-06T10:00:00Z').getTime();
  const result = ArchivFilter.applyFilters(records, { zeitraum: 'jahr' }, { now });
  assert.deepStrictEqual(result.map(r => r.fields.Aktenzeichen).sort(),
    ['BB-2026-005', 'SCH-2026-001', 'SCH-DEMO-001'].sort(),
    'recDone ist 2025 → raus');
});

test('applyFilters: ungültige Eingabe gibt leeres Array', () => {
  assert.deepStrictEqual(ArchivFilter.applyFilters(null, {}), []);
  assert.deepStrictEqual(ArchivFilter.applyFilters(undefined, {}), []);
});

test('applyFilters: Reset via getDefaultCriteria zeigt alle records', () => {
  const result = ArchivFilter.applyFilters(records, ArchivFilter.getDefaultCriteria());
  assert.strictEqual(result.length, 4);
});

test('STATUS_BUCKETS contract: 6 deklarierte Buckets', () => {
  const keys = Object.keys(ArchivFilter.STATUS_BUCKETS);
  assert.strictEqual(keys.length, 6);
  assert.ok(keys.includes('bearbeitung'));
  assert.ok(keys.includes('entwurf'));
  assert.ok(keys.includes('freigegeben'));
  assert.ok(keys.includes('versendet'));
  assert.ok(keys.includes('exportiert'));
  assert.ok(keys.includes('archiviert'));
});
