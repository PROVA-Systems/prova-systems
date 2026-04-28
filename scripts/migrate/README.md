# PROVA Migrations-Pipeline (K-1.1)

**Sprint:** K-1.1
**Zweck:** Daten aus Airtable Base `appJ7bLlAHZoxENWE` nach Supabase `cngteblrbpwsyypexjrv` übertragen
**Status:** Code-bereit — Live-Run führt Marcel manuell aus

---

## Voraussetzungen

### `.env.local` im Repo-Root mit:

```bash
AIRTABLE_PAT=patABCdef.xxxx           # Airtable Personal Access Token, Scope: data.records:read
SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # SECRET! Bypasst RLS — nur lokale Skripte!
```

**`.env.local` ist gitignored** (`.env.local` in Repo-Root `.gitignore`).

### Tools

- **Node.js ≥ 18** (für native fetch). Im Repo getestet mit Node v24.
- **`@supabase/supabase-js`** ist bereits in `package.json` (aus K-1.0).

---

## Reihenfolge der Skripte (FK-Abhängigkeiten!)

```
1. 01-sachverstaendige.js  →  workspaces + workspace_memberships
2. 02-kontakte.js          →  kontakte                            (braucht workspace_id)
3. 03-schadensfaelle.js    →  auftraege                           (braucht workspaces + kontakte)
4. 04-eintraege.js         →  eintraege                           (braucht auftraege)
5. 05-rechnungen.js        →  dokumente (typ=rechnung*) +
                              dokument_positionen                 (braucht auftraege + kontakte)
6. 06-audit-trail.js       →  audit_trail                         (braucht workspaces)
7. 07-ki-statistik.js      →  ki_protokoll                        (braucht workspaces)
```

**Drift-Notiz gegenüber Mega-Prompt #1:** Wir nutzen die **echten Schema-Namen aus `/supabase-migrations/`**, nicht die im Mega-Prompt #1 genannten:
- `workspace_memberships` (nicht `workspace_users`)
- universale `dokumente`-Tabelle (nicht `rechnungen` + `rechnungs_positionen`)
- `audit_trail` (nicht `audit_log`)
- `ki_protokoll` (nicht `ki_audit`)
- `eintraege` (nicht `diktate` — Audio-Diktate sind in `audio_dateien`)
- `auftraege.az` (nicht `aktenzeichen`)
- `auftrag_typ` ENUM-Werte sind 1:1 ohne Suffix (`schaden`, nicht `schadensgutachten`)

---

## Modi

### Dry-Run (Default — empfohlen vor Live)

```bash
node scripts/migrate/run-all.js              # alle, dry-run
node scripts/migrate/run-all.js --only=01    # nur ein Skript
node scripts/migrate/01-sachverstaendige.js  # einzeln
```

**Was Dry-Run tut:**
- Liest aus Airtable
- Validiert Schema-Konformität (Pflichtfelder, ENUMs, FK-Lookups)
- Schreibt **nicht** in Supabase
- Gibt Counts + Validation-Errors aus
- Schreibt Log nach `scripts/migrate/logs/<datum>-<modul>.log`
- Zeigt Mock-Sample (3 Records als JSON)

### Live (führt Marcel manuell aus)

```bash
node scripts/migrate/run-all.js --live       # alle Skripte live
node scripts/migrate/01-sachverstaendige.js --live
```

**Sicherheits-Check vor Live:**
1. ✅ Dry-Run grün
2. ✅ Supabase-Snapshot via Dashboard erstellt
3. ✅ `.env.local` enthält Service-Role-Key (nicht Anon-Key)
4. ✅ Keine Tippfehler in CLI-Args (`--live` schreibt **wirklich**)

### CLI-Flags (alle Skripte unterstützen sie)

| Flag | Default | Wirkung |
|---|---|---|
| `--dry-run` | true | Nur lesen + validieren, nicht schreiben |
| `--live` | — | Real schreiben (überschreibt --dry-run) |
| `--only=<NN>` | — | Nur ein nummeriertes Skript ausführen (run-all.js) |
| `--skip-validation` | false | Schneller (für Re-Run nach Validation grün) |
| `--limit=N` | — | Nur N Records pro Tabelle (für Test-Run) |
| `--quiet` | false | Weniger Console-Output (Logs bleiben voll) |

---

## Idempotenz

Alle Skripte nutzen **deterministische UUIDv5** aus `airtable-record-id` + Namespace `prova-migrate`:
- Mehrfaches Ausführen erzeugt **dieselben** Supabase-IDs
- `batchUpsert` mit `conflict_column='id'` überspringt Duplikate

→ Re-Run nach Crash ist sicher, schreibt nichts doppelt.

---

## Validation nach Live

```bash
node scripts/migrate/validate.js              # Counts-Vergleich
node scripts/migrate/validate.js --diff-detail # mit Liste fehlender Records
```

Ausgabe:
```
Tabelle              Airtable    Supabase    Diff      Status
─────────────────────────────────────────────────────────────
SACHVERSTAENDIGE     1           1           0         ✅
KONTAKTE             456         456         0         ✅
SCHADENSFAELLE       1240        1240        0         ✅
...
```

---

## Rollback

### Vor Cutover (alte Welt läuft parallel)

```bash
node scripts/migrate/rollback.js workspaces
# oder alle Tabellen:
node scripts/migrate/rollback.js --all
```

`rollback.js` setzt `deleted_at = NOW()` für alle Records mit `_migrated_from='airtable'` (nicht hard delete — DSGVO-Audit bleibt).

### Nach Cutover

Nicht trivial — Snapshot-Restore via Supabase Dashboard. Siehe `docs/MIGRATION-RUNBOOK.md`.

---

## Logs

```
scripts/migrate/logs/
  ├── 2026-04-28-01-sachverstaendige.log
  ├── 2026-04-28-02-kontakte.log
  └── ...
```

Format:
```
[2026-04-28T03:14:22Z] INFO  01-sachverstaendige: lese 1 Record(s) aus SACHVERSTAENDIGE
[2026-04-28T03:14:23Z] INFO  workspace UUID = a1b2c3...
[2026-04-28T03:14:23Z] WARN  Validation: tier 'starter' nicht in ENUM (solo|team) — skipped
[2026-04-28T03:14:24Z] INFO  done — 1 OK, 1 SKIP, 0 ERROR
```

---

## Bekannte Fallstricke

| Fallstrick | Lösung |
|---|---|
| Airtable Linked-Record kann Array oder Single sein | `transformLink()` normalisiert immer auf Array |
| Date-Felder in Airtable sind ISO-Strings | `transformDate()` parsed + setzt `null` bei leer |
| ENUM-Werte case-sensitive | Mapping über `transformEnum(value, enumMap)` |
| Airtable Rich-Text → Postgres TEXT | HTML-Tags raus, Markdown OK |
| JSON-String in Airtable → JSONB | `JSON.parse()` mit try/catch |
| Pagination 100/Page | `airtable-reader.readAllRecords` paginiert automatisch |
| Rate-Limit 5 req/sec | Throttling im Reader, exponential backoff bei 429 |

---

## Roadmap

- **K-1.1.A1-A4:** Lib-Code (airtable-reader, supabase-writer, transform)
- **K-1.1.A5-A11:** Migration-Skripte pro Tabelle
- **K-1.1.A12:** `run-all.js` Orchestrator
- **K-1.1.A13:** `validate.js` Counts-Check
- **K-1.1.A14:** `MIGRATION-RUNBOOK.md` für Marcel

Strategische Doku: `/docs/PROVA-SUPABASE-REFACTOR-MASTER.md`.
