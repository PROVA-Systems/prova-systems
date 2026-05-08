# MEGA³⁷ D10 — Code-Quality + Tests

**Datum:** 2026-05-08
**Methodik:** Test-Coverage-Inventur, File-Size-Heuristik.

## Test-Inventar

- **Test-Files:** 268 in `tests/`
- **Domains:** admin, ki, stripe, schadensfaelle, neuer-fall, dashboard, env-konsolidierung, mobile-polish, wizard, e2e, security, dsgvo, …
- **e2e-Spec-Files:** 8 (Playwright-Style)
- **Estimated test count:** > 800 Tests cumulative (M³¹–M³⁷ added Hunderte).

## Code-Volumen

- 363 Production-JS-Files (.js außerhalb tests/)
- 290 HTML-Pages
- 123 Lambda-Functions
- 9 Edge-Functions (Deno)
- 27+ Migrations in supabase-migrations/

## Severity

| Befund | Severity |
|--------|----------|
| Test-Coverage-Schätzung > 70% (LoC-basiert) | 🟢 LOW |
| ESLint nicht im CI (Marcel-Manual-Run) | 🟡 MEDIUM |
| Large Files >500 LoC (z. B. nav.js 75KB) | 🟡 MEDIUM |
| Duplicate-Code Heuristik (Inline-Styles) | 🟡 MEDIUM |
| Dead-Code (Airtable-Comments z. T. noch da) | ℹ️ INFO |

## Top-3-Empfehlungen
1. **CI-Setup:** GitHub-Actions mit `npm test` + `npm run lint` als Pull-Request-Gate.
2. **Cyclomatic-Complexity-Audit** für nav.js, app.html (Files >2000 LoC).
3. **Test-Coverage-Tool** (`c8` oder `nyc`) integrieren — aktuell nur Bauchgefühl.

## Quellen
- ESLint Recommended Rules
- node:test Coverage — nodejs.org/api/test.html#coverage
