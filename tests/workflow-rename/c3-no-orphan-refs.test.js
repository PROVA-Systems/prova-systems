'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..', '..');

const FILES = ['lib/welcome-wizard.js', 'lib/workflow-mode-router.js', 'lib/onboarding-trigger.js'];

FILES.forEach(f => {
  test('C3: ' + f + ' hat 0 user-workflow-settings-Refs', () => {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.doesNotMatch(src, /user-workflow-settings/, f + ' enthält noch alte Ref');
  });
});

test('C3: lib/welcome-wizard.js nutzt /workflow-settings', () => {
  const src = fs.readFileSync(path.join(root, 'lib/welcome-wizard.js'), 'utf8');
  assert.match(src, /\/\.netlify\/functions\/workflow-settings/);
});

test('C3: Lambda netlify/functions/workflow-settings.js existiert (Target)', () => {
  const target = path.join(root, 'netlify/functions/workflow-settings.js');
  assert.ok(fs.existsSync(target), 'Target-Lambda fehlt');
});
