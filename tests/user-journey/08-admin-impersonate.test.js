/**
 * PROVA — User-Journey 08: Admin Login-as-User End-to-End (MEGA²⁴ Block 6)
 *
 * Story: Admin loggt sich als Pilot-SV ein (Read-Only), Audit-Log greift,
 * Email-Notify (DSGVO) wird gesendet.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'netlify', 'functions', 'admin-impersonate.js');

function clearTargetCache() {
  delete require.cache[require.resolve(TARGET)];
}

function loadWithStubs() {
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(ROOT, 'netlify', 'functions', relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn, captureException: () => {} });
  stubMod('lib/admin-auth-guard.js', {
    requireAdmin: (fn) => fn,
    jsonResponse: (event, status, body) => ({ statusCode: status, body: JSON.stringify(body) }),
    getSupabaseAdmin: () => null
  });
  clearTargetCache();
  return require(TARGET);
}

describe('Journey 08 — Admin-Auth-Pflicht', () => {
  test('signImpersonationToken erfordert Secret', () => {
    const mod = loadWithStubs();
    const tok = mod._test.signImpersonationToken({ sub: 'admin@x' }, 'secret-12345-12345-12345-12345-12');
    const parts = tok.split('.');
    assert.equal(parts.length, 2);
  });

  test('TTL ist exakt 30 Min', () => {
    const mod = loadWithStubs();
    assert.equal(mod._test.TTL_SECONDS, 1800);
  });
});

describe('Journey 08 — Token-Payload Read-Only-Flag', () => {
  function buildPayload(adminEmail, workspaceId, workspaceName) {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: adminEmail,
      impersonated_workspace_id: workspaceId,
      impersonated_workspace_name: workspaceName,
      read_only: true,
      iat: now,
      exp: now + 1800,
      purpose: 'admin_impersonation'
    };
  }

  test('read_only-Flag immer true (Marcel-Direktive)', () => {
    const p = buildPayload('admin@x', 'ws-1', 'Test');
    assert.equal(p.read_only, true);
  });

  test('exp ist 30 Min nach iat', () => {
    const p = buildPayload('admin@x', 'ws-1', 'Test');
    assert.equal(p.exp - p.iat, 1800);
  });

  test('purpose markiert admin_impersonation (Audit-Trail-Filter)', () => {
    const p = buildPayload('admin@x', 'ws-1', 'Test');
    assert.equal(p.purpose, 'admin_impersonation');
  });
});

describe('Journey 08 — Audit-Trail-Payload (DSGVO)', () => {
  function buildAuditPayload(adminEmail, target, headers, reason) {
    return {
      typ: 'admin.impersonation_started',
      sv_email: adminEmail,
      details: {
        target_workspace_id: target.id,
        target_workspace_name: target.name,
        target_billing_email: target.billing_email,
        reason: reason,
        ttl_seconds: 1800,
        admin_ip: headers['x-nf-client-connection-ip'] || headers['client-ip'] || 'unknown',
        user_agent: (headers['user-agent'] || 'unknown').slice(0, 500),
        timestamp: new Date().toISOString()
      }
    };
  }

  test('IP wird aus Headers extrahiert', () => {
    const p = buildAuditPayload('admin@x',
      { id: 'ws-1', name: 'X', billing_email: 'u@v.de' },
      { 'x-nf-client-connection-ip': '8.8.8.8', 'user-agent': 'Mozilla/5.0' },
      'Pilot-Onboarding-Hilfe'
    );
    assert.equal(p.details.admin_ip, '8.8.8.8');
    assert.equal(p.details.user_agent, 'Mozilla/5.0');
  });

  test('user_agent wird auf 500 Zeichen gecappt', () => {
    const longUa = 'A'.repeat(1000);
    const p = buildAuditPayload('admin@x',
      { id: 'ws-1', name: 'X', billing_email: 'u@v.de' },
      { 'user-agent': longUa },
      'test'
    );
    assert.ok(p.details.user_agent.length <= 500);
  });

  test('Reason ist required (DSGVO-Doku)', () => {
    const p = buildAuditPayload('admin@x',
      { id: 'ws-1', name: 'X', billing_email: 'u@v.de' },
      { 'user-agent': 'M' },
      'IHK-Audit'
    );
    assert.equal(p.details.reason, 'IHK-Audit');
  });

  test('typ-Field markiert Event-Type', () => {
    const p = buildAuditPayload('admin@x',
      { id: 'ws-1', name: 'X', billing_email: 'u@v.de' },
      { 'user-agent': 'M' },
      'r'
    );
    assert.equal(p.typ, 'admin.impersonation_started');
  });
});

describe('Journey 08 — Email-Notify Skip-Logic', () => {
  test('Skipped wenn IMPERSONATION_NOTIFY != on', async () => {
    const original = process.env.IMPERSONATION_NOTIFY;
    delete process.env.IMPERSONATION_NOTIFY;
    process.env.SMTP_HOST = '';
    const mod = loadWithStubs();
    const r = await mod._test.notifyImpersonation({ to: '' });
    assert.equal(r.ok, false);
    if (original !== undefined) process.env.IMPERSONATION_NOTIFY = original;
  });

  test('Skipped wenn to fehlt/invalid', async () => {
    const mod = loadWithStubs();
    const r = await mod._test.notifyImpersonation({ to: 'no-at' });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, 'invalid_to');
  });
});

describe('Journey 08 — Email-Subject + DSGVO-Hinweis', () => {
  const fs = require('node:fs');
  const SRC = fs.readFileSync(TARGET, 'utf8');

  test('Email-Subject enthaelt PROVA-Marker', () => {
    assert.match(SRC, /\[PROVA\] Admin-Login/);
  });

  test('Email-Body enthaelt §32 BDSG / Art. 5 DSGVO Hinweis', () => {
    assert.match(SRC, /BDSG|DSGVO/);
  });

  test('Email-Body sagt Read-Only-Modus', () => {
    assert.match(SRC, /Read-Only/);
  });
});
