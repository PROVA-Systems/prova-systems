/**
 * PROVA — PWA-Install-Prompt Tests
 * MEGA¹¹ W10 (2026-05-04)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

describe('PWA-Install-Prompt Library', () => {

  test('lib/pwa-install-prompt.js existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(REPO, 'lib/pwa-install-prompt.js')));
  });

  test('window.ProvaPWA wird global exposed', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes('window.ProvaPWA = {'));
  });

  test('Public-API hat show/dismiss/canInstall/isInstalled/isIOS', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes('show: show'));
    assert.ok(src.includes('dismiss: dismiss'));
    assert.ok(src.includes('canInstall: canInstall'));
    assert.ok(src.includes('isInstalled: isInstalled'));
    assert.ok(src.includes('isIOS: isIOS'));
  });

  test('beforeinstallprompt-Event wird abgefangen + e.preventDefault', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.match(src, /addEventListener\('beforeinstallprompt'/);
    assert.match(src, /e\.preventDefault\(\)/);
  });

  test('appinstalled-Event wird gehandelt', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.match(src, /addEventListener\('appinstalled'/);
  });

  test('display-mode standalone Detection (PWA installiert)', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.match(src, /matchMedia\('\(display-mode: standalone\)'\)/);
  });

  test('iOS-Safari Legacy-Flag (navigator.standalone) gechecked', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes('window.navigator.standalone === true'));
  });

  test('Visit-Counter im localStorage', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes("STORAGE_KEY_VISITS = 'prova_pwa_visits'"));
  });

  test('Dismiss-Cooldown 7 Tage', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.match(src, /DISMISS_COOLDOWN_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  });

  test('MIN_VISITS = 3 (kein eager-Show beim 1. Visit)', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.match(src, /MIN_VISITS = 3/);
  });

  test('Banner hat ARIA-Label fuer Accessibility', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes("setAttribute('aria-label', 'PROVA als App installieren')"));
  });

  test('iOS-Spezifische UX (Teilen-Symbol-Hint)', () => {
    const src = read('lib/pwa-install-prompt.js');
    assert.ok(src.includes('Teilen-Symbol'));
    assert.ok(src.includes('Home-Bildschirm'));
  });
});

describe('manifest.json — PWA-Vollstaendigkeit', () => {
  const manifest = JSON.parse(read('manifest.json'));

  test('Pflichtfelder vorhanden', () => {
    assert.ok(manifest.name);
    assert.ok(manifest.short_name);
    assert.ok(manifest.start_url);
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.theme_color);
    assert.ok(manifest.background_color);
  });

  test('Icons mind. 192 + 512', () => {
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2);
    const sizes = manifest.icons.map(i => i.sizes);
    assert.ok(sizes.includes('192x192'));
    assert.ok(sizes.includes('512x512'));
  });

  test('Maskable-Icon vorhanden (Adaptive-Icon-Support)', () => {
    const maskable = manifest.icons.some(i => i.purpose && i.purpose.includes('maskable'));
    assert.ok(maskable, 'maskable purpose erforderlich fuer Android Adaptive Icons');
  });

  test('Lang ist "de"', () => {
    assert.equal(manifest.lang, 'de');
  });

  test('Scope auf "/" gesetzt (W10 added)', () => {
    assert.equal(manifest.scope, '/');
  });

  test('App-ID gesetzt fuer Update-Tracking (W10 added)', () => {
    assert.ok(manifest.id);
  });

  test('Shortcuts vorhanden (Quick-Actions vom Home-Screen)', () => {
    assert.ok(Array.isArray(manifest.shortcuts));
    assert.ok(manifest.shortcuts.length > 0);
  });
});

describe('dashboard.html PWA-Integration', () => {
  const html = read('dashboard.html');

  test('manifest.json verlinkt', () => {
    assert.match(html, /<link rel="manifest" href="\/manifest\.json">/);
  });

  test('Theme-Color light + dark Variants (W10 added)', () => {
    assert.match(html, /theme-color"[^>]*media="\(prefers-color-scheme: light\)"/);
    assert.match(html, /theme-color"[^>]*media="\(prefers-color-scheme: dark\)"/);
  });

  test('apple-touch-icon vorhanden', () => {
    assert.match(html, /<link rel="apple-touch-icon"/);
  });

  test('apple-mobile-web-app-* Meta-Tags vorhanden', () => {
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(html, /apple-mobile-web-app-status-bar-style/);
    assert.match(html, /apple-mobile-web-app-title/);
  });

  test('PWA-Install-Prompt Script geladen (W10 added)', () => {
    assert.match(html, /\/lib\/pwa-install-prompt\.js/);
  });
});

describe('offline.html — Fallback-Page', () => {
  test('offline.html existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(REPO, 'offline.html')));
  });

  test('offline.html hat lang="de"', () => {
    const html = read('offline.html');
    assert.match(html, /<html\s+lang="de"/);
  });

  test('offline.html hat User-Friendly Message', () => {
    const html = read('offline.html');
    assert.ok(html.includes('Internetverbindung') || html.includes('Offline'));
  });
});
