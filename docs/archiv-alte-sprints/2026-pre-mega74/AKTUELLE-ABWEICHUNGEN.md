# Aktuelle Abweichungen & Code-Realitäten

> **PFLICHT-LEKTÜRE für Claude Code** vor jedem Sprint.  
> Dokumentiert Abweichungen zwischen Sprint-Dokumenten (`docs/`) und dem **tatsächlichen Zustand** des Repos (Code + Airtable + Netlify).  
> Bei Widersprüchen zwischen Sprint-Doku und dieser Datei: **diese Datei gewinnt.**  
> Aktualisiert: 23.04.2026 nach vollständigem Code-Audit.

---

## 1. Airtable — tatsächlicher Stand

### ✅ Bereits angelegt (Marcel hat gemacht)

- Tabelle `DIKTATE` komplett
- Feld `SACHVERSTEANDIGE.dashboard_config` (multilineText)
- Felder `SCHADENSFAELLE.phase_aktuell`, `phase_2_completed_at` bis `phase_5_completed_at`
- Felder `SCHADENSFAELLE.prova_aktenzeichen`, `auftraggeber_az`, `policennummer`
- Felder `SCHADENSFAELLE.frist_quelle`, `frist_bestaetigt_ts`
- Kategorie `Floskel` im Feld `TEXTBAUSTEINE_CUSTOM.kategorie`
- Tabelle `PASSWORD_RESET_TOKENS` mit allen Feldern
- Tabelle `LOGIN_ATTEMPTS` mit allen Feldern
- Tabelle `WORKFLOW_ERRORS` mit allen Feldern
- Felder `SACHVERSTEANDIGE.two_factor_secret`, `two_factor_enabled`, `backup_codes_hash`, `password_hash`, `will_cancel`
- Felder `SCHADENSFAELLE.workflow_pdf_status`, `workflow_pdf_started`, `workflow_pdf_error`

### ⚠️ Eine Kleinigkeit noch zu korrigieren

**`DIKTATE.text_revidiert_von`** wurde als `dateTime` angelegt, muss aber `singleLineText` sein (referenziert den Namen eines anderen Diktats, z.B. `D-SCH-2026-031-1`).

**Action für Claude Code:** Bei Implementierung von Sprint S6 Marcel darauf hinweisen. Feld-Typ-Änderung kann nicht per API, nur manuell in Airtable.

### 💡 Abweichung: Floskeln via Kategorie statt `laenge`-Feld

**Sprint-Doku sagt:** Neues Feld `laenge` (Single Select kurz/mittel/lang) in `TEXTBAUSTEINE_CUSTOM`.

**Tatsächlich umgesetzt:** Bestehendes Feld `kategorie` um Option `Floskel` erweitert.

**Konsequenz für Code:**

| Slash-Befehl | Filter (korrekt) |
|---|---|
| `/floskel` | `kategorie = "Floskel"` |
| `/baustein` | `kategorie != "Floskel"` (alle anderen Kategorien) |

**Für FLOSKELN-SEED-DATEN.md Import:** Alle 50 Floskeln bekommen `kategorie: 'Floskel'`. Die Sub-Kategorie (Ortstermin-Eröffnung, Befund-Einleitung etc.) landet im Feld `notiz`.

---

## 2. airtable.js — Whitelist erweitern

### Aktueller Stand (Zeile 15-28)

```javascript
const ALLOWED_TABLES = {
  tblSxV8bsXwd1pwa0: { name: 'FAELLE',       userField: 'sv_email', readOnly: false },
  tbladqEQT3tmx4DIB: { name: 'SV',           userField: 'Email',    readOnly: false },
  tblyMTTdtfGQjjmc2: { name: 'TERMINE',      userField: 'sv_email', readOnly: false },
  tblF6MS7uiFAJDjiT: { name: 'RECHNUNGEN',   userField: 'sv_email', readOnly: false },
  tblv9F8LEnUC3mKru: { name: 'KI_STATISTIK', userField: null,       readOnly: false },
  tbl4LEsMvcDKFCYaF: { name: 'KI_LERNPOOL',  userField: null,       readOnly: false },
};
```

### Zu ergänzen in Sprint IMPORT-FIX (oder früher)

