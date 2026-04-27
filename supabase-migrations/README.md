# Supabase-Migrations — PROVA Systems

Versionierter Schema-Stand der Supabase-Datenbank (Project `cngteblrbpwsyypexjrv`, Frankfurt).

**Stand:** 28.04.2026 — Sprint K-1.0
**Status:** Alle 6 Files sind im Live-Supabase bereits ausgeführt. Diese Kopien hier sind die **Source of Truth** im Repo.

---

## Reihenfolge der Ausführung

Die Files **müssen in dieser Reihenfolge** angewendet werden — spätere bauen auf früheren auf:

| # | File | Phase | Inhalt | Tabellen |
|---|---|---|---|---|
| 1 | `01_schema_foundation.sql` | Foundation | Workspaces (Multi-Tenancy), Users, Memberships, Audit-Trail, Notifications, Sessions | 6 |
| 2 | `02_schema_kerngeschaeft.sql` | Kerngeschäft | Aufträge (universal mit JSONB für 10 Typen), Kontakte, Befunde, Messwerte, Sanierung, Phasen, Ortstermine, AZ-Generator | 14 |
| 3 | `03_schema_artefakte_storage.sql` | Artefakte + Storage | Dokumente (universal: PDFs/Rechnungen/Briefe/Mahnungen), Fotos, Audio, Anhänge, Termine, Notizen, 3 Storage-Buckets + Policies | 8 |
| 4 | `04_schema_komplett_finale.sql` | Komplett-Finale | Wissens-Bibliotheken (Normen mit pgvector, Textbausteine, KI-Prompts), KI-Protokoll/Lernpool, Imports, Support-Tickets, Compliance, Cockpit-Views | 26 |
| 5 | `05_v2_patch_billing_master_uebersicht_FIXED.sql` | Patch v2 | Yearly-Plan-Foundation + Master-Cockpit-View + Tabellarische Kundenliste + Time-Series. **FIX:** `DROP VIEW v_cockpit_mrr CASCADE` löst „cannot change name of view column"-Error | — |
| 6 | `06_v3_patch_final_lueckenschluss.sql` | Patch v3 | Stripe-Events (Idempotenz), Email-Log, Team-Invites, Onboarding-Progress, Forced Re-Consent für AGB/DSE/AVV, API-Keys, Tags, Bookmarks. **FIX v3:** Cleanup-Section am Anfang entfernt (DROP TRIGGER auf nicht-existenter Tabelle hat gecrasht) | 7 |

**Gesamt:** 61 Tabellen, 24 Helper-Functions, 12 Cockpit-Views, 3 Storage-Buckets (`sv-files`, `sv-public`, `sv-system`), pgvector 0.8.0 aktiv, RLS scharf auf jeder Tabelle.

---

## Konventionen

- **Idempotente DDL:** `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` für ENUMs.
- **GENERATED Columns nur mit IMMUTABLE Functions:** `lower()` OK, `unaccent()` NICHT (ist STABLE) — bei Bedarf BEFORE-Trigger statt GENERATED.
- **CREATE OR REPLACE VIEW kann keine Spalten umbenennen** → `DROP VIEW ... CASCADE` + `CREATE VIEW` neu.
- **Datei-Naming:** `<NN>_<verb>_<topic>.sql`, fortlaufende Nummer ohne Lücken.
- **Suffixe `_v2`/`_v3`/`_FIXED`** sind die finalen deployten Versionen — bitte beibehalten.

---

## Neue Migrations anlegen

1. Nächste freie Nummer wählen (`07_...` etc.) — keine Lücken.
2. Datum + Zweck im Header dokumentieren.
3. Idempotent schreiben (siehe Konventionen).
4. Lokal in Supabase-Dashboard → SQL Editor → New Query → Run.
5. Bei Erfolg: File commiten — **nie direkt im Dashboard ohne Repo-Eintrag**.
6. Bei Schema-Erweiterung: data-store-Methode in `/lib/data-store.js` ergänzen.

---

## Service-Role-Key

**NIE im Frontend-Code.** Nur Server-Side (Edge Functions, Migrations-Skripte). Anon-Key ist public OK — RLS schützt.

---

## Roadmap

- **K-1.1 (next):** Migrations-Pipeline Airtable → Supabase (Node.js-Skript, Field-Mapping, FK-Resolution, Storage-Migration)
- **K-1.2:** 8 Edge Functions (`pdf-generate`, `email-send`, `user-lifecycle`, `admin-notify`, `termin-reminder`, `stripe-webhook`, `mahnung-trigger`, `dsgvo-handler`) — siehe `/docs/EDGE-FUNCTION-INVENTAR-K-1-2.md`
- **K-1.5:** Cutover, Make-Account-Kündigung, Tag `v300-supabase-foundation`

Strategische Doku: `/docs/PROVA-SUPABASE-REFACTOR-MASTER.md`.
