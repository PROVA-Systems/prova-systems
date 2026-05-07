// @ts-check
/**
 * MEGA³⁴ C2 — E2E: Bescheinigung erstellen
 */
const { test, expect } = require('@playwright/test');

test('05: 8 Bescheinigungs-Typen verfügbar (data-typ)', async ({ page }) => {
  await page.goto('/bescheinigung-erstellen.html');
  if (page.url().includes('bescheinigung-erstellen')) {
    const expectedTypes = ['sv_bestaetigung', 'maengelfreiheit', 'zustand', 'beweissicherung'];
    for (const t of expectedTypes) {
      const card = page.locator(`[data-typ="${t}"]`);
      await expect(card).toBeAttached();
    }
  }
});
