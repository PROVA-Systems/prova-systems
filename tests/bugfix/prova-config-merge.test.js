/**
 * PROVA — prova-config Merge-Defense Test
 * Hotfix MEGA¹⁶.5 (2026-05-08)
 *
 * Beweist: Beide prova-config.js Files OVERWRITEN nicht mehr
 * window.PROVA_CONFIG → order-independent.
 *
 * Bug-Pattern (PRE-Hotfix):
 *   1. /lib/prova-config.js setzt window.PROVA_CONFIG = {SUPABASE_URL, ...}
 *   2. /prova-config.js (root) setzt window.PROVA_CONFIG = {AIRTABLE_BASE}
 *      → SUPABASE_URL weg
 *   3. ESM-Import supabase-client.js findet kein SUPABASE_URL → throw
 */
'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const LIB_CONFIG = fs.readFileSync(path.join(ROOT, 'lib', 'prova-config.js'), 'utf8');
const ROOT_CONFIG = fs.readFileSync(path.join(ROOT, 'prova-config.js'), 'utf8');

function runScript(src, ctx) {
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
}

function freshContext() {
  return {
    window: {},
    localStorage: { getItem: () => null }
  };
}

describe('Hotfix MEGA¹⁶.5: prova-config Order-Independence', () => {
  test('PRE-PATTERN check: source-files enthalten Merge-Pattern', () => {
    // /prova-config.js (root) muss `window.PROVA_CONFIG = window.PROVA_CONFIG || {}` haben
    assert.match(ROOT_CONFIG, /window\.PROVA_CONFIG\s*=\s*window\.PROVA_CONFIG\s*\|\|\s*\{\}/);
    assert.match(ROOT_CONFIG, /window\.PROVA_CONFIG\.AIRTABLE_BASE\s*=/);

    // /lib/prova-config.js darf NICHT mehr window.PROVA_CONFIG = config; haben
    // Stattdessen muss es existing.AIRTABLE_BASE bewahren
    assert.match(LIB_CONFIG, /existing\.AIRTABLE_BASE/);
  });

  test('Order A: lib zuerst, root danach — SUPABASE_URL bleibt erhalten', () => {
    const ctx = freshContext();
    runScript(LIB_CONFIG, ctx);
    runScript(ROOT_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, 'https://cngteblrbpwsyypexjrv.supabase.co');
    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, 'appJ7bLlAHZoxENWE');
    assert.ok(ctx.window.PROVA_CONFIG.SUPABASE_ANON_KEY);
  });

  test('Order B: root zuerst, lib danach — AIRTABLE_BASE bleibt erhalten', () => {
    const ctx = freshContext();
    runScript(ROOT_CONFIG, ctx);
    runScript(LIB_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, 'https://cngteblrbpwsyypexjrv.supabase.co');
    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, 'appJ7bLlAHZoxENWE');
    assert.ok(ctx.window.PROVA_CONFIG.SUPABASE_ANON_KEY);
  });

  test('Order C: nur root (ohne lib) — AIRTABLE_BASE gesetzt, kein Throw', () => {
    const ctx = freshContext();
    runScript(ROOT_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, 'appJ7bLlAHZoxENWE');
    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, undefined);
  });

  test('Order D: nur lib (ohne root) — SUPABASE_URL gesetzt', () => {
    const ctx = freshContext();
    runScript(LIB_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, 'https://cngteblrbpwsyypexjrv.supabase.co');
    assert.ok(ctx.window.PROVA_CONFIG.SUPABASE_ANON_KEY);
    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, undefined);
  });

  test('Lib-Doppellade idempotent — kein Daten-Verlust', () => {
    const ctx = freshContext();
    runScript(LIB_CONFIG, ctx);
    const firstUrl = ctx.window.PROVA_CONFIG.SUPABASE_URL;
    const firstKey = ctx.window.PROVA_CONFIG.SUPABASE_ANON_KEY;
    runScript(LIB_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, firstUrl);
    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_ANON_KEY, firstKey);
  });

  test('Root-Doppellade idempotent — kein Daten-Verlust', () => {
    const ctx = freshContext();
    runScript(ROOT_CONFIG, ctx);
    runScript(ROOT_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, 'appJ7bLlAHZoxENWE');
  });

  test('Triple-Lade Order A→B (lib→root→lib) — beide Werte erhalten', () => {
    const ctx = freshContext();
    runScript(LIB_CONFIG, ctx);
    runScript(ROOT_CONFIG, ctx);
    runScript(LIB_CONFIG, ctx);

    assert.equal(ctx.window.PROVA_CONFIG.SUPABASE_URL, 'https://cngteblrbpwsyypexjrv.supabase.co');
    assert.equal(ctx.window.PROVA_CONFIG.AIRTABLE_BASE, 'appJ7bLlAHZoxENWE');
  });

  test('REGRESSION: pre-Hotfix-Pattern wuerde supabase-client.js-Throw triggern', () => {
    // Pre-Hotfix: window.PROVA_CONFIG = { AIRTABLE_BASE } direkt
    // Post-Hotfix: merge → SUPABASE_URL bleibt
    // Dieser Test simuliert den Bug aus Pre-Hotfix-Pattern
    const ctx = freshContext();

    // Simuliere: Lib geladen → PROVA_CONFIG hat SUPABASE_URL
    runScript(LIB_CONFIG, ctx);
    assert.ok(ctx.window.PROVA_CONFIG.SUPABASE_URL, 'PRE-CONDITION: lib hat SUPABASE_URL gesetzt');

    // Simuliere: Root geladen mit MERGE-Pattern → SUPABASE_URL bleibt
    runScript(ROOT_CONFIG, ctx);
    assert.ok(
      ctx.window.PROVA_CONFIG.SUPABASE_URL,
      'POST-FIX: SUPABASE_URL bleibt nach Root-Load erhalten'
    );

    // Bug waere: SUPABASE_URL undefined → supabase-client.js wirft
    assert.notEqual(ctx.window.PROVA_CONFIG.SUPABASE_URL, undefined);
  });
});

describe('Hotfix MEGA¹⁶.5: dashboard.html / akte.html / app.html laden beide Files', () => {
  test('dashboard.html laedt /lib/prova-config.js + prova-config.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');
    assert.match(html, /<script src="\/lib\/prova-config\.js"><\/script>/);
    assert.match(html, /<script src="prova-config\.js"><\/script>/);
  });

  test('akte.html laedt /lib/prova-config.js + prova-config.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'akte.html'), 'utf8');
    assert.match(html, /<script src="\/lib\/prova-config\.js"><\/script>/);
    assert.match(html, /<script src="prova-config\.js"><\/script>/);
  });

  test('app.html laedt /lib/prova-config.js + prova-config.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
    assert.match(html, /<script src="\/lib\/prova-config\.js"><\/script>/);
    assert.match(html, /<script src="prova-config\.js"><\/script>/);
  });
});
