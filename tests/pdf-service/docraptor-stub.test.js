/**
 * PROVA — DocRaptor Stub Tests
 * MEGA¹⁸ W72 (2026-05-08)
 *
 * Tests dass der Stub-Adapter:
 *   - Interface-konform ist (Drop-in-Replacement-Ready)
 *   - Bei Aufruf NOT_IMPLEMENTED zurueckliefert (kein silent fail)
 *   - Migration-TODOs klar im Source dokumentiert sind
 */
'use strict';

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ADAPTER = require(path.join(ROOT, 'lib', 'pdf-service-docraptor.js'));
const SRC = fs.readFileSync(path.join(ROOT, 'lib', 'pdf-service-docraptor.js'), 'utf8');

const _origKey = process.env.DOCRAPTOR_API_KEY;

function restoreEnv() {
  if (_origKey === undefined) delete process.env.DOCRAPTOR_API_KEY;
  else process.env.DOCRAPTOR_API_KEY = _origKey;
}

describe('pdf-service-docraptor — Stub Interface', () => {
  test('serviceName ist docraptor', () => {
    assert.equal(ADAPTER.serviceName, 'docraptor');
  });

  test('_isStub flag exposed', () => {
    assert.equal(ADAPTER._isStub, true);
  });

  test('Interface-konform (validateAdapter)', () => {
    const Iface = require(path.join(ROOT, 'lib', 'pdf-service-interface.js'));
    assert.equal(Iface.validateAdapter(ADAPTER), true);
  });
});

describe('pdf-service-docraptor — isAvailable', () => {
  afterEach(() => { restoreEnv(); });

  test('isAvailable false ohne Key', () => {
    delete process.env.DOCRAPTOR_API_KEY;
    assert.equal(ADAPTER.isAvailable(), false);
  });

  test('isAvailable false mit kurzem Key', () => {
    process.env.DOCRAPTOR_API_KEY = 'short';
    assert.equal(ADAPTER.isAvailable(), false);
  });

  test('isAvailable true mit gueltigem Key', () => {
    process.env.DOCRAPTOR_API_KEY = 'docraptor_test_key_long_enough';
    assert.equal(ADAPTER.isAvailable(), true);
  });
});

describe('pdf-service-docraptor — generatePdf', () => {
  afterEach(() => { restoreEnv(); });

  test('NOT_IMPLEMENTED ohne Key (mit Hint zu PDFMonkey)', async () => {
    delete process.env.DOCRAPTOR_API_KEY;
    const r = await ADAPTER.generatePdf('<p>x</p>', {});
    assert.equal(r.ok, false);
    assert.equal(r.code, 'NOT_IMPLEMENTED');
    assert.match(r.error, /docraptor/i);
  });

  test('NOT_IMPLEMENTED auch mit Key (Stub-Status)', async () => {
    process.env.DOCRAPTOR_API_KEY = 'docraptor_test_key_long_enough';
    const r = await ADAPTER.generatePdf('<p>x</p>', {});
    assert.equal(r.code, 'NOT_IMPLEMENTED');
  });
});

describe('pdf-service-docraptor — Migration-TODO-Dokumentation', () => {
  test('Migration-Pfad im Source dokumentiert', () => {
    assert.match(SRC, /Migration-Pfad/);
    assert.match(SRC, /Marcel-Pflicht.*Setup/);
    assert.match(SRC, /DOCRAPTOR_API_KEY/);
    assert.match(SRC, /POST https:\/\/docraptor\.com\/docs/);
  });

  test('ENV-Switch dokumentiert', () => {
    assert.match(SRC, /PDF_SERVICE = 'docraptor'/);
  });

  test('Beispiel-Implementation als Kommentar vorhanden', () => {
    assert.match(SRC, /document_content/);
    assert.match(SRC, /test: isTest/);
  });
});
