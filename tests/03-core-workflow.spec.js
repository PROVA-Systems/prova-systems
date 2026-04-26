/* ════════════════════════════════════════════════════════════
   PROVA 03-core-workflow.spec.js v3
   KORREKTUR ggü. v2:
   - prova_tour_done='1' in beforeEach → verhindert .tour-overlay
   - Ansonsten unverändert, 6/6 grün in v2.
════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE  = 'https://prova-systems.de';
const EMAIL = process.env.PROVA_EMAIL || 'marcel_schreiber891@gmx.de';

const TESTFALL_NAME = `PLAYWRIGHT_TESTFALL_${Date.now()}`;
const TESTFALL_AZ   = `PW-${Date.now()}`;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(({ email }) => {
    localStorage.setItem('prova_user', JSON.stringify({
      email, name: email, token: 'test-session'
    }));
    localStorage.setItem('prova_sv_email', email);
    // P5.C1: HMAC-Token-Mock fuer auth-guard P4A.4
    var _exp = Math.floor(Date.now()/1000) + 3600;
    var _h = btoa(JSON.stringify({sub: email, exp: _exp})).replace(/[+]/g,'-').replace(/[/]/g,'_').replace(/=+$/,'');
    localStorage.setItem('prova_auth_token', _h + '.mocksig');
    localStorage.setItem('prova_paket', 'Solo');
    localStorage.setItem('prova_status', 'Aktiv');
    localStorage.setItem('prova_onboarding_done', 'true');
    localStorage.setItem('prova_welcome_seen', '1');
    localStorage.setItem('prova_erster_fall_erstellt', '1');
    localStorage.setItem('prova_tour_done', '1');  // v3: verhindert .tour-overlay
    localStorage.setItem('prova_trial_start', new Date().toISOString());
    localStorage.setItem('prova_trial_days', '14');
  }, { email: EMAIL });
});

test.describe('Core-Workflow (E2E)', () => {

  test('Step 1: Dashboard zeigt "Neuer Fall"-Button', async ({ page }) => {
    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('dashboard.html');
    expect(page.url()).not.toContain('app-login.html');

    const newCase = page.getByRole('link', { name: /neu.*fall|gutachten/i })
      .or(page.locator('a[href*="app.html"]'));

    const count = await newCase.count();
    console.log(`    ℹ️  "Neuer Fall"-Links gefunden: ${count}`);
    expect(count, 'Dashboard muss mindestens 1 Link zu app.html haben').toBeGreaterThan(0);
  });

  test('Step 2: app.html lädt und hat Stammdaten-Felder', async ({ page }) => {
    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(
      page.url().includes('app-login.html'),
      `app.html redirected zum Login: ${page.url()}`
    ).toBeFalsy();

    const schadenart    = await page.locator('#f-schadenart').count();
    const schadennummer = await page.locator('#f-schadensnummer').count();
    const auftraggeber  = await page.locator('#f-auftraggeber-name').count();

    console.log(`    ℹ️  #f-schadenart: ${schadenart}`);
    console.log(`    ℹ️  #f-schadensnummer: ${schadennummer}`);
    console.log(`    ℹ️  #f-auftraggeber-name: ${auftraggeber}`);

    expect(schadenart,    'Schadenart-Select muss existieren').toBeGreaterThan(0);
    expect(auftraggeber,  'Auftraggeber-Name-Input muss existieren').toBeGreaterThan(0);
  });

  test('Step 3: Stammdaten können eingegeben werden', async ({ page }) => {
    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    expect(page.url()).not.toContain('app-login.html');

    const schadenart = page.locator('#f-schadenart');
    if (await schadenart.isVisible().catch(() => false)) {
      const options = await schadenart.locator('option').allTextContents();
      console.log(`    ℹ️  Schadenart-Optionen: ${options.slice(0, 5).join(', ')}...`);
      const firstNonEmpty = options.findIndex(o => o.trim().length > 0 && !o.match(/^bitte/i));
      if (firstNonEmpty >= 0) {
        await schadenart.selectOption({ index: firstNonEmpty });
      }
    }

    const auftraggeber = page.locator('#f-auftraggeber-name');
    if (await auftraggeber.isVisible().catch(() => false)) {
      await auftraggeber.fill(TESTFALL_NAME);
      const val = await auftraggeber.inputValue();
      console.log(`    ℹ️  Auftraggeber-Name gesetzt: "${val}"`);
      expect(val).toBe(TESTFALL_NAME);
    } else {
      console.log('    ⚠ #f-auftraggeber-name nicht sichtbar (evtl. anderer Step aktiv)');
    }

    const schadennummer = page.locator('#f-schadensnummer');
    if (await schadennummer.isVisible().catch(() => false)) {
      await schadennummer.fill(TESTFALL_AZ);
    }
  });

  test('Step 4: Diktat-UI ist vorhanden (Mikrofon-Button + Textarea)', async ({ page }) => {
    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain('app-login.html');

    const recBtn    = await page.locator('#recBtn').count();
    const mobileFab = await page.locator('#mobile-rec-fab').count();
    const textarea  = await page.locator('#transcriptManuell').count();

    console.log(`    ℹ️  #recBtn (Mikro): ${recBtn}`);
    console.log(`    ℹ️  #mobile-rec-fab: ${mobileFab}`);
    console.log(`    ℹ️  #transcriptManuell (Textarea): ${textarea}`);

    expect(
      recBtn + mobileFab + textarea,
      'Diktat-UI (Mikro ODER Textarea) muss im DOM existieren'
    ).toBeGreaterThan(0);

    if (textarea > 0) {
      const ta = page.locator('#transcriptManuell');
      if (await ta.isVisible().catch(() => false)) {
        await ta.fill('Test-Diktat aus Playwright — keine echten Daten.');
        const val = await ta.inputValue();
        console.log(`    ℹ️  Textarea-Länge nach Fill: ${val.length} Zeichen`);
      }
    }
  });

  test('Step 5: Freigabe-Seite ist erreichbar', async ({ page }) => {
    await page.goto(BASE + '/freigabe.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(
      page.url().includes('app-login.html'),
      `freigabe.html redirected zum Login: ${page.url()}`
    ).toBeFalsy();

    await expect(page.locator('body')).toBeVisible();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length, 'freigabe.html muss Inhalt haben').toBeGreaterThan(100);
  });

  test('Step 6: Archiv-Seite ist erreichbar', async ({ page }) => {
    await page.goto(BASE + '/archiv.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    expect(page.url()).toContain('archiv.html');
    expect(page.url()).not.toContain('app-login.html');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.afterAll(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' CORE-WORKFLOW TEST ZUSAMMENFASSUNG');
  console.log('═══════════════════════════════════════════════════════');
  console.log(` Testfall-Name: ${TESTFALL_NAME}`);
  console.log(` Aktenzeichen:  ${TESTFALL_AZ}`);
  console.log(' Hinweis: Diese Tests schreiben NICHTS in Airtable.');
  console.log(' Alles bleibt als UI-Check im Browser-Context.');
  console.log('═══════════════════════════════════════════════════════\n');
});
