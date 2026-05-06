/**
 * PROVA — dsgvo-portability.js Tests (MEGA²⁸ KORR-19)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'netlify', 'functions', 'dsgvo-portability.js');

function loadWithStubs() {
  delete require.cache[require.resolve(TARGET)];
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
  stubMod('lib/jwt-middleware.js', { requireAuth: (fn) => fn });
  stubMod('lib/cors-helper.js', { getCorsHeaders: () => ({}), corsOptionsResponse: () => ({}) });
  stubMod('lib/storage-router.js', { getSupabase: () => null });
  return require(TARGET);
}

describe('dsgvo-portability — collectUserData', () => {
  test('returnt strukturiertes Export-Objekt mit allen Tabellen', async () => {
    const mod = loadWithStubs();
    const fakeSb = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: [{ table_name: table }] }),
            maybeSingle: () => Promise.resolve({ data: { id: 'x', table_name: table } })
          })
        })
      })
    };
    const r = await mod._test.collectUserData(fakeSb, 'u1', 'w1');
    assert.equal(r.version, '1.0');
    assert.ok(r.exported_at);
    assert.ok(Array.isArray(r.auftraege));
    assert.ok(Array.isArray(r.kontakte));
    assert.ok(Array.isArray(r.fotos));
    assert.ok(Array.isArray(r.termine));
    assert.ok(Array.isArray(r.audit_trail));
    assert.match(r.note, /Art\. 20/);
  });

  test('graceful bei DB-Errors', async () => {
    const mod = loadWithStubs();
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => Promise.reject(new Error('db error')),
            maybeSingle: () => Promise.reject(new Error('db error'))
          })
        })
      })
    };
    const r = await mod._test.collectUserData(fakeSb, 'u1', 'w1');
    // Trotz Errors: leere Arrays
    assert.deepEqual(r.auftraege, []);
    assert.deepEqual(r.kontakte, []);
  });
});

describe('dsgvo-portability — Source-Audit', () => {
  const SRC = fs.readFileSync(TARGET, 'utf8');

  test('JWT-Auth via requireAuth', () => {
    assert.match(SRC, /requireAuth/);
  });

  test('Method-Whitelist nur GET', () => {
    assert.match(SRC, /httpMethod !== 'GET'/);
  });

  test('Workspace-ID-Filter (RLS-Pattern)', () => {
    assert.match(SRC, /\.eq\(['"]workspace_id['"]/);
  });

  test('Content-Disposition für Download', () => {
    assert.match(SRC, /Content-Disposition.*attachment/);
  });

  test('Audit-Log bei Export', () => {
    assert.match(SRC, /dsgvo\.export\.requested/);
  });

  test('Version-Marker', () => {
    assert.match(SRC, /EXPORT_VERSION\s*=\s*['"]1\.0['"]/);
  });
});
