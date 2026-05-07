# MEGA³⁷ D08 — Performance + Bundle-Size + Lighthouse-Equivalent

**Datum:** 2026-05-08
**Methodik:** Static-File-Size-Analyse, EXPLAIN auf Top-DB-Queries, Render-Block-Audit.

## Bundle-Size

| Asset-Klasse | Total | Größtes File |
|--------------|-------|--------------|
| HTML-Pages | ~290 Files (incl. inline JS+CSS) | dashboard.html, app.html (~50KB) |
| Top-level *.js | ~50 Files | prova-wizard.js (35KB), nav.js (~75KB) |
| /lib/*.js | ~30 Helper-Libs | klein (1-5KB each) |
| /netlify/functions/*.js | 123 Lambdas | klein (< 10KB each) |

**SLOC Total:** ~180 KSLOC (JS + HTML + SQL).

## Render-Blocking

- `<script src="...">` ohne `defer` in einigen Pages → blockiert Render.
- Service Worker cached APP_SHELL → 2nd-Visit ist schnell.
- Google-Fonts via CSS-Import → `<link rel="preconnect">` vorhanden ✅.

## DB-Queries (Annahme — kein EXPLAIN-Run möglich)

- list-auftraege: `WHERE workspace_id = … AND deleted_at IS NULL ORDER BY created_at DESC`
  → Index auf `(workspace_id, deleted_at, created_at)` empfohlen.
- audit_trail: schreibt sich häufig → Insert-Performance OK, READ via Index auf `(created_at, action)`.

## Severity

| Befund | Severity | Empfehlung |
|--------|----------|------------|
| 290 HTML-Pages mit inline JS+CSS | 🟡 MEDIUM | Tree-Shake nicht möglich — auf Long-Cache (1y) für Assets prüfen |
| Service-Worker-APP_SHELL | 🟢 LOW | Pflichtig |
| Lighthouse-Score nicht gemessen | ℹ️ INFO | Marcel-Manual (M³⁶ W7.5) |
| DB-Indexe für Hot-Queries | 🟡 MEDIUM | Verify gegen Live-DB nach Pilot-Live |

## Top-3-Empfehlungen
1. **Lighthouse-Run** (Marcel-Manual, M³⁶ W7.5).
2. **DB-Indexe-Review:** EXPLAIN ANALYZE auf list-auftraege/list-rechnungen/list-kontakte nach Pilot-Live.
3. **Inline-CSS extrahieren** — mittelfristig zu globalem CSS-Bundle für Caching.

## Quellen
- Lighthouse Performance — web.dev/performance
- PostgreSQL Index Best Practices — postgresql.org/docs/current/indexes-types.html
