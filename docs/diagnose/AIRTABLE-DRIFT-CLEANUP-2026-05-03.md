# AIRTABLE-DRIFT-Cleanup — Strategie + Priorisierung

**Erstellt:** 03.05.2026 abend (Sprint MEGA-MEGA-MEGA O3)
**Stand:** Pre-Pilot-Launch (Tag v207-pilot-launch-ready)
**Vorgaenger:** `docs/diagnose/AIRTABLE-DRIFT-AUDIT.md` (01.05.2026)

---

## TL;DR — Honest Assessment

**Marcel-Vorab-Decision war:** *"Defensive Fixes, keine großen Refactors"*

15-Files-Migration in einer Nacht ohne Live-Tests = großer Refactor mit Production-Breaking-Risiko. Stattdessen:

1. **Diese Doku** als Strategie + Priorisierungs-Matrix erstellt
2. **NACHT-PAUSE-File** fuer Marcel-Decision
3. **ENV-Cleanup-Doku** (welche AIRTABLE_*-ENVs noch live, welche tot)
4. **0 Files migriert** heute Nacht — Production-Risiko zu hoch ohne Marcel-Approval pro File

Empfehlung: **Migration-Sprint K-2** mit Marcel anwesend, pro File mit echtem Test-Run.

---

## Priorisierungs-Matrix

### Stufe HIGH (Blocking-Migration für Pilot-K-2 — User-facing critical path)

| Datei | Tabelle | Supabase-Pendant | Aufwand |
|---|---|---|---|
| `frist-guard.js` | FAELLE.frist_* | `auftraege.fristen[]` | 1.5h |
| `prova-status-hydrate.js` | SV | `users` + `workspace_memberships` | 1h |
| `nav.js` (Live-Counts) | FAELLE-Aggregation | `auftraege` count via RLS | 0.5h |
| `prova-context.js` | SV + FAELLE bootstrap | `users` + `workspaces` (data-store.js) | 2h |
| `dashboard-logic.js` | FAELLE-Stats | View `v_dashboard_kpis` | 2-3h |

**Begründung HIGH:** Diese Files laden auf JEDER Page beim Login → Race-Condition-Risiko (siehe `OPTION-C-RACE-ANALYSE.md`). Migration entfernt den Race + den Auth-Mismatch beim Token-Refresh.

### Stufe MEDIUM (Logic-Files für Page-Workflow)

| Datei | Tabelle | Supabase-Pendant | Aufwand |
|---|---|---|---|
| `akte-logic.js` | FAELLE | `auftraege` + `dokumente` | 3-4h |
| `app-logic.js` | FAELLE + Briefe | `auftraege` + `dokumente` | 2-3h |
| `archiv-logic.js` | FAELLE-Liste | `auftraege` Filter+Sort | 1-2h |
| `einstellungen-logic.js` | SV | `users` + `workspaces` | 1.5h |
| `kontakte-logic.js` | KONTAKTE | `kontakte` (Schema vorhanden) | 1h |
| `briefvorlagen-logic.js` | BRIEFE + Templates | `dokumente` + `textbausteine` | 1.5-2h |
| `freigabe-logic.js` | FAELLE | `auftraege.status` | 1h |
| `rechnungen-logic.js` | RECHNUNGEN | `dokumente` (typ='rechnung') | 1.5-2h |
| `mahnwesen-logic.js` | RECHNUNGEN.mahnstufe | `dokumente.mahnstufe` | 1h |

### Stufe LOW (Internal Helpers / Utility)

| Datei | Was | Aufwand |
|---|---|---|
| `auto-save.js` | Form-Draft-Persistence | 0.5h |
| `prova-account-gate.js` | Account-Status-Check | 0.5h |
| `honorar-tracker.js` | Read-only KPI | 1h (schon teilweise gefixt in O1) |
| `import-assistent-logic.js` | Bulk-Import | Backlog (selten genutzt) |
| `jahresbericht-logic.js` | Jahres-Aggregation | Backlog |

### Stufe DEAD (kann gelöscht werden)

Aus Cluster-Review-Auto bereits 20 Files gelöscht. Restliche Kandidaten:
- `gericht-auftrag-logic.js` (war früher Gericht-Workflow, jetzt durch Auftragstyp-Picker ersetzt)
- `mahnung-pdf.js` (Function-Duplikat — war P5.A4-TODO)

---

## ENV-Cleanup-Liste

12 distinct `AIRTABLE_*`-ENVs gefunden, davon:

