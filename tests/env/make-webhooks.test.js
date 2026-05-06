/**
 * PROVA — make-webhooks Helper Tests
 * MEGA¹⁵.5 W38 (2026-05-07)
 *
 * Pre-Post-Pattern: Tests beweisen dass die Konsolidierung funktioniert
 * UND Backwards-Compat zu Legacy-ENVs gegeben ist.
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const HELPER_PATH = require.resolve('../../netlify/functions/lib/make-webhooks');

let helper;
const _envBackup = {};

function setEnv(key, value) {
  _envBackup[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv() {
  for (const [k, v] of Object.entries(_envBackup)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  Object.keys(_envBackup).forEach(k => delete _envBackup[k]);
}

function reloadHelper() {
  delete require.cache[HELPER_PATH];
  helper = require(HELPER_PATH);
}

describe('getMakeWebhook — JSON-Lookup (NEU)', () => {
  beforeEach(() => {
    reloadHelper();
    helper._resetCache();
  });
  afterEach(() => { restoreEnv(); helper._resetCache(); });

  test('JSON-ENV: einzelner Webhook abrufbar', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: 'https://hook.eu1.make.com/A5URL' }));
    assert.equal(helper.getMakeWebhook('a5'), 'https://hook.eu1.make.com/A5URL');
  });

  test('JSON-ENV: case-insensitive Lookup', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: 'https://aaa' }));
    assert.equal(helper.getMakeWebhook('A5'), 'https://aaa');
    assert.equal(helper.getMakeWebhook('a5'), 'https://aaa');
    assert.equal(helper.getMakeWebhook('A5'), 'https://aaa');
  });

  test('JSON-ENV: mehrere Webhooks parallel', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({
      a5: 'https://aaa',
      f1: 'https://fff',
      support: 'https://sss'
    }));
    assert.equal(helper.getMakeWebhook('a5'), 'https://aaa');
    assert.equal(helper.getMakeWebhook('f1'), 'https://fff');
    assert.equal(helper.getMakeWebhook('support'), 'https://sss');
  });

  test('JSON-ENV: nicht existierender Key returnt null (kein Legacy)', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: 'https://aaa' }));
    assert.equal(helper.getMakeWebhook('nonexistent'), null);
  });

  test('JSON-ENV: leere Werte werden ignoriert', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: '', f1: 'https://fff' }));
    assert.equal(helper.getMakeWebhook('a5'), null);  // empty string filtered
    assert.equal(helper.getMakeWebhook('f1'), 'https://fff');
  });
});

describe('getMakeWebhook — Backwards-Compat zu Legacy-ENVs', () => {
  beforeEach(() => {
    reloadHelper();
    helper._resetCache();
    setEnv('MAKE_WEBHOOKS', undefined);  // kein JSON
  });
  afterEach(() => { restoreEnv(); helper._resetCache(); });

  test('Legacy MAKE_WEBHOOK_A5 funktioniert ohne JSON', () => {
    setEnv('MAKE_WEBHOOK_A5', 'https://legacy-a5');
    assert.equal(helper.getMakeWebhook('a5'), 'https://legacy-a5');
  });

  test('Legacy MAKE_WEBHOOK_F1 (Lowercase-Key gibt Uppercase-ENV)', () => {
    setEnv('MAKE_WEBHOOK_F1', 'https://legacy-f1');
    assert.equal(helper.getMakeWebhook('f1'), 'https://legacy-f1');
  });

  test('Legacy MAKE_WEBHOOK_SUPPORT', () => {
    setEnv('MAKE_WEBHOOK_SUPPORT', 'https://legacy-support');
    assert.equal(helper.getMakeWebhook('support'), 'https://legacy-support');
  });

  test('Special-Case MAKE_S3_WEBHOOK (alte Pattern)', () => {
    setEnv('MAKE_S3_WEBHOOK', 'https://old-s3');
    assert.equal(helper.getMakeWebhook('s3'), 'https://old-s3');
  });

  test('Special-Case MAKE_S4_WEBHOOK', () => {
    setEnv('MAKE_S4_WEBHOOK', 'https://old-s4');
    assert.equal(helper.getMakeWebhook('s4'), 'https://old-s4');
  });

  test('Kein ENV gesetzt → null', () => {
    assert.equal(helper.getMakeWebhook('a5'), null);
    assert.equal(helper.getMakeWebhook('f1'), null);
  });
});

describe('getMakeWebhook — Hybrid (JSON + Legacy gleichzeitig)', () => {
  beforeEach(() => {
    reloadHelper();
    helper._resetCache();
  });
  afterEach(() => { restoreEnv(); helper._resetCache(); });

  test('JSON gewinnt ueber Legacy bei gleichem Key', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: 'https://json-a5' }));
    setEnv('MAKE_WEBHOOK_A5', 'https://legacy-a5');
    assert.equal(helper.getMakeWebhook('a5'), 'https://json-a5');
  });

  test('JSON-Miss faellt auf Legacy zurueck', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ a5: 'https://json-a5' }));
    setEnv('MAKE_WEBHOOK_F1', 'https://legacy-f1');
    assert.equal(helper.getMakeWebhook('a5'), 'https://json-a5');
    assert.equal(helper.getMakeWebhook('f1'), 'https://legacy-f1');
  });
});

describe('getMakeWebhook — Defensive', () => {
  beforeEach(() => {
    reloadHelper();
    helper._resetCache();
  });
  afterEach(() => { restoreEnv(); helper._resetCache(); });

  test('Korrupte JSON: Fallback auf Legacy', () => {
    setEnv('MAKE_WEBHOOKS', '{invalid json}');
    setEnv('MAKE_WEBHOOK_A5', 'https://legacy-a5');
    assert.equal(helper.getMakeWebhook('a5'), 'https://legacy-a5');
  });

  test('JSON Array statt Object: Fallback auf Legacy', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify(['not', 'an', 'object']));
    setEnv('MAKE_WEBHOOK_A5', 'https://legacy-a5');
    assert.equal(helper.getMakeWebhook('a5'), 'https://legacy-a5');
  });

  test('Empty key returnt null', () => {
    assert.equal(helper.getMakeWebhook(''), null);
    assert.equal(helper.getMakeWebhook(null), null);
    assert.equal(helper.getMakeWebhook(undefined), null);
  });

  test('Non-String key returnt null', () => {
    assert.equal(helper.getMakeWebhook(123), null);
    assert.equal(helper.getMakeWebhook({}), null);
  });
});

describe('listMakeWebhooks', () => {
  beforeEach(() => {
    reloadHelper();
    helper._resetCache();
  });
  afterEach(() => { restoreEnv(); helper._resetCache(); });

  test('Liefert sortierte Keys aus JSON', () => {
    setEnv('MAKE_WEBHOOKS', JSON.stringify({ z1: 'a', a5: 'b', f1: 'c' }));
    const keys = helper.listMakeWebhooks();
    assert.deepEqual(keys, ['a5', 'f1', 'z1']);
  });

  test('Leeres Array bei kein JSON', () => {
    setEnv('MAKE_WEBHOOKS', undefined);
    assert.deepEqual(helper.listMakeWebhooks(), []);
  });

  test('Leeres Array bei korrupter JSON', () => {
    setEnv('MAKE_WEBHOOKS', '{invalid}');
    assert.deepEqual(helper.listMakeWebhooks(), []);
  });
});

describe('Pre-Post-Pattern: Refactored Functions nutzen Helper', () => {
  const fs = require('node:fs');

  test('make-proxy.js nutzt getMakeWebhook (POST-Refactor)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'make-proxy.js'), 'utf8');
    assert.match(src, /require\(['"]\.\/lib\/make-webhooks['"]\)/);
    assert.match(src, /getMakeWebhook/);
    // Pre-Refactor-Pattern: 21 separate process.env.MAKE_WEBHOOK_* — sollte WEG sein
    const oldPattern = (src.match(/process\.env\.MAKE_WEBHOOK_/g) || []).length;
    assert.ok(oldPattern <= 1, 'Sollte hoechstens 1 process.env.MAKE_WEBHOOK_-Aufruf haben (legacy-Hinweis), gefunden: ' + oldPattern);
  });

  test('emails.js nutzt getMakeWebhook (POST-Refactor)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'emails.js'), 'utf8');
    assert.match(src, /require\(['"]\.\/lib\/make-webhooks['"]\)/);
    assert.match(src, /getMakeWebhook\('willkommen'\)/);
    assert.match(src, /getMakeWebhook\('trial'\)/);
    assert.match(src, /getMakeWebhook\('kauf'\)/);
    assert.match(src, /getMakeWebhook\('support'\)/);
  });

  test('team-interest.js nutzt getMakeWebhook (POST-Refactor)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'team-interest.js'), 'utf8');
    assert.match(src, /require\(['"]\.\/lib\/make-webhooks['"]\)/);
    assert.match(src, /getMakeWebhook\('l4'\)/);
    assert.match(src, /getMakeWebhook\('l5'\)/);
  });
});
