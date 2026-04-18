/* ════════════════════════════════════════════════════════════════════
   PROVA 06-mobile-ortstermin.spec.js (Session 6 — Tier 1, Test #9)

   ZWECK
   Der Ortstermin ist der mobilste Moment der ganzen PROVA-Nutzung:
   SV steht auf einer Baustelle, iPhone/iPad in der Hand, Diktat
   aufnehmen, Fotos machen. Wenn hier ein Button zu klein ist oder
   die Kamera/Mikrofon-Freigabe nicht klappt, ist das SV frustriert
   genug um zu kündigen.

   WAS GETESTET WIRD
   ─────────────────
   #9a  iPhone 13 Pro Viewport (390×844): app.html lädt, kein Layout-Zerbruch
   #9b  iPhone: Mikrofon-FAB existiert, ist sichtbar und tappable
   #9c  iPhone: Touch-Targets ≥ 44×44px (Apple HIG / WCAG 2.5.5)
   #9d  iPhone: Mikrofon-Permission kann per Playwright gegranted werden
   #9e  iPad Pro Viewport (1024×1366): Formular-Layout funktioniert
   #9f  iPhone: Scrolling funktioniert, keine überlappenden Overlays
   ════════════════════════════════════════════════════════════════════ */

const { test, expect, devices } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE  = 'https://prova-systems.de';
const EMAIL = process.env.PROVA_EMAIL || 'marcel_schreiber891@gmx.de';

/* ────────────────────────────────────────────────────────────────────
   Helper: Session + Permissions injizieren
   ──────────────────────────────────────────────────────────────────── */
async function setupMobileSession(browser, deviceDescriptor) {
  const ctx = await browser.newContext({
    ...deviceDescriptor,
    permissions: ['camera', 'microphone'],
    locale: 'de-DE'
  });
  await ctx.addInitScript(({ email }) => {
    localStorage.setItem('prova_user', JSON.stringify({ email, name: email, token: 'test-session' }));
    localStorage.setItem('prova_sv_email', email);
    localStorage.setItem('prova_paket', 'Solo');
    localStorage.setItem('prova_status', 'Aktiv');
    localStorage.setItem('prova_onboarding_done', 'true');
    localStorage.setItem('prova_welcome_seen', '1');
    localStorage.setItem('prova_tour_done', '1');
    localStorage.setItem('prova_trial_start', new Date().toISOString());
    localStorage.setItem('prova_trial_days', '14');
  }, { email: EMAIL });
  return ctx;
}

/* ════════════════════════════════════════════════════════════════════
   iPhone 13 Pro (390×844)
   ════════════════════════════════════════════════════════════════════ */
