/**
 * MEGA⁶⁹-FINAL-3 E2E — Fristen Kalender-View
 * Smoke-Test: View-Toggle, Kalender-Grid rendert, Pfeile navigieren.
 */
const { test, expect } = require('@playwright/test');

test.describe('MEGA⁶⁹ Fristen Kalender', () => {

  test.skip(({ baseURL }) => !process.env.E2E_USER_EMAIL, 'requires logged-in test user');

  test('View-Toggle Liste/Kalender funktioniert', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type=email]', process.env.E2E_USER_EMAIL);
    await page.fill('input[type=password]', process.env.E2E_USER_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL(/dashboard/, { timeout: 12000 });
    await page.goto('/fristen');

    // Default: Liste sichtbar, Kalender hidden
    await expect(page.locator('#fr-view-list')).toBeVisible();
    await expect(page.locator('#fr-view-calendar')).toBeHidden();

    // Klick Kalender → Toggle
    await page.click('button[data-view="calendar"]');
    await expect(page.locator('#fr-view-calendar')).toBeVisible();
    await expect(page.locator('#fr-view-list')).toBeHidden();

    // Monat-Label ist gefüllt
    await expect(page.locator('#cal-month-label')).not.toBeEmpty();

    // 42 Tag-Zellen (6 Wochen × 7 Tage) + 7 DOW-Header
    const cells = page.locator('.cal-day');
    await expect(cells).toHaveCount(42);
  });

  test('Kalender-Navigation: nächster Monat', async ({ page }) => {
    await page.goto('/fristen');
    await page.click('button[data-view="calendar"]');
    const labelBefore = await page.locator('#cal-month-label').textContent();
    await page.click('button:has-text("Weiter")');
    const labelAfter = await page.locator('#cal-month-label').textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });
});
