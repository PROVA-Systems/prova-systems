# Sprint WORKFLOW-E2E — Zusammenspiel AT↔Make↔PDFMonkey↔Code perfekt

> **PRIORITÄT:** Kritisch. Nach STRIPE-PERFEKT.
> Marcel will: *"Workflows müssen super funktionieren, Endergebnis perfekt (Gutachten, Rechnungen, Emails)."*

---

## Ziel

Jeder Workflow der mehrere Systeme koppelt muss fehlerfrei durchlaufen — auch wenn eines der Systeme kurzzeitig ausfällt. Resilienz + Beobachtbarkeit + End-to-End-Tests.

---

## Die 5 kritischen Workflows

### Workflow 1: Fall anlegen → Gutachten fertigstellen → PDF

```
Frontend (neuer-fall.html)
  → Airtable SCHADENSFAELLE.create
  → Frontend (ortstermin-modus.html)
    → Whisper-Transkription (ki-proxy)
    → DIKTATE.create
  → Frontend (ki-analyse.html)
    → OpenAI Strukturvorschläge (ki-proxy)
    → SV schreibt §6
  → Frontend (freigabe.html)
    → Make G3-Scenario triggern (webhook)
      → PDFMonkey render F-XX
      → PDF-URL zurück zu Airtable
    → SCHADENSFAELLE.Gutachten_PDF_URL gesetzt
```

### Workflow 2: Rechnung erstellen → E-Mail versenden → Bezahlung tracken

```
Frontend (rechnungen.html)
  → Airtable RECHNUNGEN.create
  → Make F1-Scenario triggern
    → PDFMonkey render F-01/02/03
    → Email via Gmail versenden
    → Airtable.status = "versendet"
  → Später: Stripe-Webhook zahlung.erhalten
    → Airtable.status = "bezahlt"
```

### Workflow 3: Brief schreiben → Senden → Archivieren

```
Frontend (briefvorlagen.html)
  → Airtable BRIEFE.create
  → PDFMonkey BRIEF-Template render
  → Email via IONOS SMTP versenden
  → BRIEFE.versand_status = "versendet"
```

### Workflow 4: §407a-Anzeige (bei Gerichtsgutachten)

```
Frontend (zpo-anzeige.html)
  → Airtable SCHADENSFAELLE.zpo_anzeige_erstellt
  → PDFMonkey spezial-Template
  → Email an Gericht
  → SCHADENSFAELLE.zpo_anzeige_gesendet
```

### Workflow 5: Mahnwesen (3 Stufen)

```
Cron-Trigger (Make oder Airtable-Automation)
  → Suche überfällige Rechnungen
  → Eskalation: Mahnstufe 1 → 2 → 3
  → Je Stufe: PDFMonkey F-06/07/08 + Email
  → BRIEFE.create pro Mahnung
```

---

## Teil 1: Resilienz bei Ausfällen

### Problem heute
Wenn Make kurz ausfällt oder PDFMonkey Timeout hat: User sieht "Fehler", weiß nicht was zu tun ist, Daten in inkonsistentem Zustand.

### Lösung: Status-Machine pro Workflow

Jeder Workflow hat einen sichtbaren Status in Airtable:

```
pending    → Workflow wurde gestartet
running    → Workflow läuft (z.B. PDFMonkey rendert)
retry      → Fehler aufgetreten, Retry läuft
completed  → Alles fertig
failed     → Nach 3 Retries endgültig fehlgeschlagen
```

### Beispiel: Freigabe→PDF

