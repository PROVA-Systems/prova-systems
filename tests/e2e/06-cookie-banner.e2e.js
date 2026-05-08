// @ts-check
/**
 * MEGA³⁴ C2 — E2E: Cookie-Banner DSGVO First-Visit-Flow
 */
const { test, expect } = require('@playwright/test');

test('06: First-Visit zeigt Cookie-Banner-Modal', async ({ page, context }) => {
  // localStorage muss leer sein für First-Visit-Simulation
  await context.clearCookies();
  await page.goto('/');
  // Cookie-Modal erscheint mit 300ms-Delay
  await page.waitForTimeout(800);
  // Modal-Element prüfen (cc-modal-root oder Buttons)
  const modal = page.locator('#cc-modal-root, .cc-overlay');
  await expect(modal).toBeVisible({ timeout: 5000 });
});

test('06: Cookie-Banner hat 3 Buttons (Alle/Nur-Notwendige/Auswahl)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await page.waitForTimeout(800);
  await expect(page.locator('#cc-accept-all')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#cc-only-necessary')).toBeVisible();
  await expect(page.locator('#cc-save-custom')).toBeVisible();
});

test('06: Accept-All-Button schließt Modal + setzt localStorage', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await page.waitForTimeout(800);
  await page.click('#cc-accept-all');
  // Modal weg
  await expect(page.locator('#cc-modal-root')).toHaveCount(0);
  // localStorage gesetzt
  const consent = await page.evaluate(() => localStorage.getItem('prova_cookie_consent'));
  expect(consent).toBeTruthy();
});