```javascript
// Neu: Kontakte-Adressbuch
tblMKmPLjRelr6Hal: { name: 'KONTAKTE',            userField: 'sv_email', readOnly: false },
// Neu: Briefe-Archiv
tblSzxvnkRE6B0thx: { name: 'BRIEFE',              userField: 'sv_email', readOnly: false },
// Neu: Custom-Textbausteine (inkl. Floskeln)
tblDS8NQxzceGedJO: { name: 'TEXTBAUSTEINE_CUSTOM', userField: 'sv_email', readOnly: false },
// Neu: Standard-Textbausteine (Read-heavy)
tbljPQrdMDsqUzieD: { name: 'TEXTBAUSTEINE',       userField: 'sv_email', readOnly: false },
// Neu: DIKTATE-Tabelle (Sprint S6)
tblTcapjDGDI2f58h: { name: 'DIKTATE',             userField: 'sv_email', readOnly: false },
// Neu: NORMEN (Read-only für Users, Write für Admin)
tblnceVJIW7BjHsPF: { name: 'NORMEN',              userField: null,       readOnly: true  },
// Neu: AUDIT_TRAIL (Write-only für Users)
tblqQmMwJKxltXXXl: { name: 'AUDIT_TRAIL',         userField: 'sv_email', readOnly: false },
// Neu: STATISTIKEN (Aggregat)
tblb0j9qOhMExVEFH: { name: 'STATISTIKEN',         userField: null,       readOnly: false },
// Neu: PUSH_SUBSCRIPTIONS
tblAiF38HeS1R1Umj: { name: 'PUSH_SUBSCRIPTIONS',  userField: 'Email',    readOnly: false },
// Neu: EINWILLIGUNGEN (DSGVO-Audit)
tblwgUQgtBWckPMHp: { name: 'EINWILLIGUNGEN',      userField: 'sv_email', readOnly: false },
// Neu: RECHTSDOKUMENTE (Read-only)
tbljJkS3HOvtmpAGT: { name: 'RECHTSDOKUMENTE',     userField: null,       readOnly: true  },
```

### Zu ergänzen in Sprint AUTH-PERFEKT

```javascript
// PASSWORD_RESET_TOKENS — NIE im Frontend lesbar! (readOnly: true sperrt nur Writes; wir brauchen Backend-exklusiv)
// Lösung: Separate Function "password-reset-request.js" und "password-reset-confirm.js"
// die DIRECT über process.env.AIRTABLE_PAT arbeiten, NICHT über airtable.js.
// Diese Tabelle gehört NICHT in ALLOWED_TABLES.

// LOGIN_ATTEMPTS — gleiche Logik: nur Backend-Functions direkt.
// Diese Tabelle gehört NICHT in ALLOWED_TABLES.

// WORKFLOW_ERRORS — kann Frontend lesen für Admin-Dashboard
tbl______: { name: 'WORKFLOW_ERRORS',    userField: null, readOnly: false }, // Table-ID aus Airtable kopieren
```

**⚠️ WICHTIG Security-Prinzip:**  
- Tabellen mit sensiblen Credentials (PASSWORD_RESET_TOKENS, LOGIN_ATTEMPTS) dürfen **NIEMALS** über den Frontend-airtable.js-Proxy erreichbar sein — auch nicht read-only.
- Stattdessen: dedizierte Backend-Functions (`login.js`, `password-reset-request.js`, etc.) die DIRECT mit Airtable-API sprechen.
- Das ist in `SPRINT-AUTH-PERFEKT.md` so beschrieben, hier nur zur Klarstellung.

---

## 3. Stripe — hart-codierte Price-IDs migrieren

### Aktueller Stand in `stripe-checkout.js` (Zeile 10-11)

```javascript
const PRICE_IDS = {
  Solo: 'price_1TEHG68d1CNm0HvYFNx99Tq6', // 149€/Mo
  Team: 'price_1TEHH68d1CNm0HvYLeG1Or7T', // 279€/Mo
};
```

### Ziel in Sprint STRIPE-PERFEKT

```javascript
const PRICE_IDS = {
  Solo: process.env.STRIPE_PRICE_SOLO,  // Marcel hat ENV-Var bereits gesetzt
  Team: process.env.STRIPE_PRICE_TEAM,  // Marcel hat ENV-Var bereits gesetzt
};
if (!PRICE_IDS.Solo || !PRICE_IDS.Team) {
  throw new Error('STRIPE_PRICE_* ENV-Vars fehlen');
}
```

### Legacy-Paket-Mapping behalten (OK)

```javascript
const paketNorm = ({ Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' })[paket] || paket;
```

Diese Legacy-Übersetzung ist OK und sollte **nicht entfernt werden** — alte URLs/Webhooks könnten noch die alten Namen senden. Kann in K3 nach Beobachtungsphase aufgeräumt werden.

---