`freigabe-logic.js`:
```javascript
async function sendeZuFreigabe() {
  // 1. Status setzen
  await updateFall(az, { workflow_pdf_status: 'pending', workflow_pdf_started: new Date().toISOString() });
  
  // 2. Make-Webhook triggern
  try {
    var response = await fetch(MAKE_G3_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({ az: az, sv_email: svEmail }),
      signal: AbortSignal.timeout(30000) // 30 Sek Timeout
    });
    
    if (!response.ok) throw new Error('Make returned ' + response.status);
    
    // 3. Optimistic UI: Status "Wird erstellt..."
    showStatusIndicator('PDF wird erstellt... Das dauert 10-30 Sekunden.');
    
    // 4. Polling: alle 3 Sek Airtable prüfen ob PDF_URL da ist
    pollForPDFReady();
    
  } catch (err) {
    await updateFall(az, { 
      workflow_pdf_status: 'retry',
      workflow_pdf_error: err.message
    });
    showError('PDF-Generierung fehlgeschlagen. Versuche es erneut. Code: ' + err.message);
  }
}

async function pollForPDFReady() {
  var maxAttempts = 30; // 90 Sek max
  var attempts = 0;
  
  var interval = setInterval(async function() {
    attempts++;
    var fall = await getFall(az);
    
    if (fall.Gutachten_PDF_URL) {
      clearInterval(interval);
      showSuccess('PDF ist fertig!');
      window.location.href = fall.Gutachten_PDF_URL;
      return;
    }
    
    if (fall.workflow_pdf_status === 'failed') {
      clearInterval(interval);
      showError('PDF-Erstellung fehlgeschlagen: ' + fall.workflow_pdf_error);
      return;
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      showError('PDF-Erstellung dauert ungewöhnlich lang. Bitte prüfen Sie die Akte in 5 Min.');
      return;
    }
  }, 3000);
}
```

### In Make-Scenario G3: Retry-Logik

Make hat native Retry-Module. Konfiguration:
- Bei PDFMonkey-Call: **Error handler → Retry** (3× mit 5 Sek Delay)
- Nach 3 Fehlversuchen: Airtable-Update mit `workflow_pdf_status = 'failed'` + Error-Message
- Make-Log in `MAKE_SZENARIEN_LOG` Tabelle für Debugging

---

## Teil 2: Einheitliches Error-Logging

### Neue Tabelle `WORKFLOW_ERRORS`

| Feld | Typ |
|---|---|
| `timestamp` | Date and Time |
| `workflow` | Single Select (pdf_render, email_send, mahnung, 407a) |
| `fall_az` | Single Line Text |
| `sv_email` | Email |
| `step` | Single Line Text (z.B. "pdfmonkey_render", "gmail_send") |
| `error_message` | Long Text |
| `retry_count` | Number |
| `resolved` | Checkbox |

### Helper in allen Functions

```javascript
async function logWorkflowError(workflow, step, error, context) {
  await createRecord('WORKFLOW_ERRORS', {
    timestamp: new Date().toISOString(),
    workflow: workflow,
    fall_az: context.az,
    sv_email: context.sv_email,
    step: step,
    error_message: error.message + '\n' + (error.stack || ''),
    retry_count: context.retry_count || 0
  });
}
```

### Admin-Dashboard zeigt Fehler

In `admin-dashboard.html` neuer Bereich "Offene Workflow-Fehler":
```javascript
async function ladeWorkflowErrors() {
  var filter = encodeURIComponent('NOT({resolved})');
  var errors = await airtableGet('WORKFLOW_ERRORS', { filterByFormula: filter, sort: [{field: 'timestamp', direction: 'desc'}] });
  renderErrorList(errors);
}
```

Marcel (als Admin) sieht sofort alle Probleme seiner Testpiloten.

---

## Teil 3: E-Mail-Verlässlichkeit

### Problem
IONOS SMTP kann mal unerreichbar sein. Email-Bounces (Tippfehler in Empfänger-Email) bleiben oft unbemerkt.

### Lösung

**A) Retry bei SMTP-Fehler:**
```javascript
// smtp-senden.js
async function sendWithRetry(mailOptions, maxRetries = 3) {
  for (var i = 0; i < maxRetries; i++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000)); // Exponential backoff
    }
  }
}
```

**B) Bounce-Erkennung:**
- IONOS SMTP gibt bei Bounces eine Fehler-Email an den Absender zurück
- Marcel kann manuell `kontakt@prova-systems.de` Postfach monitoren
- Alternativ: Gmail-Workflow nutzen statt SMTP (via Make-Scenario, bessere Zustellung)

**C) Alternative: Make statt Direkt-SMTP**
Für kritische Emails (§407a-Anzeige, Gutachten-Versand) über Make-Gmail-Connector routen (höhere Zuverlässigkeit + Logs).

---

## Teil 4: Playwright E2E-Tests

### Installation

```bash
cd prova-systems
npm install -D @playwright/test
npx playwright install chromium
```

### `playwright.config.js`

```javascript
module.exports = {
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'https://prova-systems.de',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
};
```

### Test 1: Kompletter Fall-Workflow

