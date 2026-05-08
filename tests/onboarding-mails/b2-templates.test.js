'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Cron = require('../../netlify/functions/onboarding-mail-cron');
const cronSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'onboarding-mail-cron.js'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '20_add_onboarding_mails_sent.sql'), 'utf8');
const netlifyToml = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify.toml'), 'utf8');

const TEMPLATES = [
  'WELCOME-DAY-0',
  'FIRST-AUFTRAG-DAY-1',
  'CHECK-IN-DAY-3',
  'FEEDBACK-DAY-7',
  'RENEWAL-DAY-14'
];

const TPL_DIR = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '06-emails', 'onboarding');

// 5 Templates × 2 Tests = 10 Tests
TEMPLATES.forEach(name => {
  test('B2: Template ' + name + '.liquid existiert', () => {
    const fp = path.join(TPL_DIR, name + '.liquid.template.html');
    assert.ok(fs.existsSync(fp), 'Missing: ' + fp);
  });

  test('B2: Template ' + name + ' hat Liquid-Variablen + Unsubscribe-Link', () => {
    const src = fs.readFileSync(path.join(TPL_DIR, name + '.liquid.template.html'), 'utf8');
    assert.match(src, /\{\{ vorname/);
    assert.match(src, /unsubscribe_url/);
    assert.match(src, /<!DOCTYPE html>/i);
  });
});

test('B2: Cron-Lambda exposed __SCHEDULE_DAYS mit 5 Slots', () => {
  assert.ok(Array.isArray(Cron.__SCHEDULE_DAYS));
  assert.strictEqual(Cron.__SCHEDULE_DAYS.length, 5);
  assert.deepStrictEqual(Cron.__SCHEDULE_DAYS.map(s => s.day), [0, 1, 3, 7, 14]);
});

test('B2: __daysSince Pure-Function', () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(Cron.__daysSince(oneDayAgo), 1);
  assert.strictEqual(Cron.__daysSince(null), null);
});

test('B2: netlify.toml hat onboarding-mail-cron Schedule', () => {
  assert.match(netlifyToml, /\[functions\."onboarding-mail-cron"\]/);
  assert.match(netlifyToml, /schedule\s*=\s*"0 9 \* \* \*"/);
});

test('B2: Cron-Lambda sendet via Resend', () => {
  assert.match(cronSrc, /api\.resend\.com\/emails/);
  assert.match(cronSrc, /RESEND_API_KEY/);
  assert.match(cronSrc, /'Bearer ' \+ apiKey|Bearer \$\{apiKey\}/);
});

test('B2: Idempotenz-Check via onboarding_mails_sent', () => {
  assert.match(cronSrc, /from\(['"]onboarding_mails_sent['"]\)/);
  assert.match(cronSrc, /\.eq\(['"]template['"]/);
});

test('B2: Schema-Migration 20 onboarding_mails_sent + UNIQUE-Constraint', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.onboarding_mails_sent/);
  assert.match(sql, /UNIQUE INDEX[^(]*\(user_id, template\)/);
});
