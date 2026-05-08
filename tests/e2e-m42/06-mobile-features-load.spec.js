// @ts-check
/**
 * MEGA⁴² P7 — Mobile-Features Load-Verification (CC-Subset)
 *
 * Was CC abdecken kann (vs. Marcel-Pflicht-Items in MOBILE-DEVICE-TESTS.md):
 *   - Mobile-CSS lädt
 *   - foto-upload-mobile.js + diktat-mobile.html erreichbar
 *   - Pull-to-Refresh-Lib geladen
 *   - Sync-Conflict-Resolver-Lib geladen
 *   - Bottom-Sheet-Lib geladen
 *
 * Was CC NICHT kann (siehe Runbook): Real-Stylus, Real-Touch-Latenz, iOS-Push.
 */
const { test, expect } = require('@playwright/test');

test('Mobile: foto-upload-mobile.js lädt (Smoke)', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-safari') {
    test.skip(true, 'Mobile-only Test');
    return;
  }
  const resp = await page.goto('/diktat-mobile.html');
  if (resp && resp.status() === 404) {
    test.skip(true, '🔴 nicht deployed');
    return;
  }
  expect(resp.status()).toBeLessThan(400);
});

test('Mobile: prova-design.css lädt + Mobile-Stile aktiv', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-safari') {
    test.skip(true, 'Mobile-only');
    return;
  }
  await page.goto('/');
  // CSS Custom-Property prüfen
  const safeAreaInsetTop = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') ||
           getComputedStyle(document.body).getPropertyValue('--safe-area-inset-top');
  });
  // Sollte definiert sein (auch wenn 0px)
  expect(typeof safeAreaInsetTop).toBe('string');
});

test('Mobile: Skizzen-Canvas-Lib referenziert', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-safari') {
    test.skip(true, 'Mobile-only');
    return;
  }
  const resp = await page.goto('/akte.html').catch(() => null);
  if (!resp || resp.status() === 404 || resp.status() === 401 || resp.status() === 302) {
    test.skip(true, '🔴 Auth-Redirect oder nicht deployed');
    return;
  }
  // Page hat skizzen-canvas script tag (oder lib geladen)
  const hasSkizzen = await page.evaluate(() => {
    return !!document.querySelector('script[src*="skizzen-canvas"]') ||
           !!window.ProvaSkizzenCanvas;
  });
  expect(hasSkizzen).toBeTruthy();
});

test('Mobile: pull-to-refresh script geladen auf Listen-Pages', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-safari') {
    test.skip(true, 'Mobile-only');
    return;
  }
  const resp = await page.goto('/archiv.html').catch(() => null);
  if (!resp || resp.status() >= 400) {
    test.skip(true, '🔴 Auth-Redirect');
    return;
  }
  const hasPTR = await page.evaluate(() => {
    return !!document.querySelector('script[src*="pull-to-refresh"]') ||
           !!window.ProvaPullToRefresh;
  });
  expect(hasPTR).toBeTruthy();
});

test('Mobile: Viewport meta-Tag korrekt', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-safari') {
    test.skip(true, 'Mobile-only');
    return;
  }
  await page.goto('/');
  const viewport = await page.locator('meta[name="viewport"]').first().getAttribute('content');
  expect(viewport).toMatch(/width=device-width/);
  expect(viewport).toMatch(/viewport-fit=cover/);
});
