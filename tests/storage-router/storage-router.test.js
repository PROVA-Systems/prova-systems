/**
 * PROVA — Storage-Router Tests
 * MEGA⁶ S5 (04.05.2026)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reset env vor jedem Test
function reset() { delete process.env.PROVA_MIGRATION_PATH; }

// Helper: Module re-import (cache bypass)
function freshRouter() {
  delete require.cache[require.resolve('../../netlify/functions/lib/storage-router')];
  return require('../../netlify/functions/lib/storage-router');
}

describe('storage-router · getMigrationPath', () => {
  test('default = airtable wenn ENV nicht gesetzt', () => {
    reset();
    const r = freshRouter();
    assert.equal(r.getMigrationPath(), 'airtable');
  });

  test('ENV PROVA_MIGRATION_PATH=dual respektiert', () => {
    process.env.PROVA_MIGRATION_PATH = 'dual';
    const r = freshRouter();
    assert.equal(r.getMigrationPath(), 'dual');
    reset();
  });

  test('ENV PROVA_MIGRATION_PATH=supabase respektiert', () => {
    process.env.PROVA_MIGRATION_PATH = 'supabase';
    const r = freshRouter();
    assert.equal(r.getMigrationPath(), 'supabase');
    reset();
  });

  test('ENV-Fallback bei unbekanntem Wert', () => {
    process.env.PROVA_MIGRATION_PATH = 'random';
    const r = freshRouter();
    assert.equal(r.getMigrationPath(), 'airtable');
    reset();
  });

  test('opts.path Override', () => {
    reset();
    const r = freshRouter();
    assert.equal(r.getMigrationPath({ path: 'supabase' }), 'supabase');
  });

  test('opts.path ueberschreibt ENV', () => {
    process.env.PROVA_MIGRATION_PATH = 'airtable';
    const r = freshRouter();
    assert.equal(r.getMigrationPath({ path: 'dual' }), 'dual');
    reset();
  });
});

describe('storage-router · readDual default airtable', () => {
  test('default Path airtable ruft nur airtable-Function', async () => {
    reset();
    const r = freshRouter();
    let abCalled = false, sbCalled = false;
    const result = await r.readDual({
      functionName: 'test',
      airtable: async () => { abCalled = true; return ['a', 'b']; },
      supabase: async () => { sbCalled = true; return ['s']; }
    });
    assert.deepEqual(result, ['a', 'b']);
    assert.equal(abCalled, true);
    assert.equal(sbCalled, false);
  });
});

describe('storage-router · readDual mit Override supabase', () => {
  test('opts.path=supabase ruft nur supabase', async () => {
    reset();
    const r = freshRouter();
    let abCalled = false, sbCalled = false;
    const result = await r.readDual({
      functionName: 'test',
      airtable: async () => { abCalled = true; return ['a']; },
      supabase: async () => { sbCalled = true; return ['s', 's2']; }
    }, { path: 'supabase' });
    assert.deepEqual(result, ['s', 's2']);
    assert.equal(abCalled, false);
    assert.equal(sbCalled, true);
  });
});
