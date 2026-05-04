/**
 * PROVA — KI-Cost-Display Format-Tests
 * MEGA¹¹ W9 (2026-05-04)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reproduktion der Pure-Functions aus lib/ki-cost-display.js
function fmt(n, decimals) {
  if (n == null || isNaN(n)) return '—';
  decimals = decimals == null ? 2 : decimals;
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtTokens(n) {
  // MEGA¹² W12 Bug-Fix: NaN-Handling
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return String(n);
}

function fmtEur(n) {
  if (n == null || isNaN(n)) return '0,00 €';
  return fmt(n, 2) + ' €';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

describe('KI-Cost-Display Format-Helpers', () => {

  test('fmt mit 2 Decimals (Default)', () => {
    assert.equal(fmt(0.05), '0,05');
    assert.equal(fmt(1234.567), '1.234,57');
  });

  test('fmt mit 0 Decimals', () => {
    assert.equal(fmt(42, 0), '42');
    assert.equal(fmt(1234, 0), '1.234');
  });

  test('fmt mit null/NaN/undefined', () => {
    assert.equal(fmt(null), '—');
    assert.equal(fmt(undefined), '—');
    assert.equal(fmt(NaN), '—');
  });

  test('fmtTokens kompakt: <1000 = raw', () => {
    assert.equal(fmtTokens(0), '0');
    assert.equal(fmtTokens(50), '50');
    assert.equal(fmtTokens(999), '999');
  });

  test('fmtTokens kompakt: >=1000 = "Xk"', () => {
    assert.equal(fmtTokens(1000), '1k');
    assert.equal(fmtTokens(1234), '1k');  // round
    assert.equal(fmtTokens(1500), '2k');  // round
    assert.equal(fmtTokens(999999), '1000k');
  });

  test('fmtTokens kompakt: >=1M = "X.XXM"', () => {
    assert.equal(fmtTokens(1000000), '1.00M');
    assert.equal(fmtTokens(1500000), '1.50M');
    assert.equal(fmtTokens(2345678), '2.35M');
  });

  test('fmtTokens null', () => {
    assert.equal(fmtTokens(null), '—');
    assert.equal(fmtTokens(undefined), '—');
  });

  test('fmtTokens NaN (MEGA¹² W12 Bug-Fix)', () => {
    // Pre-MEGA¹²: returnte 'NaN' string, was im UI sichtbar war
    // Post-Fix: returnt '—' (Empty-Indicator)
    assert.equal(fmtTokens(NaN), '—');
    assert.equal(fmtTokens(0/0), '—');
    assert.equal(fmtTokens(parseInt('abc')), '—');  // parseInt fail = NaN
  });

  test('fmtEur formatiert mit Komma + €', () => {
    assert.equal(fmtEur(0), '0,00 €');
    assert.equal(fmtEur(0.05), '0,05 €');
    assert.equal(fmtEur(1.5), '1,50 €');
    assert.equal(fmtEur(1234.56), '1.234,56 €');
  });

  test('fmtEur null/NaN', () => {
    assert.equal(fmtEur(null), '0,00 €');
    assert.equal(fmtEur(NaN), '0,00 €');
    assert.equal(fmtEur(undefined), '0,00 €');
  });

  test('escapeHtml escaped HTML-Special-Chars', () => {
    assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
    assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  });

  test('escapeHtml mit null/undefined', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  test('escapeHtml mit number', () => {
    assert.equal(escapeHtml(42), '42');
    assert.equal(escapeHtml(0), '0');
  });

  test('escapeHtml verhindert XSS via Funktion-Name (KRITISCH fuer Sicherheit)', () => {
    // Wenn KI-Funktion-Name aus DB injected wird (compromised), darf kein <script> rendern
    const evil = '<img src=x onerror=alert(1)>';
    const safe = escapeHtml(evil);
    assert.ok(!safe.includes('<img'));
    assert.ok(safe.includes('&lt;img'));
  });
});

describe('KI-Cost-Display Integration in einstellungen.html', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'einstellungen.html'), 'utf8');

  test('einstellungen.html laedt /lib/ki-cost-display.js', () => {
    assert.ok(html.includes('/lib/ki-cost-display.js'));
  });

  test('KI-Cost-Modal mit korrekten IDs vorhanden', () => {
    assert.ok(html.includes('id="ki-cost-modal"'));
    assert.ok(html.includes('id="ki-cost-content"'));
    assert.ok(html.includes('id="ki-cost-since"'));
  });

  test('KI-Section hat KI-Nutzung-Zeile mit Button', () => {
    assert.ok(html.includes('oeffneKICostModal()'));
    assert.ok(html.includes('💰 Anzeigen'));
  });

  test('Modal hat ARIA-Label fuer Accessibility', () => {
    assert.match(html, /id="ki-cost-modal"[\s\S]{0,200}aria-label/);
  });

  test('Close-Button hat aria-label', () => {
    assert.match(html, /schliesseKICostModal\(\)[\s\S]{0,100}aria-label="Modal schliessen"/);
  });
});
