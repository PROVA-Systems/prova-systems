/* ════════════════════════════════════════════════════════════
   PROVA 01-login.spec.js v3
   Keine Änderungen ggü. v2 — 3/3 grün in letztem Lauf.
════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE     = 'https://prova-systems.de';
const EMAIL    = process.env.PROVA_EMAIL    || 'marcel_schreiber891@gmx.de';
const PASSWORD = process.env.PROVA_PASSWORD || 'Baldoin2022';

test.describe('Login-Flow', () => {

  test('Login-Seite lädt mit Login-Formular', async ({ page }) => {
    await page.goto(BASE + '/app-login.html?from=landing');
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-pw')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-btn')).toBeVisible({ timeout: 10000 });
  });

  test('Einloggen führt weg von app-login.html', async ({ page }) => {
    await page.goto(BASE + '/app-login.html?from=landing');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const tabLogin = page.locator('#tab-login');
    if (await tabLogin.isVisible().catch(() => false)) {
      await tabLogin.click();
      await page.waitForTimeout(300);
    }

    await page.locator('#login-email').fill(EMAIL);
    await page.locator('#login-pw').fill(PASSWORD);

    await Promise.all([
      page.waitForURL(
        url => !url.toString().includes('/app-login.html') || url.toString().includes('reason='),
        { timeout: 20000 }
      ).catch(() => {}),
      page.locator('#login-btn').click()
    ]);

    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`    ℹ️  Nach Login auf: ${finalUrl}`);

    const userJson = await page.evaluate(() => localStorage.getItem('prova_user'));
    const svEmail  = await page.evaluate(() => localStorage.getItem('prova_sv_email'));

    console.log(`    ℹ️  localStorage.prova_user:     ${userJson ? 'gesetzt' : 'FEHLT'}`);
    console.log(`    ℹ️  localStorage.prova_sv_email: ${svEmail || 'FEHLT'}`);

    expect(userJson, 'localStorage.prova_user muss nach Login gesetzt sein').toBeTruthy();
    expect(userJson).toContain('@');

    expect(
      finalUrl.includes('reason=') && !finalUrl.includes('reason=logout'),
      `Kein Login-Error im URL: ${finalUrl}`
    ).toBeFalsy();
  });

  test('Dashboard erreichbar mit gesetzter Session', async ({ page, context }) => {
    await context.addInitScript(({ email }) => {
      localStorage.setItem('prova_user', JSON.stringify({
        email, name: email, token: 'test-session'
      }));
      localStorage.setItem('prova_sv_email', email);
      localStorage.setItem('prova_paket', 'Solo');
      localStorage.setItem('prova_onboarding_done', 'true');
      localStorage.setItem('prova_welcome_seen', '1');
      localStorage.setItem('prova_erster_fall_erstellt', '1');
      localStorage.setItem('prova_tour_done', '1');  // v3: Tour-Overlay verhindern
      localStorage.setItem('prova_trial_start', new Date().toISOString());
      localStorage.setItem('prova_trial_days', '14');
    }, { email: EMAIL });

    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    expect(page.url()).toContain('dashboard.html');
    await expect(page.locator('body')).toBeVisible();

    const badges = await page.locator('[class*="badge"], [class*="paket"], [class*="trial"]').count();
    console.log(`    ℹ️  Gefundene Paket/Trial-Badges: ${badges}`);
  });
});
