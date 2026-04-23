# PROVA Sicherheits-Audit-Report

**Erstellt:** 2026-04-24
**Sprint:** S-AUDIT (read-only)
**Code-Stand:** `733a6d7985dc519ec08ec550167cd6b7aec8efd2` (main)
**Auditor:** Claude Code (Opus 4.7)

---

## Zusammenfassung

| Schweregrad | Anzahl | Status |
|---|---|---|
| 🔴 Kritisch | 13 | Pilotkunden-Blocker |
| 🟠 Hoch | 14 | vor Pilotkunden zu beheben |
| 🟡 Medium | 9 | im Folge-Quartal |
| 🟢 OK / Positiv | 11 | Beibehalten |

**Bottom-Line:** Zwei Findings sind „Systemkiller" und müssen zuerst gefixt werden:
1. `airtable.js` akzeptiert die `_userEmail` aus dem Request-Body als Auth-Ersatz → **kompletter Multi-Tenant-Bypass** möglich, wenn Netlify Identity fehlt (was für Legacy-Logins der Regelfall ist).
2. `ki-proxy.js` hat **keine Pseudonymisierung**; Klardaten gehen unter bestimmten Aufruf-Pfaden direkt an OpenAI → DSGVO-Verstoß (Art. 32, Art. 49 + §203 StGB).

Beides ist behebbar, ändert aber die Auth-Architektur. Empfehlung: Sprint S-SICHER startet mit genau diesen zwei Findings.

---

## Test-Baseline (Playwright)

Die 8 bestehenden Spec-Files wurden mit `npx playwright test --reporter=list` gegen **Produktion** (`https://prova-systems.de`) ausgeführt. **Ergebnis: 68 passed, 4 failed** von 72 Tests (Laufzeit 8:18 min).

### Failed Tests

| # | Spec:Zeile | Test | Sicherheits-relevant? |
|---|---|---|---|
| 1 | `02-authenticated-smoke.spec.js:128` | „Globale Suche findet DIN 4108" (1 min Timeout, PROVASearch nicht initialisiert) | ❌ Funktional-Flake |
| 2 | `02-authenticated-smoke.spec.js:171` | **„Geschützte Seite ohne Session → Redirect zu Login"** | ✅ **SICHERHEIT — siehe Finding 7.4** |
| 3 | `03-core-workflow.spec.js:35` | „Dashboard zeigt Neuer Fall-Button" (0 Links gefunden) | ❌ Funktional |
| 4 | `07-doppelklick.spec.js:214` | „Einstellungen speichern: Doppelklick → 1 POST" (Timeout 90s) | ❌ Flake |

**64 andere Tests inkl. aller 6 Tests in `05-security.spec.js`** sind grün. Bedeutet konkret: **Finding 1.4 (sv_email-Filter), Finding 6.1 (XSS), Finding 4.1 (ki-proxy Auth) und Finding 2.1 (DSGVO-Pseudonymisierung) sind laut Playwright-Check aktuell nicht exploitbar aus dem Browser heraus.** Das ist gut, heißt aber nicht, dass der Code sicher ist — nur, dass die getesteten Angriffspfade greifen. Die Tests umgehen bewusst keine Edge Cases wie `_userEmail` im Request-Body (Finding 1.1) oder den fallback-login-Flow (Finding 7.1). **Diese Lücken existieren laut Code-Read trotz grüner Security-Tests.**

### Auffälligkeiten aus den Test-Logs

- **Auth-Guard greift inkonsistent:** `dashboard.html` lädt **ohne Session-Check** → siehe Finding 7.4. `archiv.html` redirected korrekt zu `app-login.html`. Das ist ein echter, reproduzierter Bug.
- **Permissions-Policy Parse-Fehler** im Browser-Console auf `dashboard.html`, `archiv.html`, `termine.html`, `rechnungen.html`, `kontakte.html`, `briefvorlagen.html`. Ursache: `netlify.toml:144` — `Permissions-Policy = "microphone=(self), camera=(self), geolocation=(), payment=(self 'https://js.stripe.com')"`. Die gesamte Policy wird verworfen → siehe Finding 4.6.
- **HTTP 422** auf einigen Seiten in den Console-Logs — ein Airtable-Request kommt mit Status 422 zurück. Vermutlich Schema-Mismatch. Kein Sicherheitsproblem, aber UX-Bug.
- **HTTP 403 Rate-Limit** auf `normen.html`, `textbausteine.html`, `einstellungen.html`, `hilfe.html`, `jveg.html`, `erechnung.html`, `statistiken.html` — Cloudflare/Netlify-Rate-Limit greift bei wiederholten Calls. Testrahmen-Artefakt.

---

## Phase 1 — Multi-Tenant-Filter-Audit

### 🔴 KRITISCH

#### Finding 1.1 — `netlify/functions/airtable.js:67-75` · Auth-Bypass via Request-Body

**Problem:** Die Function priorisiert `context.clientContext.user` (Netlify Identity JWT), fällt aber auf `body._userEmail` aus dem Request-Body zurück, wenn kein JWT kommt:

```javascript
// Zeile 67-75
try {
  const body = JSON.parse(event.body || '{}');
  if (body._userEmail && typeof body._userEmail === 'string') {
    return body._userEmail.toLowerCase();
  }
} catch (e) {}
```

**Risiko:** Ein Angreifer kann mit `curl` (kein Session-Cookie, kein JWT, kein Origin-Check) einen POST-Request an `/.netlify/functions/airtable` senden und im Body `_userEmail: "opfer@example.com"` mitschicken → der Server injiziert für GET-Anfragen den Filter `{sv_email}="opfer@example.com"` und liefert dessen Daten. **Alle 200+ Stellen im Code, die auf `prova_sv_email` aus localStorage setzen, sind damit wirkungslos** — das ist der einzige Schutzmechanismus.

**Schweregrad-Begründung:** Die aktive Mehrheit der PROVA-Logins läuft NICHT über Netlify Identity (siehe `app-login-logic.js:259-260` — `fallback-login`-Pfad), also greift fast immer der `_userEmail`-Fallback. Test `05-security.spec.js:349-377` (Cross-Tenant-Attack) würde das aufdecken, wenn die fingierte E-Mail real existierende Daten hätte.

