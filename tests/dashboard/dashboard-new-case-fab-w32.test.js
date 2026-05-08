'use strict';

/**
 * MEGA³⁶ W3.2 — Cockpit Quick-Action + FAB Tests
 *
 * Verifiziert:
 *  - Header-"Neuer Fall"-Button zeigt auf neuer-fall.html (statt app.html)
 *  - Mobile-FAB existiert mit korrektem aria-label und Ziel
 *  - FAB ist via @media nur auf max-width:768px sichtbar
 *  - Cmd-K-Palette (nav.js) zeigt "+ Neuer Fall" auf neuer-fall.html
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dashHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'dashboard.html'), 'utf8');
const navJs    = fs.readFileSync(path.join(__dirname, '..', '..', 'nav.js'), 'utf8');

test('W3.2: Header-Quick-Action-Button verlinkt zu neuer-fall.html', () => {
  // Button hat ID + zeigt explizit auf neuer-fall.html
  assert.match(dashHtml, /id="dash-new-case-btn"/);
  assert.match(dashHtml, /id="dash-new-case-btn"[^>]*onclick="window\.location\.href='neuer-fall\.html'"/);
});

test('W3.2: Header-Button hat aria-label für Screenreader', () => {
  assert.match(dashHtml, /id="dash-new-case-btn"[^>]*aria-label="Neuen Fall anlegen"/);
});

test('W3.2: Mobile-FAB existiert mit korrekter Klasse + ID', () => {
  assert.match(dashHtml, /class="new-case-fab"\s+id="dash-new-case-fab"/);
});

test('W3.2: Mobile-FAB verlinkt zu neuer-fall.html', () => {
  assert.match(dashHtml, /id="dash-new-case-fab"[^>]*onclick="window\.location\.href='neuer-fall\.html'"/);
});

test('W3.2: Mobile-FAB hat aria-label', () => {
  assert.match(dashHtml, /id="dash-new-case-fab"[^>]*aria-label="Neuen Fall anlegen"/);
});

test('W3.2: Mobile-FAB ist standardmässig display:none, sichtbar nur ≤768px', () => {
  assert.match(dashHtml, /\.new-case-fab\s*\{[^}]*display:\s*none/);
  assert.match(dashHtml, /@media\s*\(max-width:\s*768px\)\s*\{\s*\.new-case-fab\s*\{\s*display:\s*flex/);
});

test('W3.2: FAB nutzt accent-Gradient analog .support-fab (Design-Konsistenz)', () => {
  assert.match(dashHtml, /\.new-case-fab\s*\{[^}]*background:linear-gradient\(135deg,\s*var\(--accent/);
});

test('W3.2: Cmd-K-Palette (nav.js) zeigt "+ Neuer Fall" auf neuer-fall.html', () => {
  assert.match(navJs, /label:\s*['"]?\+ Neuer Fall['"]?[^}]*href:\s*['"]neuer-fall\.html['"]/);
});

test('W3.2: Cmd-K-Palette enthält KEINE alte app.html-Verlinkung mehr für "Neuer Fall"', () => {
  // Wir filtern den AKTIONEN-Block heraus und prüfen, dass in dieser Zeile nicht mehr app.html steht
  const aktion = navJs.match(/label:\s*['"]?\+ Neuer Fall['"]?[^}]*}/);
  assert.ok(aktion, '+ Neuer Fall Aktion gefunden');
  assert.doesNotMatch(aktion[0], /href:\s*['"]app\.html['"]/);
});

test('W3.2: FAB-Touch-Target ≥56px (Apple HIG/Android-Material)', () => {
  // Sucht width:56px und height:56px in .new-case-fab
  const css = dashHtml.match(/\.new-case-fab\s*\{[^}]+\}/);
  assert.ok(css, '.new-case-fab CSS gefunden');
  assert.match(css[0], /width:\s*56px/);
  assert.match(css[0], /height:\s*56px/);
});
