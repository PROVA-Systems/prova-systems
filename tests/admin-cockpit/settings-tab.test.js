/**
 * PROVA — admin-dashboard.html Settings-Tab Tests (MEGA²³ Block 3)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'admin-dashboard.html'), 'utf8');

describe('admin-dashboard — Settings-Tab', () => {
  test('Tab-Button "Settings" vorhanden', () => {
    assert.match(HTML, /data-tab="settings"/);
    assert.match(HTML, /⚙️ Settings/);
  });

  test('tab-settings Panel-Container vorhanden', () => {
    assert.match(HTML, /id="tab-settings"/);
  });

  test('System-Info-Section enthaelt SW-Version, Git-Commit, Tests', () => {
    assert.match(HTML, /id="settingsSwVersion"/);
    assert.match(HTML, /id="settingsGitCommit"/);
    assert.match(HTML, /id="settingsTotalTests"/);
    assert.match(HTML, /id="settingsLastDeploy"/);
  });

  test('Feature-Flags-Section enthaelt 4 Flags', () => {
    assert.match(HTML, /id="flagKiVision"/);
    assert.match(HTML, /id="flagKiText"/);
    assert.match(HTML, /id="flagKiFallback"/);
    assert.match(HTML, /id="flagImpersonate"/);
  });

  test('ENV-Status-Container vorhanden', () => {
    assert.match(HTML, /id="settingsEnvList"/);
  });

  test('Sprint-Historie-Section vorhanden', () => {
    assert.match(HTML, /Sprint-Historie/);
    assert.match(HTML, /MEGA²³/);
    assert.match(HTML, /MEGA²²/);
    assert.match(HTML, /MEGA²¹/);
  });

  test('loadSettings() Function definiert', () => {
    assert.match(HTML, /async function loadSettings/);
  });

  test('showTab() laedt loadSettings bei name=settings', () => {
    const m = HTML.match(/name === 'settings'[^}]*loadSettings/);
    assert.ok(m, 'showTab muss loadSettings bei name=settings aufrufen');
  });

  test('Settings-Panel ist initial display:none', () => {
    assert.match(HTML, /id="tab-settings"[^>]*style="[^"]*display:none/);
  });

  test('SW-Version-Probe via /sw.js Fetch', () => {
    assert.match(HTML, /sw\.js\?probe=/);
  });
});
