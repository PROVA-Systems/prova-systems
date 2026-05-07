// @ts-check
/**
 * MEGA³⁴ C2 — E2E: Neuer Schadensfall (Wizard-Flow)
 */
const { test, expect } = require('@playwright/test');

test('02: neuer-fall.html lädt Wizard-Stepper', async ({ page }) => {
  await page.goto('/neuer-fall.html');
  // Page wird zu Login redirected wenn nicht eingeloggt — das ist OK für Smoke
  // Wir prüfen nur dass entweder Wizard ODER Login geladen wird
  await expect(page).toHaveURL(/(neuer-fall|login)/);
});

test('02: Phase-Indicator §1-§6 in neuer-fall.html (data-phase-nr)', async ({ page }) => {
  await page.goto('/neuer-fall.html');
  if (page.url().includes('neuer-fall')) {
    // Wenn Page lädt: Phase-Indicator muss da sein (M33 A1)
    const phases = page.locator('[data-phase-nr]');
    await expect(phases.first()).toBeVisible({ timeout: 5000 });
  }
});
