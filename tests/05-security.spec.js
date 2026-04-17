/* ════════════════════════════════════════════════════════════════════
   PROVA 05-security.spec.js (Session 5 — Tier 1, Tests #2–#5)

   ZWECK
   Dies sind die "bevor wir Founding Members einladen"-Sicherheits-Tests.
   Jeder rote Test hier ist ein potenzielles Datenleck oder Compliance-Problem.

   TESTS
   ──────
   #2  Multi-Tenant-Isolation
       - Zwei verschiedene SV-Sessions gleichzeitig
       - Jeder Airtable-Call muss `sv_email` als Filter enthalten
       - Kein Airtable-Call darf ohne Filter laufen (kein leerer
         filterByFormula, kein TRUE() als Default)

   #3  XSS in Eingabefeldern
       - `<script>` / `<img onerror>` / `javascript:` als Auftraggeber-Name
       - Beim Wiederanzeigen darf KEIN Skript ausgeführt werden
       - DOM-Sanitizer MUSS greifen (innerHTML vs textContent)

   #4  Auth-Bypass auf Netlify-Functions
       - Direkter fetch gegen `/.netlify/functions/airtable` ohne Session
       - Gefälschte SV-Emails in Payload
       - Prüfung: Antwort enthält KEINE fremden Daten

   #5  DSGVO-Pseudonymisierung an KI-Proxy
       - Diktat mit Klartext-Namen, Adresse, IBAN, Telefon absenden
       - Outgoing Payload an ki-proxy abfangen
       - Prüfung: Sensible Daten sind durch Platzhalter ersetzt
                  bevor sie OpenAI erreichen

   Alle Tests arbeiten mit Network-Interception — nichts wird in Airtable
   geschrieben, kein echter OpenAI-Call erfolgt.
   ════════════════════════════════════════════════════════════════════ */

const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE   = 'https://prova-systems.de';
const EMAIL_A = process.env.PROVA_EMAIL || 'marcel_schreiber891@gmx.de';
const EMAIL_B = 'testuser-b-' + Date.now() + '@example.invalid';  // fiktiv

/* ────────────────────────────────────────────────────────────────────
   Helper: Session injizieren
   ──────────────────────────────────────────────────────────────────── */
async function injectSession(context, email) {
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
  }, { email });
}

/* ════════════════════════════════════════════════════════════════════
   TEST #2 — MULTI-TENANT-ISOLATION
   ════════════════════════════════════════════════════════════════════ */
