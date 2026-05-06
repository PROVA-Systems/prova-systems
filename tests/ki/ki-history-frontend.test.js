/**
 * PROVA — KI-History-Frontend Tests
 * MEGA¹³ W18 (2026-05-05)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

// Reproduktion Pure-Functions
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _fmtTokens(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return Math.round(n/1000) + 'k';
  return String(n);
}
function _fmtEur(n) {
  if (n == null || isNaN(n)) return '0,00€';
  return Number(n).toFixed(2).replace('.',',') + '€';
}
function _fmtRelativeTime(iso, now) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diff = (now || Date.now()) - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'gerade eben';
    if (sec < 3600) return Math.floor(sec/60) + 'min';
    if (sec < 86400) return Math.floor(sec/3600) + 'h';
    if (sec < 7*86400) return Math.floor(sec/86400) + 'd';
    return d.toLocaleDateString('de-DE');
  } catch (_) { return '—'; }
}

describe('KI-History Format-Helpers', () => {

  test('_esc verhindert XSS', () => {
    assert.equal(_esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(_esc('a"b'), 'a&quot;b');
  });

  test('_esc null/undefined → empty', () => {
    assert.equal(_esc(null), '');
    assert.equal(_esc(undefined), '');
  });

  test('_fmtTokens NaN-Handling (W12 Bug-Fix Pattern)', () => {
    assert.equal(_fmtTokens(NaN), '—');
    assert.equal(_fmtTokens(null), '—');
    assert.equal(_fmtTokens(undefined), '—');
  });

  test('_fmtTokens Compact-Format', () => {
    assert.equal(_fmtTokens(0), '0');
    assert.equal(_fmtTokens(999), '999');
    assert.equal(_fmtTokens(1000), '1k');
    assert.equal(_fmtTokens(1500), '2k');  // round
  });

  test('_fmtEur formatiert mit Komma + €', () => {
    assert.equal(_fmtEur(0), '0,00€');
    assert.equal(_fmtEur(0.05), '0,05€');
    assert.equal(_fmtEur(1.234), '1,23€');
    assert.equal(_fmtEur(NaN), '0,00€');
    assert.equal(_fmtEur(null), '0,00€');
  });

  test('_fmtRelativeTime: gerade eben < 1min', () => {
    const now = Date.now();
    const iso = new Date(now - 30 * 1000).toISOString();
    assert.equal(_fmtRelativeTime(iso, now), 'gerade eben');
  });

  test('_fmtRelativeTime: Minuten', () => {
    const now = Date.now();
    const iso = new Date(now - 5 * 60 * 1000).toISOString();
    assert.equal(_fmtRelativeTime(iso, now), '5min');
  });

  test('_fmtRelativeTime: Stunden', () => {
    const now = Date.now();
    const iso = new Date(now - 3 * 3600 * 1000).toISOString();
    assert.equal(_fmtRelativeTime(iso, now), '3h');
  });

  test('_fmtRelativeTime: Tage', () => {
    const now = Date.now();
    const iso = new Date(now - 2 * 86400 * 1000).toISOString();
    assert.equal(_fmtRelativeTime(iso, now), '2d');
  });

  test('_fmtRelativeTime: > 7d → absolutes Datum', () => {
    const now = Date.now();
    const iso = new Date(now - 30 * 86400 * 1000).toISOString();
    const result = _fmtRelativeTime(iso, now);
    assert.match(result, /\d/);  // contains digit (date format)
    assert.notEqual(result, '—');
  });

  test('_fmtRelativeTime: invalid input → —', () => {
    assert.equal(_fmtRelativeTime(null), '—');
    assert.equal(_fmtRelativeTime(undefined), '—');
    assert.equal(_fmtRelativeTime(''), '—');
  });
});

describe('KI-History Library — File + Public-API', () => {
  const src = read('lib/ki-history-frontend.js');

  test('window.ProvaKIHistory exposed', () => {
    assert.match(src, /window\.ProvaKIHistory\s*=/);
  });

  test('Public API: openForAuftrag + openGlobal + close', () => {
    assert.ok(src.includes('openForAuftrag: openForAuftrag'));
    assert.ok(src.includes('openGlobal: openGlobal'));
    assert.ok(src.includes('close: close'));
  });

  test('ARIA: role=dialog + aria-modal + aria-labelledby', () => {
    assert.match(src, /setAttribute\(['"]role['"], ['"]dialog['"]\)/);
    assert.match(src, /setAttribute\(['"]aria-modal['"]/);
    assert.match(src, /setAttribute\(['"]aria-labelledby['"]/);
  });

  test('ESC-Key + Backdrop-Click schliessen', () => {
    assert.match(src, /e\.key === 'Escape'/);
    assert.match(src, /e\.target === modal/);
  });

  test('Focus-Restore beim close', () => {
    assert.match(src, /_previousFocus\.focus\(\)/);
  });

  test('Backend-Endpoint /netlify/functions/ki-history', () => {
    assert.match(src, /\/\.netlify\/functions\/ki-history/);
  });

  test('Filter-Dropdown nach Funktion', () => {
    assert.match(src, /Alle Funktionen/);
    assert.match(src, /uniqueFns/);
  });

  test('Provider-Badge bei Anthropic-Fallback (W12-Integration)', () => {
    assert.match(src, /metadata\._provider === 'anthropic'/);
    assert.match(src, /Backup-KI/);
  });
});

describe('KI-Autosuggest Library — File + Public-API', () => {
  const src = read('lib/ki-autosuggest.js');

  test('window.ProvaAutosuggest exposed', () => {
    assert.match(src, /window\.ProvaAutosuggest\s*=/);
  });

  test('Public API: attach, detach, setEnabled, isEnabled', () => {
    assert.ok(src.includes('attach: attach'));
    assert.ok(src.includes('detach: detach'));
    assert.ok(src.includes('setEnabled: setEnabled'));
    assert.ok(src.includes('isEnabled: isEnabled'));
  });

  test('Tab-Key akzeptiert Vorschlag', () => {
    assert.match(src, /e\.key === 'Tab'/);
    assert.match(src, /e\.preventDefault\(\)/);
  });

  test('Esc-Key verwirft Vorschlag', () => {
    assert.match(src, /e\.key === 'Escape'/);
  });

  test('Debounce-Default 800ms', () => {
    assert.match(src, /debounceMs:\s*800/);
  });

  test('Min-Chars-Default 20', () => {
    assert.match(src, /minChars:\s*20/);
  });

  test('User-Preference via localStorage-Flag', () => {
    assert.match(src, /userPreferenceKey:\s*'ki_autosuggest_enabled'/);
    assert.match(src, /localStorage\.getItem\(prefKey\)/);
  });

  test('AbortController bei pending fetch (Cancel-Defense)', () => {
    assert.match(src, /AbortController/);
    assert.match(src, /abortController\.abort\(\)/);
  });

  test('WeakMap fuer State (Memory-Leak-Defense)', () => {
    assert.match(src, /new WeakMap\(\)/);
  });

  test('Native input-Event-Dispatch nach Tab-Accept', () => {
    assert.match(src, /dispatchEvent\(new Event\('input'/);
  });
});

describe('akte.html — KI-History + KI-Autosuggest Integration', () => {
  const html = read('akte.html');

  test('ki-history-frontend.js geladen', () => {
    assert.match(html, /\/lib\/ki-history-frontend\.js/);
  });

  test('ki-autosuggest.js geladen', () => {
    assert.match(html, /\/lib\/ki-autosuggest\.js/);
  });
});
