/**
 * Tests für lib/global-search-engine.js (MEGA²⁸ V3.2-W2 KORR-7)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const Engine = require('../../lib/global-search-engine.js');

const PAGES = [
  { type: 'page', label: 'Zentrale / Dashboard', href: 'dashboard.html' },
  { type: 'page', label: 'Neues Gutachten', href: 'app.html' },
  { type: 'page', label: 'Fälle / Archiv', href: 'archiv.html' },
  { type: 'page', label: 'Normen-Datenbank', href: 'normen.html' },
  { type: 'page', label: 'Rechnungen', href: 'rechnungen.html' }
];

const NORMEN = [
  { num: 'DIN 4108-2', titel: 'Wärmeschutz im Hochbau', bereich: 'Bauphysik' },
  { num: 'DIN EN 12831', titel: 'Heizungsanlagen', bereich: 'TGA' },
  { num: 'WTA 6-3', titel: 'Schimmelpilzsanierung', bereich: 'Bauwerksabdichtung' },
  { num: '§407a ZPO', titel: 'Sachverständigen-Eigenverantwortung', bereich: 'Recht' }
];

const CASES = [
  { az: 'SCH-2026-001', auftraggeber: 'Mustermann GmbH', adresse: 'Hauptstr. 1, Köln' },
  { az: 'SCH-DEMO-001', auftraggeber: 'PROVA Demo', adresse: 'Demoplatz 1' },
  { az: 'BB-2026-005', auftraggeber: 'Bauherr Schmidt', adresse: 'Mozartstr. 4' }
];

test('normalize: lowercases + trims', () => {
  assert.strictEqual(Engine.normalize('  Hello WORLD  '), 'hello world');
  assert.strictEqual(Engine.normalize(null), '');
  assert.strictEqual(Engine.normalize(undefined), '');
  assert.strictEqual(Engine.normalize(42), '42');
});

test('tokenMatch: substring match (case-insensitive)', () => {
  assert.strictEqual(Engine.tokenMatch('Wärmeschutz', 'wärme'), true);
  assert.strictEqual(Engine.tokenMatch('Wärmeschutz', 'foo'), false);
  assert.strictEqual(Engine.tokenMatch('', 'foo'), false);
  assert.strictEqual(Engine.tokenMatch('foo', ''), true);
});

test('searchPages: filtert nach label', () => {
  const result = Engine.searchPages(PAGES, 'arch');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].href, 'archiv.html');
});

test('searchPages: leere Query → leeres Array', () => {
  assert.deepStrictEqual(Engine.searchPages(PAGES, ''), []);
});

test('searchPages: Limit-Option respektiert', () => {
  const r = Engine.searchPages(PAGES, 'e', { limit: 2 });
  assert.strictEqual(r.length, 2);
});

test('searchNormen: trifft num', () => {
  const r = Engine.searchNormen(NORMEN, '4108');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].num, 'DIN 4108-2');
});

test('searchNormen: trifft titel', () => {
  const r = Engine.searchNormen(NORMEN, 'schimmel');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].num, 'WTA 6-3');
});

test('searchNormen: trifft bereich', () => {
  const r = Engine.searchNormen(NORMEN, 'recht');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].num, '§407a ZPO');
});

test('searchCases: trifft Aktenzeichen', () => {
  const r = Engine.searchCases(CASES, 'demo');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].az, 'SCH-DEMO-001');
});

test('searchCases: trifft Auftraggeber', () => {
  const r = Engine.searchCases(CASES, 'mustermann');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].az, 'SCH-2026-001');
});

test('searchCases: trifft Adresse', () => {
  const r = Engine.searchCases(CASES, 'mozart');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].az, 'BB-2026-005');
});

test('highlightMatch: umschließt Treffer mit <mark>', () => {
  const r = Engine.highlightMatch('Wärmeschutz', 'wärme');
  assert.ok(r.indexOf('<mark>') !== -1);
  assert.ok(r.indexOf('</mark>') !== -1);
});

test('highlightMatch: kein Match → unveränderter Text', () => {
  assert.strictEqual(Engine.highlightMatch('Hello', 'xyz'), 'Hello');
});

test('highlightMatch: leere Query → unverändert', () => {
  assert.strictEqual(Engine.highlightMatch('Hello', ''), 'Hello');
});

test('dedupeByHref: entfernt doppelte hrefs', () => {
  const items = [
    { href: 'a.html', label: 'A' },
    { href: 'b.html', label: 'B' },
    { href: 'a.html', label: 'A2' }
  ];
  const r = Engine.dedupeByHref(items);
  assert.strictEqual(r.length, 2);
});

test('buildResults: kombiniert pages + normen + cases', () => {
  const r = Engine.buildResults('demo', { pages: PAGES, normen: NORMEN, cases: CASES });
  // demo trifft nur cases
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].group, 'Fälle');
  assert.strictEqual(r[0].items.length, 1);
});

test('buildResults: Multi-Source kombiniert', () => {
  const r = Engine.buildResults('schim', { pages: PAGES, normen: NORMEN, cases: CASES });
  // Trefer in normen (Schimmelpilzsanierung)
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].group, 'Normen');
});

test('buildResults: leere Query → leere Gruppen', () => {
  const r = Engine.buildResults('', { pages: PAGES, normen: NORMEN, cases: CASES });
  assert.deepStrictEqual(r, []);
});

test('flattenGroups: macht Header + Items linear', () => {
  const groups = [
    { group: 'A', items: [{ id: 1 }, { id: 2 }] },
    { group: 'B', items: [{ id: 3 }] }
  ];
  const flat = Engine.flattenGroups(groups);
  assert.strictEqual(flat.length, 5);
  assert.strictEqual(flat[0].group, 'A');
  assert.strictEqual(flat[1].id, 1);
  assert.strictEqual(flat[3].group, 'B');
});

test('searchPages: ungültige Eingabe robust', () => {
  assert.deepStrictEqual(Engine.searchPages(null, 'x'), []);
  assert.deepStrictEqual(Engine.searchPages(undefined, 'x'), []);
});

test('searchCases: null cases robust', () => {
  assert.deepStrictEqual(Engine.searchCases(null, 'x'), []);
});
