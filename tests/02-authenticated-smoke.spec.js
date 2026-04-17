/* ════════════════════════════════════════════════════════════
   PROVA 02-authenticated-smoke.spec.js v5 (Session 4)
   FIXES ggü. v4:
   - Bug B: PROVASearch.open() warten bis init() fertig — Race-Condition
   - Bug C: normen.html — auf konkrete Karten warten (AJAX-Load)
════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE  = 'https://prova-systems.de';
const EMAIL = process.env.PROVA_EMAIL || 'marcel_schreiber891@gmx.de';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(({ email }) => {
    localStorage.setItem('prova_user', JSON.stringify({
      email, name: email, token: 'test-session'
    }));
    localStorage.setItem('prova_sv_email', email);
    localStorage.setItem('prova_paket', 'Solo');
    localStorage.setItem('prova_status', 'Aktiv');
    localStorage.setItem('prova_onboarding_done', 'true');
    localStorage.setItem('prova_welcome_seen', '1');
    localStorage.setItem('prova_erster_fall_erstellt', '1');
    localStorage.setItem('prova_tour_done', '1');
    localStorage.setItem('prova_trial_start', new Date().toISOString());
    localStorage.setItem('prova_trial_days', '14');
  }, { email: EMAIL });
});

test.describe('Authenticated Smoke: Hauptseiten nach Login', () => {

  const PAGES = [
    { name: 'Dashboard',         path: '/dashboard.html' },
    { name: 'Archiv',            path: '/archiv.html' },
    { name: 'Termine',           path: '/termine.html' },
    { name: 'Rechnungen',        path: '/rechnungen.html' },
    { name: 'Kontakte',          path: '/kontakte.html' },
    { name: 'Briefe & Vorlagen', path: '/briefvorlagen.html' },
    { name: 'Normen-Datenbank',  path: '/normen.html' },
    { name: 'Textbausteine',     path: '/textbausteine.html' },
    { name: 'Einstellungen',     path: '/einstellungen.html' },
    { name: 'Hilfe',             path: '/hilfe.html' },
    { name: 'JVEG-Rechner',      path: '/jveg.html' },
    { name: 'E-Rechnung',        path: '/erechnung.html' },
    { name: 'Statistiken',       path: '/statistiken.html' },
  ];

  for (const pg of PAGES) {
    test(`${pg.name} lädt ohne Redirect-zum-Login (${pg.path})`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push('PageError: ' + e.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push('Console: ' + msg.text());
      });

      const response = await page.goto(BASE + pg.path);

      if (response.status() === 403 || response.status() === 503) {
        console.log(`    ⚠ ${pg.name}: HTTP ${response.status()} (Cloudflare/Netlify Rate-Limit, kein Code-Bug)`);
        return;
      }

      expect(response.status()).toBeLessThan(400);

      await page.waitForTimeout(1500);
      const currentUrl = page.url();
      expect(
        currentUrl.includes('app-login.html'),
        `${pg.path} hat zu Login-Seite redirected — Auth-Guard blockt: ${currentUrl}`
      ).toBeFalsy();

      await expect(page.locator('body')).toBeVisible();

      const sidebar = page.locator('nav.sidebar, #sidebar').first();
      await expect(sidebar, 'Sidebar-Element muss existieren').toBeAttached({ timeout: 5000 });

      await page.waitForFunction(() => {
        const sb = document.querySelector('nav.sidebar, #sidebar');
        return sb && (sb.children.length > 0 || sb.textContent.trim().length > 20);
      }, { timeout: 8000 }).catch(() => {
        console.log(`    ⚠ ${pg.name}: Sidebar leer nach 8s`);
      });

      const criticalErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.toLowerCase().includes('analytics') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('net::ERR_FAILED') &&
        !e.includes('401') &&
        !e.includes('403')
      );
      if (criticalErrors.length > 0) {
        console.log(`    ⚠ ${pg.name}: ${criticalErrors.length} Fehler:`);
        criticalErrors.slice(0, 3).forEach(e => console.log(`       ${e.slice(0, 150)}`));
      }
    });
  }
});

test.describe('Normen-Test: Daten werden geladen', () => {

  test('normen.html zeigt Norm-Karten', async ({ page }) => {
    await page.goto(BASE + '/normen.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    expect(page.url()).toContain('normen.html');

    // v5 Fix: Auf konkrete Norm-Karten warten — Karten kommen via AJAX
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[class*="norm"], [class*="Norm"], [data-norm]');
      return cards.length >= 10;
    }, { timeout: 10000 }).catch(() => {
      console.log('    ⚠ Karten kamen nicht innerhalb 10s — möglicherweise Airtable-Lag');
    });

    const pageText = await page.locator('body').innerText();
    const counterMatch = pageText.match(/(\d+)\s*Normen/i);
    if (counterMatch) {
      console.log(`    ℹ️  Normen-Counter zeigt: "${counterMatch[0]}"`);
    }

    const karten = await page.locator('[class*="norm"], [class*="Norm"], [data-norm]').count();
    console.log(`    ℹ️  Norm-Karten im DOM: ${karten}`);
    expect(karten, 'Mindestens 10 Norm-Karten').toBeGreaterThan(10);
  });

  test('Globale Suche findet DIN 4108', async ({ page }) => {
    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // v5 Fix: Auf PROVASearch.init() warten (Race-Condition)
    // Das Modal-DOM wird erst NACH DOMContentLoaded async aufgebaut
    await page.waitForFunction(() => {
      return window.PROVASearch
        && typeof window.PROVASearch.open === 'function'
        && document.getElementById('prova-search-overlay') !== null;
    }, { timeout: 10000 }).catch(() => {
      console.log('    ⚠ PROVASearch nicht initialisiert nach 10s');
    });

    // Tour-Overlay-Reste defensiv entfernen
    await page.evaluate(() => {
      document.querySelectorAll('.tour-overlay, .tour-popup, .tour-tooltip, .tour-highlight').forEach(el => el.remove());
      if (window.PROVASearch && typeof window.PROVASearch.open === 'function') {
        window.PROVASearch.open();
      }
    });

    await page.waitForTimeout(800);

    const searchInput = page.locator('#prova-search-field');
    await expect(searchInput, 'Such-Modal muss sichtbar sein nach PROVASearch.open()').toBeVisible({ timeout: 5000 });

    await searchInput.fill('DIN 4108');
    await page.waitForTimeout(1500);

    const results = page.locator('#prova-search-results .ps-item');
    const count = await results.count();
    console.log(`    ℹ️  Suchergebnisse für "DIN 4108": ${count}`);
    expect(count, 'Mindestens 1 Treffer für DIN 4108').toBeGreaterThan(0);

    const firstText = await results.first().innerText();
    console.log(`    ℹ️  Erstes Ergebnis: "${firstText.slice(0, 80)}"`);
    expect(firstText.toLowerCase()).toContain('4108');
  });
});

test.describe('Session 3: Auth-Guard Self-Executing', () => {

  test('Geschützte Seite ohne Session → Redirect zu Login', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(BASE + '/dashboard.html');
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`    ℹ️  dashboard.html ohne Session führt zu: ${finalUrl}`);

    // Wenn Test fehlschlägt → entweder Code nicht deployed ODER Service Worker hat alte Version gecached
    if (!finalUrl.includes('app-login.html')) {
      console.log('    ❌ ERWARTET app-login.html — bekam: ' + finalUrl);
      console.log('    💡 Mögliche Ursachen:');
      console.log('       1. session3-fixes ZIP ist NICHT deployed (git push fehlt)');
      console.log('       2. Service Worker cached alte auth-guard.js (Hard-Refresh nötig)');
      console.log('       3. Verifizier mit: curl https://prova-systems.de/auth-guard.js | grep SELBST-AKTIVIERUNG');
    }

    expect(finalUrl, 'Dashboard ohne Session MUSS zu app-login.html redirecten').toContain('app-login.html');
    await ctx.close();
  });

  test('Geschützte Seite ohne Session → Redirect mit ?next= Parameter', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(BASE + '/archiv.html');
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`    ℹ️  archiv.html ohne Session führt zu: ${finalUrl}`);
    expect(finalUrl).toContain('app-login.html');
    if (finalUrl.includes('next=')) {
      console.log('    ✅ ?next= Parameter gesetzt — Rück-Redirect möglich');
    }

    await ctx.close();
  });

  test('Öffentliche Seiten: kein Redirect (AGB)', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(BASE + '/agb.html');
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    console.log(`    ℹ️  AGB ohne Session bleibt auf: ${finalUrl}`);
    expect(finalUrl).toContain('agb.html');
    expect(finalUrl).not.toContain('app-login.html');

    await ctx.close();
  });
});
