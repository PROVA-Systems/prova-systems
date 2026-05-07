'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/list-auftraege');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'list-auftraege.js'), 'utf8');

test('C4: __MAX_LIMIT = 200, __DEFAULT_LIMIT = 50', () => {
  assert.strictEqual(Lambda.__MAX_LIMIT, 200);
  assert.strictEqual(Lambda.__DEFAULT_LIMIT, 50);
});

test('C4: Lambda hat requireAuth + Rate-Limit', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit\.check\(context\.userEmail, 60, 60/);
});

test('C4: Workspace-Resolve via JWT-Email + workspace_memberships', () => {
  assert.match(lambdaSrc, /workspace_memberships!inner\(workspace_id\)/);
  assert.match(lambdaSrc, /\.eq\(['"]email['"], context\.userEmail\)/);
});

test('C4: Query mit RLS-konformen Filtern (workspace_id + deleted_at)', () => {
  assert.match(lambdaSrc, /\.eq\(['"]workspace_id['"], workspaceId\)/);
  assert.match(lambdaSrc, /\.is\(['"]deleted_at['"], null\)/);
});

test('C4: typen-Filter unterstützt (Multi-Select via Komma)', () => {
  assert.match(lambdaSrc, /typenRaw\.split\(','\)/);
  assert.match(lambdaSrc, /\.in\(['"]auftrag_typ['"], typen\)/);
});

test('C4: Pagination via offset/range + total_pages', () => {
  assert.match(lambdaSrc, /offset = \(page - 1\) \* limit/);
  assert.match(lambdaSrc, /\.range\(offset, offset \+ limit - 1\)/);
  assert.match(lambdaSrc, /total_pages:\s*Math\.max\(1, Math\.ceil/);
});

test('C4: count: exact für Total-Reporting', () => {
  assert.match(lambdaSrc, /count:\s*['"]exact['"]/);
});

test('C4: GET-only (POST/PATCH/DELETE rejected)', () => {
  assert.match(lambdaSrc, /event\.httpMethod !== 'GET'/);
});
