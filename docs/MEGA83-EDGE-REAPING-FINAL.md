# MEGA⁸³ Phase D — Edge-Reaping FINAL + 5-Audit-Edges-Konsolidierung

**Stand:** 2026-05-16 · Branch: `feat/mega83-akte-mission-control`
**Vorgänger:** `docs/MEGA82-EDGE-REAPING.md` (Pre-Audit)

---

## D.1 — Re-Verifikation der 6 sicheren Delete-Kandidaten

Aus MEGA82-Inventory + MEGA82-EDGE-REAPING.md. Re-Verify Frontend-Caller-Status:

### 1. `global-search` Edge — ⚫ SAFE-DELETE

**Re-Verify Caller (grep, 2026-05-16):**
- `lib/prova-global-search.js` Z.164: ruft `sb.rpc('global_search', ...)` (Migration 52, RPC-Ersatz) ✓
- `global-search.js` (root) Z.231: `/.netlify/functions/global-search` — Netlify-Function NICHT Edge ✓
- `lib/cmd-k-modal.js` Z.205: gleich ✓
- `netlify/functions/global-search.js` Self-Reference ✓

**Status: 0 Frontend-Caller auf Supabase-Edge `/functions/v1/global-search`. SAFE-DELETE.**

### 2-6. Restliche Kandidaten unverändert

Status wie in MEGA82-EDGE-REAPING.md (Re-Verify in Marcels CLI-Apply-Run):
- `fristen-reminder-cron` — SQL `process_fristen_erinnerungen` (Migration 53/54) ersetzt
- `mahnwesen-cron` — SQL `prepare_mahnwesen_notifications` (Migration 56) ersetzt
- `migrate-normen-airtable` — Migration abgeschlossen MEGA76
- `migrate-textbausteine-airtable` — dito
- `skizze-save` (Singular) — 0 Frontend-Caller (Plural skizzen-save ist aktiv)

---

## D.2 — 5-Audit-Edges-Konsolidierungs-Plan

**Aktuelle Edge-Functions (alle aktiv mit unterschiedlichen Use-Cases):**

| Function | Zweck | Pattern |
|---|---|---|
| `audit-log` | Generisches Audit-Insert (frontend-facing) | POST mit { action, entity_typ, entity_id, payload } |
| `audit-write` | Server-Side Audit-Insert (von anderen Edge-Functions) | Internal-Call |
| `audit-narrative-v1` | Audit-Lese mit Natural-Language-Output (Dashboard Aktivitäten-Widget) | GET mit limit-Param |
| `audit-source-log` | Spezial-Audit für KI-Source-Logging (S1-S3-Stufen) | Internal von ki-proxy |
| `audit-trail-write` | Frontend Audit-Write mit Pseudonymisierung | POST von Frontend |

### Konsolidierungs-Vorschlag MEGA84

**Ziel-Architektur:** 2 Edges statt 5:

1. **`audit-v2`** (read+write, frontend+internal):
   - GET-Mode: liest audit_trail mit Filter (Ersatz für `audit-narrative-v1`)
     - Query-Params: `limit`, `entity_typ`, `entity_id`, `auftrag_id`, `since`
     - Optional `format=narrative` für Natural-Language
   - POST-Mode: Audit-Insert (Ersatz für `audit-log`, `audit-trail-write`, `audit-source-log`)
     - Body: `{ action, entity_typ, entity_id, payload, source? }`
     - Source-Param erlaubt `s1/s2/s3` für KI-Stufen-Markierung

2. **`audit-internal-bridge`** (nur server-to-server):
   - Wrapper für `audit-write` mit Service-Role-Key
   - Wird von ki-proxy + anderen Edge-Functions intern aufgerufen
   - Behält separat weil Service-Role-Bypass-Pattern + Rate-Limit-anders

### Migration-Strategie (MEGA84 oder später)

1. **Phase 1: Neue `audit-v2` Edge deployed** (parallel zu existierenden 5)
2. **Phase 2: Frontend-Caller-Migration** — Grep + Replace pro Caller
3. **Phase 3: Internal-Caller-Migration** — ki-proxy + andere Edge-Functions umstellen
4. **Phase 4: 4 alte Edges löschen** (audit-log, audit-narrative-v1, audit-source-log, audit-trail-write)
5. **`audit-write` bleibt** als renamed `audit-internal-bridge`

**Geschätzter Aufwand MEGA84:** 2-3h. Risiko: mittel (Audit-Trail ist Compliance-Pflicht-Pfad — jeder verlorene Eintrag kostet Vergütungsfähigkeit).

---

## Marcel-CLI-Apply-Pfad (kopierbar)

### 1. Pre-Verify mit Logs (24h beobachten ob noch Traffic)
```bash
supabase functions logs global-search             --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs fristen-reminder-cron     --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs mahnwesen-cron            --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs migrate-normen-airtable   --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs migrate-textbausteine-airtable --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs skizze-save               --project-ref cngteblrbpwsyypexjrv --tail
```

### 2. Source-Code-Backup (optional)
```bash
mkdir -p _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/global-search _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/fristen-reminder-cron _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/mahnwesen-cron _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/migrate-normen-airtable _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/migrate-textbausteine-airtable _archiv/edge-functions/MEGA83-deleted/
cp -r supabase/functions/skizze-save _archiv/edge-functions/MEGA83-deleted/
```

### 3. Cloud-Delete
```bash
supabase functions delete global-search                  --project-ref cngteblrbpwsyypexjrv
supabase functions delete fristen-reminder-cron          --project-ref cngteblrbpwsyypexjrv
supabase functions delete mahnwesen-cron                 --project-ref cngteblrbpwsyypexjrv
supabase functions delete migrate-normen-airtable        --project-ref cngteblrbpwsyypexjrv
supabase functions delete migrate-textbausteine-airtable --project-ref cngteblrbpwsyypexjrv
supabase functions delete skizze-save                    --project-ref cngteblrbpwsyypexjrv
```

### 4. Lokale Verzeichnisse löschen
```bash
git rm -r supabase/functions/global-search
git rm -r supabase/functions/fristen-reminder-cron
git rm -r supabase/functions/mahnwesen-cron
git rm -r supabase/functions/migrate-normen-airtable
git rm -r supabase/functions/migrate-textbausteine-airtable
git rm -r supabase/functions/skizze-save
git rm tools/migrate-bibliothek-airtable.html  # Optional: tot-Migration-Tool
git commit -m "chore(mega83): edge-reaping 6 sichere Functions"
git push origin main
```

---

## DEFER MEGA84

| Item | Begründung |
|---|---|
| 5 Audit-Edges → 2 Edges Konsolidierung | Refactor mit Pseudonymisierung-Test + Compliance-Pflicht |
| Audit-Kandidaten aus MEGA81 (dashboard-fristen-upcoming, termin-reminder, etc.) | Pro-Function Caller-Sweep + 24h-Logs |
