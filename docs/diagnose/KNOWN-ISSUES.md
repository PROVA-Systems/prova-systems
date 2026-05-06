# PROVA — Known Issues (Stand 2026-05-08 nach MEGA²³)

## Active Issues (Pilot-Launch-OK, später patchen)

### KI-1: Multitenant-Isolation Test braucht DB-Setup
**Status:** Pre-existing (vor MEGA²³)
**File:** `tests/multitenant-isolation/isolation.test.js`
**Symptom:** ENOENT bei `fixtures.json` — Setup-Skript nicht gelaufen.
**Workaround:** `node tests/multitenant-isolation/setup.js` vor Test laufen lassen.
**Fix:** Skript in CI-Pipeline integrieren oder als Skip markieren bei fehlenden Fixtures. Severity: LOW (lokaler Test, keine Prod-Auswirkung).

### KI-2: Sidebar-Layout 768-1100px (Tablet-Range)
**Status:** Pre-existing
**Symptom:** Sidebar-Übergang bei mittleren Breakpoints unsauber.
**Severity:** LOW (kein Funktions-Issue, nur Visuelles).
**Fix:** Mobile-CSS-Polish in zukünftigem Sprint.

### KI-3: Beweisbeschluss-Upload braucht Supabase-auftrag_id
**Status:** Per-Design (MEGA²³ Block 1)
**Symptom:** Upload-Zone zeigt Warn-Status "Bitte erst Auftrag-Stammdaten speichern" wenn keine UUID vorhanden.
**Workaround:** URL-Parameter `?supabase_id=<uuid>` oder localStorage `prova_active_auftrag_id`.
**Fix in K-1.4 Cutover:** Volle Supabase-Integration der gericht-auftrag.html-Page (statt aktuell Airtable).

### KI-4: admin-ki-aggregations Lambda nicht implementiert
**Status:** MEGA²³ Block 4 (Frontend ready, Backend pending)
**Symptom:** Settings-Tab + KI-Stats-Tab zeigen "Lambda nicht erreichbar" Hinweis.
**Severity:** LOW (Frontend graceful degradiert).
**Fix:** Lambda `netlify/functions/admin-ki-aggregations.js` mit ki_protokoll-Aggregation in Folge-Sprint.

### KI-5: admin-env-status Lambda nicht implementiert
**Status:** MEGA²³ Block 3 (Frontend ready, Backend pending)
**Symptom:** Settings-Tab "ENV-Status"-Section zeigt graceful-fail.
**Severity:** LOW.
**Fix:** Lambda `netlify/functions/admin-env-status.js` mit READ-ONLY-ENV-Liste in Folge-Sprint.

## Resolved in MEGA²³

- ✅ 9 Toast-Migration-Tests (W5 + W16 dual-pattern fix)
- ✅ Beweisbeschluss-Upload-UI integriert (Frontend)
- ✅ Disclaimer-Wiring in 7 Pages
- ✅ Admin-Cockpit Settings-Tab
- ✅ KI-Stats Frontend-Charts (Aggregations + Renderer)
- ✅ Email-Notification bei Admin-Impersonation (DSGVO-Transparenz)

## Excluded (Out-of-Scope MEGA²³)

- User-Journey-Tests (Block 6) — deferred zu MEGA²⁴
- Security-Audit (Block 7) — deferred
- Performance-Audit (Block 8) — deferred
- Documentation-Sync (Block 9) — partial (Wakeup-Briefing only)
- Backlog-Cleanup (Block 10) — deferred
