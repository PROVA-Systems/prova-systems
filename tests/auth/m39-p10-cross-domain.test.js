'use strict';

/**
 * MEGA³⁹ P10 F1 — Cross-Subdomain-Storage-Adapter Tests
 *
 * Verifiziert dass lib/supabase-client.js den Cross-Domain-Cookie-Adapter
 * korrekt einsetzt (Cookie-First + localStorage-Fallback).
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'lib', 'supabase-client.js'), 'utf8');

test('F1: COOKIE_DOMAIN ist .prova-systems.de bei Production-Hostnames', () => {
  assert.match(src, /COOKIE_DOMAIN = \(typeof location/);
  assert.match(src, /\(\^\|\\\.\)prova-systems\\\.de\$/);
  assert.match(src, /'\.prova-systems\.de'/);
});

test('F1: COOKIE_DOMAIN ist null auf localhost/preview (kein Cookie-Set)', () => {
  assert.match(src, /:\s*null;\s*\/\/[^\n]*localhost/);
});

test('F1: crossDomainStorage hat 3 Methoden (getItem, setItem, removeItem)', () => {
  assert.match(src, /const crossDomainStorage\s*=\s*\{/);
  assert.match(src, /getItem\(key\)/);
  assert.match(src, /setItem\(key,\s*value\)/);
  assert.match(src, /removeItem\(key\)/);
});

test('F1: getItem versucht Cookie-First, dann localStorage', () => {
  // Cookie-Lookup vor localStorage-Lookup
  const fnMatch = src.match(/getItem\(key\)\s*\{[\s\S]*?\}\s*,/);
  assert.ok(fnMatch);
  const idxCookie = fnMatch[0].indexOf('document.cookie');
  const idxLS = fnMatch[0].indexOf('localStorage.getItem');
  assert.ok(idxCookie > -1 && idxLS > -1);
  assert.ok(idxCookie < idxLS, 'Cookie-Lookup muss vor localStorage stehen');
});

test('F1: setItem setzt sowohl localStorage als auch Cookie', () => {
  const fnMatch = src.match(/setItem\(key,\s*value\)\s*\{[\s\S]*?\}\s*,/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /localStorage\.setItem/);
  assert.match(fnMatch[0], /document\.cookie\s*=/);
});

test('F1: Cookie-Attribute Domain + path + SameSite + Secure', () => {
  assert.match(src, /'domain='\s*\+\s*COOKIE_DOMAIN/);
  assert.match(src, /'path=\/'/);
  assert.match(src, /'SameSite=Lax'/);
  assert.match(src, /'Secure'/);
});

test('F1: 30-Tage-Lifetime', () => {
  // Date.now() + 1000 * 60 * 60 * 24 * 30
  assert.match(src, /1000 \* 60 \* 60 \* 24 \* 30/);
});

test('F1: removeItem entfernt aus beiden Storage-Layern', () => {
  const fnMatch = src.match(/removeItem\(key\)\s*\{[\s\S]*?\n\s*\}\s*\n\s*\};/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /localStorage\.removeItem/);
  assert.match(fnMatch[0], /Thu, 01 Jan 1970/);  // Expire-in-Past
});

test('F1: createClient nutzt crossDomainStorage als auth.storage', () => {
  assert.match(src, /storage:\s*crossDomainStorage/);
});

test('F1: __crossDomainStorage + __COOKIE_DOMAIN als Test-Exports', () => {
  assert.match(src, /export const __crossDomainStorage/);
  assert.match(src, /export const __COOKIE_DOMAIN/);
});
