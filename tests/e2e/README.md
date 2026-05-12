# PROVA E2E-Tests (Playwright)

E2E-Smoke-Tests gegen prova-systems.de (oder lokal via `E2E_BASE_URL=http://localhost:8888`).

## Setup

```bash
npm install
npx playwright install chromium
```

Test-Credentials in `.env.local`:

```env
E2E_BASE_URL=https://prova-systems.de
E2E_USER_EMAIL=test@example.de
E2E_USER_PASSWORD=...
```

## Run

```bash
# Alle E2E-Specs
npx playwright test

# Nur MEGA⁶⁹-Specs
npx playwright test 09-mega69-skizze-editor 10-mega69-mahnwesen 11-mega69-fristen-kalender

# Mit UI (Debug)
npx playwright test --ui

# Specific Spec
npx playwright test 09-mega69-skizze-editor.e2e.js
```

Report: `playwright-report/index.html`

## Specs-Übersicht

| # | Spec | Beschreibung | Login nötig |
|---|---|---|---|
| 01 | `01-login-flow.e2e.js` | Login-Flow + Session-Persistence | nein |
| 02 | `02-auftrag-anlegen.e2e.js` | Neuen Auftrag erstellen | ja |
| 03 | `03-paragraph6-editor.e2e.js` | §6 Fachurteil-Editor | ja |
| 04 | `04-pdf-generation.e2e.js` | PDF-Generierung | ja |
| 05 | `05-bescheinigung.e2e.js` | (gestrichen, Marcel-Memory) | n/a |
| 06 | `06-cookie-banner.e2e.js` | Cookie-Banner-Logik | nein |
| 07 | `07-cmd-k-search.e2e.js` | Cmd+K Command-Palette | ja |
| 08 | `08-mobile-flows.e2e.js` | Mobile-Flows | ja |
| **09** | **`09-mega69-skizze-editor.e2e.js`** | **Skizze-Editor lädt, 9 Tools sichtbar** | **nein** |
| **10** | **`10-mega69-mahnwesen.e2e.js`** | **Mahnwesen Supabase-native KPI-Tiles** | **ja** |
| **11** | **`11-mega69-fristen-kalender.e2e.js`** | **Fristen View-Toggle + Kalender-Grid** | **ja** |

## MEGA⁶⁹-Tests (FINAL-3 Item 8.8)

Login-pflichtige Tests werden automatisch via `test.skip()` ohne `E2E_USER_EMAIL` übersprungen.
Stand-alone Test (Skizze-Editor #09) läuft auch ohne Credentials.

## CI-Setup

Für GitHub Actions: `playwright.config.js` hat `forbidOnly: !!process.env.CI` und Retries.
Test-Credentials als GitHub Secrets injecten: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.

## TODO MEGA⁷⁰ (Pre-Pilot-Doku-Sprint)

- Visual-Regression-Snapshots für Akte-Tabs, Mahnwesen-KPI-Tiles
- Full SV-Workflow End-to-End: Auftrag → Diktat → Skizze → §6 → PDF → Versand → Mahnung
- Mobile-Viewport-Tests für Skizze-Editor mit Touch-Events
