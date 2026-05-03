/**
 * PROVA — Cookie-Consent + Empty-State-Library Tests
 * MEGA⁷ U5 (04.05.2026)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

describe('Cookie-Consent — File Quality', () => {
  const file = 'lib/cookie-consent.js';

  test('Datei existiert', () => {
    assert.equal(fs.existsSync(file), true);
  });

  test('Public API ProvaCookieConsent.init/reset/hasConsent', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /window\.ProvaCookieConsent/);
    assert.match(txt, /init:\s*init/);
    assert.match(txt, /reset:\s*reset/);
    assert.match(txt, /hasConsent:\s*hasConsent/);
  });

  test('Auto-Init nur auf Public-Pages', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /isPublicPage/);
    assert.match(txt, /\/index\.html/);
    assert.match(txt, /\/pilot\.html/);
    assert.match(txt, /\/datenschutz\.html/);
  });

  test('Banner nutzt ARIA-Attribute', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /role.*dialog/);
    assert.match(txt, /aria-label/);
  });

  test('Dokumentiert: kein Tracking', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /KEINE Marketing-Cookies|kein.*Tracking|funktional notwendige/i);
  });
});

describe('Cancellation-Survey — File Quality', () => {
  test('Frontend-Modal-Lib existiert', () => {
    assert.equal(fs.existsSync('lib/cancellation-survey.js'), true);
  });

  test('Frontend hat 8 Reason-Kategorien', () => {
    const txt = fs.readFileSync('lib/cancellation-survey.js', 'utf8');
    const reasons = txt.match(/value:\s*['"]\w+['"]/g) || [];
    assert.ok(reasons.length >= 8, '8 Reason-Categories');
  });

  test('Backend-Function existiert', () => {
    assert.equal(fs.existsSync('netlify/functions/cancellation-survey.js'), true);
  });

  test('Backend nutzt requireAuth + zod', () => {
    const txt = fs.readFileSync('netlify/functions/cancellation-survey.js', 'utf8');
    assert.match(txt, /requireAuth/);
    assert.match(txt, /z\.object/);
  });

  test('Backend Rate-Limit 5/min/User', () => {
    const txt = fs.readFileSync('netlify/functions/cancellation-survey.js', 'utf8');
    assert.match(txt, /RateLimitUser\.check.*5,\s*60/);
  });

  test('Audit-Trail-Eintrag stripe.subscription.cancelled', () => {
    const txt = fs.readFileSync('netlify/functions/cancellation-survey.js', 'utf8');
    assert.match(txt, /stripe\.subscription\.cancelled/);
    assert.match(txt, /source.*cancellation_survey/);
  });
});

describe('Empty-State-Library — File Quality', () => {
  test('CSS + JS existieren', () => {
    assert.equal(fs.existsSync('lib/empty-states.css'), true);
    assert.equal(fs.existsSync('lib/empty-states.js'), true);
  });

  test('CSS hat Skeleton-Animation', () => {
    const txt = fs.readFileSync('lib/empty-states.css', 'utf8');
    assert.match(txt, /@keyframes prova-skeleton-pulse/);
    assert.match(txt, /\.prova-skeleton/);
  });

  test('JS exportiert ProvaUI.emptyState/skeleton/toast', () => {
    const txt = fs.readFileSync('lib/empty-states.js', 'utf8');
    assert.match(txt, /window\.ProvaUI/);
    assert.match(txt, /emptyState\s*=\s*emptyState/);
    assert.match(txt, /skeleton\s*=\s*skeleton/);
    assert.match(txt, /toast\s*=\s*toast/);
  });

  test('Empty-State-Pattern CLAUDE.md-konform', () => {
    const txt = fs.readFileSync('lib/empty-states.js', 'utf8');
    // Pflicht-Struktur: icon + title + text + primaryBtn
    assert.match(txt, /opts\.icon/);
    assert.match(txt, /opts\.title/);
    assert.match(txt, /opts\.text/);
    assert.match(txt, /opts\.primaryBtn/);
  });

  test('Toast-Notifications mit ARIA', () => {
    const txt = fs.readFileSync('lib/empty-states.js', 'utf8');
    assert.match(txt, /role.*status/);
    assert.match(txt, /aria-live/);
  });
});

describe('Error-Pages — Existenz + Inhalt', () => {
  test('500.html existiert + hat Fehler-ID-Generator', () => {
    const txt = fs.readFileSync('500.html', 'utf8');
    assert.match(txt, /Fehler-ID/);
    assert.match(txt, /err-/);
  });

  test('500.html nutzt Sentry-Auto-Tag', () => {
    const txt = fs.readFileSync('500.html', 'utf8');
    assert.match(txt, /window\.Sentry/);
  });

  test('maintenance.html hat ETA-Display', () => {
    const txt = fs.readFileSync('maintenance.html', 'utf8');
    assert.match(txt, /ETA|eta/);
    assert.match(txt, /Auto-Reload|setTimeout/i);
  });
});
