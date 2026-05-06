/**
 * PROVA — MEGA²⁷.5 Patch-Tests:
 *   Block 1: Stripe-Checkout Auto-Apply
 *   Block 2: Email-Templates + Renderer
 *   Block 3: Dashboard-Integration
 *   Block 4: Sign-up-Flow User-Linking
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FN = path.join(ROOT, 'netlify', 'functions');

function read(p) { return fs.readFileSync(p, 'utf8'); }

// ─── Block 1: Stripe-Auto-Apply ─────────────────────────────────────

describe('MEGA²⁷.5 Block 1 — stripe-checkout.js Auto-Apply', () => {
  const SRC = read(path.join(FN, 'stripe-checkout.js'));

  test('liest body.referral_code', () => {
    assert.match(SRC, /body\.referral_code/);
  });

  test('Validiert Code-Format vor Stripe-Call', () => {
    assert.match(SRC, /PROVA-FRIEND-\[A-Z\]\{1,4\}-\[A-Z2-9\]\{6\}/);
  });

  test('Sucht in referrals-Tabelle nach Code', () => {
    assert.match(SRC, /\.from\(['"]referrals['"]\)/);
    assert.match(SRC, /\.eq\(['"]code['"]/);
  });

  test('Verifiziert status=pending + nicht-abgelaufen', () => {
    assert.match(SRC, /['"]pending['"]/);
    assert.match(SRC, /expires_at/);
  });

  test('Injectet promotion_code in discounts-Array', () => {
    assert.match(SRC, /promotion_code:\s*ref\.stripe_promo_code_id/);
  });

  test('metadata.prova_referral_code wird gesetzt (für Webhook-Tracking)', () => {
    const occurrences = (SRC.match(/prova_referral_code/g) || []).length;
    assert.ok(occurrences >= 2, 'Mindestens in Session-Metadata + Subscription-Metadata, gefunden: ' + occurrences);
  });

  test('Pilot-Coupons schlagen Referral-Codes (Founding > Friend)', () => {
    // Validiert: !isPilot && !discounts vor Code-Lookup
    assert.match(SRC, /!isPilot\s*&&\s*!discounts/);
  });

  test('referralCodeApplied tracked für Response', () => {
    assert.match(SRC, /referralCodeApplied/);
  });
});

describe('MEGA²⁷.5 Block 1 — Schema-Validation', () => {
  const SCHEMA_SRC = read(path.join(ROOT, 'lib', 'schemas', 'stripe-checkout.js'));

  test('referral_code als optional-Feld', () => {
    assert.match(SCHEMA_SRC, /referral_code:\s*z\.string\(\)/);
    assert.match(SCHEMA_SRC, /optional/);
  });

  test('Regex-Validation im Schema', () => {
    assert.match(SCHEMA_SRC, /\/\^PROVA-FRIEND-/);
  });
});

// ─── Block 2: Email-Renderer + Templates ─────────────────────────────

describe('MEGA²⁷.5 Block 2 — email-renderer Pure-Functions', () => {
  const Renderer = require(path.join(ROOT, 'lib', 'email-renderer.js'));

  test('render() ersetzt {{VAR}} mit value', () => {
    const r = Renderer.render('Hi {{NAME}}', { NAME: 'Marcel' });
    assert.equal(r, 'Hi Marcel');
  });

  test('render() leeres Replacement bei missing var', () => {
    const r = Renderer.render('Hi {{MISSING}}', {});
    assert.equal(r, 'Hi ');
  });

  test('renderHtml() escaped XSS', () => {
    const r = Renderer.renderHtml('Hi {{NAME}}', { NAME: '<script>x</script>' });
    assert.doesNotMatch(r, /<script>x<\/script>/);
    assert.match(r, /&lt;script&gt;/);
  });

  test('Triple-Mustache {{{VAR}}} ist NICHT escaped', () => {
    const r = Renderer.renderHtml('{{{HTML_BLOCK}}}', { HTML_BLOCK: '<b>bold</b>' });
    assert.match(r, /<b>bold<\/b>/);
  });

  test('Section-Block {{#KEY}} renders wenn truthy', () => {
    const r = Renderer.render('{{#FOO}}YES{{/FOO}}', { FOO: true });
    assert.equal(r, 'YES');
  });

  test('Section-Block hidden wenn falsy', () => {
    const r = Renderer.render('{{#FOO}}YES{{/FOO}}', { FOO: false });
    assert.equal(r, '');
  });

  test('Inverted-Block {{^KEY}} renders wenn falsy', () => {
    const r = Renderer.render('{{^FOO}}EMPTY{{/FOO}}', { FOO: false });
    assert.equal(r, 'EMPTY');
  });

  test('stripHtml() konvertiert basic HTML zu Text', () => {
    const r = Renderer.stripHtml('<p>Hallo</p><br><p>Welt</p>');
    assert.match(r, /Hallo/);
    assert.match(r, /Welt/);
    assert.doesNotMatch(r, /<p>/);
  });

  test('stripHtml() entfernt <script>+<style>', () => {
    const r = Renderer.stripHtml('<style>x</style><p>Visible</p><script>alert(1)</script>');
    assert.match(r, /Visible/);
    assert.doesNotMatch(r, /alert\(1\)/);
    assert.doesNotMatch(r, /style/);
  });

  test('escapeHtml() handled null/undefined', () => {
    assert.equal(Renderer.escapeHtml(null), '');
    assert.equal(Renderer.escapeHtml(undefined), '');
  });
});

describe('MEGA²⁷.5 Block 2 — Templates Existence + Vars', () => {
  const Renderer = require(path.join(ROOT, 'lib', 'email-renderer.js'));

  test('referral-invite.html existiert + alle Variablen', () => {
    const tpl = Renderer.loadTemplate('referral-invite.html');
    ['{{WERBER_NAME}}', '{{WERBER_EMAIL}}', '{{GEWORBENER_EMAIL}}', '{{CODE}}',
     '{{REDEMPTION_URL}}', '{{EXPIRES_AT_FORMATTED}}'].forEach(v => {
      assert.ok(tpl.indexOf(v) >= 0, v + ' fehlt');
    });
  });

  test('referral-invite.txt existiert', () => {
    const tpl = Renderer.loadTemplate('referral-invite.txt');
    assert.ok(tpl.length > 200);
  });

  test('referral-reward.html existiert + alle Variablen', () => {
    const tpl = Renderer.loadTemplate('referral-reward.html');
    ['{{WERBER_NAME}}', '{{GEWORBENER_EMAIL}}', '{{NEXT_BILLING_DATE}}',
     '{{TOTAL_SENT}}', '{{TOTAL_REWARDED}}', '{{TOTAL_MONTHS_FREE}}',
     '{{TOTAL_VALUE_EUR}}', '{{REMAINING_OF_12}}', '{{DASHBOARD_URL}}'].forEach(v => {
      assert.ok(tpl.indexOf(v) >= 0, v + ' fehlt');
    });
  });

  test('referral-reward.txt existiert', () => {
    const tpl = Renderer.loadTemplate('referral-reward.txt');
    assert.ok(tpl.length > 200);
  });

  test('Templates haben Inline-CSS (kein external)', () => {
    const tpl = Renderer.loadTemplate('referral-invite.html');
    assert.doesNotMatch(tpl, /<link[^>]+rel="stylesheet"/);
  });

  test('Templates nutzen <table>-Layout (Outlook-Compat)', () => {
    const tpl = Renderer.loadTemplate('referral-invite.html');
    assert.match(tpl, /<table\s/);
    assert.match(tpl, /role="presentation"/);
  });

  test('CTA-Buttons ≥48px Touch-Target', () => {
    const tpl = Renderer.loadTemplate('referral-invite.html');
    assert.match(tpl, /min-height:48px/);
  });

  test('Templates max-width 600px (Email-Standard)', () => {
    const tpl = Renderer.loadTemplate('referral-invite.html');
    assert.match(tpl, /max-width:600px/);
  });
});

describe('MEGA²⁷.5 Block 2 — renderTemplate() E2E', () => {
  const Renderer = require(path.join(ROOT, 'lib', 'email-renderer.js'));

  test('renderTemplate("referral-invite") returnt {html, text}', () => {
    const r = Renderer.renderTemplate('referral-invite', {
      WERBER_NAME: 'Hans Mueller',
      WERBER_EMAIL: 'hans@x.de',
      GEWORBENER_EMAIL: 'lisa@y.de',
      CODE: 'PROVA-FRIEND-HM-A7B3K2',
      REDEMPTION_URL: 'https://prova-systems.de/r/PROVA-FRIEND-HM-A7B3K2',
      EXPIRES_AT_FORMATTED: '16.05.2026',
      HAS_PERSONAL_MESSAGE: false
    });
    assert.ok(r.html.indexOf('Hans Mueller') >= 0);
    assert.ok(r.html.indexOf('PROVA-FRIEND-HM-A7B3K2') >= 0);
    assert.ok(r.text.indexOf('Hans Mueller') >= 0);
    // Keine ungelösten Mustache-Tags
    assert.doesNotMatch(r.html, /\{\{[A-Z_]+\}\}/);
  });

  test('XSS-safe Personal-Message-Rendering', () => {
    const r = Renderer.renderTemplate('referral-invite', {
      WERBER_NAME: 'Hans',
      WERBER_EMAIL: 'h@x.de',
      GEWORBENER_EMAIL: 'l@y.de',
      CODE: 'PROVA-FRIEND-XX-AAAAAA',
      REDEMPTION_URL: 'https://example.de',
      EXPIRES_AT_FORMATTED: '01.01.2026',
      HAS_PERSONAL_MESSAGE: true,
      PERSONAL_MESSAGE: '<script>alert(1)</script>'
    });
    assert.doesNotMatch(r.html, /<script>alert\(1\)<\/script>/);
    assert.match(r.html, /&lt;script&gt;/);
  });

  test('renderTemplate("referral-reward") komplett', () => {
    const r = Renderer.renderTemplate('referral-reward', {
      WERBER_NAME: 'Hans',
      GEWORBENER_EMAIL: 'lisa@y.de',
      NEXT_BILLING_DATE: '10.06.2026',
      TOTAL_SENT: '5',
      TOTAL_REWARDED: '2',
      TOTAL_MONTHS_FREE: '2',
      TOTAL_VALUE_EUR: '198',
      REMAINING_OF_12: '10',
      DASHBOARD_URL: 'https://app.prova-systems.de/dashboard'
    });
    assert.ok(r.html.indexOf('Hans') >= 0);
    assert.ok(r.html.indexOf('99,00') >= 0); // hardcoded reward
    assert.ok(r.html.indexOf('10.06.2026') >= 0);
    assert.ok(r.text.indexOf('Hans') >= 0);
  });
});

// ─── Block 3: Dashboard-Integration ──────────────────────────────────

describe('MEGA²⁷.5 Block 3 — Dashboard-Integration', () => {
  const HTML = read(path.join(ROOT, 'dashboard.html'));

  test('lib/referral-system.js geladen', () => {
    assert.match(HTML, /\/lib\/referral-system\.js/);
  });

  test('lib/referral-ui.js geladen', () => {
    assert.match(HTML, /\/lib\/referral-ui\.js/);
  });

  test('referral-card-mount Element vorhanden', () => {
    assert.match(HTML, /id="referral-card-mount"/);
  });

  test('Init-Script nutzt ProvaReferralUI.attach', () => {
    assert.match(HTML, /ProvaReferralUI\.attach/);
  });

  test('Founding-Member-Detection via prova_paket + prova_founding_member', () => {
    assert.match(HTML, /prova_paket/);
    assert.match(HTML, /prova_founding_member/);
  });

  test('Create-Modal-Wiring (Cancel + Submit)', () => {
    assert.match(HTML, /prova-referral-cancel/);
    assert.match(HTML, /prova-referral-submit/);
  });

  test('History-Modal-Wiring (Close)', () => {
    assert.match(HTML, /prova-referral-close/);
  });

  test('Char-Counter für Message-Field', () => {
    assert.match(HTML, /prova-referral-charcount/);
  });

  test('Email-Validation vor Submit', () => {
    assert.match(HTML, /ProvaReferral\.validateEmail/);
  });

  test('Stats-Auto-Refresh nach Submit', () => {
    assert.match(HTML, /rerender/);
  });
});

// ─── Block 4: Sign-up-Flow User-Linking ──────────────────────────────

describe('MEGA²⁷.5 Block 4 — stripe-webhook-referral.js Robust-Lookup', () => {
  const SRC = read(path.join(FN, 'stripe-webhook-referral.js'));

  test('findReferralByCode() Funktion exportiert', () => {
    assert.match(SRC, /findReferralByCode/);
    assert.match(SRC, /\.eq\(['"]code['"]/);
  });

  test('findReferral() Multi-Strategy (Code + Email-Fallback)', () => {
    assert.match(SRC, /async function findReferral\b/);
    assert.match(SRC, /metaCode/);
  });

  test('findUserIdByEmail() für referred_user_id-Linking', () => {
    assert.match(SRC, /findUserIdByEmail/);
  });

  test('handleSubscriptionCreated nutzt findReferral statt -ByEmail', () => {
    assert.match(SRC, /findReferral\(sb,\s*sub,\s*customer\)/);
  });

  test('referred_user_id wird gesetzt wenn User gefunden', () => {
    assert.match(SRC, /referred_user_id\s*=\s*referredUserId/);
  });

  test('user_linked-Flag in Response', () => {
    assert.match(SRC, /user_linked/);
  });

  test('Metadata-Code-Lookup ueberschreibt Coupon-Check', () => {
    assert.match(SRC, /prova_referral_code/);
  });

  test('Test-Exports erweitert um neue Funktionen', () => {
    assert.match(SRC, /findReferralByCode/);
    assert.match(SRC, /findReferral\b/);
    assert.match(SRC, /findUserIdByEmail/);
  });
});

// ─── E2E-Smoke ──────────────────────────────────────────────────────

describe('MEGA²⁷.5 E2E-Smoke — alle 4 Blocker geschlossen', () => {
  test('1) stripe-checkout.js akzeptiert referral_code', () => {
    assert.match(read(path.join(FN, 'stripe-checkout.js')), /referral_code/);
  });

  test('2) Email-Templates existieren (4 Files)', () => {
    const dir = path.join(ROOT, 'lib', 'email-templates');
    assert.ok(fs.existsSync(path.join(dir, 'referral-invite.html')));
    assert.ok(fs.existsSync(path.join(dir, 'referral-invite.txt')));
    assert.ok(fs.existsSync(path.join(dir, 'referral-reward.html')));
    assert.ok(fs.existsSync(path.join(dir, 'referral-reward.txt')));
  });

  test('3) dashboard.html hat referral-card-mount + Init', () => {
    const html = read(path.join(ROOT, 'dashboard.html'));
    assert.match(html, /referral-card-mount/);
    assert.match(html, /ProvaReferralUI\.attach/);
  });

  test('4) stripe-webhook-referral.js hat Multi-Strategy-Lookup', () => {
    const src = read(path.join(FN, 'stripe-webhook-referral.js'));
    assert.match(src, /async function findReferral\b/);
    assert.match(src, /findUserIdByEmail/);
  });
});
