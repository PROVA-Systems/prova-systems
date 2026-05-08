'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const modalSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 're-consent-modal.js'), 'utf8');
const pendingSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 're-consent-pending.js'), 'utf8');
const submitSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 're-consent-submit.js'), 'utf8');

test('B5: Modal-Lib exposed checkAndShow + isPending API', () => {
  assert.match(modalSrc, /window\.ProvaReConsent\s*=\s*\{[\s\S]*?checkAndShow/);
  assert.match(modalSrc, /isPending/);
});

test('B5: Pending-Lambda nutzt v_user_pending_einwilligungen View', () => {
  assert.match(pendingSrc, /v_user_pending_einwilligungen/);
  assert.match(pendingSrc, /eq\(['"]user_id['"]/);
});

test('B5: Submit-Lambda Insert in einwilligungen mit IP + User-Agent', () => {
  assert.match(submitSrc, /from\(['"]einwilligungen['"]\)\.insert/);
  assert.match(submitSrc, /ip_address/);
  assert.match(submitSrc, /user_agent/);
});

test('B5: Submit-Lambda speichert inhalt_hash_snapshot (Compliance)', () => {
  assert.match(submitSrc, /inhalt_hash_snapshot/);
  assert.match(submitSrc, /inhalt_hash/);
});

test('B5: Submit-Lambda audit_trail-Insert action=create', () => {
  assert.match(submitSrc, /audit_trail/);
  assert.match(submitSrc, /entity_typ:\s*['"]einwilligung['"]/);
});

test('B5: Modal Auto-Init nur auf authenticated Pages', () => {
  assert.match(modalSrc, /skipPaths/);
  assert.match(modalSrc, /\/login/);
  assert.match(modalSrc, /\/index\.html/);
});

test('B5: Modal HTML-Escape gegen XSS', () => {
  assert.match(modalSrc, /escHtml/);
  assert.match(modalSrc, /&amp;|&lt;|&gt;/);
});

test('B5: Modal Submit-Button DISABLED bis alle Checkboxes', () => {
  assert.match(modalSrc, /allChecked/);
  assert.match(modalSrc, /disabled\s*=\s*!allChecked/);
});

test('B5: Modal lockt App via fixed-overlay (z-index 99999)', () => {
  assert.match(modalSrc, /z-index:99999/);
  assert.match(modalSrc, /position:fixed/);
});

test('B5: Pending-Lambda defensive 200 (statt 5xx) bei DB-Error', () => {
  assert.match(pendingSrc, /pending:\s*\[\][\s\S]{0,200}reason/);
});
