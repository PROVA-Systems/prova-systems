# MEGA³² W11-I8 — Schema Final Stand (Markt-Launch)

**Datum:** 2026-05-11
**Project:** `cngteblrbpwsyypexjrv` (eu-central-1 Frankfurt)

---

## Aktueller Schema-Stand: 66 Tables (alle RLS-aktiviert)

**Zuwachs durch W11/W12b:**
- ✅ `skizzen` (W12b-I2 Migration) — 13 Spalten
- ✅ `fristen` (W12b-I3 Migration) — 16 Spalten

**Erweiterungen:**
- `eintraege` +3 Spalten (W12-I1: `dauer_min`, `abrechenbar`, `deleted_at`)
- `users` +3 TOTP-Spalten (W12b-I4: `totp_recovery_codes`, `totp_last_used_at`, `totp_setup_started_at`)

**Gelöschte Migrations** (alle vor Apply gelöscht):
- 5 fehlerhafte W10/W10b-Migrations (Drift-Closure W12b)

---

## Welle-11-Migrations-Update

**KEINE neuen Migrations in Welle 11.** Nur Lambda + Frontend + Doku.

→ **Schema ist Production-stable und Markt-Launch-Ready.**

---

## ENUM-Stand: 43 ENUMs

| ENUM | Werte | Genutzt in |
|---|---|---|
| `auftrag_typ` | 10 | W11-I4 Demo-Fall (kurzstellungnahme) |
| `auftrag_status` | 5 | W11-I4 (aktiv) |
| `eintrag_typ` | 4 (diktat/text/foto/mix) | W12b-I1 reconciled |
| `frist_typ` | 8 | W12b-I3 |
| `frist_status` | 4 | W12b-I3 |
| `health_check_kategorie` | 10 | W12b-I6 (system_health) |
| `member_rolle` | 5 | RLS-Pattern |
| `foto_typ` | 10 | W11-I1 fotos-list |
| `dokument_typ` | 33 | W11-I1 dokumente-list |

---

## Schema-Reference Source-of-Truth

**`docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md`** ist Marcel-Maintained.

Bei jedem neuen Lambda/Migration-Build:
1. Schema-Reference konsultieren
2. Bei Unsicherheit `mcp__claude_ai_Supabase__execute_sql` für Live-Verify
3. Drift-Tabelle in W12-I0 Audit prüfen

---

*MEGA³² W11-I8 — Co-Authored-By Claude Opus 4.7*
