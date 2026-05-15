# MEGA⁸¹ DECISIONS — Dashboard-as-Mission-Control + Repo-Sync + Edge-Inventar

**Stand:** 2026-05-15 · **Branch:** `feat/mega81-dashboard-mission-control` (von `feat/mega80-cron-pipeline`)

---

## Phase 0 — Pre-Read + Live-Verify ✅

- `docs/PROVA-FUNKTIONS-MASTER.md`, `docs/MEGA80-DECISIONS.md`
- `cron.job`-Snapshot via MCP — siehe nächster Abschnitt
- 5 Edge-Functions gelesen: `termin-reminder`, `admin-ki-aggregations`, `whisper-diktat`, `global-search`, `_shared/admin-auth`
- 143 lokale Edge-Function-Dirs gezählt (inkl. `_shared`)

### `cron.job`-Snapshot (Live, 2026-05-15 19:55)

| jobid | jobname | schedule | command | active |
|---|---|---|---|---|
| 1 | prova-health-check | `*/5 * * * *` | `http_post → health-check-cron` | ✅ |
| 2 | prova-status-check | `*/15 * * * *` | `http_post → status-check` | ✅ |
| 8 | fristen-erinnerungen-daily | `0 6 * * *` | `SELECT process_fristen_erinnerungen()` | ✅ |
| 9 | mahnwesen-vorbereitungen-daily | `0 6 * * *` | `SELECT prepare_mahnwesen_notifications()` | ✅ |
| 10 | termin-tagesplan-daily | `0 6 * * *` | `SELECT process_termin_tagesplan()` | ✅ |

**Wichtig:** Job 10 ist `process_termin_tagesplan` (NICHT `process_termin_erinnerungen` wie MEGA80-Spec). Marcel hat beim MCP-Apply umbenannt — Repo-File 55 spiegelte das nicht. **In MEGA81 Phase A gefixt.** Kein `termin-pre-push-minutely` Job — Pre-Push verschoben.

---

## Phase A — Repo-Sync Migrations 55/56 + SW-History ✅

| Artefakt | Aktion |
|---|---|
| `supabase-migrations/55_mega80_termin_erinnerungen_cron.sql` | **gelöscht** (war nie applied) |
| `supabase-migrations/55_mega80_termin_tagesplan_cron.sql` | **neu** mit Live-SQL aus `pg_get_functiondef` |
| `supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql` | **überschrieben** mit Live-SQL (9% B2B-Verzugszinsen, 14/21/35-Tage-Stufen, 0/5/10€ Gebühren, Idempotenz via Notification-Check) |
| `supabase-migrations/57_mega81_notification_rpcs.sql` | **neu** — 4 RPCs + 1 Index |
| `docs/SW-VERSION-HISTORY.md` | **neu** — Sprint-Historie |
| `sw.js` Kommentar | gekürzt von 6KB-Wall auf 3 Sätze |

**Schema-Drift Findings:** siehe `MEGA80-DECISIONS.md` + `MEGA81-EDGE-FUNCTION-INVENTORY.md`. Hier nur das Neue:

- `process_termin_tagesplan` filtert `status NOT IN (durchgefuehrt, abgesagt, kein_zustandekommen)` statt `status IN (geplant, bestaetigt)` — leicht inklusiver, aber praktisch äquivalent.
- Live-`prepare_mahnwesen_notifications` rundet Verzugszinsen mit `ROUND(..., 2)` (Repo-File auch).

---

## Phase B — Dashboard Mission Control ✅

### B.1 + B.2 — Notification-RPCs + Index

Migration 57 mit 4 Functions (siehe File-Header). Alle nutzen `auth.uid()` direkt → RLS-konform, kein Spoofing. SECURITY INVOKER (Default), nur `mark_*`-Funktionen sind explicit LANGUAGE plpgsql für `GET DIAGNOSTICS ROW_COUNT`.

