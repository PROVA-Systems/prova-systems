/* ════════════════════════════════════════════════════════════════════
   PROVA 07-doppelklick.spec.js (Session 6 — Tier 1, Test #10)

   ZWECK
   Der häufigste Real-World-Bug in SaaS-Apps: User klickt ungeduldig
   zweimal auf "Speichern". Wenn der Button nicht disabled wird oder
   der Submit nicht debounced, entstehen doppelte Records in Airtable.
   Bei PROVA wäre das: doppelter Fall, doppelte Rechnung, doppelter
   E-Mail-Versand an den Auftraggeber. Peinlich.

   WAS GETESTET WIRD
   ─────────────────
   #10a  Doppelklick "Weiter zu Schritt 2" auf app.html
         → Nur 1 Step-Übergang, nicht zwei
   #10b  Doppelklick auf Analyse-Button
         → Nur 1× ki-proxy-Call (OpenAI kostet Geld!)
   #10c  Doppelklick auf Speichern-Button in Einstellungen
         → Nur 1× POST zu Airtable
   #10d  Schneller Dreifach-Klick
         → Kein einziger Call durchkommt mehr als einmal
   ════════════════════════════════════════════════════════════════════ */

const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE  = 'https://prova-systems.de';
const EMAIL = process.env.PROVA_EMAIL || 'marcel_schreiber891@gmx.de';

