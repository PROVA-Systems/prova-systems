# MEGA³² W12-I0 — Schema-Audit (echtes Supabase-Schema)

**Project-ID:** `cngteblrbpwsyypexjrv` (eu-central-1)
**Datum:** 2026-05-11
**Methode:** Supabase MCP `list_tables` + `execute_sql` auf `information_schema.columns` und `pg_type`/`pg_enum`
**Referenz-File:** `MEGA-32-W12-I0-SCHEMA-COLUMNS.md` (alle Spalten pro Tabelle)

---

## 0. Tabellen-Übersicht (64 Tables in `public`)

Alle Tabellen haben **RLS aktiviert**. Auszug der für Welle 10/10b kritischen Tabellen:

| Tabelle | Rows | Comment |
|---|---|---|
| `auftraege` | 1 | Universale Auftrag-Tabelle — alle 10 Typen mit JSONB für typ-spezifische Felder |
| `eintraege` | 0 | (existiert, kein Comment in DB) |
| `system_health` | 0 | (existiert, kein Comment) |
| `users` | 3 | SV-Profile, 1:1 mit auth.users |
| `workspace_memberships` | 3 | M:N zwischen User und Workspace mit Rollen-System |
| `workspaces` | 3 | Multi-Tenancy Foundation |
| `kontakte` | 2 | Universale Kontakt-Tabelle |
| `dokumente` | 2 | Universale Dokument-Tabelle |
| `termine` | 0 | Universale Termin-Tabelle mit iCal-Support |
| `fotos` | 0 | EXIF-Strip Pflicht |
| `audio_dateien` | 0 | Whisper-Transkription, Pseudonymisierung Pflicht |
| `notizen` | 0 | — |
| `ortstermine` | 0 | — |

**Tabellen die wir in W10/W10b ERSTELLEN wollten und schon existieren:**
- ✅ `eintraege` (existiert mit 17 Spalten)
- ✅ `system_health` (existiert mit 11 Spalten — wir nannten es `service_health`)
- ✅ `users` mit `totp_secret`, `totp_enabled` (existieren beide)

**Tabellen die wir erstellen wollten und nicht existieren:**
- ❌ `skizzen` (muss neu erstellt werden — W12-I2)
- ❌ `fristen` (muss neu erstellt werden — W12-I3)
- ❌ `service_health` (NICHT erstellen — `system_health` nutzen!)

---

## 1. ENUM-Werte (43 ENUMs in `public`)

### 🔴 `eintrag_typ` — NUR 4 Werte!

```
diktat, text, foto, mix
```

**Drift-Befund Welle 10b:** wir hatten 8 Werte angenommen (`ortstermin`, `telefonat`, `email`, `recherche`, `gutachten-arbeit`, `akteneinsicht`, `korrespondenz`, `sonstiges`). **ALLE FALSCH.**
**Konsequenz:** Eintrag-System nutzt `typ ENUM (diktat|text|foto|mix)` + ggf. `details JSONB` für Untertypen, oder neue ENUM-Werte via `ALTER TYPE eintrag_typ ADD VALUE`.

### 🔴 `health_check_kategorie` — 10 Werte

```
database, storage, edge_function, pdfmonkey, openai, stripe, make, email_smtp, frontend, sonstiges
```

**Drift-Befund Welle 10b:** wir hatten Service-Names als TEXT. Echtes Schema nutzt ENUM. Reconciliation: `kategorie health_check_kategorie` + `component TEXT`.

### `auftrag_typ` — 10 Werte (Universal-Auftrag)

```
schaden, beweis, ergaenzung, gegen, kurzstellungnahme, wertgutachten,
beratung, baubegleitung, schied, gericht
```

### `auftrag_status` — 5 Werte
```
entwurf, aktiv, abgeschlossen, archiv, storniert
```

### `auftrag_zweck` — 6 Werte
```
privat, gericht, versicherung, kauf, sanierung, sonstiges
```

### `member_rolle` — 5 Werte
```
owner, admin, sv, assistenz, readonly
```

### `notification_kategorie` — 4 Werte
```
aufgaben, termine, achtung, system
```

### `termin_typ` — 9 Werte
```
ortstermin, gerichtstermin, beratung_telefon, beratung_video,
beratung_vor_ort, beweisaufnahme, baubegleitung_termin, intern, sonstiges
```

### `kontakt_rolle` — 14 Werte (auftraggeber/geschaedigter/eigentuemer/.../sv_gegner/zeuge/...)
### `kontakt_typ` — 9 Werte (privat/firma/anwalt/versicherung/...)
### `dokument_typ` — 33 Werte (gutachten_pdf bis sonstiges_pdf)
### `dokument_status` — 9 Werte
### `foto_typ` — 10 Werte
### `audit_action` — 18 Werte
### `ki_provider`, `ki_modell_typ`, `ki_call_status`, `ki_feedback_bewertung`, `prompt_purpose`
### `phase_status`, `termin_status`, `email_status`, `stripe_event_status`, `referral_status`
### `import_quelle`, `import_record_status`, `import_job_status`
### `feature_event_typ`, `lead_stufe`, `ticket_typ`, `ticket_status`, `ticket_prioritaet`
### `versand_kanal`, `anhang_typ`, `anhang_herkunft`
### `einwilligung_typ`, `rechtsdoc_typ`
### `norm_bereich` — 24 Werte
### `textbaustein_kategorie` — 14 Werte
### `workspace_typ` — solo, team
### `abo_status`, `abo_tier`, `abrechnungs_intervall`
### `api_key_scope`, `invitation_status`, `ursache_prioritaet`

