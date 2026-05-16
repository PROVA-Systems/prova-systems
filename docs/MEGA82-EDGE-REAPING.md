# MEGA⁸² Phase G — Edge-Function-Reaping Pre-Audit

**Stand:** 2026-05-16 · Branch: `feat/mega82-verkauf-ready`
**Scope:** Caller-Audit per Frontend-Grep. **KEINE Cloud-Action in MEGA82** — Marcel führt `supabase functions delete` per CLI nach Verify aus.

---

## G.1 — Sicher-tot-Liste (5 Functions)

### 1. `global-search` Edge-Function — ⚫ SAFE-DELETE

**Caller-Check:**
- `lib/prova-global-search.js` Z.164: ruft RPC `sb.rpc('global_search', ...)` (Migration 52, MEGA78) — **NICHT** die Edge-Function ✅
- `global-search.js` (root) Z.231: ruft `/.netlify/functions/global-search` — das ist die NETLIFY-Function, NICHT die Edge-Version
- `lib/cmd-k-modal.js` Z.205: gleich
- `netlify/functions/global-search.js` ist die ACTIVE Implementation
- `lib/bibliothek-pattern.js`: referenziert in Kommentar, kein API-Call

**Verdict:** Supabase-Edge `global-search` hat **0 Frontend-Caller**. Netlify-Function + RPC sind die aktiven Pfade.

**Delete-Command:**
```bash
supabase functions delete global-search --project-ref cngteblrbpwsyypexjrv
```

### 2. `fristen-reminder-cron` Edge-Function — ⚫ SAFE-DELETE

**Caller-Check:**
- Nur `netlify/functions/fristen-reminder-cron.js` (Netlify-eigenständig) und Test-Files
- Keine Frontend-HTML/JS-Caller
- Cron-Job `fristen-erinnerungen-daily` (jobid 8) ruft SQL-Function `process_fristen_erinnerungen()` direkt (Migration 53/54), NICHT die Edge-Function

**Verdict:** Edge-Version ist tot seit MEGA79.

**Delete-Command:**
```bash
supabase functions delete fristen-reminder-cron --project-ref cngteblrbpwsyypexjrv
```

### 3. `mahnwesen-cron` Edge-Function — ⚫ SAFE-DELETE

**Caller-Check:**
- `netlify/functions/mahnwesen-cron.js` (Netlify-eigenständig) und Test-Files
- Cron-Job `mahnwesen-vorbereitungen-daily` (jobid 9) ruft SQL-Function `prepare_mahnwesen_notifications()` direkt (Migration 56), NICHT die Edge-Function

**Verdict:** Edge-Version ist tot seit MEGA80.

**Delete-Command:**
```bash
supabase functions delete mahnwesen-cron --project-ref cngteblrbpwsyypexjrv
```

### 4. `migrate-normen-airtable` Edge-Function — ⚫ SAFE-DELETE

**Caller-Check:**
- Nur `tools/migrate-bibliothek-airtable.html` (Migration-Tool, einmal-use)
- Airtable-Death-Marathon abgeschlossen (MEGA76)

**Verdict:** Migration ist permanent abgeschlossen.

**Delete-Commands:**
```bash
supabase functions delete migrate-normen-airtable --project-ref cngteblrbpwsyypexjrv
# Optional auch das Tool entfernen:
git rm tools/migrate-bibliothek-airtable.html
```

### 5. `migrate-textbausteine-airtable` Edge-Function — ⚫ SAFE-DELETE

**Caller-Check:**
- Nur `tools/migrate-bibliothek-airtable.html`

**Verdict:** Wie #4.

**Delete-Command:**
```bash
supabase functions delete migrate-textbausteine-airtable --project-ref cngteblrbpwsyypexjrv
```

---

## G.2 — Duplicate-Pair-Audit (3 Pairs)

### Pair 1: `email-welcome` vs. `send-welcome-email`

**Frontend-Caller-Check:**
- `email-welcome` → **0 Caller** in Frontend/Lib/Netlify
- `send-welcome-email` → 1 Caller: `netlify/functions/send-welcome-email.js` (Self-Reference)

**Verdict:** Beide haben keine Frontend-Caller. Vermutlich werden sie von Make.com / Backend-Jobs gerufen. **DEFER MEGA83** — Marcel muss Make.com-Scenarios + Email-Pipeline auditen, bevor eines gelöscht wird.

### Pair 2: `list-dokument-templates` vs. `document-templates-list`

**Frontend-Caller-Check:**
- `list-dokument-templates` → 1 Caller: `lib/dokument-templates-cache.js` (Frontend-Cache)
- `document-templates-list` → 1 Caller: `dokument-vorlagen.html`