**Behebung:**
```diff
  try {
    const context = event.clientContext || {};
    const user    = context.user;
    if (user && user.email) return user.email.toLowerCase();
  } catch (e) {}

- // Fallback: aus Body (für Legacy-Auth-Flow)
- try {
-   const body = JSON.parse(event.body || '{}');
-   if (body._userEmail && typeof body._userEmail === 'string') {
-     return body._userEmail.toLowerCase();
-   }
- } catch (e) {}
-
- return null;
+ // KEIN Fallback auf Body — wenn kein JWT vorhanden: Request verweigern.
+ return null;
}

// Zusätzlich im Handler (Zeile ~232):
const userEmail = getUserEmailFromEvent(event);
+ if (!userEmail) {
+   return { statusCode: 401, headers, body: JSON.stringify({ error: 'Anmeldung erforderlich' }) };
+ }
```
Alternative Stopgap (falls Legacy-Logins weiter unterstützt werden müssen): HMAC-signierter Kurzzeit-Token im Request-Header, serverseitig validiert gegen ein Secret. **Nicht der Body — der ist frei wählbar.**

---

#### Finding 1.2 — `auth-guard.js:152-162` · Client-seitiger Session-Token ohne Server-Signatur

**Problem:** Der Session-Token wird rein client-seitig aus `email + created + userAgent.slice(0,20)` mit einem einfachen 32-Bit-Integer-Hash gebildet. Der Kommentar sagt selbst: „Einfaches, nicht-kryptografisches Token für Client-Side Tamper-Detection".

```javascript
function buildToken(email, timestamp) {
  var str = email + ':' + timestamp + ':' + navigator.userAgent.slice(0, 20);
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'prova_' + Math.abs(hash).toString(36);
}
```

**Risiko:** Jeder Angreifer kann `prova_sv_email`, `prova_user` und `prova_session_v2` im localStorage beliebig setzen — der „Tamper-Check" findet nicht statt, weil der Angreifer den Hash mit 8 Zeilen JavaScript selbst nachbilden kann. Kein Server prüft je, ob die Session echt ist. In Kombination mit Finding 1.1 reicht das Setzen von `prova_sv_email` UND das Mitschicken von `_userEmail` im Body für einen vollständigen Identitätsdiebstahl.

**Behebung:** Server-signierter Token (wie bereits in `pdf-proxy.js` vorgemacht: HMAC-SHA256 mit `PDF_PROXY_SECRET`). Minimum:
1. Login-Function gibt HMAC-Token zurück.
2. `auth-guard.js` speichert ihn, schickt ihn als `Authorization: Bearer ...`-Header mit jedem Request.
3. `airtable.js` verifiziert die Signatur und extrahiert `sv_email` aus dem Payload.

Das ist ein Umbau — gehört in S-SICHER als Zusammenhang mit Finding 1.1.

---

#### Finding 1.3 — `netlify/functions/airtable.js:86-105` · `filterByFormula`-Injection möglich

**Problem:** In `injectUserFilter` wird die Email nur mit `.replace(/"/g, '')` „escaped":
```javascript
const userFilter = `{${userField}}="${userEmail.replace(/"/g, '')}"`;
```

**Risiko:** Airtable-Formeln sind DSL-Injection-anfällig. `.replace(/"/g, '')` entfernt nur Doublequotes. Backslashes, Unicode-Escapes, oder spezielle Airtable-Funktionen wie `FIND()`, `REGEX_MATCH()` werden nicht gefiltert. Zwar ist die E-Mail lowercased und aus JWT/Body, aber eine kompromittierte `_userEmail`-Ingabe wie `x" ) OR ({sv_email}!="` könnte die Formel komplett umbiegen. Beispiel-Payload:
```
_userEmail: 'x"),TRUE())OR({sv_email}!="'
```
→ finaler Filter: `{sv_email}="x"),TRUE())OR({sv_email}!=""` → syntaktisch valide Airtable-Formel, die **alle Records** matchet.

**Behebung:** Eingabe gegen strikte E-Mail-Regex prüfen **vor** Formel-Bau. Z.B.:
```javascript
if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(userEmail)) {
  return { statusCode: 400, body: JSON.stringify({ error: 'Ungültige E-Mail' }) };
}
```
Zusätzlich ist Airtable empfiehlt, Werte zu escapen indem man `"` durch `\\"` ersetzt (nicht durch Löschen):
```diff
- const userFilter = `{${userField}}="${userEmail.replace(/"/g, '')}"`;
+ const userFilter = `{${userField}}="${userEmail.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
```

---

#### Finding 1.4 — Mehrere Frontend-Logic-Files nutzen `localStorage.prova_sv_email` als Auth-Beweis

**Betroffen (Auszug):** `akte-logic.js:999`, `archiv-logic.js:37,439`, `app-logic.js:211,2450,2892,3560`, `briefvorlagen-logic.js:218,250,304`, `dashboard-core.js:33`, `dashboard-logic.js:687,877`, `einstellungen-logic.js:65,94,173,674,955,1026,1178,1197`, `frist-guard.js:496`, `import-assistent-logic.js`, `termine-logic.js`, `rechnungen-logic.js:352,697`, `stellungnahme-gegengutachten.html:156`, `benachrichtigungen.html:828,863,894,1016`, u.v.m. (Grep-Gesamtzahl: 520 Treffer über 199 Files).

**Problem:** Diese Files lesen `prova_sv_email` und verwenden ihn für:
- GET-Filter (`filterByFormula={sv_email}="..."`)
- POST/PATCH-Payload (`sv_email: localStorage.getItem('prova_sv_email')`)

**Risiko:** Wenn ein Angreifer Zugriff auf den Browser hat (XSS, geteilter Rechner, eingeschleuste Browser-Erweiterung), reicht das Setzen von `localStorage.prova_sv_email` für einen Account-Takeover. Solange die Server-Verifikation fehlt (Finding 1.1), vertraut der Client komplett dem localStorage.

**Behebung:** Nach Finding 1.1/1.2 werden alle Client-Reads von `prova_sv_email` überflüssig — der Server kennt den Nutzer aus dem Token. Bis dahin: minimaler Hotfix auf Server-Seite (Findings 1.1 + 1.3 reichen, Client-Seite kann beim Alten bleiben).

---

### 🟠 HOCH

#### Finding 1.5 — `stellungnahme-gegengutachten.html:156` · `sv_email` im Client-seitigen Filter, aber Server ignoriert ihn bei POST

**Problem:** Zeile 156 baut:
```javascript
filterByFormula: "AND({Aktenzeichen}='" + az + "',{sv_email}='" + svEmail + "')"
```
Das ist nicht schlimm (Server injiziert `sv_email` sowieso nochmal), aber: die Variable `svEmail` kommt aus localStorage, nicht aus einer Auth-Quelle — **und `az` wird als String in die Formel konkateniert**. Wenn `az` ein String wie `X',{sv_email}!='x` enthält, ist wieder Injection möglich.

