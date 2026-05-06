# MEGA³² W12b-I7 — Global Lambda-Audit

**Datum:** 2026-05-11
**Methode:** `grep -rn` Schema-Drift-Patterns gegen Schema-Reference

---

## Drift-Patterns geprüft

| Pattern | Drift-Bedeutung |
|---|---|
| `schadensfall_id` | Spalte existiert nicht — sollte `auftrag_id` sein |
| `workspace_members` | Tabelle heißt `workspace_memberships` |
| `erstellt_von` | sollte `created_by_user_id` sein |
| `aktenzeichen` (in DB-Query) | sollte `az` sein |
| `user_workspaces` / `user_profiles` | Tabellen existieren nicht |
| `geaendert_am` | sollte `updated_at` sein |
| `start` / `end` (Termine) | sollte `datum + uhrzeit_von/uhrzeit_bis` sein |

---

## Ergebnis pro Lambda

### W12b-I1 (eintraege) — RECONCILED ✅
- eintraege-list.js, eintraege-create.js, eintraege-update.js, eintraege-delete.js, eintraege-jveg-export.js
- Alle nutzen `auftrag_id` mit Backwards-Compat-Fallback `body.schadensfall_id`
- `created_by_user_id` (NICHT erstellt_von)

### W12b-I2 (skizzen) — RECONCILED ✅
- skizzen-list.js, skizzen-save.js, skizzen-delete.js
- Schema neu: svg_content (NICHT svg_data), foto_referenz_id (NICHT foto_ref)

### W12b-I3 (fristen) — RECONCILED ✅
- fristen-list.js, fristen-create.js, fristen-update.js, fristen-mark-erfuellt.js, fristen-reminder-cron.js
- Alle auf `auftrag_id` + `created_by_user_id` + `updated_at`
- reminder-cron: Email aus `users` (NICHT user_workspaces/user_profiles)

### W12b-I6 (status-check) — RECONCILED ✅
- status-check.js: `system_health` mit `kategorie`/`component`/`response_time_ms`/`sampled_at`

### W9N-I5 (generate-ical) — RECONCILED ✅ **(W12b-I7-Fix)**
**Drift-Befund:**
- SELECT war `start`, `end`, `ort`, `az`, `sv_email` — alle falsch!
**Korrektur:**
- SELECT auf echtes Schema: `datum`, `uhrzeit_von`, `uhrzeit_bis`, `dauer_minuten`, `ort_*`, `ical_uid`, `auftrag_id`, JOIN `auftraege(az)`
- DTSTART aus `datum + uhrzeit_von` kombiniert
- DTEND via `uhrzeit_bis` ODER `dauer_minuten`-Offset
- LOCATION aus `ort_name + ort_adresse + ort_plz + ort_ort`
- UID aus `ical_uid` (nicht selbst generiert)
- Filter `deleted_at IS NULL` + `status != 'abgesagt'`

### W9N-I4 (global-search) — RECONCILED ✅ **(W12b-I7-Fix)**
**Drift-Befund:**
- SELECT auftraege: `aktenzeichen`, `schadensart`, `schaden_strasse`, `ort` — alle falsch!
**Korrektur:**
- SELECT auf `az`, `schadensart_label`, `schadensart_kategorie`, `kurzbeantwortung`
- OR-Filter auf existing-Spalten

### W10b-I8 (ical-subscribe-url) — OK ✅
- Nutzt nur `context.userEmail` aus JWT — keine DB-Query

### W8-I7 (admin-support-inbox) — OK ✅ (kein Drift in support_tickets)

### Andere W9/W10/W10b-Lambdas mit `aktenzeichen`-Erwähnung
| Lambda | Status |
|---|---|
| admin-time-tracking.js | ✅ akzeptiert `det.aktenzeichen \|\| det.az` (Backwards-Compat) |
| foto-anlage-pdf.js | ✅ API-Body-Field `aktenzeichen` (Frontend-Compat, kein DB-Access) |
| foto-captioning.js | ✅ API-Body-Field (Frontend-Compat) |
| parse-beweisbeschluss.js | ✅ Variable + Doku, kein DB-Access |
| termin-reminder.js | ⚠️ Falls existing — nicht in W12b-Scope (legacy/airtable) |

---

## Gesamt-Drift-Closure

- **5 Lambda-Gruppen vollständig reconciled** (W12b-I1/I2/I3/I6 + 2 fixes in I7)
- **Backwards-Compat bewahrt** (Frontend-API-Felder bleiben, DB-Queries reconciled)
- **Keine Production-RLS-Bypässe**

## Tests pro Lambda-Gruppe

| Test-Suite | Tests | Status |
|---|---|---|
| eintraege/eintraege-w12-schema.test.js | 21 | ✅ |
| skizzen/skizzen-w12-schema.test.js | 20 | ✅ |
| fristen/fristen-w12-schema.test.js | 15 | ✅ |
| auth-2fa/totp-w12-env.test.js | 4 | ✅ |
| status/status-w12-schema.test.js | 11 | ✅ |
| schadensfall-tabs/schadensfall-tabs.test.js | (W11 — nicht in W12b) | — |

**Total W12b: 71 neue Tests grün, 0 Regressions.**

---

*MEGA³² W12b-I7 — Co-Authored-By Claude Opus 4.7*
