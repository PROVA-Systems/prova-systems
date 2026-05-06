/**
 * Tests für bescheinigungen.html (MEGA²⁸ V3.2-W3-I3 KORR-9)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', '..', 'bescheinigungen.html'),
  'utf8'
);

test('bescheinigungen.html: hat Auth-Guard für Token + Email', () => {
  assert.match(html, /prova_auth_token/);
  assert.match(html, /prova_sv_email/);
});

test('bescheinigungen.html: lädt runAuthGuard via module', () => {
  assert.match(html, /import\s+\{\s*runAuthGuard\s*\}\s+from\s+['"]\/lib\/auth-guard\.js['"]/);
});

test('bescheinigungen.html: definiert 11 Bescheinigungen', () => {
  const matches = html.match(/code:\s*'K-\d+/g) || [];
  assert.strictEqual(matches.length, 11, 'Erwartet 11 K-* Codes');
});

test('bescheinigungen.html: zeigt K-2.0-Recherche-Hinweis (NJW + UBA + SV-VO)', () => {
  assert.match(html, /BGH NJW 2014, 1452/);
  assert.match(html, /UBA-Leitfaden 2017/);
  assert.match(html, /SV-VO NRW/);
});

test('bescheinigungen.html: K-08 Befangenheits-Anzeige verweist auf §406 ZPO', () => {
  assert.match(html, /§406 ZPO/);
});

test('bescheinigungen.html: Mahnung-Vorlagen K-06A/B/C verweisen auf §286 BGB', () => {
  // 3 Mahnstufen + alle nach §286 BGB
  const mahnstufen = html.match(/code:\s*'K-06[ABC]'/g) || [];
  assert.strictEqual(mahnstufen.length, 3);
  assert.match(html, /§286 BGB/);
});

test('bescheinigungen.html: Click-Through zu briefvorlagen.html mit Vorlage-Param', () => {
  assert.match(html, /briefvorlagen\.html\?vorlage=/);
});

test('bescheinigungen.html: Suche-Input + filterCards()-Wiring', () => {
  assert.match(html, /id="bs-q"/);
  assert.match(html, /oninput="filterCards\(\)"/);
});

test('bescheinigungen.html: Empty-State + Reset-Button', () => {
  assert.match(html, /id="bs-empty"/);
  assert.match(html, /Suche zurücksetzen/);
});

test('bescheinigungen.html: lädt global-search.js (Cmd+K)', () => {
  assert.match(html, /<script\s+src="global-search\.js"/);
});

test('bescheinigungen.html: title + lang Attribut', () => {
  assert.match(html, /<title>[^<]*Bescheinigungen/);
  assert.match(html, /<html\s+lang="de"/);
});

test('bescheinigungen.html: escHtml verhindert XSS', () => {
  assert.match(html, /function escHtml/);
  assert.match(html, /replace\(\/&\/g/);
});

test('bescheinigungen.html: K-2.0-aligned (alle 11 Codes K-01..K-09 + 06A/B/C)', () => {
  const expected = ['K-01', 'K-02', 'K-03', 'K-04', 'K-05', 'K-06A', 'K-06B', 'K-06C', 'K-07', 'K-08', 'K-09'];
  expected.forEach(code => {
    assert.ok(html.includes("'" + code + "'"), 'Erwartet Code: ' + code);
  });
});
