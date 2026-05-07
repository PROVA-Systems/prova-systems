// @ts-check
/**
 * MEGA³⁴ C2 — E2E Smoke-Test: Login → Dashboard
 */
const { test, expect } = require('@playwright/test');

test('01: Login-Page erreichbar + zeigt Login-Form', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page).toHaveTitle(/Login|Anmelden|PROVA/i);
  // Login-Form-Elemente
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
});

test('01: Landing-Page → Login-Link funktioniert', async ({ page }) => {
  await page.goto('/');
  // Login-Link in Header oder Hero
  const loginLink = page.locator('a[href*="login"]').first();
  await expect(loginLink).toBeVisible();
});