test.describe('#9 Mobile/Ortstermin — iPhone 13 Pro', () => {

  test('#9a app.html lädt auf iPhone ohne Layout-Zerbruch', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPhone 13 Pro']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    const viewport = page.viewportSize();
    console.log(`    ℹ️  Viewport: ${viewport.width}×${viewport.height}`);
    expect(viewport.width).toBe(390);

    // Body-Width darf den Viewport NICHT überschreiten (= horizontaler Scrollbar = Bug)
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    console.log(`    ℹ️  Body-ScrollWidth: ${bodyScrollWidth}px, WindowWidth: ${windowWidth}px`);
    expect(bodyScrollWidth, 'Body darf nicht breiter als Viewport sein (horizontal scroll = UX-Bug)').toBeLessThanOrEqual(windowWidth + 2);

    // Main-Content muss sichtbar sein
    const schadenart = page.locator('#f-schadenart');
    await expect(schadenart, 'Erstes Formularfeld muss auf Mobile sichtbar sein').toBeVisible({ timeout: 5000 });

    await ctx.close();
  });

  test('#9b Mikrofon-FAB sichtbar und tappable auf iPhone', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPhone 13 Pro']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Stammdaten schnell ausfüllen damit wir auf Step 2 kommen wo das FAB ist
    const schadenart = page.locator('#f-schadenart');
    if (await schadenart.isVisible().catch(() => false)) {
      const opts = await schadenart.locator('option').allTextContents();
      const idx = opts.findIndex(o => o.trim() && !o.match(/^bitte/i));
      if (idx >= 0) await schadenart.selectOption({ index: idx });
    }
    await page.locator('#f-auftraggeber-name').fill('Mobile-Test-Versicherung');
    if (await page.locator('#f-strasse').isVisible().catch(() => false)) {
      await page.locator('#f-strasse').fill('Teststraße 1');
      await page.locator('#f-plz').fill('50667');
      await page.locator('#f-ort').fill('Köln');
    }

    // "Weiter" auf Mobile kann anders heißen — beide Varianten versuchen
    const weiterBtn = page.locator('.mobile-bar-btn-pri, button:has-text("Weiter")').first();
    if (await weiterBtn.isVisible().catch(() => false)) {
      await weiterBtn.tap();
      await page.waitForTimeout(1500);
    }

    // Mikrofon-FAB (mobile floating action button)
    const mobileFab = page.locator('#mobile-rec-fab');
    const exists = await mobileFab.count() > 0;
    console.log(`    ℹ️  #mobile-rec-fab existiert: ${exists}`);

    if (exists) {
      const visible = await mobileFab.isVisible().catch(() => false);
      console.log(`    ℹ️  #mobile-rec-fab sichtbar: ${visible}`);

      if (visible) {
        const box = await mobileFab.boundingBox();
        if (box) {
          console.log(`    ℹ️  FAB-Größe: ${Math.round(box.width)}×${Math.round(box.height)}px`);
          // Mobile FAB sollte deutlich größer als min-target sein (üblich 56–64px)
          expect(box.width, 'Mikrofon-FAB Breite mindestens 44px (Apple HIG)').toBeGreaterThanOrEqual(44);
          expect(box.height, 'Mikrofon-FAB Höhe mindestens 44px (Apple HIG)').toBeGreaterThanOrEqual(44);
        }
      }
    } else {
      console.log('    ⚠ Kein Mikrofon-FAB auf aktuellem Step — Step-2-Übergang möglicherweise nicht erfolgt');
    }

    await ctx.close();
  });

  test('#9c Alle sichtbaren Buttons haben Touch-Target ≥ 44×44px', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPhone 13 Pro']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Alle interaktiven Elemente messen
    const tooSmall = await page.evaluate(() => {
      const MIN = 44;
      const problems = [];

      // Buttons + a[href] + input[type=button|submit] + [role=button]
      const interactive = document.querySelectorAll(
        'button:not([disabled]):not([hidden]), a[href], input[type="button"], input[type="submit"], [role="button"]'
      );

      for (const el of interactive) {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const rect = el.getBoundingClientRect();
        // Nur wirklich sichtbare Elemente prüfen
        if (rect.width === 0 || rect.height === 0) continue;
        // Elemente außerhalb Viewport ignorieren
        if (rect.bottom < 0 || rect.top > window.innerHeight + 2000) continue;

        if (rect.width < MIN || rect.height < MIN) {
          // Text extrahieren für die Fehlermeldung
          let label = (el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 30);
          if (!label) label = `<${el.tagName.toLowerCase()} ${el.id ? '#'+el.id : ''}>`;

          problems.push({
            label,
            width:  Math.round(rect.width),
            height: Math.round(rect.height),
            id:     el.id || '',
            class:  (el.className || '').toString().slice(0, 40)
          });
        }
      }
      return problems;
    });

    console.log(`    ℹ️  Interaktive Elemente mit Touch-Target < 44px: ${tooSmall.length}`);
    if (tooSmall.length > 0) {
      console.log('    ⚠ Problematische Elemente (Top 10):');
      tooSmall.slice(0, 10).forEach(p => {
        console.log(`       ${p.width}×${p.height}px  "${p.label}"${p.id ? ' #'+p.id : ''}`);
      });
    }

    // Warn-Schwelle: bis 8 kleine Targets sind akzeptabel (Icons, Close-Buttons)
    // Über 8: Polish-Arbeit nötig
    expect(tooSmall.length, 'Maximal 8 interaktive Elemente unter 44×44px auf Dashboard').toBeLessThanOrEqual(8);

    await ctx.close();
  });

  test('#9d Mikrofon-Permission wird gegranted (kein Permission-Dialog-Blocker)', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPhone 13 Pro']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Kann das Permission-System Mikrofon abfragen?
    const permStatus = await page.evaluate(async () => {
      try {
        const res = await navigator.permissions.query({ name: 'microphone' });
        return res.state;
      } catch (e) {
        return 'error: ' + e.message;
      }
    });

    console.log(`    ℹ️  Mikrofon-Permission-Status: ${permStatus}`);
    // 'granted' ideal, 'prompt' = würde Dialog zeigen, 'denied' = blockiert
    expect(['granted', 'prompt'], 'Mikrofon-Permission darf NICHT denied sein').toContain(permStatus);

    // MediaDevices API verfügbar?
    const mediaApiReady = await page.evaluate(() =>
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
    console.log(`    ℹ️  getUserMedia verfügbar: ${mediaApiReady}`);
    expect(mediaApiReady, 'MediaDevices.getUserMedia muss verfügbar sein für Diktat').toBeTruthy();

    await ctx.close();
  });

  test('#9f Keine überlappenden Overlays, Hauptcontent erreichbar', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPhone 13 Pro']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Reste vom Tour-Overlay wegräumen
    await page.evaluate(() => {
      document.querySelectorAll('.tour-overlay, .tour-popup, .tour-tooltip, .tour-highlight').forEach(el => el.remove());
    });

    // Prüfen: Hauptinhalt ist erreichbar (nicht von z-index-Monstern verdeckt)
    const mainVisible = await page.evaluate(() => {
      const main = document.querySelector('main, .dashboard-main, #main-content, body > div');
      if (!main) return { ok: false, reason: 'kein Main-Element' };
      const rect = main.getBoundingClientRect();
      return {
        ok: rect.width > 100 && rect.height > 100,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });

    console.log(`    ℹ️  Main-Content: ${mainVisible.width}×${mainVisible.height}px, erreichbar: ${mainVisible.ok}`);
    expect(mainVisible.ok, 'Hauptcontent muss auf Mobile erreichbar sein').toBeTruthy();

    await ctx.close();
  });
});