```javascript
// tests/e2e/workflow-kompletter-fall.spec.js
const { test, expect } = require('@playwright/test');

test('Kompletter Fall-Workflow: Anlage → Diktat → KI → PDF → Rechnung', async ({ page }) => {
  test.setTimeout(120000); // 2 Min für gesamten Workflow
  
  // 1. Login
  await page.goto('/app-login.html');
  await page.fill('#email', process.env.TEST_SV_EMAIL);
  await page.fill('#password', process.env.TEST_SV_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*fall-aufmachen/);
  
  // 2. Neuer Fall
  await page.click('text=+ Neuen Fall komplett anlegen');
  await expect(page).toHaveURL(/.*neuer-fall/);
  
  // 3. Auftragstyp wählen
  await page.click('[data-typ="versicherungsgutachten"]');
  
  // 4. Stammdaten
  await page.fill('#f-auftraggeber', 'Test-Versicherung E2E');
  await page.fill('#f-strasse', 'Teststraße 1');
  await page.fill('#f-plz', '50667');
  await page.fill('#f-ort', 'Köln');
  await page.selectOption('#f-schadensart', 'Schimmelbefall');
  
  // 5. Typ-spezifisch
  await page.fill('#f-schaden-nr', 'E2E-' + Date.now());
  
  // 6. Fall anlegen
  await page.click('text=Fall anlegen + zur Akte');
  await expect(page).toHaveURL(/.*akte/);
  
  // 7. Ortstermin starten
  await page.click('text=Ortstermin starten');
  await expect(page).toHaveURL(/.*ortstermin-modus/);
  
  // 8. Dummy-Diktat (Text-Modus für Test)
  await page.click('[data-tab="diktat"]');
  await page.fill('#dictat-manuell', 'Test-Diktat für E2E. Schimmel an Wand NW, ca 30cm, seit 3 Wochen sichtbar.');
  await page.click('text=Diktat speichern');
  
  // 9. Zurück zur Akte
  await page.click('text=Zur Akte zurück');
  
  // 10. KI-Analyse
  await page.click('text=KI-Analyse starten');
  await expect(page).toHaveURL(/.*ki-analyse/);
  await page.click('text=Diktat strukturieren');
  await page.waitForSelector('#paragraph-1-vorschlag', { timeout: 30000 });
  
  // 11. §6 schreiben
  var longText = 'Bei der Ortsbesichtigung konnte an der Nordwestecke ein Befall festgestellt werden. '.repeat(20);
  await page.fill('#p6-text', longText);
  await page.click('text=Geprüft & als Eigenleistung übernehmen');
  
  // 12. Freigabe
  await expect(page).toHaveURL(/.*freigabe/);
  await page.click('text=Zur PDF-Freigabe');
  
  // 13. PDF wartet max 90 Sek
  await page.waitForSelector('.pdf-ready', { timeout: 90000 });
  
  // 14. PDF-URL sollte jetzt in Airtable sein
  var pdfLink = await page.$('a[href*="pdfmonkey"]');
  expect(pdfLink).not.toBeNull();
});
```

### Test 2: Multi-Tenant-Isolation

```javascript
test('SV1 sieht keine Daten von SV2', async ({ browser }) => {
  // SV1 legt Fall an mit spezifischem AZ
  var ctx1 = await browser.newContext();
  var page1 = await ctx1.newPage();
  await loginAs(page1, process.env.TEST_SV1_EMAIL, process.env.TEST_SV1_PASSWORD);
  
  var uniqueAZ = 'TEST-ISO-' + Date.now();
  await createFall(page1, { aktenzeichen: uniqueAZ });
  
  // SV2 loggt sich ein und schaut ins Archiv
  var ctx2 = await browser.newContext();
  var page2 = await ctx2.newPage();
  await loginAs(page2, process.env.TEST_SV2_EMAIL, process.env.TEST_SV2_PASSWORD);
  await page2.goto('/archiv.html');
  
  // SV2 darf TEST-ISO-XYZ NICHT sehen
  await expect(page2.locator('text=' + uniqueAZ)).not.toBeVisible();
  
  // SV2 versucht direkt URL aufzurufen
  await page2.goto('/akte.html?az=' + uniqueAZ);
  await expect(page2.locator('text=Akte nicht gefunden')).toBeVisible();
});
```

