'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Helper = require('../../netlify/functions/lib/email-resend-helper');

test('Helper: 3 Templates existieren', () => {
  ['WELCOME', 'TRIAL-ENDING', 'PILOT-FEEDBACK'].forEach(t => {
    const tpl = Helper.loadTemplate(t);
    assert.ok(tpl, t + ' template missing');
    assert.match(tpl, /<!DOCTYPE html>/i);
  });
});

test('Helper: renderLiquid Variable-Substitution', () => {
  const out = Helper.renderLiquid('Hello {{ name }}', { name: 'World' });
  assert.strictEqual(out, 'Hello World');
});

test('Helper: renderLiquid default-Wert', () => {
  const out = Helper.renderLiquid('Hello {{ name | default: "Friend" }}', {});
  assert.strictEqual(out, 'Hello Friend');
});

test('Helper: renderLiquid if-Block-Truthy', () => {
  const out = Helper.renderLiquid('{% if active %}Yes{% endif %}', { active: true });
  assert.strictEqual(out, 'Yes');
});

test('Helper: renderLiquid if-Block-Falsy', () => {
  const out = Helper.renderLiquid('{% if active %}Yes{% endif %}', { active: false });
  assert.strictEqual(out, '');
});

test('Helper: renderLiquid if-Block-Missing', () => {
  const out = Helper.renderLiquid('{% if active %}Yes{% endif %}', {});
  assert.strictEqual(out, '');
});

test('WELCOME-Template: enthält 5-Schritte-Pattern + Pricing-Hinweis', () => {
  const tpl = Helper.loadTemplate('WELCOME');
  assert.match(tpl, /Schritte/);
  assert.match(tpl, /179€/);
  assert.match(tpl, /379€/);
  assert.match(tpl, /99€/);
});

test('WELCOME: Demo-Fall-Conditional', () => {
  const tpl = Helper.loadTemplate('WELCOME');
  assert.match(tpl, /\{%\s*if\s+demo_fall_id\s*%\}/);
});

test('TRIAL-ENDING: Pricing-Cards + Founding', () => {
  const tpl = Helper.loadTemplate('TRIAL-ENDING');
  assert.match(tpl, /Founding-Member/);
  assert.match(tpl, /99€/);
  assert.match(tpl, /\{%\s*if\s+founding_remaining\s*%\}/);
});

test('PILOT-FEEDBACK: Booking-Link (Cal.com EU) + 3 Fragen', () => {
  const tpl = Helper.loadTemplate('PILOT-FEEDBACK');
  // booking_url mit calendly_url Backwards-Compat-Default
  assert.match(tpl, /\{\{\s*booking_url(\s*\|\s*default:\s*calendly_url)?\s*\}\}/);
  // 3 Fragen-Cards
  const matches = tpl.match(/class="question"/g) || [];
  assert.strictEqual(matches.length, 3);
});

test('Lambda email-welcome.js: ENV-Fallback PROVA_ → EMAIL_CRON_SECRET', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'email-welcome.js'), 'utf8');
  assert.match(src, /PROVA_EMAIL_CRON_SECRET\s*\|\|\s*process\.env\.EMAIL_CRON_SECRET/);
});

test('Lambda email-trial-ending-cron.js: workspaces.trial_end Filter', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'email-trial-ending-cron.js'), 'utf8');
  assert.match(src, /trial_end/);
  assert.match(src, /from\(['"]workspaces['"]\)/);
});

test('Lambda email-pilot-feedback-cron.js: is_demo=false Filter + Cal.com EU URL', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'email-pilot-feedback-cron.js'), 'utf8');
  assert.match(src, /eq\(['"]is_demo['"]\s*,\s*false\)/);
  // Cal.com EU oder Calendly-Backwards-Compat akzeptiert
  assert.match(src, /cal\.eu|calendly/);
  // ENV-Fallback-Chain neu
  assert.match(src, /PROVA_BOOKING_URL/);
  assert.match(src, /PROVA_CALENDLY_URL/);
});

test('Helper: HTML-Render keine doppelten Variablen', () => {
  const tpl = '{{ x }}{{ x }}';
  const out = Helper.renderLiquid(tpl, { x: 'A' });
  assert.strictEqual(out, 'AA');
});

test('Helper: getResendKey ENV-Fallback', () => {
  delete process.env.PROVA_RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  assert.strictEqual(Helper.getResendKey(), null);
  process.env.RESEND_API_KEY = 'fake-key';
  assert.strictEqual(Helper.getResendKey(), 'fake-key');
  delete process.env.RESEND_API_KEY;
});
