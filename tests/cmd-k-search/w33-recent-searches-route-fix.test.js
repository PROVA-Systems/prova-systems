'use strict';

/**
 * MEGA³⁶ W3.3 — Cmd-K: Recent-Searches + Route-Fix Tests
 *
 * Verifiziert:
 *  - "Neuer Fall (Wizard)"-Page-Eintrag zeigt auf neuer-fall.html
 *  - Schnellaktion "Neuen Fall anlegen" zeigt auf neuer-fall.html
 *  - Recent-Searches-Block (prova_search_history) wird im Empty-State
 *    angezeigt und Click führt zu Re-Query (kein Navigate)
 *  - escapeAttr-Helper schützt vor XSS in data-recent-query
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const frontSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'global-search.js'), 'utf8');

test('W3.3: PAGES enthält "Neuer Fall (Wizard)" → neuer-fall.html', () => {
  assert.match(frontSrc, /label:\s*['"]Neuer Fall \(Wizard\)['"][^}]*href:\s*['"]neuer-fall\.html['"]/);
});

test('W3.3: PAGES enthält "Klassisches Gutachten-Formular" → app.html (für Power-User)', () => {
  assert.match(frontSrc, /label:\s*['"]Klassisches Gutachten-Formular['"][^}]*href:\s*['"]app\.html['"]/);
});

test('W3.3: Schnellaktion "Neuen Fall anlegen" zeigt auf neuer-fall.html', () => {
  assert.match(frontSrc, /label:\s*['"]Neuen Fall anlegen['"][^}]*href:\s*['"]neuer-fall\.html['"]/);
});

test('W3.3: Schnellaktion "Neues Gutachten starten" → app.html ist entfernt', () => {
  assert.doesNotMatch(frontSrc, /Neues Gutachten starten/);
});

test('W3.3: _getRecentSearches liest prova_search_history aus localStorage', () => {
  assert.match(frontSrc, /_getRecentSearches/);
  assert.match(frontSrc, /prova_search_history/);
});

test('W3.3: Empty-State rendert "Letzte Suchen"-Group bei vorhandener History', () => {
  assert.match(frontSrc, /group:\s*['"]Letzte Suchen['"]/);
});

test('W3.3: Recent-Query-Items haben _isRecentQuery + Re-Query-Click', () => {
  assert.match(frontSrc, /_isRecentQuery:\s*true/);
  // Click-Handler erkennt data-recent-query und feuert _search
  assert.match(frontSrc, /data-recent-query/);
  assert.match(frontSrc, /el\.dataset\.recentQuery/);
});

test('W3.3: Re-Query setzt input.value und ruft _search auf', () => {
  const renderBlock = frontSrc.match(/_render\(items\)\s*\{[\s\S]*?\n\s*\},/);
  assert.ok(renderBlock, '_render-Block gefunden');
  assert.match(renderBlock[0], /this\._input\.value\s*=\s*recent/);
  assert.match(renderBlock[0], /this\._search\(recent\)/);
});

test('W3.3: escapeAttr-Helper escaped Quotes/Tags (XSS-Schutz)', () => {
  // escapeAttr ist im Top-Level-Scope definiert
  assert.match(frontSrc, /function escapeAttr\(/);
  assert.match(frontSrc, /replace\(\/&\/g/);
  assert.match(frontSrc, /replace\(\/"/);
  assert.match(frontSrc, /replace\(\/</);
});

test('W3.3: Type-Label "Aktion" für action-items in Render', () => {
  // Visuelles Tag hilft User zwischen Action vs Page zu unterscheiden
  assert.match(frontSrc, /typeLabel\s*=\s*isRecentQuery\s*\?\s*['"]Suche['"]/);
  assert.match(frontSrc, /item\.type\s*===\s*['"]action['"]\s*\?\s*['"]Aktion['"]/);
});