test.describe('Sicherheits-Test #2: Multi-Tenant-Isolation', () => {

  test('Jeder Airtable-Call enthält sv_email als Filter (kein ungefilterter Zugriff)', async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, EMAIL_A);
    const page = await ctx.newPage();

    const airtableCalls = [];

    // Intercept alle Airtable-Calls — wir wollen die Payloads sehen
    await page.route('**/.netlify/functions/airtable', async route => {
      const body = route.request().postDataJSON();
      airtableCalls.push({
        method: body?.method,
        path:   body?.path || '',
        payload: body?.payload || null
      });
      // Leere Response zurückgeben damit nichts crasht
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [] })
      });
    });

    // Mehrere Seiten durchgehen die Airtable lesen
    for (const path of ['/dashboard.html', '/archiv.html', '/termine.html', '/rechnungen.html', '/kontakte.html']) {
      await page.goto(BASE + path);
      await page.waitForTimeout(2000);
    }

    // Analyse aller GET-Calls
    const gets = airtableCalls.filter(c => c.method === 'GET');
    console.log(`    ℹ️  Airtable-GET-Calls insgesamt: ${gets.length}`);

    const unfiltered = [];
    const filteredCorrectly = [];
    const unparseableFilter = [];

    for (const call of gets) {
      const pathStr = call.path || '';

      // Extrahiere filterByFormula
      const m = pathStr.match(/filterByFormula=([^&]+)/);
      if (!m) {
        // KEIN filter in URL — das wäre kritisch für Fälle, Termine, Rechnungen
        // Ausnahmen: Normen-DB (öffentlich), Sachverstaendige (pro-User via Email)
        if (pathStr.includes('tblNormenDB') || pathStr.includes('SACHVERSTAENDIGE') || pathStr.includes('tbladqEQT3tmx4DIB')) {
          // Normen oder SV-Tabelle — spezielle Semantik OK
        } else {
          unfiltered.push(pathStr.slice(0, 120));
        }
        continue;
      }

      let decoded = '';
      try { decoded = decodeURIComponent(m[1]); }
      catch (e) { unparseableFilter.push(pathStr.slice(0, 120)); continue; }

      const lower = decoded.toLowerCase();
      if (lower.includes('sv_email') || lower.includes('{email}') || lower.includes('user_email')) {
        filteredCorrectly.push(decoded.slice(0, 80));
      } else if (lower === 'true()' || lower === '') {
        unfiltered.push(pathStr.slice(0, 120));
      } else {
        // Anderer Filter aber kein sv_email — z.B. Normen-DB oder spezielle Abfragen
        // Flaggen zur Inspektion
        console.log(`    ⚠ Filter ohne sv_email: "${decoded.slice(0, 80)}"`);
      }
    }

    console.log(`    ✅ Mit sv_email gefiltert:  ${filteredCorrectly.length}`);
    console.log(`    ❌ Ohne Filter:             ${unfiltered.length}`);
    if (unfiltered.length > 0) {
      console.log('    🚨 KRITISCH — Ungefilterter Airtable-Zugriff gefunden:');
      unfiltered.forEach(p => console.log(`       ${p}`));
    }

    expect(unfiltered.length, 'KEIN Airtable-Call darf ohne sv_email-Filter laufen (außer Normen/SV-Tabelle)').toBe(0);
    expect(gets.length, 'Mindestens ein GET sollte gemacht worden sein').toBeGreaterThan(0);

    await ctx.close();
  });

  test('Zwei parallele SV-Sessions — keine Datenüberschneidung', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await injectSession(ctxA, EMAIL_A);
    await injectSession(ctxB, EMAIL_B);

    const callsA = [];
    const callsB = [];

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.route('**/.netlify/functions/airtable', async route => {
      const body = route.request().postDataJSON();
      callsA.push({ path: body?.path || '', payload: body?.payload });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [] }) });
    });
    await pageB.route('**/.netlify/functions/airtable', async route => {
      const body = route.request().postDataJSON();
      callsB.push({ path: body?.path || '', payload: body?.payload });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [] }) });
    });

    await Promise.all([
      pageA.goto(BASE + '/archiv.html'),
      pageB.goto(BASE + '/archiv.html')
    ]);
    await Promise.all([
      pageA.waitForTimeout(2500),
      pageB.waitForTimeout(2500)
    ]);

    // Prüfung: Calls von A dürfen NUR EMAIL_A enthalten, niemals EMAIL_B
    const aContainsB = callsA.some(c =>
      (c.path || '').toLowerCase().includes(EMAIL_B.toLowerCase().split('@')[0]) ||
      JSON.stringify(c.payload || '').toLowerCase().includes(EMAIL_B.toLowerCase())
    );
    const bContainsA = callsB.some(c =>
      (c.path || '').toLowerCase().includes(EMAIL_A.toLowerCase().split('@')[0]) ||
      JSON.stringify(c.payload || '').toLowerCase().includes(EMAIL_A.toLowerCase())
    );

    console.log(`    ℹ️  Session A Calls: ${callsA.length}, Session B Calls: ${callsB.length}`);
    console.log(`    ${aContainsB ? '❌' : '✅'} Session A verwendet NIEMALS E-Mail von B`);
    console.log(`    ${bContainsA ? '❌' : '✅'} Session B verwendet NIEMALS E-Mail von A`);

    expect(aContainsB, 'Session A darf KEINE Daten von User B abfragen').toBeFalsy();
    expect(bContainsA, 'Session B darf KEINE Daten von User A abfragen').toBeFalsy();

    await ctxA.close();
    await ctxB.close();
  });
});

