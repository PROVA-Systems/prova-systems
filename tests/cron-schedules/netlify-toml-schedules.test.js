'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const toml = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify.toml'), 'utf8');

test('Crons: fristen-reminder-cron registriert (06:00 UTC daily)', () => {
  assert.match(toml, /\[functions\."fristen-reminder-cron"\]\s*\n\s*schedule = "0 6 \* \* \*"/);
});

test('Crons: email-trial-ending-cron registriert (09:00 UTC daily)', () => {
  assert.match(toml, /\[functions\."email-trial-ending-cron"\]\s*\n\s*schedule = "0 9 \* \* \*"/);
});

test('Crons: email-pilot-feedback-cron registriert (10:00 UTC daily)', () => {
  assert.match(toml, /\[functions\."email-pilot-feedback-cron"\]\s*\n\s*schedule = "0 10 \* \* \*"/);
});

test('Crons: status-check registriert (alle 5 Min)', () => {
  assert.match(toml, /\[functions\."status-check"\]\s*\n\s*schedule = "\*\/5 \* \* \* \*"/);
});

test('Crons: mahnwesen-cron registriert (06:30 UTC daily)', () => {
  assert.match(toml, /\[functions\."mahnwesen-cron"\]\s*\n\s*schedule = "30 6 \* \* \*"/);
});

test('Crons: existing referral-Crons NICHT überschrieben', () => {
  assert.match(toml, /\[functions\."check-referral-rewards"\]/);
  assert.match(toml, /\[functions\."send-referral-reminders"\]/);
});

test('Crons: insgesamt 7 [functions.X] schedule-Einträge', () => {
  const matches = toml.match(/\[functions\."[\w-]+"\]\s*\n\s*schedule =/g) || [];
  assert.strictEqual(matches.length, 7, `7 erwartet, ${matches.length} gefunden`);
});

test('Crons: Lambdas existieren physisch', () => {
  ['fristen-reminder-cron', 'email-trial-ending-cron', 'email-pilot-feedback-cron', 'status-check'].forEach(name => {
    const fp = path.join(__dirname, '..', '..', 'netlify', 'functions', name + '.js');
    assert.ok(fs.existsSync(fp), `Lambda ${name}.js fehlt`);
  });
});

test('Crons: Cron-Secret-Auth-Pattern in Lambdas', () => {
  ['fristen-reminder-cron', 'email-trial-ending-cron', 'email-pilot-feedback-cron'].forEach(name => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', name + '.js'), 'utf8');
    assert.match(src, /CRON_SECRET/, name + ' fehlt CRON_SECRET-Check');
    assert.match(src, /401/, name + ' fehlt 401-Response');
  });
});
