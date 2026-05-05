/**
 * PROVA — MEGA²⁷.6 Tests:
 *   Block 1: HTML-Email in create-referral.js
 *   Block 2: welcome-referred-Block in send-welcome-email.js
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FN = path.join(ROOT, 'netlify', 'functions');

function read(p) { return fs.readFileSync(p, 'utf8'); }

function loadWithStubs(target) {
  delete require.cache[require.resolve(target)];
  const stubMod = (relPath, exportsObj) => {
    const fullPath = require.resolve(path.join(FN, relPath));
    require.cache[fullPath] = { id: fullPath, filename: fullPath, loaded: true, exports: exportsObj };
  };
  stubMod('lib/sentry-wrap.js', { withSentry: (fn) => fn });
  stubMod('lib/jwt-middleware.js', { requireAuth: (fn) => fn });
  stubMod('lib/cors-helper.js', {
    getCorsHeaders: () => ({}),
    corsOptionsResponse: () => ({ statusCode: 200 })
  });
  stubMod('lib/storage-router.js', { getSupabase: () => null });
  return require(target);
}

// ─── Block 1: HTML-Email in create-referral ──────────────────────────

describe('MEGA²⁷.6 Block 1 — create-referral.js HTML-Email', () => {
  const SRC = read(path.join(FN, 'create-referral.js'));

  test('Importiert email-renderer Library', () => {
    assert.match(SRC, /require\(['"]\.\.\/\.\.\/lib\/email-renderer/);
  });

  test('Nutzt renderTemplate fuer referral-invite', () => {
    assert.match(SRC, /renderTemplate\(['"]referral-invite/);
  });

  test('mailOptions enthaelt html-Field', () => {
    assert.match(SRC, /mailOptions\.html\s*=\s*htmlBody/);
  });

  test('mailOptions enthaelt text-Field (Plain-Fallback)', () => {
    assert.match(SRC, /text:\s*textBody/);
  });

  test('replyTo: opts.referrerEmail (Reply geht an Werber)', () => {
    assert.match(SRC, /replyTo:\s*opts\.referrerEmail/);
  });

  test('expiresAt wird an sendInviteEmail uebergeben', () => {
    assert.match(SRC, /expiresAt:\s*expiresAt/);
  });

  test('_formatExpiresAt-Helper exportiert', () => {
    assert.match(SRC, /_formatExpiresAt/);
  });

  test('Vars-Object enthaelt alle 8 Mustache-Vars', () => {
    ['WERBER_NAME', 'WERBER_EMAIL', 'GEWORBENER_EMAIL', 'CODE',
     'REDEMPTION_URL', 'EXPIRES_AT_FORMATTED', 'PERSONAL_MESSAGE',
     'HAS_PERSONAL_MESSAGE'].forEach(v => {
      assert.match(SRC, new RegExp('\\b' + v + '\\b'),
        v + ' fehlt im Vars-Object');
    });
  });

  test('Fallback auf Plain-Text bei Renderer-Error', () => {
    assert.match(SRC, /renderer fallback/);
  });

  test('Returnt html_sent-Flag fuer Audit', () => {
    assert.match(SRC, /html_sent/);
  });
});

describe('MEGA²⁷.6 Block 1 — _formatExpiresAt', () => {
  test('formatiert ISO zu DD.MM.YYYY, HH:MM Uhr', () => {
    const mod = loadWithStubs(path.join(FN, 'create-referral.js'));
    const r = mod._test._formatExpiresAt('2026-05-16T12:00:00Z');
    // Format: "DD.MM.YYYY, HH:MM Uhr" (Stunde + ggf. Tag varies durch TZ)
    assert.match(r, /^\d{2}\.\d{2}\.\d{4},\s+\d{2}:\d{2}\s+Uhr$/);
    assert.match(r, /\.05\.2026/);
  });

  test('returnt empty string bei null/invalid', () => {
    const mod = loadWithStubs(path.join(FN, 'create-referral.js'));
    assert.equal(mod._test._formatExpiresAt(null), '');
    assert.equal(mod._test._formatExpiresAt(''), '');
    assert.equal(mod._test._formatExpiresAt('not-a-date'), '');
  });
});

// ─── Block 2: welcome-referred-Block ─────────────────────────────────

describe('MEGA²⁷.6 Block 2 — send-welcome-email Referrer-Block', () => {
  test('buildWelcomeEmail OHNE referrer_name → kein IS_REFERRED-Block', () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const r = mod._test.buildWelcomeEmail({ firstname: 'Lisa' });
    assert.equal(r.is_referred, false);
    assert.doesNotMatch(r.html, /Empfohlen von/);
    assert.doesNotMatch(r.text, /EMPFOHLEN VON/);
  });

  test('buildWelcomeEmail MIT referrer_name → IS_REFERRED-Block in HTML + Text', () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const r = mod._test.buildWelcomeEmail({
      firstname: 'Lisa',
      referrer_name: 'Hans Mueller'
    });
    assert.equal(r.is_referred, true);
    assert.match(r.html, /Empfohlen von Hans Mueller/);
    assert.match(r.text, /EMPFOHLEN VON HANS MUELLER/);
    assert.match(r.html, /50 €/);
    assert.match(r.html, /1 Monat gratis/);
  });

  test('Empty/whitespace referrer_name → kein Block', () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const r1 = mod._test.buildWelcomeEmail({ firstname: 'X', referrer_name: '' });
    const r2 = mod._test.buildWelcomeEmail({ firstname: 'X', referrer_name: '   ' });
    assert.equal(r1.is_referred, false);
    assert.equal(r2.is_referred, false);
  });

  test('XSS-Schutz auf referrer_name', () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const r = mod._test.buildWelcomeEmail({
      firstname: 'X',
      referrer_name: '<script>alert(1)</script>'
    });
    assert.doesNotMatch(r.html, /<script>alert\(1\)<\/script>/);
    assert.match(r.html, /&lt;script&gt;/);
  });

  test('Founding + Referred kombinierbar', () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const r = mod._test.buildWelcomeEmail({
      firstname: 'X',
      founding_member: true,
      referrer_name: 'Hans'
    });
    assert.match(r.subject, /🎯/);
    assert.equal(r.is_referred, true);
    assert.match(r.html, /Empfohlen von Hans/);
  });
});

describe('MEGA²⁷.6 Block 2 — lookupReferrerForUser', () => {
  test('returnt null bei missing sb oder userId', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    assert.equal(await mod._test.lookupReferrerForUser(null, 'u1'), null);
    assert.equal(await mod._test.lookupReferrerForUser({}, null), null);
  });

  test('returnt null wenn keine Referral gefunden', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null })
              })
            })
          })
        })
      })
    };
    const r = await mod._test.lookupReferrerForUser(fakeSb, 'u1');
    assert.equal(r, null);
  });

  test('returnt full_name wenn referrer-User existiert', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    let queryCount = 0;
    const fakeSb = {
      from: (table) => {
        queryCount++;
        if (table === 'referrals') {
          return {
            select: () => ({ eq: () => ({ in: () => ({ limit: () => ({
              maybeSingle: () => Promise.resolve({
                data: { referrer_user_id: 'r1', referrer_email: 'hans@x.de' }
              })
            }) }) }) })
          };
        }
        if (table === 'users') {
          return {
            select: () => ({ eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { full_name: 'Hans Mueller' } })
            }) })
          };
        }
        return {};
      }
    };
    const r = await mod._test.lookupReferrerForUser(fakeSb, 'u1');
    assert.equal(r, 'Hans Mueller');
  });

  test('Fallback auf referrer_email wenn user not found', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-welcome-email.js'));
    const fakeSb = {
      from: (table) => {
        if (table === 'referrals') {
          return {
            select: () => ({ eq: () => ({ in: () => ({ limit: () => ({
              maybeSingle: () => Promise.resolve({
                data: { referrer_user_id: 'r1', referrer_email: 'hans@x.de' }
              })
            }) }) }) })
          };
        }
        // users-Lookup throws
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new Error('not found')) }) }) };
      }
    };
    const r = await mod._test.lookupReferrerForUser(fakeSb, 'u1');
    assert.equal(r, 'hans@x.de');
  });
});

describe('MEGA²⁷.6 Block 2 — Source-Audit Handler', () => {
  const SRC = read(path.join(FN, 'send-welcome-email.js'));

  test('Handler liest body.user_id', () => {
    assert.match(SRC, /body\.user_id/);
  });

  test('lookupReferrerForUser aufgerufen wenn user_id vorhanden', () => {
    assert.match(SRC, /lookupReferrerForUser\(sb,\s*body\.user_id\)/);
  });

  test('referrer_name an buildWelcomeEmail durchgereicht', () => {
    assert.match(SRC, /referrer_name:\s*referrerName/);
  });

  test('Response: is_referred-Flag', () => {
    assert.match(SRC, /is_referred:\s*!!email\.is_referred/);
  });

  test('Graceful: catch um lookupReferrer (Fail blockt nicht)', () => {
    assert.match(SRC, /catch\s*\(_\)\s*\{\s*\/\* graceful/);
  });
});
