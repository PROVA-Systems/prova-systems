/**
 * PROVA — Page-Wiring Security-Audit Tests (MEGA²⁵ Phase 2)
 *
 * Static-analysis tests:
 * - Pages mit KI-Calls laden prova-disclaimer.js
 * - Sw.js APP_SHELL hat alle MEGA²³+²⁴ Libs
 * - Lambdas mit state-changing-operations haben Auth-Pattern
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

describe('Security-Audit — Disclaimer-Wiring (Pflicht-Pages)', () => {
  const PAGES = [
    'gericht-auftrag.html',
    'stellungnahme.html',
    'ortstermin-modus.html',
    'akte.html',
    'app.html',
    'freigabe.html',
    'gutachterliche-stellungnahme.html',
    'wertgutachten.html'
  ];

  PAGES.forEach(page => {
    test(page + ' laedt prova-disclaimer.js', () => {
      const html = read(page);
      assert.match(html, /prova-disclaimer\.js/);
    });
  });
});

describe('Security-Audit — sw.js APP_SHELL Coverage', () => {
  test('sw.js cached lib/beweisbeschluss-upload.js (Block 1)', () => {
    assert.match(read('sw.js'), /\/lib\/beweisbeschluss-upload\.js/);
  });

  test('sw.js cached lib/prova-disclaimer.js (Block 2)', () => {
    assert.match(read('sw.js'), /\/lib\/prova-disclaimer\.js/);
  });

  test('sw.js cached lib/admin-ki-stats-frontend.js (Block 4)', () => {
    assert.match(read('sw.js'), /\/lib\/admin-ki-stats-frontend\.js/);
  });

  test('sw.js Version >= v285', () => {
    const m = read('sw.js').match(/CACHE_VERSION\s*=\s*['"]prova-v(\d+)['"]/);
    assert.ok(m, 'CACHE_VERSION nicht gefunden');
    const ver = parseInt(m[1], 10);
    assert.ok(ver >= 285, 'sw.js Version sollte >= 285 sein, gefunden: ' + ver);
  });
});

describe('Security-Audit — Lambda-Auth-Patterns', () => {
  // Lambdas mit state-changing-operations brauchen Auth-Pattern
  // (auth-token-issue.js ist ausgeschlossen — IS die Auth-Funktion selbst)
  const STATE_CHANGING = [
    'admin-impersonate.js',
    'admin-send-email.js',
    'admin-cache-clear.js',
    'workflow-settings.js',
    'parse-beweisbeschluss.js',
    'log-legal-acceptance.js'
  ];

  const AUTH_PATTERNS = [
    /requireAuth/,
    /requireAdmin/,
    /resolveUser/,
    /PROVA_INTERNAL_WRITE_SECRET/,
    /verifyToken/,
    /jwtMiddleware/
  ];

  STATE_CHANGING.forEach(file => {
    test(file + ' nutzt Auth-Pattern', () => {
      const src = read('netlify/functions/' + file);
      const hasAuth = AUTH_PATTERNS.some(re => re.test(src));
      assert.ok(hasAuth, file + ' fehlt Auth-Pattern');
    });
  });
});

describe('Security-Audit — Pseudo-Send vor KI-Calls', () => {
  test('ki-proxy.js nutzt Pseudonymisierung', () => {
    const src = read('netlify/functions/ki-proxy.js');
    assert.ok(/pseudonymize|prova-pseudo|PROVA_PSEUDO/.test(src),
      'ki-proxy muss Pseudo-Logic haben (Server-Side Pflicht laut CLAUDE.md Regel 17)');
  });

  test('parse-beweisbeschluss.js hat KEINE PII-Logging-Patterns', () => {
    const src = read('netlify/functions/parse-beweisbeschluss.js');
    // Audit-Trail-Payload sollte keine vollen Klartextnamen loggen
    assert.doesNotMatch(src, /console\.log\([^)]*klaeger\b/i);
    assert.doesNotMatch(src, /console\.log\([^)]*beklagter\b/i);
  });
});

describe('Security-Audit — Disclaimer in KI-Output-Pages', () => {
  test('gericht-auftrag.html hat inline §407a-Disclaimer', () => {
    const html = read('gericht-auftrag.html');
    assert.match(html, /§407a/);
    assert.match(html, /class="prova-ki-disclaimer"/);
  });

  test('ortstermin-modus.html hat Disclaimer bei Foto-KI + Diktat', () => {
    const html = read('ortstermin-modus.html');
    const occurrences = (html.match(/§407a/g) || []).length;
    assert.ok(occurrences >= 2, 'Mindestens 2 §407a-Hinweise (Foto-KI + Diktat), gefunden: ' + occurrences);
  });

  test('stellungnahme.html hat Disclaimer im KI-Assist-Panel', () => {
    const html = read('stellungnahme.html');
    assert.match(html, /class="prova-ki-disclaimer"/);
  });
});

describe('Security-Audit — Konstanten + Pflicht-Werte', () => {
  test('beweisbeschluss-upload.js MAX_FILE_SIZE ist 10 MB', () => {
    const Lib = require(path.join(ROOT, 'lib', 'beweisbeschluss-upload.js'));
    assert.equal(Lib._const.MAX_FILE_SIZE, 10 * 1024 * 1024);
  });

  test('admin-impersonate.js TTL ist 30 Min', () => {
    delete require.cache[require.resolve(path.join(ROOT, 'netlify', 'functions', 'admin-impersonate.js'))];
    // Stub modules
    const stubMod = (relPath, exportsObj) => {
      const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
      require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
    };
    stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
    stubMod('lib/admin-auth-guard.js', {
      requireAdmin: (fn) => fn,
      jsonResponse: () => ({}),
      getSupabaseAdmin: () => null
    });
    const mod = require(path.join(ROOT, 'netlify', 'functions', 'admin-impersonate.js'));
    assert.equal(mod._test.TTL_SECONDS, 1800);
  });
});

describe('Security-Audit — Migration-Files vorhanden', () => {
  test('Migration 11 (Beweisbeschluss) existiert', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'supabase-migrations', '11_auftraege_beweisbeschluss.sql')));
  });

  test('Migration 11 enthaelt 4 beweisbeschluss-Spalten', () => {
    const sql = read('supabase-migrations/11_auftraege_beweisbeschluss.sql');
    assert.match(sql, /beweisbeschluss_pdf_storage_path/);
    assert.match(sql, /beweisbeschluss_pdf_extrakt\b/);
    assert.match(sql, /beweisbeschluss_pdf_extrakt_version/);
    assert.match(sql, /beweisbeschluss_pdf_uploaded_at/);
  });
});