### Test 3: KI darf §6 nicht schreiben

```javascript
test('§6 Fachurteil bleibt nach KI-Analyse leer', async ({ page }) => {
  await loginAs(page, process.env.TEST_SV_EMAIL, process.env.TEST_SV_PASSWORD);
  
  var az = await createFallMitDiktat(page);
  await page.goto('/ki-analyse.html?az=' + az);
  await page.click('text=Diktat strukturieren');
  await page.waitForSelector('#paragraph-1-vorschlag');
  
  var paragraph6 = await page.inputValue('#p6-text');
  expect(paragraph6).toBe(''); // KI hat hier nichts geschrieben
  
  // Button ist disabled bis 500 Zeichen
  var buttonDisabled = await page.isDisabled('#btn-eigenleistung');
  expect(buttonDisabled).toBe(true);
});
```

### Test 4: Stripe-Webhook-Signatur-Check

```javascript
test('Fake Stripe Webhook wird abgelehnt', async ({ request }) => {
  var response = await request.post('/.netlify/functions/stripe-webhook', {
    data: { type: 'checkout.session.completed', data: { object: { customer: 'fake' }}},
    headers: { 'stripe-signature': 'fake_signature' }
  });
  expect(response.status()).toBe(400);
});
```

### Test 5: Rate-Limiting Login

```javascript
test('Brute-Force wird nach 5 Fehlversuchen blockiert', async ({ page }) => {
  await page.goto('/app-login.html');
  
  for (var i = 0; i < 5; i++) {
    await page.fill('#email', 'test@test.de');
    await page.fill('#password', 'wrong' + i);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
  }
  
  // 6. Versuch: 429
  await page.fill('#password', 'wrong5');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Zu viele Versuche')).toBeVisible();
});
```

### GitHub Action für automatischen Test-Lauf

`.github/workflows/e2e.yml`:
```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * *'  # Täglich 6 Uhr

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        env:
          TEST_SV_EMAIL: ${{ secrets.TEST_SV_EMAIL }}
          TEST_SV_PASSWORD: ${{ secrets.TEST_SV_PASSWORD }}
          TEST_SV1_EMAIL: ${{ secrets.TEST_SV1_EMAIL }}
          TEST_SV1_PASSWORD: ${{ secrets.TEST_SV1_PASSWORD }}
          TEST_SV2_EMAIL: ${{ secrets.TEST_SV2_EMAIL }}
          TEST_SV2_PASSWORD: ${{ secrets.TEST_SV2_PASSWORD }}
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Akzeptanzkriterien

- [ ] Jeder Workflow hat `workflow_*_status` in Airtable
- [ ] Frontend zeigt Status-Indikator live (Polling)
- [ ] `WORKFLOW_ERRORS`-Tabelle existiert und wird befüllt
- [ ] Make-Scenarios haben Retry-Logik
- [ ] SMTP-Calls haben 3× Retry mit Exponential Backoff
- [ ] Admin-Dashboard zeigt offene Workflow-Fehler
- [ ] Playwright installiert und konfiguriert
- [ ] Mindestens 5 E2E-Tests grün: kompletter Workflow, Multi-Tenant, KI-§6, Stripe-Webhook, Rate-Limit
- [ ] GitHub-Action läuft bei jedem Push + täglich 6 Uhr
- [ ] Test-User (TEST_SV_EMAIL, TEST_SV1, TEST_SV2) angelegt und in GitHub-Secrets
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste für Marcel

1. [ ] Kompletter Workflow von neuer-fall bis PDF klappt end-to-end (2 Min)
2. [ ] Bei absichtlich gestopptem Make: Error-Meldung erscheint, retry kommt
3. [ ] Bei Webhook-Fehler: Eintrag in `WORKFLOW_ERRORS`
4. [ ] Admin-Dashboard zeigt den Fehler
5. [ ] Nach Fix (Make wieder aktiv): manueller Retry klappt
6. [ ] Playwright lokal: `npx playwright test` → alle Tests grün
7. [ ] GitHub-Action läuft nach Push → grün
8. [ ] Rechnung versenden klappt, Email kommt an
9. [ ] Brief versenden klappt, Email kommt an
10. [ ] Bei Email mit Tippfehler im Empfänger: Bounce-Email kommt zurück ins Postfach
