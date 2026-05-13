'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'fachurteil.html'), 'utf8');
const libSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'ki-s-stufen.js'), 'utf8');

function evalLib() {
  const win = {};
  new Function('window', 'document', 'module', libSrc)(win, {}, {});
  return win.ProvaSStufen;
}

test('A3: 3 Buttons (ki-s1-btn / ki-s2-btn / ki-s3-btn) im HTML', () => {
  ['ki-s1-btn', 'ki-s2-btn', 'ki-s3-btn'].forEach(id =>
    assert.match(html, new RegExp('id="' + id + '"')));
});

test('A3: KI-Output-Box mit user-select:none (non-copyable)', () => {
  assert.match(html, /id="ki-output-box"[\s\S]{0,400}user-select:none/);
});

test('A3: ki-s-stufen.js Lib eingebunden', () => {
  assert.match(html, /\/lib\/ki-s-stufen\.js/);
});

test('A3: Lib exposed ProvaSStufen.toggle API', () => {
  const api = evalLib();
  assert.strictEqual(typeof api.toggle, 'function');
  assert.ok(api.ACTIONS.s1);
  assert.ok(api.ACTIONS.s2);
  assert.ok(api.ACTIONS.s3);
});

test('A3: Action-Mapping aus KI-PROMPTS-MASTER', () => {
  const api = evalLib();
  assert.strictEqual(api.ACTIONS.s1.action, 'rechtschreibung_s1');
  assert.strictEqual(api.ACTIONS.s2.action, 'absatz_s2');
  assert.strictEqual(api.ACTIONS.s3.action, 'fachsprache_s3');
});

test('A3: ki-proxy-Call mit purpose-Parameter (für ai-router)', () => {
  assert.match(libSrc, /\/\.netlify\/functions\/ki-proxy/);
  assert.match(libSrc, /purpose:\s*cfg\.model_purpose/);
});

test('A3: Output-Box hidden by default (display:none)', () => {
  // Initial: display:none
  assert.match(html, /id="ki-output-box"[\s\S]{0,200}display:none/);
});

test('A3: ki-stufen-status Indicator-Element', () => {
  assert.match(html, /id="ki-stufen-status"/);
});
