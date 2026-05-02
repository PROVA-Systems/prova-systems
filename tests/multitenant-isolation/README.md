# PROVA Multi-Tenant Isolation Test-Suite

**Sprint:** S6 Phase 3
**Datum:** 02.05.2026

Tests die verifizieren dass Cross-Tenant-Daten-Zugriff durch RLS verhindert wird.

---

## Was wird getestet

Drei isolierte Test-Workspaces (A, B, C). Jeder mit eigenem Test-User. Tests prüfen dass:

- User-A kann **NICHT** Daten von Workspace-B lesen
- User-A kann **NICHT** Daten in Workspace-B schreiben
- User-A kann **NICHT** Storage-Files von Workspace-B abrufen
- User-A kann **NICHT** API-Endpoints mit fremder workspace_id aufrufen

**Mindestens 30 Tests, sinnvoll 50+.**

---

## Voraussetzungen

### ENV-Vars (lokal in `.env.local`)

```bash
# Supabase
SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # ⚠ NUR LOKAL/CI, niemals committen

# PROVA-API für End-to-End-Tests (optional)
PROVA_API_URL=https://app.prova-systems.de
```

### Test-Datenbank-Strategie

**Persistent in Production-DB** mit klar erkennbaren Namen:

```
workspace-Namen:  __test_pentest_a__, __test_pentest_b__, __test_pentest_c__
user-Emails:      test-pentest-a@prova-systems.de, ...-b@..., ...-c@...
```

**Pro Test-Lauf:**
1. `setup.js` — löscht alte Test-Daten + erstellt neue
2. `isolation.test.js` — Tests laufen
3. `teardown.js` — löscht Test-Daten (optional, kann persistent bleiben für Debug)

**Marcel kann jederzeit die Test-Workspaces löschen** wenn nicht mehr gebraucht — sie haben einen klaren Naming-Prefix.

---

## Lokal laufen lassen

```bash
# Setup einmalig (oder bei Schema-Änderung)
node tests/multitenant-isolation/setup.js

# Tests laufen
node --test tests/multitenant-isolation/isolation.test.js

# Teardown
node tests/multitenant-isolation/teardown.js
```

---

## CI-Integration

GitHub-Action `.github/workflows/multitenant-isolation-tests.yml`:

- Trigger: jeder PR auf main + manueller Workflow-Dispatch
- Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Marcel hinterlegen)
- Bei rotem Test → PR-Block

---

## Architektur

### setup.js
- Nutzt Service-Role-Key (RLS-Bypass)
- Räumt erst auf: alle Datensätze mit `workspace.name LIKE '__test_pentest_%'`
- Erstellt 3 Workspaces + 3 Users
- Erstellt Test-Daten (5 Aufträge, 5 Kontakte, 3 Rechnungen pro Workspace)

### isolation.test.js
- Nutzt **anon-Key** + sign-in für jeden Test-User (echter User-Pfad, RLS aktiv)
- Pro Test: `signInAsUserA()`, dann Versuch auf Workspace-B-Daten zuzugreifen
- Erwartet: leere Liste (RLS filtert) oder 403/404

### teardown.js
- Service-Role-Key räumt auf

---

## Test-Coverage (geplant)

| Kategorie | Test-Anzahl |
|---|---:|
| Auftraege (CRUD per RLS) | 4 × 3 Workspaces = 12 |
| Kontakte | 4 × 3 = 12 |
| Fotos | 3 × 3 = 9 |
| Audit-Trail-Schreibung mit fremder workspace_id | 3 |
| KI-Protokoll-Cross-Read | 3 |
| Storage-URL-Zugriff | 3 |
| Workspace-Memberships | 3 |
| Rechnungs-Workflows | 3 |
| Edge-Cases (NULL-workspace_id, manipuliertes JWT) | 3 |
| **TOTAL** | **51** |

---

## Marcel-Pflicht-Aktionen für Aktivierung

1. **GitHub-Secrets setzen** im Repo:
   - Settings → Secrets → Actions
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

2. **Test-Workflow erst-aktivieren:**
   - Workflow `multitenant-isolation-tests.yml` ist deployed
   - Marcel triggered manuell: Actions → Multitenant Isolation Tests → Run Workflow
   - Bei grün → automatisch bei jedem PR

3. **Bei Schema-Änderung:** `node setup.js` lokal nochmal ausführen.

---

*Test-Suite-Skeleton 02.05.2026 nacht*
