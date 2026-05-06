/**
 * PROVA — MEGA²⁷.7 Final-Polish Tests:
 *   Block 1: netlify.toml Cron-Schedules
 *   Block 2: check-referral-rewards Reward-Email
 *   Block 3: send-referral-reminders Lambda + Templates
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
  stubMod('lib/cors-helper.js', { getCorsHeaders: () => ({}), corsOptionsResponse: () => ({ statusCode: 200 }) });
  stubMod('lib/storage-router.js', { getSupabase: () => null });
  return require(target);
}

// ─── Block 1: netlify.toml Cron-Schedules ────────────────────────────

describe('MEGA²⁷.7 Block 1 — netlify.toml Cron-Schedules', () => {
  const TOML = read(path.join(ROOT, 'netlify.toml'));

  test('netlify.toml existiert + nicht-leer', () => {
    assert.ok(TOML.length > 100);
  });

  test('check-referral-rewards Schedule "0 2 * * *"', () => {
    assert.match(TOML, /\[functions\."check-referral-rewards"\][\s\S]*?schedule\s*=\s*"0\s+2\s+\*\s+\*\s+\*"/);
  });

  test('send-referral-reminders Schedule "0 14 * * *"', () => {
    assert.match(TOML, /\[functions\."send-referral-reminders"\][\s\S]*?schedule\s*=\s*"0\s+14\s+\*\s+\*\s+\*"/);
  });

  test('Beide Cron-Bloecke unter MEGA²⁷.7-Marker', () => {
    assert.match(TOML, /MEGA.{1,2}.{1,2}.7/);
  });
});

// ─── Block 2: check-referral-rewards Reward-Email ────────────────────

describe('MEGA²⁷.7 Block 2 — Reward-Email Helpers', () => {
  test('calculateReferrerStats: empty bei null inputs', async () => {
    const mod = loadWithStubs(path.join(FN, 'check-referral-rewards.js'));
    const stats = await mod._test.calculateReferrerStats(null, 'u1');
    assert.equal(stats.total_sent, 0);
    assert.equal(stats.total_rewarded, 0);
  });

  test('calculateReferrerStats: aggregiert korrekt', async () => {
    const mod = loadWithStubs(path.join(FN, 'check-referral-rewards.js'));
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: [
              { status: 'rewarded' },
              { status: 'rewarded' },
              { status: 'active' },
              { status: 'pending' },
              { status: 'expired' },     // wird NICHT als sent gezählt
              { status: 'cancelled' }    // wird NICHT als sent gezählt
            ]
          })
        })
      })
    };
    const stats = await mod._test.calculateReferrerStats(fakeSb, 'u1');
    assert.equal(stats.total_sent, 4); // ohne expired+cancelled
    assert.equal(stats.total_rewarded, 2);
    assert.equal(stats.total_active_count, 4); // pending+active+rewarded
  });

  test('sendRewardEmail: skipped wenn no_smtp_env', async () => {
    const original = { h: process.env.SMTP_HOST };
    delete process.env.SMTP_HOST;
    const mod = loadWithStubs(path.join(FN, 'check-referral-rewards.js'));
    const r = await mod._test.sendRewardEmail({}, { referrer_email: 'x@y.de' }, {});
    assert.equal(r.ok, false);
    assert.equal(r.skipped, 'no_smtp_env');
    if (original.h !== undefined) process.env.SMTP_HOST = original.h;
  });

  test('sendRewardEmail: skipped wenn no_referrer_email', async () => {
    const mod = loadWithStubs(path.join(FN, 'check-referral-rewards.js'));
    const r = await mod._test.sendRewardEmail({}, {}, {});
    assert.equal(r.ok, false);
    assert.equal(r.skipped, 'no_referrer_email');
  });
});

describe('MEGA²⁷.7 Block 2 — check-referral-rewards Source-Audit', () => {
  const SRC = read(path.join(FN, 'check-referral-rewards.js'));

  test('sendRewardEmail wird im Cron-Loop aufgerufen', () => {
    assert.match(SRC, /sendRewardEmail\(sb,\s*r,\s*stats\)/);
  });

  test('reward_email phase im errors-tracking', () => {
    assert.match(SRC, /phase:\s*['"]reward_email['"]/);
  });

  test('Email-Failure blockt Reward NICHT (graceful)', () => {
    // Pattern: try { sendRewardEmail } catch { errors.push(... 'reward_email' ...) }
    assert.match(SRC, /try\s*\{[\s\S]*?sendRewardEmail[\s\S]*?\}\s*catch\s*\([\s\S]*?errors\.push[\s\S]*?reward_email/);
  });

  test('Renderer.renderTemplate fuer referral-reward', () => {
    assert.match(SRC, /renderTemplate\(['"]referral-reward['"]/);
  });

  test('Stats werden vor Email berechnet', () => {
    assert.match(SRC, /calculateReferrerStats\(sb,\s*r\.referrer_user_id\)/);
  });
});

// ─── Block 3: send-referral-reminders ────────────────────────────────

describe('MEGA²⁷.7 Block 3 — send-referral-reminders Lambda', () => {
  const SRC = read(path.join(FN, 'send-referral-reminders.js'));

  test('Lambda-File existiert + valid', () => {
    assert.ok(fs.existsSync(path.join(FN, 'send-referral-reminders.js')));
  });

  test('Internal-Secret-Auth aktiv', () => {
    assert.match(SRC, /PROVA_INTERNAL_WRITE_SECRET/);
  });

  test('Filter: status=pending + reminder_count=0', () => {
    assert.match(SRC, /\.eq\(['"]status['"],\s*['"]pending['"]\)/);
    assert.match(SRC, /\.eq\(['"]reminder_count['"],\s*0\)/);
  });

  test('Tag-5-bis-Tag-6-Window via lte/gte created_at', () => {
    assert.match(SRC, /5\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    assert.match(SRC, /6\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  });

  test('Anti-expired: gt expires_at NOW', () => {
    assert.match(SRC, /\.gt\(['"]expires_at['"]/);
  });

  test('reminder_count++ nach erfolgreichem Send', () => {
    assert.match(SRC, /reminder_count:\s*\(ref\.reminder_count\s*\|\|\s*0\)\s*\+\s*1/);
  });

  test('Renderer.renderTemplate fuer referral-reminder', () => {
    assert.match(SRC, /renderTemplate\(['"]referral-reminder['"]/);
  });

  test('Reply-To: referrer_email', () => {
    assert.match(SRC, /replyTo:\s*referral\.referrer_email/);
  });

  test('Test-Exports', () => {
    assert.match(SRC, /exports\._test\s*=\s*\{[\s\S]*?findPendingReferralsForReminder/);
  });
});

describe('MEGA²⁷.7 Block 3 — findPendingReferralsForReminder', () => {
  test('returnt empty bei null sb', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-referral-reminders.js'));
    const r = await mod._test.findPendingReferralsForReminder(null);
    assert.deepEqual(r, []);
  });

  test('Mock-Query findet Test-Daten', async () => {
    const mod = loadWithStubs(path.join(FN, 'send-referral-reminders.js'));
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              lte: () => ({
                gte: () => ({
                  gt: () => ({
                    limit: () => Promise.resolve({
                      data: [{ id: 'r1', code: 'PROVA-FRIEND-XX-AAAAAA' }]
                    })
                  })
                })
              })
            })
          })
        })
      })
    };
    const r = await mod._test.findPendingReferralsForReminder(fakeSb);
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'r1');
  });
});

// ─── Block 3: Reminder-Templates ─────────────────────────────────────

describe('MEGA²⁷.7 Block 3 — Reminder-Templates', () => {
  const Renderer = require(path.join(ROOT, 'lib', 'email-renderer.js'));

  test('referral-reminder.html existiert + Vars', () => {
    const tpl = Renderer.loadTemplate('referral-reminder.html');
    ['{{WERBER_NAME}}', '{{GEWORBENER_EMAIL}}', '{{CODE}}',
     '{{REDEMPTION_URL}}', '{{DAYS_LEFT}}', '{{HOURS_LEFT}}'].forEach(v => {
      assert.ok(tpl.indexOf(v) >= 0, v + ' fehlt in HTML');
    });
  });

  test('referral-reminder.txt existiert + Vars', () => {
    const tpl = Renderer.loadTemplate('referral-reminder.txt');
    ['{{WERBER_NAME}}', '{{CODE}}', '{{DAYS_LEFT}}', '{{REDEMPTION_URL}}'].forEach(v => {
      assert.ok(tpl.indexOf(v) >= 0, v + ' fehlt in TXT');
    });
  });

  test('renderTemplate("referral-reminder") komplett ohne unresolved-vars', () => {
    const r = Renderer.renderTemplate('referral-reminder', {
      WERBER_NAME: 'Hans',
      GEWORBENER_EMAIL: 'lisa@x.de',
      CODE: 'PROVA-FRIEND-HM-AAAAAA',
      REDEMPTION_URL: 'https://example.de/r/CODE',
      DAYS_LEFT: '2',
      HOURS_LEFT: '48'
    });
    assert.doesNotMatch(r.html, /\{\{[A-Z_]+\}\}/);
    assert.doesNotMatch(r.text, /\{\{[A-Z_]+\}\}/);
    assert.match(r.html, /Hans/);
    assert.match(r.html, /PROVA-FRIEND-HM-AAAAAA/);
    assert.match(r.html, /2 Tage/);
  });

  test('Template Touch-Target ≥48px', () => {
    const tpl = Renderer.loadTemplate('referral-reminder.html');
    assert.match(tpl, /min-height:48px/);
  });

  test('Template max-width 600px (Email-Standard)', () => {
    const tpl = Renderer.loadTemplate('referral-reminder.html');
    assert.match(tpl, /max-width:600px/);
  });
});
