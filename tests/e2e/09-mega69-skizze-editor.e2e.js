/**
 * MEGA⁶⁹-FINAL-3 E2E — Skizze-Editor lädt + Tools sichtbar
 * Smoke-Test: Modal öffnet, 9 Tools sind klickbar.
 */
const { test, expect } = require('@playwright/test');

test.describe('MEGA⁶⁹ Skizze-Editor', () => {

  test('Stand-alone Editor-Page lädt + alle 9 Tools sichtbar', async ({ page }) => {
    await page.goto('/tools/test-mega69-final-2.html');
    await page.click('text=+ Neue Skizze öffnen');
    // Modal-Overlay sollte erscheinen
    await expect(page.locator('.prova-skizze-overlay')).toBeVisible({ timeout: 6000 });
    // 9 Tools (data-tool Attribute)
    const tools = ['auswahl', 'linie', 'pfeil', 'rechteck', 'kreis', 'text', 'mass', 'eraser', 'foto'];
    for (const t of tools) {
      await expect(page.locator(`.sk-tool[data-tool="${t}"]`)).toBeVisible();
    }
  });

  test('Tools-Aktivierung wechselt is-active-Class', async ({ page }) => {
    await page.goto('/tools/test-mega69-final-2.html');
    await page.click('text=+ Neue Skizze öffnen');
    await expect(page.locator('.prova-skizze-overlay')).toBeVisible();
    await page.click('.sk-tool[data-tool="rechteck"]');
    await expect(page.locator('.sk-tool[data-tool="rechteck"]')).toHaveClass(/is-active/);
  });
});
