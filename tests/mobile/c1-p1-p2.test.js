'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const navJs = fs.readFileSync(path.join(__dirname, '..', '..', 'nav.js'), 'utf8');
const mobileCss = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'mobile-polish.css'), 'utf8');
const auditDoc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-32-C1-MOBILE-AUDIT-P1.md'), 'utf8');

test('C1 P1: Mobile-Audit-Doku existiert', () => {
  assert.ok(auditDoc.length > 500);
});

test('C1 P1: Audit listet 6+ Pages', () => {
  ['dashboard', 'akte', 'stellungnahme', 'freigabe', 'einstellungen', 'index'].forEach(p =>
    assert.match(auditDoc, new RegExp(p + '\\.html')));
});

test('C1 P2: Sidebar-Resize K-FIX existiert (matchMedia + change-Listener)', () => {
  // K-FIX aus nav.js Zeile 1664+ (Memory #19)
  assert.match(navJs, /K-FIX.*Sidebar-Layout-Bug/);
  assert.match(navJs, /onBreakpointChange/);
  assert.match(navJs, /matchMedia\(['"]\(max-width:\s*768px\)['"]/);
});

test('C1 P2: nav.js verwendet mqTablet für 769-1099px', () => {
  assert.match(navJs, /min-width:\s*769px[\s\S]{0,40}max-width:\s*1099px/);
});

test('C1 Touch-Targets: min-width/height 44px in mobile-polish.css', () => {
  assert.match(mobileCss, /min-width:\s*44px/);
  assert.match(mobileCss, /min-height:\s*44px/);
});

test('C1 Touch-Targets: deckt Hauptselektoren', () => {
  ['\\.btn', '\\.topbar-btn', '\\.tool-button', '\\.section-toggle'].forEach(sel =>
    assert.match(mobileCss, new RegExp(sel)));
});

test('C1: Audit-Doku Lighthouse-Empfehlung vorhanden', () => {
  assert.match(auditDoc, /Lighthouse/);
});

test('C1: Audit-Doku Safe-Area-Insets erwähnt', () => {
  assert.match(auditDoc, /safe-area|Safe-Area/);
});
