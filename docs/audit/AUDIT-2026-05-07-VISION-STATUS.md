# PROVA Vision-Komplettheits-Audit

**Datum:** 2026-05-07
**Auditor:** Claude Code (Repo-First, kein Memory-Layer)
**Methode:** Vollständiger Repo-Audit gegen Vision-Master + Live-Schema-Verify via Supabase-MCP
**Branch:** `mega33-env-konsolidierung` (kein neuer Branch erstellt — nur Audit-Doku committed)
**Status:** WIP — wird per-Section gepusht

---

## Gesamt-Status

*[wird nach allen 19 Bereichen finalisiert]*

---

## Methodik

- Pro Bereich: konkrete Datei-Pfade, Line-Numbers, Test-Namen
- Bei Unsicherheit: explizit "AUDIT-UNKLAR"
- Quellen: Repo (Wahrheit) > Supabase-MCP (Live-DB-Schema) > Master-Docs (Soll-Stand)
- Keine Memory-Annahmen, keine W11/W12/W13-Marketing-Behauptungen

---

## Bereich 1 — Schema (DB)

**Status:** ✅ KOMPLETT
**Komplettheit:** **~98%**
**Methode:** Supabase-MCP `list_tables` Live-Verify gegen `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md`

**Belege:**
- Live-DB: **66 Tabellen** in `public` Schema (cngteblrbpwsyypexjrv, eu-central-1, alle RLS-aktiv)
- Schema-Reference-Doku: `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md` (Marcel-maintained, 644 LOC, 409 Spalten-Einträge)
- Drift-Closure verifiziert in Welle 12b — `docs/audit/MEGA-32-W12-I0-SCHEMA-AUDIT.md`

**Kritische Soll-Tabellen alle vorhanden (Live-Verify):**
- ✅ `workspaces` (3 rows), `users` (3), `workspace_memberships` (3) — Multi-Tenancy Foundation
- ✅ `auftraege` (1 row) — Universal-Tabelle alle 10 Typen
- ✅ `kontakte` (2), `dokumente` (2), `eintraege`, `fristen`, `skizzen` — Audit-Blocker geschlossen (W12b)
- ✅ `audit_trail` (4 rows) — INSERT-only DSGVO Art. 30 + IHK-SVO
- ✅ `ki_protokoll` — Pflicht-Logging-Tabelle laut Regel 16 (existiert, 0 rows aktuell — kein KI-Call live)
- ✅ `system_health` — W12b-I6 Status-Page-Foundation
- ✅ `einwilligungen` — DSGVO Art. 7
- ✅ `impersonation_log` — Login-as-User-Pflicht
- ✅ `feature_events` (2 rows) — Cockpit-Heatmap-Foundation
- ✅ `versicherungs_partner` — AVV-Konformität (Regel 18)
- ✅ `rechtsdokumente` — Forced Re-Consent (Regel 20)
- ✅ `ki_prompt_templates`, `ki_lernpool`, `ki_feedback` — KI-Härtung-Foundation

**ENUMs (43 verifiziert in W12-I0-Audit):** `auftrag_typ` (10), `auftrag_status` (5), `eintrag_typ` (4 NUR), `frist_typ` (8), `frist_status` (4), `health_check_kategorie` (10), `member_rolle` (5), `dokument_typ` (33), `foto_typ` (10), `audit_action` (18), `ki_provider` (3), `ki_modell_typ` (11), `ki_call_status` (5), `prompt_purpose` (12), `termin_typ` (9), `termin_status` (6), etc.

**Lücken:**
- ⚠️ `auftraege.auftraggeber_typ` + `auftraggeber_kontakt_id` existieren NICHT in Production. Migration `2026_05_10_w9_06b_auftraege_extend.sql` ist als `PLANNED — DO NOT APPLY` markiert. Architektur-Alternative: M:N via `auftrag_kontakte`. Marcel-Decision pending. (Beleg: `docs/audit/MEGA-32-W12b-I5-AUFTRAEGE-EXTEND-STATUS.md`)
- ⚠️ `ki_protokoll.cached_tokens_in` Spalte für Prompt-Caching W4-Bonus: AUDIT-UNKLAR — nicht direkt gegrept, separater Schema-Spalten-Audit nötig falls W4 priorisiert wird.

**Acceptance:** Schema ist **Production-stable und Markt-Launch-Ready** (W12b-FINAL bestätigt).

---