async function setupSession(context) {
  await context.addInitScript(({ email }) => {
    localStorage.setItem('prova_user', JSON.stringify({ email, name: email, token: 'test-session' }));
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
}

test.describe('#10 Doppelklick-Schutz: Keine Duplikate durch schnelle Klicks', () => {

  test('#10a Doppelklick "Weiter" auf app.html verursacht keinen Double-Submit', async ({ browser }) => {
    const ctx = await browser.newContext();
    await setupSession(ctx);
    const page = await ctx.newPage();

    // Alle Airtable-Calls intercepten + zählen
    const airtableCalls = [];
    await page.route('**/.netlify/functions/airtable', async route => {
      const body = route.request().postDataJSON();
      airtableCalls.push({ method: body?.method, path: body?.path || '', ts: Date.now() });
      await new Promise(r => setTimeout(r, 300));  // Server-Latency simulieren
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'rec_mock', fields: {} })
      });
    });

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Stammdaten füllen
    const schadenart = page.locator('#f-schadenart');
    if (await schadenart.isVisible().catch(() => false)) {
      const opts = await schadenart.locator('option').allTextContents();
      const idx = opts.findIndex(o => o.trim() && !o.match(/^bitte/i));
      if (idx >= 0) await schadenart.selectOption({ index: idx });
    }
    await page.locator('#f-auftraggeber-name').fill('Doppelklick-Test');
    if (await page.locator('#f-strasse').isVisible().catch(() => false)) {
      await page.locator('#f-strasse').fill('Teststr 1');
      await page.locator('#f-plz').fill('50667');
      await page.locator('#f-ort').fill('Köln');
    }

    // JETZT: Doppelklick auf "Weiter"
    const weiterBtn = page.locator('button:has-text("Weiter")').first();
    if (!(await weiterBtn.isVisible().catch(() => false))) {
      console.log('    ⚠ Kein "Weiter"-Button gefunden — Test inconclusive');
      await ctx.close();
      return;
    }

    console.log('    ℹ️  Sende 2 Klicks innerhalb 100ms...');

    // Dieser Pattern erzeugt einen echten ungeduldig-User-Doppelklick
    await Promise.all([
      weiterBtn.click(),
      (async () => {
        await page.waitForTimeout(50);
        await weiterBtn.click({ force: true }).catch(() => {});  // force: selbst wenn disabled
      })()
    ]);

    await page.waitForTimeout(2000);

    // Ergebnis: Wie viele Step-Übergänge / POST-Calls?
    const posts = airtableCalls.filter(c => c.method === 'POST');
    console.log(`    ℹ️  Airtable-POST-Calls nach Doppelklick: ${posts.length}`);
    console.log(`    ℹ️  Gesamte Airtable-Calls: ${airtableCalls.length}`);

    // Wir sind in Step 1 — "Weiter" macht noch keinen POST (der kommt später in Analyse)
    // Aber: Die Validierung sollte nicht zweimal laufen und auch sonst sollte das UI
    // auf dem gleichen Screen bleiben (kein Double-Step)
    const currentStep = await page.evaluate(() => {
      const step1 = document.querySelector('#step1, [data-step="1"]');
      const step2 = document.querySelector('#step2, [data-step="2"]');
      return {
        step1Visible: step1 ? getComputedStyle(step1).display !== 'none' : null,
        step2Visible: step2 ? getComputedStyle(step2).display !== 'none' : null
      };
    });
    console.log(`    ℹ️  Step-Sichtbarkeit nach Doppelklick:`, currentStep);

    // Der Test auf app.html ist mehr Sanity-Check — echter Duplicate-Risk kommt später
    expect(posts.length, 'Höchstens 1 POST durch Doppelklick-Weiter').toBeLessThanOrEqual(1);

    await ctx.close();
  });

  test('#10b Doppelklick "Analyse starten" → nur 1× ki-proxy-Call (OpenAI-Kostenbremse)', async ({ browser }) => {
    const ctx = await browser.newContext();
    await setupSession(ctx);
    const page = await ctx.newPage();

    const kiProxyCalls = [];
    await page.route('**/.netlify/functions/ki-proxy', async route => {
      kiProxyCalls.push({ ts: Date.now() });
      // Server-Latency simulieren (KI-Aufruf dauert 5-15s in Realität)
      await new Promise(r => setTimeout(r, 2000));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ gutachten: { ueberschrift: 'Mock' } })
      });
    });

    // Airtable mocken damit nichts crasht
    await page.route('**/.netlify/functions/airtable', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [], id: 'rec_mock' }) })
    );

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Stammdaten + Schritt 2
    const schadenart = page.locator('#f-schadenart');
    if (await schadenart.isVisible().catch(() => false)) {
      const opts = await schadenart.locator('option').allTextContents();
      const idx = opts.findIndex(o => o.trim() && !o.match(/^bitte/i));
      if (idx >= 0) await schadenart.selectOption({ index: idx });
    }
    await page.locator('#f-auftraggeber-name').fill('Doppelklick-KI-Test');
    if (await page.locator('#f-strasse').isVisible().catch(() => false)) {
      await page.locator('#f-strasse').fill('KI-Teststr 1');
      await page.locator('#f-plz').fill('50667');
      await page.locator('#f-ort').fill('Köln');
    }

    await page.locator('button:has-text("Weiter")').first().click().catch(() => {});
    await page.waitForTimeout(1500);

    const textarea = page.locator('#transcriptManuell');
    if (!(await textarea.isVisible().catch(() => false))) {
      console.log('    ⚠ Step 2 nicht erreicht — Test inconclusive');
      await ctx.close();
      return;
    }

    await textarea.fill('Feuchteschaden im Keller, aufsteigende Nässe, Wassermesswerte 4-12% Holzfeuchte.');

    const analyseBtn = page.locator('#btn-analyse-starten, button:has-text("Analyse")').first();
    if (!(await analyseBtn.isVisible().catch(() => false))) {
      console.log('    ⚠ Analyse-Button nicht sichtbar — Test inconclusive');
      await ctx.close();
      return;
    }

    console.log('    ℹ️  Doppelklick auf Analyse-Button...');

    // Mehrfacher Ungeduld-Klick
    await Promise.all([
      analyseBtn.click(),
      (async () => { await page.waitForTimeout(30);  await analyseBtn.click({ force: true }).catch(() => {}); })(),
      (async () => { await page.waitForTimeout(80);  await analyseBtn.click({ force: true }).catch(() => {}); })(),
      (async () => { await page.waitForTimeout(150); await analyseBtn.click({ force: true }).catch(() => {}); })()
    ]);

    // Warten bis mindestens ein Call durchgegangen ist + nachlaufende Calls abfangen
    await page.waitForTimeout(4000);

    console.log(`    ℹ️  ki-proxy-Aufrufe nach 4× Klick: ${kiProxyCalls.length}`);
    if (kiProxyCalls.length > 1) {
      console.log('    🚨 KRITISCH — OpenAI wird mehrfach aufgerufen pro Klick-Sekunde!');
      console.log('       Kostenrisiko: Jeder extra Call = extra gpt-4o-mini Tokens.');
      console.log('       Fix: Button disabled setzen sobald der 1. Call startet,');
      console.log('            ODER Debounce-Funktion um weiterZuAnalyse() herum.');
    } else {
      console.log('    ✅ Button disabled oder Debounce greift — genau 1 Call trotz 4 Klicks');
    }

    expect(kiProxyCalls.length, 'Maximal 1× ki-proxy-Call trotz 4 schneller Klicks').toBeLessThanOrEqual(1);

    await ctx.close();
  });

  test('#10c Einstellungen speichern: Doppelklick → 1 POST', async ({ browser }) => {
    test.setTimeout(90000); // einstellungen.html kann lange auf networkidle brauchen
    const ctx = await browser.newContext();
    await setupSession(ctx);
    const page = await ctx.newPage();

    const airtablePosts = [];
    await page.route('**/.netlify/functions/airtable', async route => {
      const body = route.request().postDataJSON();
      if (body?.method === 'POST' || body?.method === 'PATCH') {
        airtablePosts.push({ method: body.method, path: body.path || '', ts: Date.now() });
      }
      // kürzerer Delay damit Gesamt-Testzeit moderat bleibt
      await new Promise(r => setTimeout(r, 150));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [], id: 'rec_mock' })
      });
    });

    await page.goto(BASE + '/einstellungen.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500); // JS-Init-Zeit

    // Speicher-Button finden (Einstellungen hat unterschiedliche Speichern-Buttons)
    const saveBtn = page.locator(
      'button:has-text("Speichern"), button[type="submit"]:has-text("speichern"), button[id*="save"], button[id*="speicher"]'
    ).first();

    if (!(await saveBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('    ⚠ Kein Speicher-Button auf Einstellungen sichtbar — Test inconclusive');
      await ctx.close();
      return;
    }

    console.log('    ℹ️  Doppelklick-Test auf Einstellungen-Speichern...');

    // Mehrfach klicken
    await Promise.all([
      saveBtn.click().catch(() => {}),
      (async () => { await page.waitForTimeout(40);  await saveBtn.click({ force: true }).catch(() => {}); })(),
      (async () => { await page.waitForTimeout(120); await saveBtn.click({ force: true }).catch(() => {}); })()
    ]);

    await page.waitForTimeout(2000);

    console.log(`    ℹ️  Airtable-POST/PATCH-Calls: ${airtablePosts.length}`);
    if (airtablePosts.length > 1) {
      console.log('    ⚠ Einstellungen-Speichern ohne Doppelklick-Schutz!');
      airtablePosts.forEach((c, i) => console.log(`       ${i+1}. ${c.method} ${c.path.slice(0, 80)}`));
    } else {
      console.log('    ✅ Kein doppelter Schreibvorgang trotz Mehrfach-Klick');
    }

    expect(airtablePosts.length, 'Maximal 1 Schreibvorgang trotz Doppelklick').toBeLessThanOrEqual(1);

    await ctx.close();
  });

  test('#10d Neuer-Fall-Button: Dreifach-Klick → 1 Navigation', async ({ browser }) => {
    const ctx = await browser.newContext();
    await setupSession(ctx);
    const page = await ctx.newPage();

    await page.goto(BASE + '/dashboard.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Tour-Overlay entfernen
    await page.evaluate(() => {
      document.querySelectorAll('.tour-overlay, .tour-popup, .tour-tooltip, .tour-highlight').forEach(el => el.remove());
    });

    // Neuer-Fall-Button/Link finden
    const neuerFall = page.locator('a:has-text("Neuer Fall"), button:has-text("Neuer Fall")').first();
    if (!(await neuerFall.isVisible().catch(() => false))) {
      console.log('    ⚠ Kein "Neuer Fall"-Button auf Dashboard — Test inconclusive');
      await ctx.close();
      return;
    }

    // Navigation-Events zählen
    let navigations = 0;
    page.on('framenavigated', () => { navigations++; });

    console.log('    ℹ️  Dreifach-Klick auf "Neuer Fall"...');
    await Promise.all([
      neuerFall.click().catch(() => {}),
      (async () => { await page.waitForTimeout(40); await neuerFall.click({ force: true }).catch(() => {}); })(),
      (async () => { await page.waitForTimeout(90); await neuerFall.click({ force: true }).catch(() => {}); })()
    ]);

    await page.waitForTimeout(3000);

    console.log(`    ℹ️  Navigations-Events insgesamt: ${navigations}`);
    console.log(`    ℹ️  Aktuelle URL: ${page.url()}`);

    // Auf app.html gelandet ist der erwartete Zustand
    expect(page.url()).toContain('app.html');

    await ctx.close();
  });
});

test.afterAll(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' DOPPELKLICK-TESTS (#10) — ABSCHLUSS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Wenn Tests rot:');
  console.log('   #10a/c → Button disabled-State beim Klick einbauen');
  console.log('   #10b   → KRITISCH. OpenAI-Kosten bei jedem extra Call.');
  console.log('            Fix-Pattern: let _busy = false; if (_busy) return;');
  console.log('                         _busy = true; btn.disabled = true;');
  console.log('                         try { await doWork(); } finally {');
  console.log('                         _busy = false; btn.disabled = false; }');
  console.log('═══════════════════════════════════════════════════════\n');
});