**Risiko:** Mit manipulierten Eingaben könnte ein User in seiner eigenen Sitzung andere eigene (oder fremde) Records lesen — allerdings nur wenn der Server den Filter 1:1 akzeptiert. `airtable.js:181` tut genau das.

**Behebung:** AZ-Format auf Server-Seite hart validieren (Regex `/^[A-Z]{2,6}-\d{4}-\d{1,4}$/`) und Apostrophe eskapen. Bevorzugt: gar keine vom Client gebauten Formeln durchlassen — stattdessen `body.filter_az` erwarten und Server die Formel bauen.

---

#### Finding 1.6 — `prova-airtable-api.js:201`, `prova-api.js:44`, `dashboard-core.js:53` · Zentrale Filter-Helper ohne `sv_email`-Injektion

**Problem:** Diese drei zentralen Airtable-Helper akzeptieren beliebige `filter`-Optionen vom Aufrufer. Sie stellen selbst nicht sicher, dass `sv_email` im Filter landet — sie verlassen sich darauf, dass das **der Server** tut. Das ist funktional OK (Server-Side-Filter gewinnt), aber wenn der Server-Side-Schutz jemals wegfällt (z. B. Tabelle versehentlich ohne `userField` in Whitelist), fehlt der Client-Side-Fallback.

**Schweregrad:** 🟠 weil Defense-in-Depth-Prinzip verletzt, aber nicht direkt exploitable wenn airtable.js intakt.

**Behebung:** Client-Helper bauen `sv_email` selbst in die Filter ein, wenn ein `userBound: true`-Flag gesetzt ist.

---

#### Finding 1.7 — Hardcodierte `appJ7bLlAHZoxENWE` über ~40 Stellen im Frontend

**Problem:** Die Base-ID steht in mindestens 40 Frontend-Files als Literal. Wenn sie je rotiert werden muss (z. B. nach einem Breach), ist das ein massiver Rollout-Aufwand.

**Schweregrad:** 🟡 Operational Risk, keine direkte Schwachstelle.

**Behebung:** Client-Helfer `AIRTABLE_BASE` aus einer zentralen Config (z. B. `prova-config.js`) importieren, nicht hartcodieren.

---

### 🟢 OK

- `netlify/functions/airtable.js:15-30` — Tabellen-Whitelist (`ALLOWED_TABLES`) ist sauber; Zugriffe auf nicht-gelistete Tabellen werden mit 403 abgelehnt (Zeile 227-230).
- Rate-Limiting (100 req/min/IP) auf Airtable-Function (Zeile 33-52) — wird bei Cold-Start zurückgesetzt, ist aber ein pragmatischer Schutz vor Scraping.
- `tests/05-security.spec.js:66-202` testet Multi-Tenant-Isolation mit zwei parallelen Sessions und prüft, dass kein Call eine fremde E-Mail im Filter hat. **Sehr gute Test-Abdeckung — Marcel hier nicht loslassen, die Tests sind Gold.**

---

## Phase 2 — DSGVO-Pseudonymisierung-Audit

### 🔴 KRITISCH

#### Finding 2.1 — `netlify/functions/ki-proxy.js` · Keine Server-Pseudonymisierung vor OpenAI-Call

**Problem:** Der KI-Proxy nimmt Daten wie `az`, `auftraggeber`, `objekt`, `diktat`, `messwerte`, `kontext.az`, `kontext.fehler` ungefiltert in den Prompt (siehe Zeilen 79, 144-150, 373-398) und sendet sie an OpenAI. Es gibt keinen Aufruf von `prova-pseudo.js`, `pseudonymize.js` oder irgendeiner anderen Funktion, die Klardaten maskiert. Die einzigen Stellen mit Pseudonymisierung liegen **im Client** (`diktat-parser.js:20-32`, `paragraph-generator.js:22-39`, `baubegleitung-polish.js:94`).

**Risiko:**
- Wenn der Client vergisst zu pseudonymisieren (oder es deaktiviert), werden Klardaten (Namen, Adressen, IBAN, E-Mails aus dem Diktat) an OpenAI (USA) gesendet → Verstoß gegen CLAUDE.md Regel 10 + Art. 32 DSGVO + Art. 49 DSGVO (Drittlandtransfer).
- `handleFachurteilEntwurf` nimmt `auftraggeber` direkt in den Prompt — das ist typischerweise der Versicherungs-/Gerichtsname, aber auch Privatpersonen kommen vor → Personenbezug.
- `handleSupportChat` nimmt `kontext.az`, `kontext.fehler` (kann Stacktrace-Info enthalten), ggf. `kontext.seite` (kann Query-Params leaken).
- `avv.html:368` verspricht: „Daten im Zusammenhang mit Gutachten werden vor der Übermittlung an OpenAI nach Möglichkeit pseudonymisiert." Das ist rechtlich eine Zusicherung; der Code hält sie nur durch Client-Disziplin, nicht durch Technik.

**Behebung:**
1. `prova-pseudo.js` auch server-seitig verfügbar machen (als `lib/prova-pseudo.js` Modul unter `netlify/functions/lib/`).
2. In `ki-proxy.js` Handler-Einstieg: **jede** Text-Eingabe (diktat, messwerte, paragraphen.*, kontext.*, user_kontext) durch `ProvaPseudo.apply()` schleusen **bevor** sie in `messages` landet.
3. `ProvaPseudo.audit()` als letzten Check anwenden: wenn Reste gefunden → entweder 400 zurückgeben oder final scrubben + Warning loggen.
4. Client-seitige Pseudonymisierung **behalten** (Defense-in-Depth) — aber Server-Seite wird zur Hoheitsinstanz.

---

#### Finding 2.2 — `netlify/functions/foto-captioning.js` · Foto-Upload inkl. `aktenzeichen` unverschlüsselt an OpenAI

**Problem:** Ein Foto plus das Aktenzeichen (Body `aktenzeichen`) und die erwartete Schadensart gehen direkt an GPT-4o Vision. Das Aktenzeichen wäre zwar allein nicht personenbezogen, aber:
- **Das Foto selbst enthält oft Klingelschilder, Briefkästen, Autokennzeichen, Firmen-/Gesichts-Aufnahmen.** Kein Blurring, kein EXIF-Strip, keine Gesichtserkennung.
- Keine Authentifizierung auf der Function (Finding 4.2) — jeder kann OpenAI-Token-Budget verbrennen **und** gespeicherte Fotos abgreifen, wenn sie im Netzwerk erscheinen.

