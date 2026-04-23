# Sprint S-SICHER — Datensicherheit & E2E-Tests

> **PRIORITÄT 3 — nach S-AUDIT und IMPORT-FIX.**
> Pflicht vor Pilotkunden.
> **Voraussetzung:** Marcel hat den AUDIT-REPORT gelesen und entschieden welche Findings gefixt werden.

---

## Ziel

1. Alle 🔴 KRITISCHEN Findings aus dem Audit-Report beheben
2. Alle 🟠 HOHEN Findings beheben
3. Aufbau einer E2E-Test-Suite die Multi-Tenant-Bugs für immer verhindert

---

## Phase 1 — Multi-Tenant-Lecks fixen

**Quelle:** `docs/AUDIT-REPORT.md` Phase 1

Für jedes 🔴-Finding:

1. Lies die betroffene Stelle vollständig
2. Implementiere den vorgeschlagenen Fix (oder besseren wenn du einen siehst)
3. Erstelle einen einzelnen Commit pro Fix mit Format:
   `Sprint S-Sicher Fix #1.X: <Datei>:<Zeile> - sv_email-Filter ergänzt`
4. Vor Commit: `node --check` laufen lassen

---

## Phase 2 — DSGVO-Pseudonymisierung implementieren

**Quelle:** `docs/AUDIT-REPORT.md` Phase 2

### Wenn nicht existiert: Pseudonymisierungs-Modul bauen

Erstelle `pseudonymize.js` (Helper für ki-proxy):

```javascript
// pseudonymize.js
function pseudonymize(text, fall) {
  var mapping = {};
  var counter = { vorname: 0, nachname: 0, strasse: 0, ort: 0, email: 0, tel: 0, iban: 0, steuer: 0 };
  
  // Bekannte Daten aus Fall extrahieren
  var bekannt = {
    vornamen: extractVornamen(fall),
    nachnamen: extractNachnamen(fall),
    strassen: [fall.Schaden_Strasse, fall.Empf_Strasse].filter(Boolean),
    orte: [fall.Ort, fall.Empf_Ort].filter(Boolean),
    emails: [fall.Auftraggeber_Email].filter(Boolean),
    telefone: [fall.Auftraggeber_Telefon].filter(Boolean)
  };
  
  // Ersetzen mit Platzhaltern
  bekannt.vornamen.forEach(function(v) {
    counter.vorname++;
    var placeholder = '[VORNAME-' + counter.vorname + ']';
    mapping[placeholder] = v;
    text = text.split(v).join(placeholder);
  });
  // ... analog für andere ...
  
  // Generische Patterns (Email, Telefon, IBAN per Regex)
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, function(m) {
    counter.email++;
    var ph = '[EMAIL-' + counter.email + ']';
    mapping[ph] = m;
    return ph;
  });
  
  text = text.replace(/DE\d{20}/g, function(m) {
    counter.iban++;
    var ph = '[IBAN-' + counter.iban + ']';
    mapping[ph] = m;
    return ph;
  });
  
  return { pseudonymized: text, mapping: mapping };
}

function depseudonymize(text, mapping) {
  Object.keys(mapping).forEach(function(placeholder) {
    text = text.split(placeholder).join(mapping[placeholder]);
  });
  return text;
}

module.exports = { pseudonymize, depseudonymize };
```

### In ki-proxy.js einbauen

```javascript
const { pseudonymize, depseudonymize } = require('./pseudonymize');

exports.handler = async function(event) {
  var body = JSON.parse(event.body);
  var fallData = body.fall;
  var diktat = body.diktat;
  
  // VOR OpenAI: Pseudonymisieren
  var pseudo = pseudonymize(diktat, fallData);
  
  var openaiResponse = await callOpenAI(pseudo.pseudonymized);
  
  // NACH OpenAI: Depseudonymisieren
  var finalText = depseudonymize(openaiResponse.text, pseudo.mapping);
  
  return { statusCode: 200, body: JSON.stringify({ text: finalText }) };
};
```

**Wichtig:** Mapping bleibt nur kurzzeitig im Memory der Function. Wird nach Antwort verworfen.

---

## Phase 3 — PDF-URL-Sicherheit

**Status quo:** PDFMonkey-URLs sind öffentlich raterbar wenn man die Template-ID + Document-ID kennt.

**Lösung:** PDF-Proxy mit Bearer-Token

```javascript
// pdf-proxy.js (existiert teilweise)
exports.handler = async function(event) {
  // Token aus Cookie/Header validieren
  var token = event.headers.authorization;
  if (!validateToken(token)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  
  // PDF von PDFMonkey holen
  var pdfId = event.queryStringParameters.id;
  var fall = await getFallByPdfId(pdfId);
  
  // sv_email-Check: gehört das PDF dem aktuellen User?
  var userEmail = getUserEmailFromToken(token);
  if (fall.sv_email !== userEmail) {
    return { statusCode: 403, body: 'Forbidden' };
  }
  
  // Erst dann PDF ausliefern
  var pdf = await fetchFromPDFMonkey(pdfId);
  return { 
    statusCode: 200, 
    headers: { 'Content-Type': 'application/pdf' },
    body: pdf,
    isBase64Encoded: true
  };
};
```

**Frontend-Update:** Statt `src="https://pdfmonkey.io/..."` jetzt `src="/.netlify/functions/pdf-proxy?id=..."` mit Cookie-Auth.

---

## Phase 4 — Audit-Trail-Completeness

**Aufgabe:** Sicherstellen dass jede schreibende Aktion in `AUDIT_TRAIL` landet.