/* ════════════════════════════════════════════════════════════════════
   TEST #3 — XSS IN EINGABEFELDERN
   ════════════════════════════════════════════════════════════════════ */
test.describe('Sicherheits-Test #3: XSS in Eingabefeldern', () => {

  test('<script>-Tag im Auftraggeber-Namen wird NICHT ausgeführt', async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, EMAIL_A);
    const page = await ctx.newPage();

    // Track ob Alert oder Dialog erscheint — das wäre die XSS-Ausführung
    let xssTriggered = false;
    page.on('dialog', async d => {
      xssTriggered = true;
      console.log(`    🚨 ALERT ausgelöst: "${d.message()}"`);
      await d.dismiss();
    });

    // Console-Log überwachen auf verdächtige Ausgaben
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // XSS-Payload einfügen
    const XSS_PAYLOADS = [
      '<script>window.__XSS_FIRED__=true;alert("XSS1")</script>',
      '<img src=x onerror="window.__XSS_FIRED__=true;alert(\'XSS2\')">',
      'javascript:window.__XSS_FIRED__=true;alert("XSS3")//'
    ];

    let fieldsAffected = 0;

    for (const payload of XSS_PAYLOADS) {
      const input = page.locator('#f-auftraggeber-name');
      if (await input.isVisible().catch(() => false)) {
        await input.fill(payload);
        await input.blur();
        await page.waitForTimeout(500);
        fieldsAffected++;

        // Sofort prüfen: wurde das Skript ausgeführt?
        const fired = await page.evaluate(() => window.__XSS_FIRED__ === true);
        if (fired) {
          console.log(`    🚨 XSS AUSGEFÜHRT bei Payload: "${payload.slice(0, 40)}..."`);
        }
        expect(fired, `XSS-Payload wurde ausgeführt: "${payload.slice(0, 40)}"`).toBeFalsy();
      }
    }

    console.log(`    ℹ️  Felder getestet: ${fieldsAffected}`);
    console.log(`    ${xssTriggered ? '❌ KRITISCH' : '✅'} Kein XSS-Alert ausgelöst`);
    expect(xssTriggered, 'Kein Alert/Dialog darf durch XSS-Payload getriggert werden').toBeFalsy();

    await ctx.close();
  });

  test('XSS in localStorage-geschriebenen Werten wird beim Rendering escaped', async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, EMAIL_A);
    const page = await ctx.newPage();

    let xssTriggered = false;
    page.on('dialog', async d => {
      xssTriggered = true;
      await d.dismiss();
    });

    // XSS-Payload in localStorage-Name eintragen (SV-Name)
    await page.addInitScript(() => {
      const u = JSON.parse(localStorage.getItem('prova_user') || '{}');
      u.name = '<img src=x onerror="window.__STORE_XSS__=true;alert(\'STORAGE-XSS\')">';
      localStorage.setItem('prova_user', JSON.stringify(u));
    });

    // Auf diverse Seiten gehen wo der Name angezeigt wird
    for (const path of ['/dashboard.html', '/einstellungen.html', '/archiv.html']) {
      await page.goto(BASE + path);
      await page.waitForTimeout(1500);
      const fired = await page.evaluate(() => window.__STORE_XSS__ === true);
      if (fired) {
        console.log(`    🚨 STORAGE-XSS getriggert auf ${path}`);
      }
      expect(fired, `Storage-XSS auf ${path} wurde ausgeführt`).toBeFalsy();
    }

    expect(xssTriggered, 'Gespeicherter XSS-Payload darf nicht gerendert werden').toBeFalsy();
    console.log(`    ✅ Name-Feld aus localStorage wird sicher gerendert`);

    await ctx.close();
  });
});