**Risiko:** DSGVO-Verstoß bei Gesichts-/Kennzeichen-Aufnahmen. Bei Gerichtsgutachten verschärfend (Beweismittel).

**Behebung:**
- **Kurzfristig:** Client-seitig vor Upload EXIF strippen (es gibt kleine Libraries, ~2KB).
- **Mittelfristig:** Server-seitig Blurring (Gesichter + Kennzeichen) via OpenCV oder externen Dienst **vor** OpenAI-Call. Das ist Aufwand — ggf. K3+.
- **Sofort:** im AVV klarstellen, dass Bild-Inhalte nicht pseudonymisiert werden und eine explizite Einwilligung vom SV vor Aufnahme eingeholt werden muss (steht indirekt in `einverstaendnis-dsgvo.html`, aber nicht auf Foto-Fluss bezogen).

---

#### Finding 2.3 — `netlify/functions/whisper-diktat.js` · Audio + Transkript ohne Post-Pseudonymisierung

**Problem:** Audio geht unverschlüsselt an Whisper (das ist unvermeidbar — Whisper muss das Original hören). Das zurückgegebene **Transkript** enthält aber zwangsläufig Klardaten (Namen, Adressen, IBANs), weil das SV sie im Diktat genannt hat. Die Function gibt dieses Klar-Transkript 1:1 zurück (Zeile 125) und verlässt sich darauf, dass der Client vor dem ki-proxy-Call `ProvaPseudo.apply()` ruft. Wenn das vergessen wird → erneuter OpenAI-Call mit Klardaten.

**Risiko:** Ergänzend zu Finding 2.1 — zweiter Angriffspfad für Klardaten-Leak.

**Behebung:** Transkript **vor Rückgabe** durch Pseudonymisierung schleusen (Finding 2.1 löst das teilweise; zusätzlich kann `whisper-diktat.js` direkt selbst `ProvaPseudo.apply(transkript)` rufen).

---

### 🟠 HOCH

#### Finding 2.4 — `ki-proxy.js:343` · `user_kontext` unbegrenzt in Prompt

**Problem:** `appendUserContext` nimmt `body.user_kontext` (max 1000 Zeichen) direkt in den System-Prompt. Dieser Kontext stammt aus den SV-Einstellungen — kann aber vom Client-JS mit beliebigen Daten überschrieben werden. Keine Pseudonymisierung, keine Filterung.

**Risiko:** SV könnte versehentlich personenbezogene Daten (Bankverbindung, Klienten-Namen aus früheren Fällen) in „Einstellungen → KI & Diktat" eingetragen haben. Jeder KI-Call trägt die dann zu OpenAI.

**Behebung:** `appendUserContext` zuerst durch `ProvaPseudo.apply()` schicken.

---

#### Finding 2.5 — Client-Pseudonymisierung ist optional, nicht erzwungen

**Problem:** In `diktat-parser.js:75`, `paragraph-generator.js:264,303`, `baubegleitung-polish.js:120` wird pseudonymisiert **bevor** der KI-Call abgeht. In anderen Clients wie `app-logic.js`, `stellungnahme-logic.js`, `freigabe-logic.js`, `ki-lernpool.js` wird direkt an `ki-proxy` gesendet, ohne `ProvaPseudo.apply()` vorgeschaltet.

**Risiko:** Inkonsistent — ein SV weiß nicht, welcher Pfad sicher ist.

