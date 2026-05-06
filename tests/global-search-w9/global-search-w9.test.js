/**
 * Tests für W9N-I4 Cmd-K Globale Suche (MEGA²⁹ W9N-I4)
 * - Lambda: netlify/functions/global-search.js
 * - Frontend-Erweiterung: global-search.js _searchSupabase
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

describe('global-search.js Lambda (W9-I4)', () => {
  const SRC = read('netlify/functions/global-search.js');

  test('requireAuth + withSentry + Rate-Limit', () => {
    assert.match(SRC, /requireAuth/);
    assert.match(SRC, /withSentry/);
    assert.match(SRC, /functionName:\s*['"]global-search['"]/);
    assert.match(SRC, /RateLimit\.check/);
  });

  test('Searches across auftraege + kontakte + bescheinigungen', () => {
    assert.match(SRC, /from\(['"]auftraege['"]\)/);
    assert.match(SRC, /from\(['"]kontakte['"]\)/);
    assert.match(SRC, /KORRESPONDENZ/); // bescheinigungen statisch
  });

  test('Query-Params q + limit + type', () => {
    assert.match(SRC, /queryStringParameters[\s\S]{0,200}\bq\b/);
    assert.match(SRC, /typeFilter/);
    assert.match(SRC, /LimitClamp/);
  });

  test('Min-2-Char-Filter (Schutz vor leeren Queries)', () => {
    assert.match(SRC, /cleanQ\.length\s*<\s*2/);
  });

  test('Score-basiertes Sorting (relevantestes zuerst)', () => {
    assert.match(SRC, /\? 100 : \d+/); // exact-match Score-Pattern
    assert.match(SRC, /sort\(\(a, b\)/);
  });

  test('Type-Filter "akten" / "kontakte" / "dokumente"', () => {
    assert.match(SRC, /typeFilter === ['"]akten['"]/);
    assert.match(SRC, /typeFilter === ['"]kontakte['"]/);
    assert.match(SRC, /typeFilter === ['"]dokumente['"]/);
  });

  test('Defensive try-catch um Tabellen-Reads (table-existence-tolerant)', () => {
    const matches = SRC.match(/catch\s*\(_?\)\s*\{[^}]*\}/g) || [];
    assert.ok(matches.length >= 2, 'Mind. 2 try-catch-Blöcke für Defensive-Reads');
  });
});

describe('global-search.js Frontend Erweiterung W9N-I4', () => {
  const SRC = read('global-search.js');

  test('Bestehender Cmd-K-Listener (Standard-Pattern erhalten)', () => {
    assert.match(SRC, /e\.metaKey \|\| e\.ctrlKey/);
    assert.match(SRC, /e\.key === ['"]k['"]/);
  });

  test('NEU: _searchSupabase via global-search Lambda', () => {
    assert.match(SRC, /_searchSupabase/);
    assert.match(SRC, /\/\.netlify\/functions\/global-search\?q=/);
  });

  test('NEU: Hybrid-Backend (Supabase + Airtable parallel)', () => {
    assert.match(SRC, /this\._searchSupabase\(q\)/);
    assert.match(SRC, /this\._searchAirtable\(q\)/);
  });

  test('NEU: 300ms Debounce für Supabase (Live-Feel)', () => {
    // Im _searchSupabase-Block muss "300" als setTimeout-Delay vorkommen
    const sbBlock = SRC.match(/_searchSupabase\(q\)\s*\{[\s\S]{0,3000}/);
    assert.ok(sbBlock);
    assert.match(sbBlock[0], /\}, 300\);/);
  });

  test('NEU: Recently-Searched-History in localStorage', () => {
    assert.match(SRC, /prova_search_history/);
    assert.match(SRC, /\.slice\(0,\s*5\)/); // max 5 Einträge
  });

  test('NEU: Type-spezifische Icons (akte/kontakt/dokument)', () => {
    assert.match(SRC, /r\.type === ['"]akte['"]/);
    assert.match(SRC, /r\.type === ['"]kontakt['"]/);
    assert.match(SRC, /r\.type === ['"]dokument['"]/);
  });

  test('NEU: Keine Doppelt-Anzeige von Hits (Hybrid-Dedup via existingHrefs)', () => {
    // Pattern existiert bereits in _searchAirtable, muss in _searchSupabase ebenfalls vorhanden sein
    const sbSection = SRC.match(/_searchSupabase[\s\S]{0,3000}/);
    assert.ok(sbSection);
    assert.match(sbSection[0], /existingHrefs/);
  });
});
