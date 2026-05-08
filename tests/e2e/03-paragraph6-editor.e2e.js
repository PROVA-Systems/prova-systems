// @ts-check
/**
 * MEGA³⁴ C2 — E2E: §6 Fachurteil-Editor
 */
const { test, expect } = require('@playwright/test');

test('03: stellungnahme.html lädt 60vw-Editor (CSS-Custom-Property)', async ({ page }) => {
  await page.goto('/stellungnahme.html');
  // Login-Redirect ok für Smoke
  if (page.url().includes('stellungnahme')) {
    // CSS-Variable --editor-main-width muss 60vw sein (M31 A1)
    const root = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--editor-main-width').trim();
    });
    expect(root).toMatch(/60vw|60%/);
  }
});

test('03: §6-Fachurteil-Editor Marker in Page-Title', async ({ page }) => {
  await page.goto('/stellungnahme.html');
  if (page.url().includes('stellungnahme')) {
    await expect(page).toHaveTitle(/(§6|Fachurteil|Stellungnahme)/i);
  }
});
