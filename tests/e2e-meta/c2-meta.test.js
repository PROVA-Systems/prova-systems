'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }

const E2E_FILES = [
  '01-login-flow.e2e.js',
  '02-auftrag-anlegen.e2e.js',
  '03-paragraph6-editor.e2e.js',
  '04-pdf-generation.e2e.js',
  '05-bescheinigung.e2e.js',
  '06-cookie-banner.e2e.js',
  '07-cmd-k-search.e2e.js',
  '08-mobile-flows.e2e.js'
];

test('C2-META: 8 E2E-Test-Files in tests/e2e/', () => {
  E2E_FILES.forEach(f => {
    const fp = path.join(root, 'tests', 'e2e', f);
    assert.ok(fs.existsSync(fp), 'Missing E2E file: ' + f);
  });
});

test('C2-META: playwright.config.js mit E2E-Config', () => {
  const cfg = read('playwright.config.js');
  assert.match(cfg, /testDir:\s*['"]\.\/tests\/e2e['"]/);
  assert.match(cfg, /testMatch:\s*\/.*\\\.e2e\\\.js/);
});

test('C2-META: 2 Browser-Projekte (chromium + mobile-safari)', () => {
  const cfg = read('playwright.config.js');
  assert.match(cfg, /name:\s*['"]chromium['"]/);
  assert.match(cfg, /mobile-safari|iPhone 14 Pro/);
});

test('C2-META: package.json hat test:e2e + test:ki-live Scripts', () => {
  const pkg = read('package.json');
  assert.match(pkg, /"test:e2e":\s*"playwright test"/);
  assert.match(pkg, /"test:ki-live":/);
});

test('C2-META: jeder E2E-File nutzt @playwright/test', () => {
  E2E_FILES.forEach(f => {
    const src = fs.readFileSync(path.join(root, 'tests', 'e2e', f), 'utf8');
    assert.match(src, /require\(['"]@playwright\/test['"]\)/, f + ' fehlt @playwright/test');
  });
});

test('C2-META: Coverage-Audit-Doku existiert', () => {
  const doc = read('docs/audit/MEGA-34-C2-E2E-COVERAGE.md');
  E2E_FILES.forEach(f => assert.match(doc, new RegExp(f)));
  assert.match(doc, /npm run test:e2e/);
  assert.match(doc, /Skip-Logic|test\.skip/);
});

test('C2-META: BaseURL via ENV überschreibbar (E2E_BASE_URL)', () => {
  const cfg = read('playwright.config.js');
  assert.match(cfg, /E2E_BASE_URL/);
});

test('C2-META: 06-cookie-banner.e2e.js prüft alle 3 Buttons', () => {
  const src = read('tests/e2e/06-cookie-banner.e2e.js');
  ['cc-accept-all', 'cc-only-necessary', 'cc-save-custom'].forEach(id => {
    assert.match(src, new RegExp('#' + id));
  });
});