---

## 2. Tabellen-Schema (Drift-relevante)

### `auftraege` (46 Spalten) — Universal

Schlüssel-Spalten:
- `id UUID` PK
- `workspace_id UUID` FK
- `az TEXT` (Aktenzeichen)
- `typ auftrag_typ` ENUM
- `status auftrag_status`
- `zweck auftrag_zweck`
- `auftraggeber_kontakt_id UUID` FK kontakte (✅ existiert!)
- `auftraggeber_typ` (✅ existiert!)
- `created_by_user_id UUID` FK users
- `created_at`, `updated_at TIMESTAMPTZ`

**W12-I5 Conclusion:** `auftraggeber_typ` + `auftraggeber_kontakt_id` ✅ existieren bereits — keine Migration nötig.

### `eintraege` (17 Spalten) — existiert!

```
id UUID
workspace_id UUID
auftrag_id UUID            ← NICHT schadensfall_id!
ortstermin_id UUID NULL
typ eintrag_typ            ← ENUM (diktat|text|foto|mix)
nr INTEGER NULL
datum DATE
titel TEXT
content TEXT
audio_dateien_ids UUID[]
foto_ids UUID[]
pseudonymisiert BOOLEAN
konjunktiv_check_passed BOOLEAN
search_vector tsvector
created_by_user_id UUID
created_at, updated_at TIMESTAMPTZ
```

**Welle-10b-Drift:**
- `schadensfall_id` ❌ → muss `auftrag_id` ✅
- `eintrag_typ` als TEXT mit 8 Werten ❌ → `typ eintrag_typ` ENUM mit 4 Werten ✅
- `beschreibung_text` ❌ → `titel` + `content` ✅
- `dauer_min`, `abrechenbar` ❌ existieren NICHT (für JVEG: `details JSONB` wäre der saubere Pfad — aber `details` Spalte gibts AUCH NICHT in `eintraege`. Lösung: ALTER TABLE in W12-I1)

### `system_health` (11 Spalten)

```
id UUID
workspace_id UUID NULL  -- system-weit oder workspace-spezifisch
kategorie health_check_kategorie  ← ENUM
component TEXT
status TEXT  -- 'up'/'degraded'/'down'
response_time_ms INTEGER
error_rate_pct NUMERIC
details JSONB
error_message TEXT
sampled_at TIMESTAMPTZ
window_minutes INTEGER DEFAULT 5
```

**Welle-10b-Drift:** wir hatten `service_health` mit anderen Spalten. **Reconciliation:** alle Lambdas auf `system_health` umstellen, Migration 6 (service_health) löschen.

### `users` (29 Spalten) — TOTP-relevant

Existing TOTP-Spalten (✅):
- `totp_secret TEXT NULL`
- `totp_enabled BOOLEAN`

Fehlende TOTP-Spalten (❌):
- `totp_recovery_codes TEXT[]` — fehlt
- `totp_last_used_at TIMESTAMPTZ` — fehlt
- `totp_setup_started_at TIMESTAMPTZ` — fehlt

**Welle-10b-Migration `2026_05_10_w9_2fa_foundation.sql` falsch:** versuchte alle 5 Spalten neu anzulegen. Reconciliation: nur die 3 fehlenden ergänzen via `ADD COLUMN IF NOT EXISTS`.

### `workspace_memberships` (14 Spalten)

Schlüssel-Spalten:
- `workspace_id UUID` FK
- `user_id UUID` FK
- `rolle member_rolle` ENUM (`owner|admin|sv|assistenz|readonly`)
- `aktiv BOOLEAN`

**Welle-10b-Drift:** RLS-Policies referenzierten `workspace_members` — Tabelle heißt aber `workspace_memberships`. Alle neue Migrations müssen das korrigieren.

### `fotos` (28 Spalten)

Schlüssel-Spalten für Skizzen-Foto-Referenz:
- `id UUID` PK
- `workspace_id UUID`
- `auftrag_id UUID NULL`
- `typ foto_typ` ENUM
- `storage_path TEXT`

### `termine` (32 Spalten)

Schlüssel-Spalten für iCal-Export (W9N-I5):
- `id UUID`
- `workspace_id UUID`
- `auftrag_id UUID NULL`
- `typ termin_typ` ENUM
- `titel TEXT`
- `start_datetime TIMESTAMPTZ`
- `end_datetime TIMESTAMPTZ`
- `ort_strasse, ort_plz, ort_ort, ort_land TEXT`
- `status termin_status`