## 4. Bestehende Playwright-Tests — Basis für Sprint S-AUDIT / S-SICHER / WORKFLOW-E2E

Das Repo hat bereits **8 Spec-Files** in `tests/`:

| Test | Status | Was drin |
|---|---|---|
| `00-smoke.spec.js` | ✅ | Basis-Smoke |
| `01-login.spec.js` | ✅ | Login-Flow mit localStorage-Check |
| `02-authenticated-smoke.spec.js` | ✅ | Post-Login-Seiten |
| `03-core-workflow.spec.js` | ✅ | Kern-Workflow |
| `04-e2e-workflow.spec.js` | ✅ | End-to-End |
| `05-security.spec.js` | ✅ | **Multi-Tenant, XSS, Auth-Bypass, DSGVO-Pseudonymisierung** |
| `06-mobile-ortstermin.spec.js` | ✅ | Mobile |
| `07-doppelklick.spec.js` | ✅ | UI-Race |
| `08-pdf-templates.spec.js` | ✅ | PDF-Render |

**Konsequenz für Sprint S-AUDIT:**  
Claude Code muss nicht alle Tests NEU schreiben, sondern:
1. Bestehende Tests zuerst **ausführen** (`npx playwright test`)
2. Ergebnisse in AUDIT-REPORT.md dokumentieren
3. Nur für **fehlende** Aspekte neue Tests schreiben (z.B. 2FA-Tests nach AUTH-PERFEKT)

**Konsequenz für WORKFLOW-E2E:**  
Test-Suite erweitern, nicht neu bauen. Bei bestehenden Tests Retries + bessere Fehler-Meldungen ergänzen.

---

## 5. Code-Realitäten — was bereits existiert

### ✅ Existiert (besser als im Sprint-Plan angenommen)

| Feature | Status | File |
|---|---|---|
| Security-Header (CSP, HSTS, X-Frame, Permissions-Policy) | ✅ Komplett | `netlify.toml` |
| Stripe-Webhook mit Signatur-Verifizierung | ✅ | `stripe-webhook.js` |
| `airtable.js` mit Rate-Limiting + User-Filter-Injection | ✅ | `airtable.js` |
| `auth-guard.js` v2 mit JWT-ähnlicher Token-Struktur | ✅ | `auth-guard.js` |
| `foto-captioning.js` (KI-Bildbeschreibung) | ✅ | Netlify Function |
| `audit-log.js` (zentrale Audit-Logs) | ✅ | Netlify Function |
| `dsgvo-auskunft.js` + `dsgvo-loeschen.js` (Art. 15/17) | ✅ | Netlify Functions |
| `health.js` (Status-Endpoint) | ✅ | Netlify Function |
| Service Worker mit CACHE_VERSION `prova-v180` | ✅ | `sw.js` |
| Playwright-Config + `.env.local` | ✅ | Repo-Root |

### ⏳ Fehlt (wird in den Sprints gebaut)

| Feature | Sprint | Priorität |
|---|---|---|
| `fall-aufmachen.html` (neuer Einstiegspunkt) | S3 | Hoch |
| `neuer-fall.html` (3-Stufen-Formular) | S3 | Hoch |
| `akte.html` Umbau (Phasen-Leiste) | S4 | Hoch |
| `ki-analyse.html` (neu) | S5 | Mittel |
| `ortstermin-modus.html` Skizze-Tab | S5 | Mittel |
| 2FA (TOTP + Backup-Codes) | AUTH-PERFEKT | Kritisch |
| Passwort-Reset via E-Mail-Link | AUTH-PERFEKT | Kritisch |
| Rate-Limiting auf Login-Function | AUTH-PERFEKT | Kritisch |
| Stripe-Price-IDs → ENV-Vars | STRIPE-PERFEKT | Mittel |
| WORKFLOW_ERRORS-Tabelle-Integration | WORKFLOW-E2E | Mittel |
| Pseudonymisierungs-Modul verifizieren | S-SICHER | Kritisch |

---

## 6. Wichtige Dateipfade (wo gearbeitet wird)

