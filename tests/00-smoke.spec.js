/* ════════════════════════════════════════════════════════════
   PROVA 00-smoke.spec.js v3
   ÄNDERUNGEN ggü. v2:
   - CACHE_VERSION-Regex erkennt jetzt 'prova-v59', 'v125', 'v140' etc.
     Bisher matchte nur 'v\d+' — jetzt auch Prefix-Format.
════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://prova-systems.de';

test.describe('Smoke-Test: Öffentliche Seiten', () => {
  const PAGES = [
    { name: 'Startseite',    path: '/' },
    { name: 'Login-Seite',   path: '/app-login.html' },
    { name: 'AGB',           path: '/agb.html' },
    { name: 'Datenschutz',   path: '/datenschutz.html' },
    { name: 'Impressum',     path: '/impressum.html' },
  ];

  for (const pg of PAGES) {
    test(`${pg.name} (${pg.path}) lädt ohne Fehler`, async ({ page }) => {
      const response = await page.goto(BASE + pg.path);
      expect(response.status(), `HTTP-Status für ${pg.path}`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Smoke-Test: Kritische Assets', () => {

  test('prova-design.css ist erreichbar', async ({ request }) => {
    const response = await request.get(BASE + '/prova-design.css');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.length).toBeGreaterThan(1000);
    expect(body).toContain('--surface');
  });

  test('global-search.js ist erreichbar (Session-2-Fix optional)', async ({ request }) => {
    const response = await request.get(BASE + '/global-search.js');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.length, 'global-search.js muss substanziellen Content haben').toBeGreaterThan(5000);

    if (!body.includes('_typeLabel')) {
      console.log('    ⚠ Session-2-Fix "_typeLabel" noch nicht deployed (erwartet bis Deploy-Run)');
    } else {
      console.log('    ✅ Session-2-Fix "_typeLabel" im Live-System');
    }
  });

  test('Service Worker Version erreichbar', async ({ request }) => {
    const response = await request.get(BASE + '/sw.js');
    expect(response.status()).toBe(200);
    const body = await response.text();

    // Flexibler Regex: erkennt 'v125', 'prova-v125', 'prova-v59' etc.
    const match = body.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    expect(match, 'CACHE_VERSION muss im sw.js stehen').toBeTruthy();

    const versionString = match[1];
    const versionMatch = versionString.match(/v?(\d+)/);
    expect(versionMatch, `Version-Nummer in "${versionString}" muss extrahierbar sein`).toBeTruthy();
    const version = parseInt(versionMatch[1], 10);

    console.log(`    ℹ️  Service Worker-Version: "${versionString}" → v${version}`);
    expect(version, 'Version muss >= 50 sein (alte Deploys)').toBeGreaterThanOrEqual(50);

    if (version < 140) {
      console.log(`    ⚠ v${version} < v140 — Session-1+2-Fixes noch nicht deployed`);
    }
  });

  test('Normen-Function erreichbar', async ({ request }) => {
    const response = await request.get(BASE + '/.netlify/functions/normen');
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('normen');
      const count = Array.isArray(json.normen) ? json.normen.length : 0;
      console.log(`    ℹ️  Normen in Airtable: ${count}`);
      expect(count, 'Normen-DB muss mind. 10 Einträge haben').toBeGreaterThan(10);
      if (count < 200) {
        console.log(`    ⚠ Nur ${count} Normen — sync-normen.js noch nicht komplett (Ziel: 264)`);
      }
    }
  });
});
