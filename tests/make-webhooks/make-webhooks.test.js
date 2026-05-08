'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Helper = require('../../netlify/functions/lib/make-webhooks');

test('getMakeWebhook: JSON-Lookup case-insensitive', () => {
  delete process.env.MAKE_WEBHOOKS;
  Helper._resetCache();
  process.env.MAKE_WEBHOOKS = '{"a5":"https://hook.eu1.make.com/abc","f1":"https://hook.eu1.make.com/def"}';
  Helper._resetCache();
  assert.strictEqual(Helper.getMakeWebhook('a5'), 'https://hook.eu1.make.com/abc');
  assert.strictEqual(Helper.getMakeWebhook('A5'), 'https://hook.eu1.make.com/abc');
  assert.strictEqual(Helper.getMakeWebhook('F1'), 'https://hook.eu1.make.com/def');
  delete process.env.MAKE_WEBHOOKS;
});

test('getMakeWebhook: Legacy-ENV-Fallback (MAKE_WEBHOOK_<KEY>)', () => {
  delete process.env.MAKE_WEBHOOKS;
  Helper._resetCache();
  process.env.MAKE_WEBHOOK_LEGACY1 = 'https://legacy.example.com/hook';
  assert.strictEqual(Helper.getMakeWebhook('legacy1'), 'https://legacy.example.com/hook');
  delete process.env.MAKE_WEBHOOK_LEGACY1;
});

test('getMakeWebhook: JSON hat Vorrang vor Legacy', () => {
  Helper._resetCache();
  process.env.MAKE_WEBHOOKS = '{"x1":"https://json.example.com"}';
  process.env.MAKE_WEBHOOK_X1 = 'https://legacy.example.com';
  Helper._resetCache();
  assert.strictEqual(Helper.getMakeWebhook('x1'), 'https://json.example.com');
  delete process.env.MAKE_WEBHOOKS;
  delete process.env.MAKE_WEBHOOK_X1;
});

test('getMakeWebhook: ungültiger Key → null', () => {
  Helper._resetCache();
  delete process.env.MAKE_WEBHOOKS;
  assert.strictEqual(Helper.getMakeWebhook(''), null);
  assert.strictEqual(Helper.getMakeWebhook(null), null);
  assert.strictEqual(Helper.getMakeWebhook('nonexistent'), null);
});

test('getMakeWebhook: Special-Case s3/s4 Legacy', () => {
  Helper._resetCache();
  delete process.env.MAKE_WEBHOOKS;
  process.env.MAKE_S3_WEBHOOK = 'https://s3.example.com';
  process.env.MAKE_S4_WEBHOOK = 'https://s4.example.com';
  assert.strictEqual(Helper.getMakeWebhook('s3'), 'https://s3.example.com');
  assert.strictEqual(Helper.getMakeWebhook('s4'), 'https://s4.example.com');
  delete process.env.MAKE_S3_WEBHOOK;
  delete process.env.MAKE_S4_WEBHOOK;
});

test('listMakeWebhooks: liefert Keys (kein Wert-Leak)', () => {
  Helper._resetCache();
  process.env.MAKE_WEBHOOKS = '{"a5":"x","f1":"y"}';
  Helper._resetCache();
  const keys = Helper.listMakeWebhooks();
  assert.deepStrictEqual(keys.sort(), ['a5', 'f1']);
  delete process.env.MAKE_WEBHOOKS;
});

test('Caller: emails.js nutzt getMakeWebhook (kein direkter MAKE_WEBHOOK_X-Lookup)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'emails.js'), 'utf8');
  // Code sollte process.env.MAKE_WEBHOOK_X NICHT direkt nutzen (außer als Comment)
  const codeOnly = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(codeOnly, /getMakeWebhook/);
  // Direkter process.env.MAKE_WEBHOOK_<KEY> wäre Drift — sollte 0 sein
  const directMatches = codeOnly.match(/process\.env\.MAKE_WEBHOOK_/g) || [];
  assert.strictEqual(directMatches.length, 0, 'Kein direkter Legacy-Lookup mehr');
});

test('Caller: make-proxy.js nutzt getMakeWebhook', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'make-proxy.js'), 'utf8');
  const codeOnly = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(codeOnly, /getMakeWebhook/);
  const directMatches = codeOnly.match(/process\.env\.MAKE_WEBHOOK_/g) || [];
  assert.strictEqual(directMatches.length, 0);
});

test('Caller: team-interest.js nutzt getMakeWebhook', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'team-interest.js'), 'utf8');
  const codeOnly = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(codeOnly, /getMakeWebhook/);
  const directMatches = codeOnly.match(/process\.env\.MAKE_WEBHOOK_/g) || [];
  assert.strictEqual(directMatches.length, 0);
});

test('Helper: korrupte JSON → fail-soft (listMakeWebhooks → [], getMakeWebhook → null)', () => {
  Helper._resetCache();
  process.env.MAKE_WEBHOOKS = 'not-json';
  Helper._resetCache();
  // listMakeWebhooks catched intern und gibt [] zurück (resilient)
  assert.deepStrictEqual(Helper.listMakeWebhooks(), []);
  // getMakeWebhook fällt auf Legacy zurück → null wenn keine
  assert.strictEqual(Helper.getMakeWebhook('a5'), null);
  delete process.env.MAKE_WEBHOOKS;
});