**Verdict:** **BEIDE AKTIV** — unterschiedliche Caller. NICHT löschen. Stattdessen: Konsolidierungs-Sprint MEGA83 (z.B. `dokument-vorlagen.html` auf `lib/dokument-templates-cache.js` umstellen → dann `document-templates-list` löschen).

### Pair 3: `skizze-save` (Singular) vs. `skizzen-save` (Plural)

**Frontend-Caller-Check:**
- `skizze-save` → **0 Caller** in Frontend
- `skizzen-save` → Aktive Caller: `lib/prova-skizze-editor.js`, `skizzen.html`, 2 Test-HTMLs

**Verdict:** `skizze-save` (Singular) ist tot. ⚫ SAFE-DELETE.

**Delete-Command:**
```bash
supabase functions delete skizze-save --project-ref cngteblrbpwsyypexjrv
```

---

## G.3 — 5 Audit-Edges konsolidieren — ⏸ DEFER MEGA83

**Aktuell separate Functions:**
- `audit-log`
- `audit-write`
- `audit-narrative-v1`
- `audit-source-log`
- `audit-trail-write`

**Konsolidierungs-Vorschlag MEGA83:**
1. Eine generische `audit-log-v2` mit `task`-Parameter
2. Alle 5 Caller migrieren (Frontend + Backend)
3. Old 5 Edges löschen

**Begründung Defer:** Refactor mit 5 Callers + Test-Pfad pro Caller = mittel-großer Sprint mit Risiko.

---

## Marcel-Apply-Pfad (MEGA82-Hotfix oder MEGA83)

```bash
# 1. Pre-Verify mit Logs (24h beobachten ob Traffic da ist)
supabase functions logs global-search --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs fristen-reminder-cron --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs mahnwesen-cron --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs migrate-normen-airtable --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs migrate-textbausteine-airtable --project-ref cngteblrbpwsyypexjrv --tail
supabase functions logs skizze-save --project-ref cngteblrbpwsyypexjrv --tail

# 2. Source-Code in _archiv/edge-functions/<name>/ sichern (optional Backup)
mkdir -p _archiv/edge-functions/
cp -r supabase/functions/global-search _archiv/edge-functions/global-search-MEGA82-deleted
# ... für jede Function

# 3. Cloud-Delete
supabase functions delete global-search             --project-ref cngteblrbpwsyypexjrv
supabase functions delete fristen-reminder-cron     --project-ref cngteblrbpwsyypexjrv
supabase functions delete mahnwesen-cron            --project-ref cngteblrbpwsyypexjrv
supabase functions delete migrate-normen-airtable   --project-ref cngteblrbpwsyypexjrv
supabase functions delete migrate-textbausteine-airtable --project-ref cngteblrbpwsyypexjrv
supabase functions delete skizze-save               --project-ref cngteblrbpwsyypexjrv

# 4. Lokale Verzeichnisse löschen
git rm -r supabase/functions/global-search
git rm -r supabase/functions/fristen-reminder-cron
git rm -r supabase/functions/mahnwesen-cron
git rm -r supabase/functions/migrate-normen-airtable
git rm -r supabase/functions/migrate-textbausteine-airtable
git rm -r supabase/functions/skizze-save

# 5. Optional: Migration-Tool entfernen
git rm tools/migrate-bibliothek-airtable.html

# 6. Commit
git commit -m "chore: edge-reaping (6 sichere Functions)"
```

**Σ 6 sichere Deletes** (5 aus MEGA81-Inventory + skizze-save aus G.2 Pair 3).

## Audit-Kandidaten (MEGA83 oder später)

Aus MEGA81-EDGE-FUNCTION-INVENTORY.md — brauchen tieferes Caller-Audit:
- `dashboard-fristen-upcoming` — vermutet tot, MEGA81 widgetHeute ersetzt
- `termin-reminder` — Make.com-Altlast
- `onboarding-mail-cron`, `email-pilot-feedback-cron`, `email-trial-ending-cron` — Cron-Job fehlt in pg_cron
- `email-welcome` vs `send-welcome-email` (G.2 Pair 1) — Make.com-Pipeline-Audit nötig
- `list-dokument-templates` vs `document-templates-list` (G.2 Pair 2) — Caller-Konsolidierung nötig
- `push-notify`, `uptime-webhook` — externer Trigger
- `sentry-test` — Test-Endpoint

## Defer MEGA83

- **G.3 Audit-Edges-Konsolidierung** — Refactor mit 5 Caller-Migrationen
- **G.2 Pair 1/Pair 2 Final-Cleanup** — Make.com-Audit + Caller-Konsolidierung
- **11 Audit-Kandidaten** — Per-Function-Caller-Sweep + 24h-Logs-Beobachtung
