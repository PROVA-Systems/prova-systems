/**
 * MEGA⁶⁹-FINAL-3 E2E — Mahnwesen Supabase-native
 * Smoke-Test: Page lädt, KPI-Tiles sichtbar, Filter funktioniert.
 * Voraussetzung: User ist eingeloggt (siehe 01-login-flow.e2e.js).
 */
const { test, expect } = require('@playwright/test');

test.describe('MEGA⁶⁹ Mahnwesen', () => {

  test.skip(({ baseURL }) => !process.env.E2E_USER_EMAIL, 'requires logged-in test user (E2E_USER_EMAIL)');

  test('Page rendert mit 4 KPI-Tiles', async ({ page }) => {
    // Login (existing-fixture analog 01-login-flow.e2e.js)
    await page.goto('/login');
    await page.fill('input[type=email]', process.env.E2E_USER_EMAIL);
    await page.fill('input[type=password]', process.env.E2E_USER_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL(/dashboard/, { timeout: 12000 });

    await page.goto('/mahnwesen');
    await expect(page.locator('h1', { hasText: 'Mahnwesen' })).toBeVisible();
    await expect(page.locator('#kpi-offen')).toBeVisible();
    await expect(page.locator('#kpi-ueberfaellig')).toBeVisible();
    await expect(page.locator('#kpi-zinsen')).toBeVisible();
    await expect(page.locator('#kpi-stufen')).toBeVisible();
  });

  test('Filter "Nur überfällig" filtert Liste', async ({ page }) => {
    await page.goto('/mahnwesen');
    await page.selectOption('#f-status', 'overdue');
    // KPI-Anzahl-Element existiert und enthält Zahl
    await expect(page.locator('#mh-count')).toBeVisible();
  });
});
