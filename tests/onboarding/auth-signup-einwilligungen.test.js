/**
 * PROVA — auth-supabase-logic.js handleSignUp Erweiterung Tests (MEGA²⁰ W86)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'auth-supabase-logic.js'), 'utf8');

describe('auth-supabase-logic.js — handleSignUp Erweiterung', () => {
  test('Pflicht-Validation als Defense-in-Depth', () => {
    assert.match(SRC, /cbAgb && cbAvv && cbDse/);
    assert.match(SRC, /Bitte alle Pflicht-Einwilligungen/);
  });

  test('Legal-Checkboxes referenziert (cb-agb/cb-avv/cb-dse/cb-newsletter)', () => {
    ['cb-agb', 'cb-avv', 'cb-dse', 'cb-newsletter'].forEach(id => {
      assert.match(SRC, new RegExp("getElementById\\(['\"]" + id + "['\"]\\)"), 'missing ' + id);
    });
  });

  test('log-legal-acceptance POST nach Signup', () => {
    assert.match(SRC, /\/\.netlify\/functions\/log-legal-acceptance/);
    assert.match(SRC, /method:\s*['"]POST['"]/);
  });

  test('Default Pflicht-Types: agb + datenschutzerklaerung + avv_auftragsverarbeitung', () => {
    assert.match(SRC, /\['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung'\]/);
  });

  test('Newsletter conditional hinzu wenn checked', () => {
    assert.match(SRC, /cbNewsletter && cbNewsletter\.checked/);
    assert.match(SRC, /types\.push\(['"]newsletter['"]\)/);
  });

  test('onboarding_schritt: signup', () => {
    assert.match(SRC, /onboarding_schritt:\s*['"]signup['"]/);
  });

  test('Best-Effort-Pattern (kein Block bei Fail)', () => {
    assert.match(SRC, /Best-Effort/);
    assert.match(SRC, /Force-Later/);
  });

  test('Force-Later-Hint via existing get_pending_einwilligungen', () => {
    assert.match(SRC, /forced re-consent will catch this on next login/);
  });

  test('Submit-Button re-disabled nach Reset', () => {
    assert.match(SRC, /signup-submit/);
    assert.match(SRC, /signupSubmit\.disabled = true/);
  });

  test('Logging bei Failure ohne Block', () => {
    assert.match(SRC, /console\.warn\(['"]\[auth\] log-legal-acceptance failed/);
    assert.match(SRC, /console\.warn\(['"]\[auth\] log-legal-acceptance partial/);
  });
});

describe('auth-supabase-logic.js — Existing Forced Re-Consent (unangetastet)', () => {
  test('get_pending_einwilligungen RPC bei Login bleibt aktiv', () => {
    assert.match(SRC, /get_pending_einwilligungen/);
    assert.match(SRC, /einwilligung-update\.html/);
  });
});