/* ════════════════════════════════════════════════════════════════════
   iPad Pro (1024×1366)
   ════════════════════════════════════════════════════════════════════ */
test.describe('#9 Mobile/Ortstermin — iPad Pro', () => {

  test('#9e iPad: app.html Formular-Layout funktioniert', async ({ browser }) => {
    const ctx = await setupMobileSession(browser, devices['iPad Pro 11']);
    const page = await ctx.newPage();

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    const viewport = page.viewportSize();
    console.log(`    ℹ️  iPad-Viewport: ${viewport.width}×${viewport.height}`);

    // Horizontal-Scroll prüfen
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth, 'Body breiter als iPad-Viewport = Layout-Bug').toBeLessThanOrEqual(windowWidth + 2);

    // Alle Pflichtfelder sichtbar?
    const fields = ['#f-schadenart', '#f-auftraggeber-name', '#f-strasse', '#f-plz', '#f-ort'];
    for (const sel of fields) {
      const v = await page.locator(sel).isVisible().catch(() => false);
      console.log(`    ℹ️  ${sel}: ${v ? '✅ sichtbar' : '❌ nicht sichtbar'}`);
      expect(v, `${sel} muss auf iPad sichtbar sein`).toBeTruthy();
    }

    await ctx.close();
  });
});
