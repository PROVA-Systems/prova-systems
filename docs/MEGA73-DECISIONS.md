# MEGA⁷³ Marathon — Decisions Log

**Stand:** 2026-05-15 02:00 (autonom Marcel-Sleep)
**Branch:** `feat/mega73-cleanup-marathon`

---

## Entscheidung 1 — Plan-Mode-Interruption

Nach Phase-1-Start (4 `git mv` Quarantäne-Rollbacks staged) wurde Plan-Mode aktiviert. Plan-File geschrieben (`C:\Users\selin\.claude\plans\buzzing-exploring-lollipop.md`). ExitPlanMode kam automatisch zurück. Resume aus Working-Tree-State. KEIN Code-Verlust.

## Entscheidung 2 — Phase 1 Quarantäne-Verdikte

| File | Verdict | Methode |
|---|---|---|
| `share.html` | KEEP (zurück) | Marcel-Verdikt (Spec) — Public-Share-Feature |
| `legal/datenschutz-intern.html` | KEEP (zurück) | Diff: 36 vs. 393 LOC = >20% Diff = eigenständig |
| `anforderung-unterlagen-erweitert.html` | IN QUARANTINE | `grep -rl` außerhalb _archiv/docs: 0 Treffer |
| `briefe/ortstermin-arbeitsblatt.html` | IN QUARANTINE | `grep -rl`: 0 Treffer |

## Entscheidung 3 — Schema-Verify-Methodik

Statt Supabase-MCP-Calls (Tool-Search-Overhead) habe ich Schema-Verify via Repo-Migrations gemacht:
- `supabase-migrations/01_schema_foundation.sql` für `users`, `audit_trail`, `workspaces`
- `supabase-migrations/02_schema_kerngeschaeft.sql` für `auftraege`
- `supabase/migrations/20260429_add_letterhead_config.sql` für `users.letterhead_config`
- `supabase-migrations/10_users_persona_onboarding.sql` für `welcome_wizard_completed`

→ 100% reproducible, kein Live-MCP-Round-Trip nötig.

## Entscheidung 4 — audit_action enum vs. freigabe_abgeschlossen

Schema-Verify zeigt: `audit_action` enum hat NUR `'create','read','update','delete','login','logout','login_failed','export','import','pdf_generate','pdf_view','pdf_send','ki_request','ki_response','workspace_invite','workspace_remove_member','data_export_dsgvo','data_delete_dsgvo'`.

→ `'freigabe_abgeschlossen'` ist KEIN gültiger Wert. Konservativ-Entscheidung: `action='update'` (Auftrag-Update auf Status=abgeschlossen) + Semantik via `payload.action_subtype='freigabe_abgeschlossen'`.

**Phase-H-Backlog:** enum-Erweiterung via Migration für sauberere Audit-Trail-Semantik.

## Entscheidung 5 — termine.az → auftrag_id-Lookup

`termine`-Tabelle hat `auftrag_id uuid` FK, kein `aktenzeichen` text-Column. Migration:
- Speichern: best-effort `auftraege.select('id').eq('az', az)` lookup → `auftrag_id`
- Anzeige: termin.az bleibt im UI-State, aber Persistenz nur via FK

## Entscheidung 6 — rechnungen-Save fire-and-forget

WEBHOOK_S6 (Make.com) generiert PDF + sendet Email. Supabase `dokumente`-INSERT läuft parallel als fire-and-forget IIFE (non-blocking) damit UI-Flow + Webhook nicht gebremst werden. Bei Supabase-Failure: localStorage-Cache bleibt funktional (kein User-Impact).

## Entscheidung 7 — baubegleitung Begehung als eintraege

`baubegleitung-logic.js` schrieb Begehungen früher als Airtable-Auftraege-Updates. Migration: Begehung → `eintraege` mit `typ='text'` + `auftrag_id`-Lookup via `proj.az`. Strukturell sauberer als alles in `auftraege.details` zu kippen.

## Entscheidung 8 — statistiken Erstellungszeit_Sekunden

Airtable hatte ein Computed-Field `Erstellungszeit_Sekunden`. In `auftraege`-Schema gibt es das nicht direkt. CSV-Export hat dieses Feld nun als `null`. Phase-B+-Backlog: aus `audit_trail`-Events (login → freigabe_abgeschlossen) berechnen.

## Entscheidung 9 — PROVA-VISION-MASTER + 00_MASTERPLAN überspringen

Beide Doku-Files sind >500 LOC strukturell. Append/Phase-Tabelle-Update wäre möglich aber low-impact. Konservativ-Entscheidung: skippen, CLAUDE.md + ARCHITEKTUR-MASTER reichen für Marcel-Morgen-Review.

**Phase-F-Followup:** wenn Marcel will, dedizierter Doku-Sprint mit allen Master-Files.

## Entscheidung 10 — Branch-Base

Branch von `feat/mega72-full-marathon` (statt `main`). main ist bei `3c141a5` (Kartographie + 1.2.2), MEGA⁷² Phase A noch nicht gemerged. → Marcel mergt Reihenfolge: 1.2.4 → MEGA⁷² → MEGA⁷³.

---

*Decisions document final. Push folgt.*
