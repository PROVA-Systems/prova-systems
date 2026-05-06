/**
 * PROVA — Mode-C Variable-Mapping Tests
 * MEGA¹⁷-PERFECTION W62 (2026-05-08)
 *
 * Coverage:
 *   - lib/prova-fields.js (Single-Source-of-Truth)
 *   - lib/prova-mode-c.js: smartGuessField + smartGuessFieldWithConfidence
 *   - lib/prova-mode-c.js: interpolateHtml + collectMappingValues
 *   - parse-docx.js PUT-Endpoint Validation
 *   - einstellungen.html Auto-Open + Confidence-Badge Markup
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ProvaFields = require(path.join(ROOT, 'lib', 'prova-fields.js'));
const ProvaModeC = require(path.join(ROOT, 'lib', 'prova-mode-c.js'));

describe('lib/prova-fields.js — Single-Source-of-Truth', () => {
  test('Mindestens 25 Felder, max 60 (Sanity)', () => {
    assert.ok(ProvaFields.PROVA_FIELDS.length >= 25);
    assert.ok(ProvaFields.PROVA_FIELDS.length <= 60);
  });

  test('Alle Felder haben key + label + group', () => {
    ProvaFields.PROVA_FIELDS.forEach(f => {
      assert.ok(f.key && typeof f.key === 'string');
      assert.ok(f.label && typeof f.label === 'string');
      assert.ok(f.group && typeof f.group === 'string');
    });
  });

  test('Keys sind unique', () => {
    const keys = ProvaFields.PROVA_FIELDS.map(f => f.key);
    assert.equal(keys.length, new Set(keys).size);
  });

  test('GROUPS deckt mind. 5 Gruppen', () => {
    assert.ok(ProvaFields.GROUPS.length >= 5);
  });

  test('byGroup(Akte) liefert nur Akten-Felder', () => {
    const akte = ProvaFields.byGroup('Akte');
    assert.ok(akte.length >= 5);
    akte.forEach(f => assert.equal(f.group, 'Akte'));
  });

  test('byKey(akte.az) findet Aktenzeichen', () => {
    const f = ProvaFields.byKey('akte.az');
    assert.ok(f);
    assert.equal(f.label, 'Aktenzeichen');
  });

  test('byKey(unknown) returnt null', () => {
    assert.equal(ProvaFields.byKey('foo.bar'), null);
  });

  test('ProvaModeC.PROVA_FIELDS ist Re-Export', () => {
    assert.equal(ProvaModeC.PROVA_FIELDS.length, ProvaFields.PROVA_FIELDS.length);
    assert.equal(ProvaModeC.PROVA_FIELDS[0].key, ProvaFields.PROVA_FIELDS[0].key);
  });
});

describe('lib/prova-mode-c.js — smartGuessField (basic)', () => {
  test('$Aktenzeichen → akte.az', () => {
    assert.equal(ProvaModeC.smartGuessField('Aktenzeichen'), 'akte.az');
  });

  test('$Auftraggeber → kunde.name', () => {
    assert.equal(ProvaModeC.smartGuessField('Auftraggeber'), 'kunde.name');
  });

  test('Adresse → akte.objekt.adresse', () => {
    assert.equal(ProvaModeC.smartGuessField('Adresse'), 'akte.objekt.adresse');
  });

  test('Heute → system.heute', () => {
    assert.equal(ProvaModeC.smartGuessField('Heute'), 'system.heute');
  });

  test('Foobar → null', () => {
    assert.equal(ProvaModeC.smartGuessField('Foobar'), null);
  });

  test('Empty input → null', () => {
    assert.equal(ProvaModeC.smartGuessField(''), null);
    assert.equal(ProvaModeC.smartGuessField(null), null);
  });
});

describe('lib/prova-mode-c.js — smartGuessFieldWithConfidence (W56)', () => {
  test('Aktenzeichen (12 chars) → high confidence', () => {
    const r = ProvaModeC.smartGuessFieldWithConfidence('Aktenzeichen');
    assert.equal(r.field, 'akte.az');
    assert.equal(r.confidence, 'high');
  });

  test('AZ (2 chars, full match) → high confidence (ratio>=0.7)', () => {
    const r = ProvaModeC.smartGuessFieldWithConfidence('AZ');
    assert.equal(r.field, 'akte.az');
    assert.equal(r.confidence, 'high');
  });

  test('Auftraggeber (lang) → high', () => {
    const r = ProvaModeC.smartGuessFieldWithConfidence('Auftraggeber');
    assert.equal(r.confidence, 'high');
  });

  test('Foobar → low confidence + null field', () => {
    const r = ProvaModeC.smartGuessFieldWithConfidence('Foobar');
    assert.equal(r.field, null);
    assert.equal(r.confidence, 'low');
  });

  test('Empty/null/undefined → low + null', () => {
    assert.deepEqual(ProvaModeC.smartGuessFieldWithConfidence(''), { field: null, confidence: 'low' });
    assert.deepEqual(ProvaModeC.smartGuessFieldWithConfidence(null), { field: null, confidence: 'low' });
  });

  test('$/{{}} prefixes werden gestrippt', () => {
    assert.equal(ProvaModeC.smartGuessFieldWithConfidence('$Aktenzeichen').field, 'akte.az');
    assert.equal(ProvaModeC.smartGuessFieldWithConfidence('{{Kunde}}').field, 'kunde.name');
  });
});

describe('lib/prova-mode-c.js — interpolateHtml', () => {
  test('$Var basic interpolation', () => {
    const r = ProvaModeC.interpolateHtml('<p>$X</p>', { X: 'akte.az' }, { akte: { az: 'SCH-001' } });
    assert.equal(r.html, '<p>SCH-001</p>');
    assert.equal(r.applied, 1);
  });

  test('{{Var}} interpolation', () => {
    const r = ProvaModeC.interpolateHtml('<p>{{Y}}</p>', { Y: 'kunde.name' }, { kunde: { name: 'A' } });
    assert.equal(r.html, '<p>A</p>');
  });

  test('XSS-Defense beim Wert-Einsetzen', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>$X</p>',
      { X: 'akte.titel' },
      { akte: { titel: '<script>alert(1)</script>' } }
    );
    assert.match(r.html, /&lt;script&gt;/);
    assert.doesNotMatch(r.html, /<script>/);
  });

  test('Missing key bleibt unverändert + listed', () => {
    const r = ProvaModeC.interpolateHtml('<p>$A und $B</p>', { A: 'akte.az' }, { akte: { az: 'X' } });
    assert.match(r.html, /\$B/);
    assert.deepEqual(r.missing, ['B']);
  });

  test('Nested path akte.objekt.adresse', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>$A</p>',
      { A: 'akte.objekt.adresse' },
      { akte: { objekt: { adresse: 'Hauptstr. 1' } } }
    );
    assert.equal(r.html, '<p>Hauptstr. 1</p>');
  });

  test('null dataContext sicher', () => {
    const r = ProvaModeC.interpolateHtml('<p>$A</p>', null, null);
    assert.deepEqual(r.missing, ['A']);
  });
});

describe('parse-docx.js PUT-Endpoint Validation', () => {
  const PARSE_DOCX = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'parse-docx.js'), 'utf8');

  test('PUT-Method handler exists', () => {
    assert.match(PARSE_DOCX, /event\.httpMethod === ['"]PUT['"]/);
  });

  test('UUID-Validation', () => {
    assert.match(PARSE_DOCX, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(id\)/);
  });

  test('Object-Validation fuer mapping', () => {
    assert.match(PARSE_DOCX, /typeof mapping !== ['"]object['"]/);
    assert.match(PARSE_DOCX, /Array\.isArray\(mapping\)/);
  });

  test('Sanity-Check fuer field-key Werte (max 100, only [a-zA-Z0-9_.])', () => {
    assert.match(PARSE_DOCX, /v\.length > 100/);
    assert.match(PARSE_DOCX, /\[\^a-zA-Z0-9_\\\.\]/);
  });

  test('Update auf user_vorlagen mit variable_mapping', () => {
    assert.match(PARSE_DOCX, /\.update\(\{\s*variable_mapping:\s*mapping/);
  });
});

describe('einstellungen.html — Auto-Open + Confidence (W56)', () => {
  const EINST = fs.readFileSync(path.join(ROOT, 'einstellungen.html'), 'utf8');

  test('Library-Einbindung: prova-fields.js + prova-mode-c.js', () => {
    assert.match(EINST, /<script src="\/lib\/prova-fields\.js"><\/script>/);
    assert.match(EINST, /<script src="\/lib\/prova-mode-c\.js"><\/script>/);
  });

  test('Auto-Open nach Upload (data.id + variables>0)', () => {
    assert.match(EINST, /data\.variables.*length > 0/);
    assert.match(EINST, /window\.openMappingModal\s*\(\s*data\.id\s*\)/);
  });

  test('Confidence-Badge Rendering (🟢/🟡/🔴)', () => {
    assert.match(EINST, /smartGuessFieldWithConfidence/);
    assert.match(EINST, /'🟢'/);
    assert.match(EINST, /'🟡'/);
    assert.match(EINST, /'🔴'/);
  });

  test('"✏ Mapping" Button explizit', () => {
    assert.match(EINST, /✏ Mapping/);
  });
});