```
prova-systems/                          ← Repo-Root
├── CLAUDE.md                           ← Daueranleitung (diese Datei = Beigabe)
├── AKTUELLE-ABWEICHUNGEN.md            ← Diese Datei
├── README.md, ANLEITUNG-*.md           ← Orientierung
│
├── docs/                               ← Sprint-Dokumente
│   ├── BLUEPRINT-v1.1.md
│   ├── INFRASTRUKTUR-REFERENZ.md
│   └── SPRINT-*.md                     ← 10 Sprint-Files
│
├── netlify/functions/                  ← Backend-Logik
│   ├── airtable.js                     ← ← WHITELIST ERWEITERN
│   ├── ki-proxy.js
│   ├── stripe-webhook.js
│   ├── stripe-checkout.js (= create-checkout-session.js)
│   ├── audit-log.js
│   └── ~30 weitere
│
├── tests/                              ← Playwright E2E (8 Specs)
│   ├── 00-smoke.spec.js
│   ├── 05-security.spec.js             ← Multi-Tenant, XSS, DSGVO bereits getestet!
│   └── ...
│
├── *.html                              ← Frontend-Seiten (~90 Files)
├── *.js                                ← Frontend-Logik + Helper
├── sw.js                               ← Service Worker (CACHE_VERSION erhöhen!)
├── netlify.toml, _redirects, _headers  ← Netlify-Config
├── playwright.config.js                ← Test-Config
└── package.json                        ← Dependencies
```

---

## 7. Claude-Code-Workflow-Regeln

### Bei jedem Sprint-Start

1. **ZUERST** diese Datei lesen (AKTUELLE-ABWEICHUNGEN.md)
2. **DANN** CLAUDE.md (Verhalten)
3. **DANN** Sprint-Doku (z.B. `docs/SPRINT-S-AUDIT.md`)
4. **DANN** Ist-Code lesen (File-für-File)
5. **ERST DANN** anfangen zu ändern

### Erste Aktion jedes Sprints

Branch erstellen:
```bash
git checkout main
git pull origin main
git checkout -b sprint-<name>
```

### Bei jedem Commit

```bash
git add .
git commit -m "Sprint <Name>: <Was und Warum>"
```

### Am Ende jedes Sprints

Liefere:
1. **Was wurde geändert** (File-Liste via `git diff --stat main`)
2. **Warum** (Sprint-Bezug)
3. **Was muss Marcel testen** (Klick-Checkliste aus Sprint-Doku)
4. **Bekannte Limitierungen** (was geht noch nicht)

Dann bittet Claude Code Marcel, den Branch zu reviewen und zu mergen.

---

## 8. Zentrale Frontend-Konfiguration — teilweise umgestellt

### Stand nach Sprint S-SICHER Paket 1 (24.04.2026)

Neue Datei `prova-config.js` im Repo-Root definiert:
```javascript
window.PROVA_CONFIG = { AIRTABLE_BASE: "appJ7bLlAHZoxENWE" };
```

**Umgestellt auf `window.PROVA_CONFIG.AIRTABLE_BASE` (mit Hardcode-Fallback):**

| File | Zeile | Status |
|---|---|---|
| `dashboard-core.js` | 26 (`DASH.AT_BASE`) | ✅ umgestellt |
| `app-logic.js` | 81 (`const AIRTABLE_BASE`), 2365 (`var AT_BASE` in IIFE) | ✅ umgestellt |
| `akte-logic.js` | 10 (`var AT_BASE`) | ✅ umgestellt |
| `freigabe-logic.js` | 17 (`var AT_BASE`) | ✅ umgestellt |
| `nav.js` | — | — (kein Hardcode vorhanden, nichts zu tun) |

**Einbindung von `prova-config.js`:** in `app.html`, `dashboard.html`, `akte.html` direkt nach `auth-guard.js`, synchron (kein `defer`).

**Noch NICHT umgestellt (Folge-Sprint):** Rund 35 weitere Files enthalten den Hardcode `appJ7bLlAHZoxENWE` — teils als Top-Level-Variablen, teils als inline-Strings in `/v0/appJ7bLlAHZoxENWE/tblXYZ...`-URLs. Diese bleiben in S-SICHER Paket 1 bewusst unangetastet.

**Defense-in-Depth:** Jede umgestellte Variable hat die Form `(window.PROVA_CONFIG && window.PROVA_CONFIG.AIRTABLE_BASE) || 'appJ7bLlAHZoxENWE'` — fällt bei fehlender Config (z. B. Cache-Problem oder Script-Load-Reihenfolge) auf den Hardcode zurück. Kein Bruch möglich.

---

## Historie dieser Datei

| Datum | Änderung |
|---|---|
| 23.04.2026 | Initial mit Floskel-Abweichung |
| 23.04.2026 | Erweitert um Live-Code-Audit: airtable.js-Whitelist, Stripe-Hardcoding, Test-Bestand, DIKTATE-Feldtyp |
| 24.04.2026 | § 8 ergänzt: `prova-config.js` eingeführt, 5 Hot-Files umgestellt (S-SICHER Paket 1) |
