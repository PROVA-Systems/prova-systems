/**
 * PROVA — send-welcome-email Tests (MEGA²⁶ Phase 6)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'netlify', 'functions', 'send-welcome-email.js');

function loadWithStubs() {
  delete require.cache[require.resolve(TARGET)];
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
  stubMod('lib/cors-helper.js', {
    getCorsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' }),
    corsOptionsResponse: () => ({ statusCode: 200 })
  });
  return require(TARGET);
}

describe('send-welcome-email — buildWelcomeEmail', () => {
  test('Founding-Member-Subject mit 🎯-Emoji', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: 'Max', founding_member: true });
    assert.match(r.subject, /🎯/);
    assert.match(r.subject, /Founding-Member/);
  });

  test('Standard-Subject ohne Emoji bei non-Founding', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: 'Max' });
    assert.doesNotMatch(r.subject, /🎯/);
    assert.match(r.subject, /Willkommen bei PROVA/);
  });

  test('Founding-Text erwähnt 125€/Monat lifetime', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: 'Max', founding_member: true });
    assert.match(r.text, /125\s*€/);
    assert.match(r.text, /lifetime/);
  });

  test('Standard-Text erwähnt 90 Tage Trial + 179€', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: 'Max' });
    assert.match(r.text, /90 Tage/);
    assert.match(r.text, /179\s*€/);
  });

  test('§407a-Hinweis im Body', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({});
    assert.match(r.text, /§407a/);
    assert.match(r.text, /eigenverantwortlich/);
  });

  test('Default firstname "Sachverständiger" bei missing', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({});
    assert.match(r.text, /Sachverst[aä]ndiger/);
  });

  test('HTML enthaelt escaped Subject', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: '<script>x</script>', founding_member: false });
    assert.doesNotMatch(r.html, /<script>x<\/script>/);
  });

  test('4 Onboarding-Steps sichtbar (Welcome-Wizard, Akte, Diktat, Fachurteil)', () => {
    const mod = loadWithStubs();
    const r = mod._test.buildWelcomeEmail({ firstname: 'Max' });
    assert.match(r.text, /1\. Welcome-Wizard/);
    assert.match(r.text, /2\. Erste echte Akte/);
    assert.match(r.text, /3\. Diktat/);
    assert.match(r.text, /4\. §6 Fachurteil/);
  });
});

describe('send-welcome-email — escapeHtml', () => {
  test('escaped < > & " \'', () => {
    const mod = loadWithStubs();
    assert.equal(mod._test.escapeHtml('<a href="x&y">'),
      '&lt;a href=&quot;x&amp;y&quot;&gt;');
  });

  test('null und undefined → empty', () => {
    const mod = loadWithStubs();
    assert.equal(mod._test.escapeHtml(null), '');
    assert.equal(mod._test.escapeHtml(undefined), '');
  });
});

describe('send-welcome-email — sendEmail (mock-environment)', () => {
  test('skipped wenn SMTP_HOST fehlt', async () => {
    const original = { h: process.env.SMTP_HOST, u: process.env.SMTP_USER, p: process.env.SMTP_PASS };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const mod = loadWithStubs();
    const r = await mod._test.sendEmail('test@x.de', { subject: 's', text: 't', html: '<p>h</p>' });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, 'no_smtp_env');
    if (original.h !== undefined) process.env.SMTP_HOST = original.h;
    if (original.u !== undefined) process.env.SMTP_USER = original.u;
    if (original.p !== undefined) process.env.SMTP_PASS = original.p;
  });
});

describe('send-welcome-email — Source-Code-Audit', () => {
  const fs = require('node:fs');
  const SRC = fs.readFileSync(TARGET, 'utf8');

  test('Internal-Secret-Auth aktiv', () => {
    assert.match(SRC, /PROVA_INTERNAL_WRITE_SECRET/);
    assert.match(SRC, /Internal-Secret/);
  });

  test('Email-Validation Pattern vorhanden', () => {
    assert.match(SRC, /\^\[\^@\\s\]\+@/);
  });

  test('withSentry-Wrapper aktiv', () => {
    assert.match(SRC, /withSentry/);
  });

  test('Test-Exports definiert', () => {
    assert.match(SRC, /exports\._test/);
  });
});