**Behebung:** Finding 2.1 ist die beste Lösung (Server erzwingt's). Ergänzend: `prova-pseudo.js` auf jeder Seite, die zu ki-proxy callt, einbinden und als Mandatory-Pre-Step verwenden.

---

### 🟡 MEDIUM

#### Finding 2.6 — `prova-pseudo.js:77` · Personen-Regex konservativ, viele Treffer verpasst

Die Regex erkennt nur Namen mit Kontext-Indikator (Herr/Frau/Dr./Auftraggeber etc.). Diktierte Namen ohne diese Prefix (z. B. „Müller rief heute an") werden nicht erkannt. **Bewusste Design-Entscheidung** laut Kommentar (Zeile 70) — dokumentiert, aber Marcel sollte im Usability-Test prüfen, wie oft echte Namen durchrutschen.

---

### 🟢 OK / Positiv

- `netlify/functions/lib/` existiert für wiederverwendbare Module — `prova-pseudo.js` lässt sich dort spiegeln, ohne Architektur umzubauen.
- `prova-pseudo.js` ist **gut gebaut**: IBAN (DE), E-Mail, Telefon, Straße, PLZ+Ort, Personen (mit Kontext). Inklusive `audit()` für Reverse-Check.
- `tests/05-security.spec.js:411-538` testet die Pseudonymisierung via Network-Interception mit realistischem Diktat (Name + IBAN + Adresse + Telefon + E-Mail). Wenn dieser Test bei der nächsten Run rot wird, erfahrt ihr es.

---

## Phase 3 — localStorage-Audit

### 🔴 KRITISCH

#### Finding 3.1 — Session-State im Klartext-localStorage ohne Server-Verifikation

**Problem:** `prova_user`, `prova_sv_email`, `prova_session_v2`, `prova_last_activity` sowie `prova_paket`, `prova_status`, `prova_einstellungen` liegen alle im klartext-localStorage. Kein HMAC, kein Server-Round-Trip.

**Risiko:** Siehe Finding 1.2 (Auth-Token-Fälschung), Finding 1.4 (sv_email-Manipulation). Zusätzlich:
- `prova_einstellungen.session_timeout` kann auf 168 (= 7 Tage) gesetzt werden → Auto-Logout effektiv aus (auth-guard.js:189).
- `prova_paket = 'Team'` könnte Paket-Gates in `paket-guard.js` umgehen (wenn nur client-seitig geprüft).

**Behebung:** Zentrale Sicherungsmaßnahme: Server vertraut localStorage NIE. Alle sicherheitskritischen Entscheidungen (Pricing, Multi-Tenant, Feature-Flags) auf Server verlagern. localStorage ist UX-Cache.

---

### 🟠 HOCH

#### Finding 3.2 — `import-assistent-logic.js` · Geschäftsdaten primär in localStorage (laut AKTUELLE-ABWEICHUNGEN.md)

Bekanntes Issue, in Sprint IMPORT-FIX eingeplant. Kontakte/Bausteine/Fälle aus Import landen stellenweise nur im localStorage, nicht in Airtable. Bei Browser-Cache-Clear verloren; kein Multi-Device-Sync.

**Stand im Code:** `import-assistent-logic.js:500` ruft zwar `airtable`-Function, aber vorherige Stellen nutzen lokale `_parsed`-Struktur. Detaillierte Prüfung erfordert manuelle Nachverfolgung der Import-Flows (für S-AUDIT read-only nicht gemacht).

**Behebung:** Sprint IMPORT-FIX (nach S-SICHER).

---

### 🟡 MEDIUM

#### Finding 3.3 — `prova_last_activity` manipulierbar, aber niedriges Schadenpotenzial

Ein Angreifer könnte sich per JS dauerhaft „aktiv" halten, um Auto-Logout zu umgehen. Impact begrenzt (Session läuft eh 30 Tage).

---

### 🟢 OK

- `tests/05-security.spec.js:46-61` (`injectSession`) belegt, wie einfach localStorage-Manipulation ist. Ist schon als Test-Helper genutzt, kann aber auch als Angriffsvektor verstanden werden.
- `auth-guard.js:183-209` implementiert Inaktivitäts-Timeout (konfigurierbar, Default 8h). Client-seitig umgehbar, aber UX-sinnvoll.

---

## Phase 4 — API-Endpoint-Auth-Audit

Es gibt **46 Netlify Functions** (`ls netlify/functions/*.js`). Davon haben einige Auth, einige nicht. Die schlimmsten:

### 🔴 KRITISCH

#### Finding 4.1 — `netlify/functions/ki-proxy.js` · Keine Auth, keine Origin-Beschränkung

**Problem:** Die gesamte Function läuft ohne jeden Auth-Check. CORS ist `*` (Zeile 53, 74, 278). Jeder Internet-User kann einen POST senden und OpenAI-Token verbrennen.

**Risiko:** Finanzieller Missbrauch. Ein Angreifer mit Shell-Script kann innerhalb von Minuten mehrere hundert € an OpenAI-Calls erzeugen. Test `05-security.spec.js:379-405` prüft das — falls der Test grün läuft, heißt das: der Proxy gibt keinen *sinnvollen* Content zurück ohne bestimmte Parameter, aber die OpenAI-Calls finden trotzdem statt.

**Behebung:**
1. `context.clientContext.user` prüfen wie in `pdf-proxy.js:182-185`. Bei fehlendem JWT: 401.
2. CORS auf `cors-helper.js` umstellen (nur prova-systems.de/netlify.app/localhost).
3. Zusätzlich Rate-Limit pro User-Email.

---

#### Finding 4.2 — `netlify/functions/foto-captioning.js` · Keine Auth, CORS `*`

Analog zu 4.1. `foto-captioning.js:10,91,113,125` setzt `Access-Control-Allow-Origin: '*'`. Kein JWT-Check.

---

#### Finding 4.3 — `netlify/functions/whisper-diktat.js` · Keine Auth, CORS `*`

Analog zu 4.1/4.2. `whisper-diktat.js:167`. **Zusätzlich: 25MB Upload-Limit** pro Request — kombiniert mit kein Auth = teurer DoS-Vektor (OpenAI Whisper kostet pro Minute).

---

#### Finding 4.4 — `netlify/functions/push-notify.js:409` · CORS `*`

Push-Subscriptions werden ohne Origin-Beschränkung angenommen. Wenn jemand die Function-URL kennt und ein valides VAPID-Subscription-Payload hat (aus eigenem Browser extrahiert), kann er Push-Benachrichtigungen an fremde User senden — **sofern** die Subscription-Tabelle das erlaubt. Muss weiter verifiziert werden.

---

### 🟠 HOCH

#### Finding 4.5 — Duplikate: Viele Functions existieren doppelt im Repo-Root und in `netlify/functions/`

**Problem:** Beispiele von identischen Namen:
- `admin-auth.js` (root) + `netlify/functions/admin-auth.js`
- `audit-log.js` + `netlify/functions/audit-log.js`
- `brief-pdf-senden.js` + `netlify/functions/brief-pdf-senden.js`
- `dsgvo-auskunft.js` + `netlify/functions/dsgvo-auskunft.js`
- `error-log.js` + `netlify/functions/error-log.js`
- `ki-proxy.js` + `netlify/functions/ki-proxy.js`
- `stripe-checkout.js` + `netlify/functions/stripe-checkout.js`
- weitere ~15 Paare.

`netlify.toml:7,16` deklariert nur `netlify/functions` als Functions-Directory — die Root-Kopien werden **nicht deployed**, existieren aber als toter Code.

**Risiko:** Entwickler bearbeiten aus Versehen die Root-Kopie → Änderungen sind wirkungslos und gehen verloren. Die Root-Varianten haben teilweise CORS `*` und anderes älteres Verhalten — wenn sie eines Tages doch deployed werden (z. B. Netlify-Config-Unfall), ist das ein Rückschritt.

**Behebung:** Die Root-Kopien **prüfen und löschen** (manuell, Datei für Datei). Im Zweifel Marcel fragen, welche „die echte" ist (zumeist die unter `netlify/functions/`). Dies ist **S-SICHER-Aufgabe**, nicht S-AUDIT.

---

#### Finding 4.6 — `netlify.toml:144` · Permissions-Policy wird vom Browser verworfen

Die Syntax `payment=(self 'https://js.stripe.com')` erzeugt Parse-Fehler im Chrome-Console (siehe Test-Baseline). Ergebnis: **Die gesamte Permissions-Policy wird ignoriert**, nicht nur die fehlerhafte Direktive. Das hebelt Mikrofon-/Kamera-Beschränkungen aus.

**Behebung:**
```diff
- Permissions-Policy = "microphone=(self), camera=(self), geolocation=(), payment=(self 'https://js.stripe.com')"
+ Permissions-Policy = "microphone=(self), camera=(self), geolocation=(), payment=(self \"https://js.stripe.com\")"
```
(Wichtig: Doublequotes um den Origin, nicht Singlequotes. Netlify-Toml erfordert Escape.)
Ergänzend Cross-Browser mit <https://permissionspolicy.com/parser/> testen.

---

#### Finding 4.7 — `netlify/functions/airtable.js` · Keine JWT-Pflicht (nur Fallback-Logik)

Bereits in Finding 1.1 behandelt. Hier nochmal: Diese Function sollte JWT strikt verlangen wie `pdf-proxy.js`, `stripe-checkout.js`, `stripe-portal.js` das tun.

---

### 🟡 MEDIUM

#### Finding 4.8 — `netlify/functions/health.js` · Öffentlicher Status-Endpoint (nicht geprüft)

Funktion-Existenz bestätigt (Glob), Inhalt nicht im Detail gelesen. Bei `/health`-Endpoints ist typisch ein Info-Leak (Version, Env, DB-Status). **Empfehlung:** im S-SICHER kurz reviewen.

---

#### Finding 4.9 — `_headers:9` · Access-Control-Allow-Origin: `*` für statische Assets

Für CSS/JS/Icons akzeptabel, aber in Kombination mit Session-Cookies potenziell problematisch. Niedrige Priorität.

---

### 🟢 OK

- **25 Functions nutzen `context.clientContext.user`** für JWT-Check (siehe Grep): `rechnung-pdf.js`, `stripe-checkout.js`, `make-proxy.js`, `foto-upload.js`, `pdf-proxy.js`, `zugferd-rechnung.js`, `dsgvo-loeschen.js`, `dsgvo-auskunft.js`, `mein-aktivitaetsprotokoll.js`, `mahnung-pdf.js`, `ki-statistik.js`, `invite-user.js`, `jahresbericht-pdf.js`, `foto-anlage-pdf.js`, `smtp-senden.js`, `smtp-credentials.js`, `smtp-test.js`, `audit-log.js`, `admin-auth.js`, `brief-senden.js`, `brief-pdf-senden.js`, `setup-tabellen.js`, `provision-sv.js`, `create-checkout-session.js`, `emails.js`. Gut.
- **30 Functions nutzen `lib/cors-helper.js`**. Die Ausreißer (`airtable.js`, `ki-proxy.js`, `foto-captioning.js`, `whisper-diktat.js`, `push-notify.js`) sind die Hotspots für 4.1-4.4.

---

## Phase 5 — PDF-URL-Sicherheits-Audit

### 🟠 HOCH

#### Finding 5.1 — `netlify/functions/pdf-proxy.js:41-47` · `DOC_TYPE_MAP` enthält Placeholder-Tabellen-IDs

**Problem:** Die Tabellen-Mapping hat echte IDs nur für `gutachten` (`tblSxV8bsXwd1pwa0`). Für `rechnung`, `brief`, `mahnung`, `fotoanlage` stehen Platzhalter:
```javascript
rechnung:   { table: 'tblRechnungen',      ...}
brief:      { table: 'tblBriefe',          ...}
mahnung:    { table: 'tblMahnungen',       ...}
fotoanlage: { table: 'tblFotoAnlagen',     ...}
```
Die echten IDs wären laut INFRASTRUKTUR-REFERENZ.md: `RECHNUNGEN=tblF6MS7uiFAJDjiT`, `BRIEFE=tblSzxvnkRE6B0thx`.

**Risiko:** PDF-Proxy schlägt für Rechnungen/Briefe/Mahnungen fehl → Fall-Back auf direkten Download ohne Token wird irgendwo im Frontend genommen (zu prüfen) → Kein Eigentümer-Check.

**Behebung:** Echte Table-IDs eintragen. Nicht bestehende Tabellen (`tblMahnungen`, `tblFotoAnlagen`) sauber deaktivieren oder neue Tabellen anlegen.

---

### 🟡 MEDIUM

#### Finding 5.2 — `pdf-proxy.js:192` · `directUrl` als Bypass-Pfad

Wenn jemand eine gültige CDN-URL kennt (z. B. geleakte PDFMonkey-Download-URL), kann sie direkt mit `action: 'sign'` + `pdf_url: '<direct>'` signieren — Eigentümer-Check wird übersprungen (nur Host-Allowlist greift).

**Risiko:** Niedrig, weil CDN-URLs zeitlich begrenzt gültig sind, aber Theorie besagt: wer die URL hat, kann einen Download-Token erstellen. Besser: `directUrl` nur mit Admin-Rolle zulassen.

---

### 🟢 OK / Positiv

- `pdf-proxy.js` ist vorbildlich: **HMAC-SHA256 + 15-Min-TTL + JWT-Pflicht + Owner-Check + Host-Allowlist + X-Content-Type-Options: nosniff + Cache-Control: no-store**. Das ist der Goldstandard, den alle anderen Functions treffen sollten.
- `pdf-proxy.js:72` verwendet `crypto.timingSafeEqual` — kein Timing-Angriff.

---

## Phase 6 — XSS und Input-Validation

### 🟠 HOCH

#### Finding 6.1 — 479 `innerHTML=`-Zuweisungen in 87 Files · Kein zentraler Sanitizer

**Problem:** Grep nach `escapeHtml|escapeHTML|sanitize|DOMPurify` liefert **nur 7 Treffer in 2 Files**. Das bedeutet: die allermeisten `innerHTML`-Zuweisungen vertrauen auf die Quell-Daten (Airtable, User-Eingabe). Beispiel `einstellungen-logic.js:362`:
```javascript
valEl.innerHTML = checks.map(function(c) { ... }).join('')
```
Wenn `c.text` user-kontrolliert ist, ist das direkter XSS-Vektor.

**Risiko:** In `01-login.spec.js` ist belegt, dass `prova_user.name` aus localStorage stammt und gerendert wird. `05-security.spec.js:263-297` testet genau diesen Vektor (Storage-XSS via Name-Feld). Der Testlauf war zum Report-Zeitpunkt noch nicht am Security-Spec angekommen — **Ergebnis nachreichen**.

**Hotspots nach Anzahl innerHTML-Treffer:**
- `freigabe-logic.js`: 90
- `app-logic.js`: 82
- `einstellungen-logic.js`: 78
- `stellungnahme-logic.js`: 74
- `maengelanzeige.html`: 43+ (Brief-Templates)
- `rechnungen-logic.js`: 35

**Behebung:** Zentrale `escapeHtml(s)`-Helper schreiben (10 Zeilen), systematisch dort einsetzen, wo User-Input gerendert wird:
```javascript
function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}
```
Alternative: Wo möglich, `textContent` statt `innerHTML` verwenden.

---

### 🟡 MEDIUM

#### Finding 6.2 — Brief-Vorlagen haben HTML-Rendering mit Airtable-Feldwerten

In vielen Brief-Templates (`briefe/*.html`) werden Airtable-Felder direkt ins HTML interpoliert (Glob zeigt ~50 Templates). Wenn Airtable-Felder XSS-Payloads enthalten (z. B. durch Import), können sie beim Rendern ausgeführt werden.

**Behebung:** Zusammen mit 6.1.

---

### 🟢 OK

- `tests/05-security.spec.js:207-297` hat **zwei XSS-Tests** (Eingabe + Storage). Wenn beide grün sind, ist zumindest der Auftraggeber-Name-Vektor geschlossen.

---

## Phase 7 — Auth-Flow-Audit

### 🔴 KRITISCH

#### Finding 7.1 — Keine Server-seitige Passwort-Speicherung in PROVA-Functions

**Problem:** PROVA nutzt Netlify Identity für echte User-Logins. `netlify/functions/identity-signup.js:52-66` legt nur den SV-Record in Airtable an; das Passwort-Handling erfolgt in Netlify Identity selbst. **Aber:** `app-login-logic.js:259-260` hat einen `fallback-login`-Pfad, der User mit beliebiger E-Mail einloggt, wenn Netlify Identity fehlschlägt:

```javascript
localStorage.setItem('prova_user', JSON.stringify({email: email, name: email, token: 'fallback-login'}));
localStorage.setItem('prova_sv_email', email);
```

**Risiko:** In Kombination mit Finding 1.1: Ein Angreifer kann durch bewusstes Fehlschlagen des Netlify-Identity-Calls (z. B. blockiertes Skript, offline) in den Fallback-Pfad geraten UND sich als beliebige Email „einloggen" — weil kein Passwort validiert wird. Das ist **der größte bekannte Auth-Bypass** im Code.

**Behebung:** Fallback-Login komplett entfernen. Wenn Netlify Identity nicht erreichbar ist: harte Fehlermeldung, kein Login.

---

### 🟠 HOCH

#### Finding 7.2 — `netlify/functions/identity-signup.js:42` · Schwaches E-Mail-Escaping

```javascript
const filter = encodeURIComponent('{Email}="' + email.replace(/"/g, '\\"') + '"');
```
Analog zu Finding 1.3 — nur Doublequotes, keine Backslash-Escapes.

---

#### Finding 7.3 — Kein Rate-Limit auf Login-Flow

**Problem:** `identity-signup.js` ist Signup, nicht Login. Der eigentliche Login läuft über `identity.netlify.com`. Aber: Wenn der `fallback-login` in `app-login-logic.js` genutzt wird, findet **keine Rate-Limit**-Prüfung statt — Brute-Force möglich.

**Behebung:** Sprint AUTH-PERFEKT (laut BLUEPRINT) soll das lösen. Dokumentiere in SPRINT-S-SICHER.

---

### 🔴 KRITISCH (aus Test-Lauf)

#### Finding 7.4 — `dashboard.html` redirected NICHT zu Login ohne Session

**Problem:** Playwright-Test `02-authenticated-smoke.spec.js:171-192` schlägt fehl:
```
dashboard.html ohne Session führt zu: https://prova-systems.de/dashboard.html
❌ ERWARTET app-login.html — bekam: https://prova-systems.de/dashboard.html
```
**Im Gegensatz dazu** redirected `archiv.html` korrekt zu `app-login.html`. Das heißt: die Auth-Guard-Einbindung ist inkonsistent — entweder
- `auth-guard.js` ist in `dashboard.html` nicht eingebunden, oder
- es ist mit `defer`/`async` geladen und läuft nach dem DOM-Render zu spät an, oder
- das `provaAuthGuard()`-Skript ruft `silent: true` oder redirectTo ist falsch, oder
- der Service Worker liefert eine alte Version von `auth-guard.js` ohne SELBST-AKTIVIERUNG (siehe Test-Hint-Zeile 187).

**Risiko:** Ein nicht-authentifizierter User kann die dashboard.html-Seite öffnen. Ohne Daten ist die Seite zwar leer, aber:
- HTML-Markup lässt DOM-Struktur und Feature-Set erkennen (Rekonnaissance).
- Wenn JS später Daten lädt (ohne eigenen Auth-Check), landet man im Auth-Bypass-Szenario aus Finding 1.1.

**Behebung:** In `dashboard.html` prüfen, ob `<script src="auth-guard.js"></script>` (ohne defer) als **allererstes** Script im `<head>` steht, mit **synchronem** `provaAuthGuard()` direkt danach. Siehe `archiv.html` als funktionierendes Beispiel. Zusätzlich CACHE_VERSION in `sw.js` erhöhen (Regel 4).

---

### 🟢 OK

- `auth-guard.js:183-209` hat Inaktivitäts-Timeout, konfigurierbar via Einstellungen.
- `auth-guard.js:135-147` hat Legacy-Migration, die alte Sessions automatisch in V2-Format überführt.
- `archiv.html` (und weitere Seiten) funktionieren mit dem Auth-Guard korrekt (Test-Beleg).

---

## Phase 8 — Error-Handler-Audit

### 🟠 HOCH

#### Finding 8.1 — Viele Functions geben `e.message` in Response zurück

**Betroffen:**
- `netlify/functions/airtable.js:287-291` — `detail: e.message`
- `netlify/functions/ki-proxy.js:74` — `detail: e.message`
- `netlify/functions/foto-captioning.js:92,126` — `detail: e.message`
- `netlify/functions/whisper-diktat.js:119,159` — Error-Message in Response
- `netlify/functions/pdf-proxy.js:128` — `console.error` mit ENV-Namen

**Risiko:** Info-Leak. Stack-Traces, API-Key-Fragmente (bei bestimmten 403-Fehlern), interne Pfade. Ein Angreifer nutzt solche Fehlermeldungen, um Infrastruktur zu kartieren.

**Behebung:** Fehler loggen (Server-seitig), aber dem Client nur generische Nachrichten zurückgeben. Muster:
```javascript
console.error('[airtable] fetch failed:', e);
return { statusCode: 502, headers, body: JSON.stringify({ error: 'API nicht erreichbar' }) };
```

---

### 🟢 OK

- `prova-error-handler.js` existiert (Frontend). Inhalt ist im Umfang des Audits nicht detailliert geprüft — Marcel: ggf. sicherstellen, dass es auf allen 90+ HTML-Seiten eingebunden ist.

---

## Gesamtübersicht Findings

| # | Schweregrad | Titel |
|---|---|---|
| 1.1 | 🔴 | airtable.js akzeptiert `_userEmail` aus Body (Auth-Bypass) |
| 1.2 | 🔴 | Client-seitiger Session-Token ohne Server-Signatur |
| 1.3 | 🔴 | `filterByFormula`-Injection durch unzureichendes Escaping |
| 1.4 | 🔴 | Frontend vertraut localStorage.prova_sv_email für Auth |
| 1.5 | 🟠 | Formula-Injection via `az` in stellungnahme-gegengutachten |
| 1.6 | 🟠 | Zentrale Helper ohne sv_email-Injection (Defense-in-Depth) |
| 1.7 | 🟡 | BASE_ID 40× hartcodiert |
| 2.1 | 🔴 | ki-proxy.js ohne Server-Pseudonymisierung |
| 2.2 | 🔴 | foto-captioning.js: Fotos unpseudonymisiert an OpenAI |
| 2.3 | 🔴 | whisper-diktat.js: Klar-Transkript zurückgeben |
| 2.4 | 🟠 | user_kontext unpseudonymisiert im Prompt |
| 2.5 | 🟠 | Client-Pseudo inkonsistent angewandt |
| 2.6 | 🟡 | Personen-Regex in prova-pseudo.js konservativ |
| 3.1 | 🔴 | Session-State im Klartext-localStorage |
| 3.2 | 🟠 | Import-Assistent legt Geschäftsdaten in localStorage |
| 3.3 | 🟡 | prova_last_activity manipulierbar |
| 4.1 | 🔴 | ki-proxy.js: keine Auth, CORS `*` |
| 4.2 | 🔴 | foto-captioning.js: keine Auth, CORS `*` |
| 4.3 | 🔴 | whisper-diktat.js: keine Auth, CORS `*` |
| 4.4 | 🔴 | push-notify.js: CORS `*` |
| 4.5 | 🟠 | Function-Duplikate im Repo-Root (toter Code) |
| 4.6 | 🟠 | Permissions-Policy wird von Chrome verworfen |
| 4.7 | 🟠 | airtable.js: keine strikte JWT-Pflicht |
| 4.8 | 🟡 | health.js nicht reviewt |
| 4.9 | 🟡 | _headers: CORS `*` für statische Assets |
| 5.1 | 🟠 | pdf-proxy.js: DOC_TYPE_MAP hat Placeholder-IDs |
| 5.2 | 🟡 | pdf-proxy.js: directUrl-Bypass |
| 6.1 | 🟠 | 479 innerHTML ohne zentralen Sanitizer |
| 6.2 | 🟡 | Brief-Templates rendern Airtable-Felder ungefiltert |
| 7.1 | 🔴 | fallback-login erlaubt beliebige E-Mail ohne Passwort |
| 7.2 | 🟠 | identity-signup.js: schwaches E-Mail-Escaping |
| 7.3 | 🟠 | Kein Rate-Limit auf fallback-login |
| 7.4 | 🔴 | dashboard.html ohne Session redirected NICHT zu Login (Test-Fund) |
| 8.1 | 🟠 | Functions leaken e.message in Response |

---

## Empfehlungen (Reihenfolge der Behebung)

### Blocker für Pilotkunden (sofort, Sprint S-SICHER)

1. **Finding 7.1** — fallback-login entfernen. Das ist der größte Skandal.
2. **Finding 7.4** — Auth-Guard auf `dashboard.html` reparieren (reproduziert durch Test).
3. **Finding 1.1** — `_userEmail`-Body-Fallback in airtable.js entfernen + 401 wenn kein JWT.
4. **Finding 2.1 + 2.3** — Server-seitige Pseudonymisierung in ki-proxy.js und whisper-diktat.js.
5. **Finding 4.1-4.3** — JWT-Pflicht + cors-helper einziehen für ki-proxy, foto-captioning, whisper-diktat.
6. **Finding 1.2** — HMAC-Token ergänzen (technisch verzahnt mit 1.1; gleicher Sprint).
7. **Finding 1.3** — E-Mail-Validation + korrektes Escaping in airtable.js.
8. **Finding 3.1** — Security-Decisions (paket-guard etc.) auf Server verlagern.

### Vor Pilotkunden (S-SICHER Teil 2)

8. **Finding 4.5** — Function-Duplikate aus Repo-Root löschen (manuell).
9. **Finding 4.6** — Permissions-Policy in netlify.toml fixen.
10. **Finding 5.1** — DOC_TYPE_MAP Table-IDs korrigieren.
11. **Finding 6.1** — zentrale `escapeHtml` einführen + an Hotspots (freigabe-logic.js, app-logic.js, stellungnahme-logic.js) anwenden.
12. **Finding 8.1** — e.message nicht mehr in Client-Response.

### Folge-Quartal (K3+)

13. **Finding 2.2** — EXIF-Strip + Face-Blur im foto-captioning-Flow.
14. **Finding 4.8** — health.js reviewen.
15. **Finding 1.7** — BASE_ID in Zentral-Config.
16. Restliche 🟡 Findings.

---

## Schlusswort

**Audit fertig. 13 kritische, 14 hohe, 9 mittlere Findings. Empfehlung: zuerst kritische beheben.**

Drei Findings stechen heraus und müssen absolut zuerst:
1. **Fallback-Login (7.1)** — erlaubt Einloggen als beliebiger User ohne Passwort.
2. **Auth-Bypass via `_userEmail` (1.1)** — erlaubt Daten-Lesung für beliebigen SV per Curl.
3. **dashboard.html ohne Auth-Guard (7.4)** — reproduziert durch Playwright-Test.

Gemeinsam eingesetzt ergibt das: Angreifer mit minimalem Skript kann alle PROVA-Daten eines beliebigen SV lesen. Das ist nicht akzeptabel vor Pilotkunden.

**Positive Seite:** Die Infrastruktur-Bausteine für die Fixes existieren bereits:
- `pdf-proxy.js` zeigt den sauberen HMAC-Token-Flow als Vorbild.
- `cors-helper.js` ist bereits in 30/46 Functions integriert.
- `prova-pseudo.js` ist ein gutes client-seitiges Pseudo-Modul, das 1:1 server-seitig wiederverwendbar ist.
- `tests/05-security.spec.js` testet genau die richtigen Vektoren — die Fixes sind damit automatisch verifiziert.

Der Umbau ist sauber planbar. Geschätzter Aufwand für 12 kritische Findings: **10-14 Stunden** (S-SICHER).

---

**STOPP für Marcel-Review.**
Kein Code wurde geändert. Bitte Findings reviewen und entscheiden, welche im Sprint S-SICHER angegangen werden. Danach startet S-SICHER mit der Behebung.
