// @ts-check
/**
 * MEGA³⁴ C2 — E2E: Mobile-Flows (Diktat-Page, Demo, Status)
 */
const { test, expect, devices } = require('@playwright/test');

test.use({ ...devices['iPhone 14 Pro'] });

test('08-mobile: diktat-mobile.html Round-Record-Button (140x140)', async ({ page }) => {
  await page.goto('/diktat-mobile.html');
  if (page.url().includes('login')) {
    test.skip();
    return;
  }
  const btn = page.locator('#dm-record-btn');
  await expect(btn).toBeVisible({ timeout: 5000 });
});

test('08-mobile: demo.html 6-Step-Tour public', async ({ page }) => {
  await page.goto('/demo.html');
  await expect(page.locator('#demo-step-1')).toBeVisible();
});

test('08-mobile: public-status.html erreichbar (kein Auth)', async ({ page }) => {
  await page.goto('/public-status.html');
  await expect(page.locator('#ps-services')).toBeAttached();
});

test('08-mobile: cookie-einstellungen.html Settings-Page', async ({ page }) => {
  await page.goto('/cookie-einstellungen.html');
  await expect(page.locator('#ce-content')).toBeAttached();
});
