# CI Multi-Tenant Isolation Tests

**Stand:** 02.05.2026 (Sprint S6 Phase 3)
**Workflow:** `.github/workflows/multitenant-isolation-tests.yml`
**Tests:** `tests/multitenant-isolation/`

---

## Was die CI macht

Bei jedem PR auf `main` (mit Änderungen an Migrations/lib/Tests):
1. Setup: 3 Test-Workspaces in Production-DB erzeugen
2. Run: 30+ Tests die Cross-Tenant-Zugriff prüfen
3. Teardown: Test-Workspaces löschen (auch bei Fail)

Bei rotem Test → PR-Block.

---

## Marcel-Pflicht-Setup

### Schritt 1 — GitHub-Secrets hinterlegen

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Wert |
|---|---|
| `SUPABASE_URL` | `https://cngteblrbpwsyypexjrv.supabase.co` |
| `SUPABASE_ANON_KEY` | (aus Supabase-Dashboard → API → anon-key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (aus Supabase-Dashboard → API → service-role-Key — **HOCHGEHEIM**) |

⚠️ **Service-Role-Key niemals in Repo committen.** Nur als GitHub-Secret.

### Schritt 2 — Erst-Lauf manuell

GitHub → Actions → "Multitenant Isolation Tests" → Run workflow → Run.

Bei grün: aktiviert sich automatisch bei jedem PR.

### Schritt 3 — Bei Schema-Änderung

Wenn Tabellen/Spalten verändert werden:
- `tests/multitenant-isolation/setup.js` Test-Daten-Anlage prüfen
- ggf. fixture-Daten erweitern

---

## Test-Workspace-Strategie

**Persistent in Production-DB** mit klar erkennbaren Naming-Prefix:

```
workspace.name = '__test_pentest_a__' / '_b__' / '_c__'
user.email     = 'test-pentest-a@prova-systems.de' / -b@... / -c@...
```

Marcel kann jederzeit per SQL alle Test-Daten löschen:
```sql
DELETE FROM workspaces WHERE name LIKE '__test_pentest_%';
```

---

## Was wenn Test rot wird?

1. **PR wird geblockt**
2. Logs prüfen: welcher Test failed?
3. RLS-Policy-Lücke? → Migration ergänzen
4. Test-Daten-Setup-Bug? → setup.js fixen
5. Re-Run Workflow nach Fix

---

## Welche Tests laufen?

Siehe `tests/multitenant-isolation/isolation.test.js`:

- 6 Auftraege-Tests (CRUD pro Workspace)
- 4 Kontakte-Tests
- 2 Dokumente-Tests
- 2 Audit-Trail-Tests (H-12 Finding)
- 1 KI-Protokoll-Test
- 3 Workspace-Memberships-Tests
- 2 Workspaces-Direct-Tests
- 2 Notizen-Tests
- 1 Fotos-Test
- 2 Termine-Tests
- 2 Auftrag-FK-Pattern-Tests
- 1 Email-Log-Test
- 2 KI-Feedback + Invitations-Tests
- 3 Edge-Case-Tests (anon-Client, JWT-Manipulation)
- 2 Einwilligungen-Cross-User-Tests

**TOTAL ca. 33 Tests.**

---

## Erwartete Test-Dauer

- Setup: ~5-10s (3 Workspaces + Auth-User-Creation)
- Tests: ~10-20s (33 Tests, Read-Heavy)
- Teardown: ~3-5s

**Total CI-Lauf: ~30-60s.**

---

## NEEDS-MARCEL-Aktionen

- [ ] GitHub-Secrets hinterlegen (3 Vars)
- [ ] Erst-Lauf manuell triggern + Ergebnis prüfen
- [ ] Bei rotem Test: NACHT-PAUSE-File für Claude Code

---

*CI-Multi-Tenant-Doku 02.05.2026 nacht*