Neuer Index `idx_notifications_user_active` für `(user_id, created_at DESC) WHERE dismissed_at IS NULL` — die bestehenden Indexes deckten nur "unread" und "by kategorie" ab.

### B.3 — Notifications-Bell ✅

**Datei:** `prova-notifications.js` **komplett ersetzt** (war noch obsoletes Airtable-Pattern, vermutlich seit MEGA76 nur als Stub aktiv).

Neue v3-Implementation:
- Auto-Mount in `.prova-notif-slot` oder `.topbar-right`
- Bell mit Badge (`is-active`-Class wenn unread > 0)
- Dropdown mit Liste, "Alle als gelesen"-Button, Footer-Link auf `/benachrichtigungen.html`
- 60s Polling, Cross-Tab via Standard-Browser-Cache
- Click-Outside + Esc schließen Dropdown
- Inline-CSS injection (kein separates CSS-File nötig)

**Globaler Helper:** `window.ProvaNotifications.refresh() / open() / close() / markAllRead()`

### B.4 — Heute-Widget ✅

**Datei:** `lib/prova-dashboard-widgets.js` erweitert.

Neuer Widget `heute` (steht jetzt an erster Stelle):
- Termine heute (max 6) — direkt aus `termine`-Tabelle
- Fristen heute oder überfällig (max 6) — aus `fristen`-Tabelle
- Ungelesene Notifications-Count via RPC `notifications_unread_count`
- Empty-State: "Heute steht nichts an. Guten Tag!"

`dashboard-fristen-upcoming` Edge Function **NICHT** genutzt — direkter Supabase-Client ist ausreichend und vermeidet eine zusätzliche Roundtrip + Edge-Function-Cold-Start.

### B.5 + B.6 — Fristen + Mahnwesen-Widget-Refresh ✅

`ProvaDashboardWidgets.refresh(container)` neu — liest `data-prova-widgets` Attribut und re-rendert. Aktuell von außen nicht aufgerufen (Marcel kann es manuell im Console oder über zukünftige Bell-Action triggern).

Widgets selbst unverändert — sie waren bereits seit MEGA75-D auf korrektem Schema.

### B.7 — Dashboard-Layout-Reihenfolge ✅

`dashboard.html` Z.1165: widgets-Liste auf `['heute', 'aktive', 'fristen', 'mahnwesen', 'ki_stats', 'aktivitaet']` aktualisiert. "Heute" ist jetzt das erste Tile.

---

## Phase C — Edge-Function-Inventar ✅

Datei: `docs/MEGA81-EDGE-FUNCTION-INVENTORY.md` — 143 Functions in 13 Kategorien.

**Sicher-tot-Liste (für MEGA82-Reaping):**
1. `global-search` — RPC ersetzt seit MEGA78
2. `fristen-reminder-cron` — SQL `process_fristen_erinnerungen` ersetzt seit MEGA79
3. `mahnwesen-cron` — SQL `prepare_mahnwesen_notifications` ersetzt seit MEGA80
4. `migrate-normen-airtable` — Airtable-Migration abgeschlossen seit MEGA76
5. `migrate-textbausteine-airtable` — dito

**Audit-Kandidaten:** 11 weitere Functions (dashboard-fristen-upcoming, termin-reminder, onboarding-mail-cron, email-pilot-feedback-cron, email-trial-ending-cron, list-dokument-templates vs document-templates-list, skizze-save vs skizzen-save, email-welcome vs send-welcome-email, push-notify, uptime-webhook, sentry-test) — alle brauchen Frontend-Grep + Logs vor Lösch-Entscheidung.

KEINE Löschungen in MEGA81 — Phase C ist reine Kategorisierung.

---

## Phase D — MEGA80-Reste ✅

### D.1 — admin-ki-aggregations `is_founder` ✅

**Datei:** `supabase/functions/admin-ki-aggregations/index.ts`

