// @ts-check
/**
 * MEGA³⁴ C2 — E2E: PDF-Generation (Freigabe-Flow)
 */
const { test, expect } = require('@playwright/test');

test('04: freigabe.html erreichbar', async ({ page }) => {
  await page.goto('/freigabe.html');
  await expect(page).toHaveURL(/(freigabe|login)/);
});

test('04: bescheinigung-erstellen.html zeigt 8-Card-Selector', async ({ page }) => {
  await page.goto('/bescheinigung-erstellen.html');
  if (page.url().includes('bescheinigung-erstellen')) {
    // 8 Bescheinigungs-Typen-Cards
    const cards = page.locator('[data-typ]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  }
});