**Welle-9N-I5 Drift-Risiko:** `generate-ical.js` SELECTed Spalten `start, end` — heißen wirklich `start_datetime, end_datetime`. **W12-I7-Audit-Item.**

### `kontakte` (37 Spalten) — Universal-Kontakte

Schlüssel-Spalten:
- `id UUID`
- `workspace_id UUID`
- `typ kontakt_typ` ENUM
- `vorname, nachname, firma TEXT`
- `email, telefon TEXT`
- `strasse, plz, ort, land TEXT`

---

## 3. Code-zu-Schema-Drift-Tabelle

| Code-Annahme (W10/W10b) | Echtes Schema | Lambda/Datei betroffen |
|---|---|---|
| `schadensfall_id` Spalte | `auftrag_id` | eintraege-list/create/update/delete/jveg-export, schadensfall-tabs-widget, dashboard-fristen-widget |
| `workspace_members` Tabelle | `workspace_memberships` | alle neuen Migrations W10/W10b RLS |
| `eintraege.beschreibung_text` | `eintraege.titel + eintraege.content` | eintraege-create/update, eintraege.html |
| `eintrag_typ` 8 Werte (`ortstermin`/`telefonat`/...) | ENUM 4 Werte (`diktat`/`text`/`foto`/`mix`) | eintraege-create-Whitelist + eintraege.html Dropdown |
| `eintraege.dauer_min` Spalte | nicht existent | eintraege-jveg-export — neue Spalte oder JSONB |
| `eintraege.abrechenbar` Spalte | nicht existent | eintraege-jveg-export — neue Spalte |
| `eintraege.deleted_at` Spalte | nicht existent | alle eintraege-Lambdas Soft-Delete |
| `eintraege.erstellt_von` | `created_by_user_id` | alle eintraege-Lambdas |
| `service_health` Tabelle | `system_health` | status-check.js |
| `service_health.service` | `system_health.component` (+ `kategorie` ENUM) | status-check.js |
| `service_health.checked_at` | `system_health.sampled_at` | status-check.js |
| TOTP-Migration legt 5 neue Spalten an | nur 3 fehlen (`totp_secret`+`totp_enabled` existieren) | 2026_05_10_w9_2fa_foundation.sql |
| `termine.start, termine.end` | `termine.start_datetime, termine.end_datetime` | generate-ical.js |
| `fristen` Tabelle existiert | nicht existent — muss neu erstellt | alle 5 fristen-*.js |
| `skizzen` Tabelle existiert | nicht existent — muss neu erstellt | alle 3 skizzen-*.js |
| `auftraege.auftraggeber_typ` Migration nötig | bereits vorhanden | auftraege-Migration nicht apply'n |

---

## 4. Migrations-Status

| Migration-Datei | Status | Action |
|---|---|---|
| `2026_05_10_w9_2fa_foundation.sql` | ❌ Fehlerhaft | W12-I4 ersetzt durch nur-3-Spalten-Migration |
| `2026_05_10_w10_eintraege_system.sql` | ❌ Fehlerhaft (Tabelle existiert, anderes Schema) | W12-I1 — Migration LÖSCHEN, Lambdas auf existing Schema |
| `2026_05_10_w10_fristen_system.sql` | ✅ Schema neu | W12-I3 — FK-Korrektur (auftraege/workspace_memberships) |
| `2026_05_10_w10b_skizzen_system.sql` | ✅ Schema neu | W12-I2 — FK-Korrektur (auftraege/workspace_memberships) |
| `2026_05_10_w10b_service_health.sql` | ❌ Doppelte Tabelle | W12-I6 LÖSCHEN — `system_health` nutzen |

**Marcel-Manual:** keine Migration die wir in W10/W10b geschrieben haben wurde gegen Production angewendet (alle nur Files in /supabase/migrations/). Reconciliation = File-Edits + neue Migrations für skizzen/fristen mit korrekten FKs.

---

## 5. Welle-12-Plan (Reconciliation-Reihenfolge)

1. **W12-I1** Eintraege-Lambdas + Frontend auf existing Schema (KEINE neue Migration; ggf. ALTER TABLE für `details JSONB`-Spalte falls JVEG-Daten nötig)
2. **W12-I2** Skizzen — neue Migration mit `auftrag_id` + `workspace_memberships`-RLS
3. **W12-I3** Fristen — neue Migration mit `auftrag_id` + `workspace_memberships`-RLS
4. **W12-I4** 2FA — Migration auf 3 fehlende Spalten reduzieren
5. **W12-I5** auftraege-extend — KEIN apply nötig (Spalten existieren)
6. **W12-I6** Status-Page auf `system_health` umschreiben + alte Migration löschen
7. **W12-I7** Global Lambda-Audit (generate-ical: `start_datetime` statt `start`, etc.)
8. **W12-I8** Frontend-Audit
9. **W12-FINAL** Doku + Welle-11-Recommendation

---

*MEGA³²-W12-I0 Schema-Audit — Co-Authored-By Claude Opus 4.7*
