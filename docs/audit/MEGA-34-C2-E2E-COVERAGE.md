# MEGA³⁴ C2 — E2E Smoke-Test Coverage

**Datum:** 2026-05-07

## 8 E2E-Test-Files in `tests/e2e/`

| # | File | Flows | Status |
|---|---|---|---|
| 1 | 01-login-flow.e2e.js | Login-Page + Landing→Login-Link | ✅ |
| 2 | 02-auftrag-anlegen.e2e.js | neuer-fall.html Wizard-Phase-Indicator | ✅ |
| 3 | 03-paragraph6-editor.e2e.js | stellungnahme.html 60vw-Layout | ✅ |
| 4 | 04-pdf-generation.e2e.js | freigabe + bescheinigung-erstellen | ✅ |
| 5 | 05-bescheinigung.e2e.js | 8 Bescheinigungs-Typen-Cards | ✅ |
| 6 | 06-cookie-banner.e2e.js | First-Visit + 3-Buttons + Accept-All | ✅ |
| 7 | 07-cmd-k-search.e2e.js | Cmd+K open + ESC close | ✅ |
| 8 | 08-mobile-flows.e2e.js | iPhone 14 Pro: Diktat + Demo + Status + Cookie | ✅ |

## Browser-Coverage

- **Chromium** (Desktop Chrome) — Standard-Tests
- **Mobile Safari** (iPhone 14 Pro) — Mobile-Flows

## Run-Anweisung

```bash
# Default: gegen prova-systems.de (live)
npm run test:e2e

# Lokal gegen netlify dev (wenn lokaler Server läuft)
E2E_BASE_URL=http://localhost:8888 npm run test:e2e

# Single Test-File
npx playwright test tests/e2e/06-cookie-banner.e2e.js

# UI-Mode für Debugging
npx playwright test --ui
```

## Skip-Logic

- Tests die Auth benötigen: `test.skip()` wenn URL in `/login` redirected
- Tests gegen Demo + Cookie + Status: laufen public ohne Auth

## Pre-Pilot-Verifikation

Diese Suite ist **NICHT** Teil von `npm test` (wird im Standard-Run nicht ausgeführt).
Marcel muss vor Pilot-Live einmalig:

```bash
npx playwright install chromium webkit
npm run test:e2e
```

Bei Fail: Screenshot + Video in `playwright-report/`.

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