Pattern: `adminHandler` bleibt (Email-Whitelist + 2FA AAL2), **zusätzlich** wird `users.is_founder = true` geprüft. Reasoning: die Email-Whitelist hat 5 Einträge — nicht alle davon sind aktive Founder mit KI-Kosten-Übersicht-Berechtigung. is_founder ist die finale Stellschraube.

Lookup via Service-Client (RLS bypass) auf `users.email = adminEmail` (case-insensitive) → `is_founder` + `deleted_at`.

**Deploy:** Marcel via `supabase functions deploy admin-ki-aggregations`.

### D.2 — whisper-diktat Sprach-Parameter ✅

**Datei:** `supabase/functions/whisper-diktat/index.ts`

`'language', 'de'` hardcoded → liest jetzt `user_workflow_settings.diktat_sprache` (MEGA77 Schema-Erweiterung). OpenAI Whisper braucht ISO-639-1 (`de`) statt regional (`de-DE`/`de-AT`) → wir splitten den ersten Sub-Tag. Fallback `'de'` wenn Setting fehlt oder Read-Error.

`try/catch` defensiv — wenn Read fehlschlägt, default `'de'` statt Function-Crash.

**Deploy:** Marcel via `supabase functions deploy whisper-diktat`.

### D.3 — provaInlineSuggestionsEnabled in TipTap-Auto-Trigger ✅

**Datei:** `lib/ki-autosuggest.js`

Ergänzt: `_trigger()` prüft jetzt **zusätzlich** zum bestehenden `userPreferenceKey`-Check auch `window.provaInlineSuggestionsEnabled()` (aus MEGA80 ki-lernpool.js). Off → silent skip.

Damit erfüllt der Master-Toggle in Einstellungen → KI&Diktat seinen Zweck end-to-end: kein Ghost-Text, kein Spinner, kein KI-Call.

---

## Phase E — Optional (DEFER MEGA82)

| Item | Defer-Grund |
|---|---|
| F.2 Split-Audit Doku | Reine Doku-Aufgabe ohne Code-Risiko — Marcel kann parallel selbst auditen |
| applyPhaseVisibility DOM-Refactor | akte.html hat noch kein `data-phase`-Markup. Refactor braucht eigenen Sprint mit DOM-Restrukturierung pro Akte-Section |

---

## Defer-Liste für MEGA82

| Item | Konkreter Grund |
|---|---|
| F.1 Login Cross-Domain | Cookie-Storage-Adapter + Cross-Subdomain-Tests sind ein eigener Sprint (S-SICHER 2.0). Nicht risikoadäquat in Marathon |
| MEGA82-Reaping | `supabase functions delete` für 5 sichere + 11 Audit-Kandidaten — braucht Marcel-Eyes-On |
| applyPhaseVisibility | DOM-Refactor in akte.html für `data-phase`-Attribute |
| H Netlify-Functions Airtable-Cleanup | Per-File-Audit; fällt nach ENV-Cleanup automatisch aus |
| Pre-Push-Minutely Termin-Cron | Vom MEGA80-Entwurf weggefallen — re-evaluate, ob es echten Bedarf gibt (jetziges Tagesplan-Pattern + Bell deckt 95%) |

---

## Apply-Pfad für Marcel

### 1. Migration 57 applien

```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega81_notification_rpcs
  query=<Inhalt von supabase-migrations/57_mega81_notification_rpcs.sql>
```

### 2. Edge-Function-Deploys (CLI)

```
supabase functions deploy admin-ki-aggregations --project-ref cngteblrbpwsyypexjrv
supabase functions deploy whisper-diktat --project-ref cngteblrbpwsyypexjrv
```

### 3. Smoke-Tests

Siehe `docs/MEGA81-MARCEL-CHECKLIST.md` — 12 Punkte.

---

## CACHE_VERSION

v3243 → **v3244-mega81-mission-control**

Kommentar in `sw.js` ist jetzt 3 Sätze max — Historie in `docs/SW-VERSION-HISTORY.md`.
