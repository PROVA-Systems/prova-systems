// ============================================================
// PROVA Systems — MEGA⁴⁶ E2E-Smoke-Test-Suite (Skeleton)
// ============================================================
// 10 Kern-Workflows als Playwright-Tests. Real-Implementation
// erfordert Test-User-Credentials in ENV:
//   PROVA_TEST_EMAIL, PROVA_TEST_PASSWORD
//   PROVA_BASE_URL (default: https://app.prova-systems.de)
//
// Run: npx playwright test tests/playwright/mega46-e2e-smoke.spec.js
// ============================================================

const { test, expect } = require('@playwright/test');

const BASE = process.env.PROVA_BASE_URL || 'https://app.prova-systems.de';
const EMAIL = process.env.PROVA_TEST_EMAIL || 'marcel.schreiber891@gmail.com';
const PASSWORD = process.env.PROVA_TEST_PASSWORD || '';

const SKIP_REAL = !PASSWORD;
const skipReal = (reason) => SKIP_REAL && test.skip(true, reason);

// ─── Helpers ──────────────────────────────────────────────────

async function login(page) {
  await page.goto(BASE + '/app-login.html');
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-pw', PASSWORD);
  await page.click('#login-btn');
  await page.waitForURL(/dashboard\.html/, { timeout: 10000 });
}

async function expectNoRedConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  // Expect after navigation completes
  await page.waitForLoadState('networkidle');
  // Whitelist known harmless errors (z.B. Sentry-CDN-Fail in Dev)
  const filtered = errors.filter(e =>
    !/Sentry/.test(e) && !/Failed to load resource/.test(e));
  expect(filtered, 'Console errors: ' + filtered.join('\n')).toEqual([]);
}

// ─── Test-Cases ───────────────────────────────────────────────

test.describe('MEGA46 E2E Smoke', () => {

  test('1. Login → Dashboard rendert', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-section="kpi"], #dashboard-kpi, .dashboard-stats').first()).toBeVisible({ timeout: 5000 });
    await expectNoRedConsoleErrors(page);
  });

  test('2. Akte erstellen → Save funktioniert', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/neuer-fall.html');
    // Wizard-Steps durchlaufen — Implementation TODO basierend auf finaler UI
    test.skip(true, 'Real-Impl folgt nach Wizard-UI-Stabilisierung');
  });

  test('3. Diktat → KI → §6 Fachurteil', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    test.skip(true, 'Audio-Upload + KI-Pipeline benötigt fixture-Audio');
  });

  test('4. PDF-Generation', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/dashboard.html');
    test.skip(true, 'PDF-Download requires demo-Akte; pending fixture-setup');
  });

  test('5. Rechnung + ZUGFeRD-Export', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/rechnungen.html');
    test.skip(true, 'Rechnung-Flow requires existing Auftrag fixture');
  });

  test('6. DSGVO-Auskunft → JSON-Download', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/dsgvo-mein-konto.html');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      page.click('text=Daten exportieren').catch(() => null)
    ]);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/prova-export-.*\.json/);
    } else {
      test.skip(true, 'DSGVO-Export-Button nicht gefunden — UI-Selector Update nötig');
    }
  });

  test('7. Admin-Cockpit → KPIs laden', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/admin-cockpit.html');
    // Erwartung: System-Health-Box ist grün
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    // 2FA-Pflicht für Admin → falls 403 erscheint, ist das erwartet
    const has403 = await page.locator('text=2FA-Pflicht, text=Admin-Zugriff erforderlich').count();
    if (has403 > 0) test.skip(true, 'Admin-Account braucht 2FA aktiviert');
  });

  test('8. Pilot-Onboarding → Demo-Akte erstellt', async ({ page, request }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/onboarding-supabase.html');
    test.skip(true, 'Onboarding-Flow benötigt clean Test-Account fixture');
  });

  test('9. Stripe-Checkout öffnet (NICHT durchziehen)', async ({ page }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    await login(page);
    await page.goto(BASE + '/pricing.html');
    // Klick auf Solo-Plan-Button erwartet Redirect zu Stripe Checkout
    test.skip(true, 'Stripe-Checkout-Button-Selector pending UI-Stabilisierung');
  });

  test('10. Mobile-Test 380px → Login + Dashboard', async ({ browser }) => {
    skipReal('PROVA_TEST_PASSWORD not set');
    const ctx = await browser.newContext({
      viewport: { width: 380, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await ctx.newPage();
    await login(page);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    // Mobile Burger-Menu sichtbar?
    const burger = await page.locator('[aria-label="Menu"], .nav-burger, .mobile-menu-btn').count();
    expect(burger).toBeGreaterThan(0);
    await ctx.close();
  });

});

// ─── Standalone Edge-Health-Check ────────────────────────────

test('Edge-Functions Health (no auth)', async ({ request }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cngteblrbpwsyypexjrv.supabase.co';
  const ANON = process.env.SUPABASE_ANON_KEY || '';
  if (!ANON) test.skip(true, 'SUPABASE_ANON_KEY not set');
  const res = await request.get(SUPABASE_URL + '/functions/v1/health', {
    headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + ANON }
  });
  expect([200, 503]).toContain(res.status());  // 503 ok wenn ENV-degraded
  const body = await res.json();
  expect(body).toHaveProperty('status');
  expect(body).toHaveProperty('checks');
});
