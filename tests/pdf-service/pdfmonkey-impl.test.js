/**
 * PROVA — PDFMonkey Adapter Tests
 * MEGA¹⁸ W72 (2026-05-08)
 *
 * Mock-strategie: globalen fetch ueberschreiben pro Test, validate
 * dass Adapter API-Calls korrekt formt und Polling funktioniert.
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ADAPTER = require(path.join(ROOT, 'lib', 'pdf-service-pdfmonkey.js'));

const _origFetch = global.fetch;
const _origEnv = {
  PDFMONKEY_API_KEY: process.env.PDFMONKEY_API_KEY,
  PDFMONKEY_MODE_C_TEMPLATE_ID: process.env.PDFMONKEY_MODE_C_TEMPLATE_ID
};

function restoreEnv() {
  Object.entries(_origEnv).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
}

function mockFetch(impl) {
  global.fetch = impl;
}

describe('pdf-service-pdfmonkey — isAvailable', () => {
  afterEach(() => { restoreEnv(); });

  test('isAvailable false wenn Key fehlt', () => {
    delete process.env.PDFMONKEY_API_KEY;
    assert.equal(ADAPTER.isAvailable(), false);
  });

  test('isAvailable false wenn Key zu kurz', () => {
    process.env.PDFMONKEY_API_KEY = 'abc';
    assert.equal(ADAPTER.isAvailable(), false);
  });

  test('isAvailable true wenn Key gesetzt', () => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
    assert.equal(ADAPTER.isAvailable(), true);
  });
});

describe('pdf-service-pdfmonkey — Validation', () => {
  afterEach(() => { restoreEnv(); global.fetch = _origFetch; });

  test('CONFIG_MISSING wenn API_KEY fehlt', async () => {
    delete process.env.PDFMONKEY_API_KEY;
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 'tpl' });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'CONFIG_MISSING');
  });

  test('TEMPLATE_MISSING wenn weder template_id noch ENV', async () => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
    delete process.env.PDFMONKEY_MODE_C_TEMPLATE_ID;
    const r = await ADAPTER.generatePdf('<p>x</p>', {});
    assert.equal(r.code, 'TEMPLATE_MISSING');
  });

  test('BAD_INPUT wenn html leer', async () => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
    const r = await ADAPTER.generatePdf('  ', { template_id: 'tpl' });
    assert.equal(r.code, 'BAD_INPUT');
  });

  test('BAD_INPUT wenn html nicht string', async () => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
    const r = await ADAPTER.generatePdf(null, { template_id: 'tpl' });
    assert.equal(r.code, 'BAD_INPUT');
  });
});

describe('pdf-service-pdfmonkey — generatePdf Happy Path', () => {
  beforeEach(() => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
    process.env.PDFMONKEY_MODE_C_TEMPLATE_ID = 'tpl-uuid-123';
  });
  afterEach(() => { restoreEnv(); global.fetch = _origFetch; });

  test('Erfolgreicher Document-Create + sofort success', async () => {
    let createCalled = false;
    let pollCalled = false;
    mockFetch(async (url, opts) => {
      if (!createCalled && url.endsWith('/documents') && opts.method === 'POST') {
        createCalled = true;
        const body = JSON.parse(opts.body);
        assert.equal(body.document.document_template_id, 'tpl-uuid-123');
        assert.equal(body.document.payload.title, 'Test Title');
        assert.equal(body.document.payload.html_content, '<p>HELLO</p>');
        return {
          ok: true,
          json: async () => ({ document: { id: 'doc-abc' } })
        };
      }
      if (url.includes('/documents/doc-abc')) {
        pollCalled = true;
        return {
          ok: true,
          json: async () => ({ document: { id: 'doc-abc', status: 'success', download_url: 'https://pdf.example/doc-abc.pdf', created_at: '2026-05-08T10:00Z' } })
        };
      }
      throw new Error('Unexpected URL: ' + url);
    });

    const r = await ADAPTER.generatePdf('<p>HELLO</p>', { title: 'Test Title' });
    assert.equal(r.ok, true);
    assert.equal(r.download_url, 'https://pdf.example/doc-abc.pdf');
    assert.equal(r.document_id, 'doc-abc');
    assert.equal(r.service, 'pdfmonkey');
    assert.ok(createCalled);
    assert.ok(pollCalled);
  });

  test('Pending dann success → returnt download_url', async () => {
    let pollCount = 0;
    mockFetch(async (url, opts) => {
      if (opts && opts.method === 'POST') {
        return { ok: true, json: async () => ({ document: { id: 'd1' } }) };
      }
      pollCount++;
      if (pollCount === 1) {
        return { ok: true, json: async () => ({ document: { id: 'd1', status: 'pending' } }) };
      }
      return { ok: true, json: async () => ({ document: { id: 'd1', status: 'success', download_url: 'https://x.pdf' } }) };
    });

    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.ok, true);
    assert.ok(pollCount >= 2);
  });
});

describe('pdf-service-pdfmonkey — Error-Paths', () => {
  beforeEach(() => {
    process.env.PDFMONKEY_API_KEY = 'pdfm_secret_keylongenough';
  });
  afterEach(() => { restoreEnv(); global.fetch = _origFetch; });

  test('CREATE_FAILED bei 4xx', async () => {
    mockFetch(async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' }));
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'CREATE_FAILED');
    assert.match(r.error, /401/);
  });

  test('NETWORK bei fetch-throw im Create', async () => {
    mockFetch(async () => { throw new Error('Network down'); });
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'NETWORK');
    assert.match(r.error, /Network down/);
  });

  test('CREATE_FAILED wenn keine document.id', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ document: {} }) }));
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'CREATE_FAILED');
  });

  test('RENDER_FAILED bei status=failure', async () => {
    let postDone = false;
    mockFetch(async (url, opts) => {
      if (opts && opts.method === 'POST') {
        postDone = true;
        return { ok: true, json: async () => ({ document: { id: 'd1' } }) };
      }
      return { ok: true, json: async () => ({ document: { id: 'd1', status: 'failure', failure_reason: 'liquid syntax error' } }) };
    });
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'RENDER_FAILED');
    assert.match(r.error, /liquid syntax error/);
    assert.ok(postDone);
  });

  test('NO_URL wenn success aber download_url fehlt', async () => {
    mockFetch(async (url, opts) => {
      if (opts && opts.method === 'POST') {
        return { ok: true, json: async () => ({ document: { id: 'd1' } }) };
      }
      return { ok: true, json: async () => ({ document: { id: 'd1', status: 'success' } }) };
    });
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'NO_URL');
  });

  test('POLL_FAILED bei 5xx in Poll', async () => {
    mockFetch(async (url, opts) => {
      if (opts && opts.method === 'POST') {
        return { ok: true, json: async () => ({ document: { id: 'd1' } }) };
      }
      return { ok: false, status: 503 };
    });
    const r = await ADAPTER.generatePdf('<p>x</p>', { template_id: 't' });
    assert.equal(r.code, 'POLL_FAILED');
  });
});

describe('pdf-service-pdfmonkey — Config-Constants', () => {
  test('Polling-Konstanten sinnvoll', () => {
    const cfg = ADAPTER._config;
    assert.ok(cfg.MAX_POLL_MS >= 30 * 1000);
    assert.ok(cfg.MAX_POLL_MS <= 120 * 1000);
    assert.ok(cfg.POLL_INITIAL_MS >= 500);
    assert.ok(cfg.POLL_BACKOFF >= 1.0);
    assert.ok(cfg.POLL_MAX_INTERVAL_MS <= cfg.MAX_POLL_MS);
  });

  test('PDFMonkey API-URL korrekt', () => {
    assert.equal(ADAPTER._config.PDFMONKEY_API, 'https://api.pdfmonkey.io/api/v1');
  });
});
