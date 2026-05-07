// @ts-check
/**
 * MEGA³⁴ C2 — E2E: Cmd+K Globale Suche
 */
const { test, expect } = require('@playwright/test');

test('07: Cmd+K öffnet Search-Overlay', async ({ page }) => {
  await page.goto('/dashboard.html');
  // Login-Redirect-Tolerance
  if (!page.url().includes('dashboard')) {
    test.skip();
    return;
  }
  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(300);
  const overlay = page.locator('#prova-search-overlay');
  await expect(overlay).toHaveClass(/open/);
});

test('07: ESC schließt Search-Overlay', async ({ page }) => {
  await page.goto('/dashboard.html');
  if (!page.url().includes('dashboard')) {
    test.skip();
    return;
  }
  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const overlay = page.locator('#prova-search-overlay');
  await expect(overlay).not.toHaveClass(/open/);
});