**Stellen die loggen MÜSSEN:**
- Fall angelegt
- Stammdaten geändert
- Diktat aufgenommen
- KI-Analyse gestartet
- §6 als Eigenleistung übernommen (mit timestamp + sv_email + sv_validiert=true)
- Freigabe erteilt
- PDF generiert
- Brief versandt
- Rechnung erstellt
- Rechnung bezahlt markiert
- Fall abgeschlossen
- Stammdaten exportiert

**Wenn nicht überall vorhanden:** ergänzen via `prova-audit.js` Helper (existiert bereits).

---

## Phase 5 — Auto-Logout

In `auth-guard.js` ergänzen:

```javascript
var INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 Minuten

var lastActivity = Date.now();

['click', 'keypress', 'scroll', 'touchstart'].forEach(function(evt) {
  document.addEventListener(evt, function() { lastActivity = Date.now(); }, { passive: true });
});

setInterval(function() {
  if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
    if (confirm('Sie waren 60 Minuten inaktiv. Aus Sicherheitsgründen werden Sie abgemeldet.')) {
      localStorage.removeItem('prova_user');
      localStorage.removeItem('prova_sv_email');
      window.location.href = 'app-login.html';
    } else {
      lastActivity = Date.now();
    }
  }
}, 60000);
```

---

## Phase 6 — Backup-Strategie dokumentieren

Erstelle `docs/BACKUP-STRATEGIE.md`:

```markdown
# PROVA Backup-Strategie

## Airtable
- Native Snapshots: Airtable hält automatisch Snapshots der letzten 7 Tage
- Pro-Plan: 30 Tage History
- Manuelle Backups: monatlich CSV-Export aller Tabellen

## PDFs (PDFMonkey)
- Alle generierten PDFs sind 90 Tage in PDFMonkey verfügbar
- Wichtige PDFs zusätzlich in Airtable als Attachment? (TBD)

## Code (GitHub)
- Vollständige History via Git
- Tags für jeden Deploy

## Wiederherstellung
- Bei Datenverlust in Airtable: Snapshot wiederherstellen via Airtable-UI
- Bei Code-Problem: git revert + redeploy
```

---

## Phase 7 — E2E-Tests mit Playwright

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Konfiguration:** `playwright.config.js`
```javascript
module.exports = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'https://prova-systems.de',
    headless: true
  }
};
```

**Test 1 — Multi-Tenant-Isolation:**
```javascript
// tests/e2e/multi-tenant.spec.js
const { test, expect } = require('@playwright/test');

test('SV1 sieht keine Daten von SV2', async ({ browser }) => {
  // SV1 legt Fall an
  var ctx1 = await browser.newContext();
  var page1 = await ctx1.newPage();
  await loginAs(page1, 'sv1@test.de');
  await page1.click('text=+ Fall aufmachen');
  // ... Fall anlegen mit AZ "TEST-SV1-001" ...
  
  // SV2 loggt sich ein
  var ctx2 = await browser.newContext();
  var page2 = await ctx2.newPage();
  await loginAs(page2, 'sv2@test.de');
  await page2.goto('https://prova-systems.de/archiv.html');
  
  // SV2 darf TEST-SV1-001 NICHT sehen
  await expect(page2.locator('text=TEST-SV1-001')).not.toBeVisible();
});
```

**Test 2 — KI darf §6 nicht schreiben:**
```javascript
test('§6 Fachurteil-Feld bleibt leer nach KI-Analyse', async ({ page }) => {
  await loginAs(page, 'sv@test.de');
  await page.goto('https://prova-systems.de/ki-analyse.html?az=TEST-001');
  await page.click('text=Diktat strukturieren & prüfen');
  await page.waitForSelector('text=Strukturhilfe §1');
  
  var paragraph6 = await page.locator('#paragraph-6-textarea').inputValue();
  expect(paragraph6).toBe('');  // KI darf hier nichts geschrieben haben
});
```

**Test 3 — Vollständiger Workflow:**
```javascript
test('Kompletter Fall: anlegen → Diktat → PDF', async ({ page }) => {
  // ... realistischer Durchlauf ...
});
```

**GitHub-Action für automatischen Test-Lauf bei jedem Push:**
`.github/workflows/e2e.yml`
```yaml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

---

## Akzeptanzkriterien

- [ ] Alle 🔴 Audit-Findings haben einen Fix-Commit
- [ ] Pseudonymisierung läuft vor jedem OpenAI-Call
- [ ] PDF-URLs sind nur mit Auth abrufbar
- [ ] Audit-Trail komplett für alle schreibenden Aktionen
- [ ] Auto-Logout nach 60 Min Inaktivität
- [ ] `docs/BACKUP-STRATEGIE.md` existiert
- [ ] Mindestens 3 E2E-Tests laufen grün
- [ ] GitHub-Action triggert E2E-Tests bei jedem Push
- [ ] sw.js CACHE_VERSION inkrementiert
- [ ] Status-Report mit Liste aller behobenen Findings

---

## Was Marcel testen muss

1. Mit zwei verschiedenen SV-Accounts (test-sv1@, test-sv2@) einloggen
2. Fall mit SV1 anlegen
3. Mit SV2 ins Archiv → SV1-Fall darf NICHT erscheinen
4. KI-Analyse durchlaufen → §6 muss leer bleiben
5. PDF-URL kopieren → in Inkognito-Tab öffnen → muss 401/403 zurückgeben
6. 60 Min nichts klicken → Auto-Logout-Dialog erscheint
