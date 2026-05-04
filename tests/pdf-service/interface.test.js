/**
 * PROVA — PDF-Service Interface Tests
 * MEGA¹⁸ W72 (2026-05-08)
 *
 * Coverage:
 *   - lib/pdf-service-interface.js: getService / resolveServiceName /
 *     validateAdapter / errorResult / successResult / cache-management
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Iface = require(path.join(ROOT, 'lib', 'pdf-service-interface.js'));

const _origPdfService = process.env.PDF_SERVICE;

function restoreEnv() {
  if (_origPdfService === undefined) delete process.env.PDF_SERVICE;
  else process.env.PDF_SERVICE = _origPdfService;
}

describe('pdf-service-interface — resolveServiceName', () => {
  afterEach(() => { restoreEnv(); Iface._resetCache(); });

  test('Default ist pdfmonkey wenn ENV leer', () => {
    delete process.env.PDF_SERVICE;
    assert.equal(Iface.resolveServiceName(), 'pdfmonkey');
  });

  test('ENV pdfmonkey gibt pdfmonkey', () => {
    process.env.PDF_SERVICE = 'pdfmonkey';
    assert.equal(Iface.resolveServiceName(), 'pdfmonkey');
  });

  test('ENV docraptor gibt docraptor', () => {
    process.env.PDF_SERVICE = 'docraptor';
    assert.equal(Iface.resolveServiceName(), 'docraptor');
  });

  test('ENV unknown faellt auf default zurueck', () => {
    process.env.PDF_SERVICE = 'foobar';
    assert.equal(Iface.resolveServiceName(), 'pdfmonkey');
  });

  test('ENV case-insensitive (PDFMONKEY → pdfmonkey)', () => {
    process.env.PDF_SERVICE = 'PDFMONKEY';
    assert.equal(Iface.resolveServiceName(), 'pdfmonkey');
  });

  test('ENV mit whitespace getrimmed', () => {
    process.env.PDF_SERVICE = '  pdfmonkey  ';
    assert.equal(Iface.resolveServiceName(), 'pdfmonkey');
  });
});

describe('pdf-service-interface — getService', () => {
  beforeEach(() => { Iface._resetCache(); });
  afterEach(() => { restoreEnv(); Iface._resetCache(); });

  test('getService(pdfmonkey) liefert pdfmonkey-Adapter', () => {
    process.env.PDF_SERVICE = 'pdfmonkey';
    const svc = Iface.getService();
    assert.equal(svc.serviceName, 'pdfmonkey');
    assert.equal(typeof svc.generatePdf, 'function');
    assert.equal(typeof svc.isAvailable, 'function');
  });

  test('getService(docraptor) liefert docraptor-Stub', () => {
    process.env.PDF_SERVICE = 'docraptor';
    const svc = Iface.getService();
    assert.equal(svc.serviceName, 'docraptor');
    assert.equal(svc._isStub, true);
  });

  test('getService gecached pro Service-Name', () => {
    process.env.PDF_SERVICE = 'pdfmonkey';
    const a = Iface.getService();
    const b = Iface.getService();
    assert.equal(a, b);  // gleicher Object-Reference
  });

  test('getService wechselt bei ENV-Switch', () => {
    process.env.PDF_SERVICE = 'pdfmonkey';
    const a = Iface.getService();
    process.env.PDF_SERVICE = 'docraptor';
    const b = Iface.getService();
    assert.equal(a.serviceName, 'pdfmonkey');
    assert.equal(b.serviceName, 'docraptor');
  });
});

describe('pdf-service-interface — validateAdapter', () => {
  test('Gueltiger Adapter bestanden', () => {
    const svc = require(path.join(ROOT, 'lib', 'pdf-service-pdfmonkey.js'));
    assert.equal(Iface.validateAdapter(svc), true);
  });

  test('null ist invalid', () => {
    assert.equal(Iface.validateAdapter(null), false);
  });

  test('Object ohne generatePdf invalid', () => {
    assert.equal(Iface.validateAdapter({ isAvailable: () => true, serviceName: 'x' }), false);
  });

  test('Object ohne isAvailable invalid', () => {
    assert.equal(Iface.validateAdapter({ generatePdf: async () => {}, serviceName: 'x' }), false);
  });

  test('Object ohne serviceName invalid', () => {
    assert.equal(Iface.validateAdapter({ generatePdf: async () => {}, isAvailable: () => true }), false);
  });
});

describe('pdf-service-interface — Result-Helpers', () => {
  test('errorResult shape', () => {
    const r = Iface.errorResult('boom', 'CONFIG_MISSING');
    assert.equal(r.ok, false);
    assert.equal(r.download_url, null);
    assert.equal(r.error, 'boom');
    assert.equal(r.code, 'CONFIG_MISSING');
  });

  test('errorResult default code UNKNOWN', () => {
    const r = Iface.errorResult('boom');
    assert.equal(r.code, 'UNKNOWN');
  });

  test('successResult shape mit extras', () => {
    const r = Iface.successResult('https://x', { document_id: 'abc', service: 'pdfmonkey' });
    assert.equal(r.ok, true);
    assert.equal(r.download_url, 'https://x');
    assert.equal(r.error, null);
    assert.equal(r.document_id, 'abc');
    assert.equal(r.service, 'pdfmonkey');
  });

  test('SERVICE_NAMES enthaelt pdfmonkey + docraptor', () => {
    assert.deepEqual(Iface.SERVICE_NAMES, ['pdfmonkey', 'docraptor']);
  });

  test('DEFAULT_SERVICE ist pdfmonkey', () => {
    assert.equal(Iface.DEFAULT_SERVICE, 'pdfmonkey');
  });
});
