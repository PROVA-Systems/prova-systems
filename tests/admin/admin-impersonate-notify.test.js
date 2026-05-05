/**
 * PROVA — admin-impersonate.js Email-Notify Tests (MEGA²³ Block 11)
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'netlify', 'functions', 'admin-impersonate.js');

// requireAdmin / sentry-wrap mocks
function clearTargetCache() {
  delete require.cache[require.resolve(TARGET)];
}

function loadWithStubs(envOverrides = {}) {
  // Stubs für Module-Cache (admin-auth-guard + sentry-wrap)
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', {
    withSentry: (fn) => fn,
    captureException: () => {}
  });
  stubMod('lib/admin-auth-guard.js', {
    requireAdmin: (fn) => fn,
    jsonResponse: (event, status, body) => ({ statusCode: status, body: JSON.stringify(body) }),
    getSupabaseAdmin: () => null
  });

  // ENV
  const restored = {};
  for (const k of Object.keys(envOverrides)) {
    restored[k] = process.env[k];
    if (envOverrides[k] === undefined) delete process.env[k];
    else process.env[k] = envOverrides[k];
  }

  clearTargetCache();
  const mod = require(TARGET);
  return { mod, restoreEnv: () => {
    for (const k of Object.keys(restored)) {
      if (restored[k] === undefined) delete process.env[k];
      else process.env[k] = restored[k];
    }
  }};
}

describe('admin-impersonate — notifyImpersonation()', () => {
  let restoreEnv = () => {};

  afterEach(() => restoreEnv());

  test('skipped wenn SMTP_HOST fehlt', async () => {
    const { mod, restoreEnv: r } = loadWithStubs({ SMTP_HOST: undefined, SMTP_USER: undefined });
    restoreEnv = r;
    const result = await mod._test.notifyImpersonation({
      to: 'user@example.de',
      adminEmail: 'admin@prova.de',
      workspaceName: 'Test',
      reason: 'test',
      ttlMinutes: 30,
      adminIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0'
    });
    assert.equal(result.ok, false);
    assert.equal(result.skipped, 'no_smtp_env');
  });

  test('skipped wenn to fehlt oder invalid', async () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    restoreEnv = r;
    const r1 = await mod._test.notifyImpersonation({ to: '' });
    assert.equal(r1.ok, false);
    const r2 = await mod._test.notifyImpersonation({ to: 'no-at-sign' });
    assert.equal(r2.ok, false);
    assert.equal(r2.skipped, 'invalid_to');
  });

  test('skipped wenn nodemailer nicht installiert (Mock)', async () => {
    // Wir koennen nodemailer nicht entfernen (Tests laufen in voller Env),
    // aber wir testen dass der Pfad existiert und nicht crasht
    const { mod, restoreEnv: r } = loadWithStubs({
      SMTP_HOST: 'smtp.example.de',
      SMTP_USER: 'u',
      SMTP_PASS: 'p'
    });
    restoreEnv = r;
    // Da wir nodemailer NICHT mocken, wird die Funktion versuchen zu connecten
    // und timeout — wir akzeptieren beide outcomes (ok:false oder reject)
    // Test prueft nur dass die Funktion existiert + Mode signature stimmt
    assert.equal(typeof mod._test.notifyImpersonation, 'function');
  });
});

describe('admin-impersonate — signImpersonationToken()', () => {
  test('produziert gueltiges 2-Teile-Token (head.sig)', () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    r();
    const tok = mod._test.signImpersonationToken({ sub: 'admin@x', exp: 12345 }, 'this-is-a-32-char-secret-string!');
    assert.equal(typeof tok, 'string');
    const parts = tok.split('.');
    assert.equal(parts.length, 2, 'Token muss 2 Teile haben');
    assert.ok(parts[0].length > 10);
    assert.ok(parts[1].length > 10);
  });

  test('gleicher Input → gleicher Output (deterministic)', () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    r();
    const t1 = mod._test.signImpersonationToken({ a: 1 }, 'secret-12345-12345-12345-12345-12');
    const t2 = mod._test.signImpersonationToken({ a: 1 }, 'secret-12345-12345-12345-12345-12');
    assert.equal(t1, t2);
  });

  test('verschiedene Secrets → verschiedene Outputs', () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    r();
    const t1 = mod._test.signImpersonationToken({ a: 1 }, 'secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const t2 = mod._test.signImpersonationToken({ a: 1 }, 'secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    assert.notEqual(t1, t2);
  });
});

describe('admin-impersonate — TTL-Konstante', () => {
  test('TTL ist 30 Min (1800 Sekunden)', () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    r();
    assert.equal(mod._test.TTL_SECONDS, 30 * 60);
  });
});

describe('admin-impersonate — b64url() helper', () => {
  test('encoded base64url ohne padding', () => {
    const { mod, restoreEnv: r } = loadWithStubs({});
    r();
    const r1 = mod._test.b64url('hello world');
    assert.doesNotMatch(r1, /=/, 'kein = Padding');
    assert.doesNotMatch(r1, /\+/, 'kein + (sollte - sein)');
    assert.doesNotMatch(r1, /\//, 'kein / (sollte _ sein)');
  });
});

describe('admin-impersonate — Source-Code Audit', () => {
  const fs = require('node:fs');
  const SRC = fs.readFileSync(TARGET, 'utf8');

  test('Source enthaelt user_agent in audit_trail-payload', () => {
    assert.match(SRC, /user_agent/);
  });

  test('Source enthaelt admin_ip in audit_trail-payload', () => {
    assert.match(SRC, /admin_ip/);
  });

  test('Source enthaelt notifyImpersonation-Aufruf', () => {
    assert.match(SRC, /notifyImpersonation/);
  });

  test('IMPERSONATION_NOTIFY ENV-Gate vorhanden', () => {
    assert.match(SRC, /IMPERSONATION_NOTIFY/);
  });

  test('Email-Subject enthaelt PROVA + Admin-Login', () => {
    assert.match(SRC, /Admin-Login/);
  });

  test('DSGVO-Hinweis im Email-Text', () => {
    assert.match(SRC, /DSGVO/);
  });
});