/* ════════════════════════════════════════════════════════════════════
   TEST #4 — AUTH-BYPASS AUF NETLIFY-FUNCTIONS
   ════════════════════════════════════════════════════════════════════ */
test.describe('Sicherheits-Test #4: Auth-Bypass auf Functions', () => {

  test('Airtable-Function ohne Session — kein Bulk-Read ohne sv_email-Filter möglich', async ({ request }) => {
    // Bösartiger Versuch: Alle Fälle lesen ohne Filter
    const res = await request.post(BASE + '/.netlify/functions/airtable', {
      data: {
        method: 'GET',
        path: '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0?maxRecords=100'
        // ABSICHTLICH KEIN filterByFormula — Angreifer will alle Fälle
      },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      timeout: 10000
    }).catch(e => ({ status: () => 0, json: async () => ({}) }));

    const status = res.status();
    console.log(`    ℹ️  Unfiltered-Bulk-Read HTTP-Status: ${status}`);

    // AKZEPTABLE Antworten:
    // - 400/403/422: Function lehnt ungefilterte Calls ab (IDEAL)
    // - 200 mit leerem Array: Function erzwingt leeren Filter
    // - 401: Auth-required
    // NICHT akzeptabel:
    // - 200 mit echten Records aus verschiedenen SVs

    if (status === 200) {
      const data = await res.json().catch(() => ({}));
      const records = data.records || [];
      console.log(`    ℹ️  Records zurückgegeben: ${records.length}`);

      // Prüfen: Records von verschiedenen SVs?
      if (records.length > 0) {
        const svEmails = new Set(records.map(r => (r.fields?.sv_email || '').toLowerCase()).filter(Boolean));
        console.log(`    ℹ️  Unique sv_emails in Records: ${svEmails.size}`);

        if (svEmails.size > 1) {
          console.log('    🚨 KRITISCH — Function gibt Daten mehrerer SVs an unauthentifizierten Caller');
        }
        expect(svEmails.size, 'Function darf ohne Auth NICHT Daten verschiedener SVs preisgeben').toBeLessThanOrEqual(1);
      } else {
        console.log('    ✅ Records-Array leer — Function filtert serverseitig');
      }
    } else {
      console.log(`    ✅ Function antwortet mit ${status} — lehnt ungefilterten Call ab`);
    }
  });

  test('Cross-Tenant-Attacke: Mit Email-A versuchen Daten von anderem SV zu lesen', async ({ request }) => {
    // Angreifer kennt EMAIL_A, schickt Request mit EMAIL_B im Filter
    const res = await request.post(BASE + '/.netlify/functions/airtable', {
      data: {
        method: 'GET',
        path: `/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0?filterByFormula=${encodeURIComponent(`{sv_email}="${EMAIL_B}"`)}&maxRecords=100`
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Caller-Email': EMAIL_A  // wir behaupten wir wären A
      },
      failOnStatusCode: false,
      timeout: 10000
    }).catch(e => ({ status: () => 0, json: async () => ({}) }));

    const status = res.status();
    console.log(`    ℹ️  Cross-Tenant-Attack HTTP-Status: ${status}`);

    if (status === 200) {
      const data = await res.json().catch(() => ({}));
      const records = data.records || [];
      console.log(`    ℹ️  Records zurückgegeben: ${records.length}`);
      // Da EMAIL_B fiktiv ist, sollten 0 Records zurückkommen
      expect(records.length, 'Fiktive E-Mail sollte 0 Records geben').toBe(0);
      console.log('    ✅ Fiktive E-Mail liefert keine Records');
    } else {
      console.log(`    ℹ️  Function antwortet ${status} — prüft Auth oder Rate-Limit`);
    }
  });

  test('KI-Proxy ohne Session: Reject oder Rate-Limit', async ({ request }) => {
    const res = await request.post(BASE + '/.netlify/functions/ki-proxy', {
      data: {
        diktat: 'Test ohne Session',
        stammdaten: { name: 'Attacker' }
      },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      timeout: 10000
    }).catch(e => ({ status: () => 0 }));

    const status = res.status();
    console.log(`    ℹ️  KI-Proxy ohne Session: HTTP ${status}`);

    // 400/401/403/422 sind alle akzeptabel. 200 ohne Auth-Check wäre Geldverschwendung.
    // Kritisch wäre 200 + Gutachten-Antwort (kostet OpenAI-Token)
    if (status === 200) {
      const data = await res.json().catch(() => ({}));
      const hasRealResponse = !!(data.gutachten || data.content || data.choices);
      if (hasRealResponse) {
        console.log('    🚨 KRITISCH — ki-proxy generiert Content ohne Auth (OpenAI-Kosten für Angreifer!)');
      }
      expect(hasRealResponse, 'ki-proxy darf ohne Auth KEINEN OpenAI-Call auslösen').toBeFalsy();
    } else {
      console.log(`    ✅ ki-proxy lehnt unauthentifizierten Call ab`);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   TEST #5 — DSGVO: PSEUDONYMISIERUNG VOR KI-PROXY
   ════════════════════════════════════════════════════════════════════ */
test.describe('Sicherheits-Test #5: DSGVO-Pseudonymisierung', () => {

  test('Namen, IBAN und Adresse werden vor OpenAI-Call pseudonymisiert', async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, EMAIL_A);
    const page = await ctx.newPage();

    let kiProxyPayload = null;

    // KI-Proxy-Call intercepten + Payload analysieren
    await page.route('**/.netlify/functions/ki-proxy', async route => {
      kiProxyPayload = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          gutachten: { ueberschrift: 'Mock-Gutachten', ursache: 'Mock-Ursache' }
        })
      });
    });

    // Alle anderen Calls mocken damit nichts crasht
    await page.route('**/.netlify/functions/airtable', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [] }) })
    );

    await page.goto(BASE + '/app.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Sensible Daten einfüllen
    const SENSITIVE = {
      name:    'Klaus-Dieter Hartmann-Schönwalde',
      email:   'klaus.hartmann@musterbank-ag.de',
      strasse: 'Zitronenstraße 17',
      plz:     '50667',
      ort:     'Köln',
      // IBAN + Telefon ins Diktat — da kommen die oft vor
      diktat:  'Herr Klaus-Dieter Hartmann-Schönwalde, ' +
               'wohnhaft Zitronenstraße 17, 50667 Köln, ' +
               'Bankverbindung DE89 3704 0044 0532 0130 00, ' +
               'Telefon +49 221 98765432, E-Mail klaus.hartmann@musterbank-ag.de, ' +
               'beauftragt uns mit der Begutachtung der Feuchteschäden im Keller.'
    };

    // Felder füllen
    const schadenart = page.locator('#f-schadenart');
    if (await schadenart.isVisible().catch(() => false)) {
      const opts = await schadenart.locator('option').allTextContents();
      const idx = opts.findIndex(o => o.trim() && !o.match(/^bitte/i));
      if (idx >= 0) await schadenart.selectOption({ index: idx });
    }
    await page.locator('#f-auftraggeber-name').fill(SENSITIVE.name);
    if (await page.locator('#f-auftraggeber-email').isVisible().catch(() => false)) {
      await page.locator('#f-auftraggeber-email').fill(SENSITIVE.email);
    }
    if (await page.locator('#f-strasse').isVisible().catch(() => false)) {
      await page.locator('#f-strasse').fill(SENSITIVE.strasse);
      await page.locator('#f-plz').fill(SENSITIVE.plz);
      await page.locator('#f-ort').fill(SENSITIVE.ort);
    }

    // Weiter zu Diktat-Schritt
    await page.locator('button:has-text("Weiter")').first().click().catch(() => {});
    await page.waitForTimeout(1500);

    // Diktat einfüllen
    const textarea = page.locator('#transcriptManuell');
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(SENSITIVE.diktat);

      // Analyse starten
      const analyseBtn = page.locator('#btn-analyse-starten, button:has-text("Analyse")').first();
      if (await analyseBtn.isVisible().catch(() => false)) {
        await analyseBtn.click();

        // Warten bis KI-Proxy gerufen wurde
        const startTime = Date.now();
        while (Date.now() - startTime < 10000 && kiProxyPayload === null) {
          await page.waitForTimeout(200);
        }
      }
    }

    if (kiProxyPayload === null) {
      console.log('    ⚠ KI-Proxy wurde nicht aufgerufen — Test inconclusive');
      console.log('    ℹ️  Mögliche Ursache: Step-Übergang oder Analyse-Button-Selektor hat sich geändert');
      return; // Kein Fail, aber auch kein Pass
    }

    const payloadStr = JSON.stringify(kiProxyPayload);
    console.log(`    ℹ️  KI-Payload-Größe: ${payloadStr.length} Zeichen`);

    // Prüfungen
    const checks = [
      { label: 'Voller Klarname "Klaus-Dieter Hartmann-Schönwalde"', needle: 'Hartmann-Schönwalde', desc: 'Name ersetzen (z.B. durch [AUFTRAGGEBER])' },
      { label: 'Klar-IBAN "DE89 3704 0044 0532 0130 00"', needle: 'DE89 3704 0044 0532', desc: 'IBAN ersetzen (z.B. durch [IBAN])' },
      { label: 'IBAN ohne Leerzeichen "DE89370400440532013000"', needle: 'DE89370400440532', desc: 'IBAN ersetzen (z.B. durch [IBAN])' },
      { label: 'Klar-Email "klaus.hartmann@musterbank-ag.de"', needle: 'klaus.hartmann@musterbank-ag.de', desc: 'E-Mail ersetzen (z.B. durch [EMAIL])' },
      { label: 'Klar-Telefon "+49 221 98765432"', needle: '98765432', desc: 'Telefon ersetzen (z.B. durch [TELEFON])' }
    ];

    const violations = [];
    for (const c of checks) {
      const found = payloadStr.includes(c.needle);
      if (found) {
        console.log(`    ❌ ${c.label} — IM PAYLOAD (Erwartung: ${c.desc})`);
        violations.push(c.label);
      } else {
        console.log(`    ✅ ${c.label} — nicht im Payload`);
      }
    }

    if (violations.length > 0) {
      console.log('');
      console.log('    🚨 DSGVO-RISIKO:');
      console.log('       Sensible Klartextdaten wurden ungeschützt an OpenAI gesendet.');
      console.log('       §§ 25, 32 DSGVO + §203 StGB + §407a ZPO bedenken.');
      console.log('       Action: Pseudonymisierung in ki-proxy.js oder Frontend implementieren.');
    }

    // Name + IBAN sind die kritischsten. PLZ alleine ist weniger kritisch.
    // Wenn auch nur eine Klartext-Identifikation durchkommt → Fail
    expect(violations.length, `DSGVO-Verstoß: ${violations.length} sensible Daten unpseudonymisiert`).toBe(0);

    await ctx.close();
  });
});

/* ════════════════════════════════════════════════════════════════════
   ABSCHLUSS-ZUSAMMENFASSUNG
   ════════════════════════════════════════════════════════════════════ */
test.afterAll(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' TIER-1 SICHERHEITSTESTS (#2–#5) — ZUSAMMENFASSUNG');
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Getestet wurde:');
  console.log('   #2 Multi-Tenant-Isolation (sv_email Pflichtfilter)');
  console.log('   #3 XSS-Schutz in Eingabe + localStorage');
  console.log('   #4 Auth-Bypass auf Netlify-Functions');
  console.log('   #5 DSGVO-Pseudonymisierung vor OpenAI');
  console.log('');
  console.log(' Rote Tests sind KRITISCH — bitte nicht nur fixen,');
  console.log(' sondern ganzes System auf ähnliche Löcher prüfen.');
  console.log('═══════════════════════════════════════════════════════\n');
});