| ENV-Name | Status | Verwendung | Marcel-Aktion |
|---|---|---|---|
| `AIRTABLE_API_KEY` | **LIVE** | netlify/functions/airtable.js Proxy | Behalten bis Migration done |
| `AIRTABLE_PAT` | **LIVE** | Personal Access Token (Alternative zu API_KEY) | Behalten bis Migration done |
| `AIRTABLE_TOKEN` | **LIVE** | Legacy-Alias | Behalten (Backward-Compat) |
| `AIRTABLE_BASE` | **LIVE** | App-Base-ID `appJ7bLlAHZoxENWE` | Behalten bis Migration done |
| `AIRTABLE_BASE_ID` | **LIVE** | Alias für AIRTABLE_BASE | Konsolidieren auf AIRTABLE_BASE |
| `AIRTABLE_API` | **LIVE** | Audit-Log + DSGVO + Subscription | Behalten bis Migration done |
| `AIRTABLE_TABLE` | **LIVE** | Default-Tabelle in app-logic.js, jahresbericht-logic.js | Migration HIGH |
| `AIRTABLE_TABLE_SV` | **LIVE** | SV-Tabelle (= `AIRTABLE_SV_TABLE`) | Konsolidieren |
| `AIRTABLE_SV_TABLE` | **LIVE** | SV-Tabelle Identifier | Konsolidieren mit AIRTABLE_TABLE_SV |
| `AIRTABLE_AUDIT_TRAIL_TABLE` | **LIVE** | nur in `prova-subscription.js` | Migration MEDIUM |
| `AIRTABLE_BRIEFE_TABLE` | **LIVE** | Briefvorlagen-Logic | Migration MEDIUM |
| `AIRTABLE_META_API` | DEAD | nur in `scripts/migrate/lib/airtable-reader.js` (One-Way-Migration) | Behalten (Migration-Skript) |

**Konsolidierungs-Empfehlung:**
- `AIRTABLE_BASE_ID` → DEPRECATED, alle auf `AIRTABLE_BASE` umstellen
- `AIRTABLE_SV_TABLE` → DEPRECATED, alle auf `AIRTABLE_TABLE_SV` umstellen
- `AIRTABLE_TOKEN` → DEPRECATED, alle auf `AIRTABLE_API_KEY` (Standard)

---

## Pattern-Vorlage für Migration

Anhand `prova-context.js` Beispiel:

```js
// VORHER (Airtable):
async function atFetch(table, formula, opts) {
  return await provaFetch('/.netlify/functions/airtable', {
    method: 'POST',
    body: JSON.stringify({ method: 'GET', path: '/v0/' + AT.BASE + '/' + table + '?...' })
  });
}

// NACHHER (Supabase):
import { dataStore } from '/lib/data-store.js';

async function fetchAuftraege(filter, opts) {
  return await dataStore.auftraege.list({
    where: filter,
    orderBy: opts.sort,
    limit: opts.limit
  });
}
```

**Schritte pro File:**
1. Airtable-Tabelle identifizieren (z.B. FAELLE)
2. Supabase-Pendant lookup (z.B. `auftraege`)
3. Spalten-Mapping pruefen (Airtable hat oft camelCase-IDs, Supabase snake_case)
4. RLS-Check: data-store.js nutzt automatisch RLS via JWT-Session
5. Code austauschen
6. Test im Browser-DevTools (Console + Network-Tab)
7. Edge-Cases: Pagination, Sort, Filter

---

## Was ich heute Nacht NICHT gemacht habe (mit Begruendung)

- ❌ **Logic-Files migrieren** — Production-Breaking-Risiko ohne Live-Tests, kein Browser zum Verifizieren
- ❌ **ENV-Vars deprecaten** — Marcel muss in Netlify Dashboard handeln, ich kann nur dokumentieren
- ❌ **Tests erweitern** — neue Tests ohne neue Functions = Schein-Sicherheit

## Was ich heute Nacht gemacht habe

- ✅ Diese Strategie-Doku
- ✅ Priorisierungs-Matrix mit Aufwands-Schaetzungen
- ✅ ENV-Cleanup-Liste mit Konsolidierungs-Empfehlungen
- ✅ Pattern-Vorlage fuer Migration
- ✅ NACHT-PAUSE-File fuer Marcel-Decision (siehe NACHT-PAUSE-MEGA-MEGA-MEGA-AIRTABLE-MIGRATION.md)
- ✅ O1-Bug-Fix in `prova-context.js`: Default-Sort entfernt (Tabellen ohne Timestamp triggerten 422) — das war ein Drift-Symptom

---

## Marcel-Decision-Punkte

1. **Wann Migration-Sprint K-2 starten?** Vor Pilot-Launch ODER nach 2 Wochen Pilot-Feedback?
2. **Welche Stufe-HIGH-Files priorisieren?** Alle 5 oder nur kritische 3?
3. **ENV-Konsolidierung jetzt oder nach Migration?** (Niedriges Risiko, aber Marcel-Pflicht in Netlify)
4. **DEAD-Files loeschen?** `gericht-auftrag-logic.js`, `mahnung-pdf.js`

---

*Erstellt im Sprint O3, MEGA-MEGA-MEGA, 03.05.2026 abend.*
