# PROVA Migration-Runbook (K-1.1)

**Sprint:** K-1.1
**Owner:** Marcel (führt Live-Run manuell aus)
**Stand:** 28.04.2026

---

## TLDR

```bash
# 1. Pre-Check
node scripts/migrate/run-all.js              # Dry-Run

# 2. Wenn alles ✅:
node scripts/migrate/run-all.js --live       # Live (writes!)

# 3. Validation:
node scripts/migrate/validate.js
```

---

## Pre-Migration-Checklist

### `.env.local` im Repo-Root

```bash
# Airtable (READ)
AIRTABLE_PAT=patABC...                              # Scope: data.records:read

# Supabase (WRITE — RLS-Bypass!)
SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # SECRET!
```

**`.env.local` ist gitignored** (siehe `/.gitignore` Z.9).

### Voraussetzungen

- [ ] Node.js ≥ 18 installiert (`node --version`)
- [ ] `npm install` gelaufen (`@supabase/supabase-js` + `dotenv`)
- [ ] Supabase-Snapshot via Dashboard erstellt (für Rollback)
- [ ] Alle SVs aus Airtable bereits in Supabase Auth angelegt
  (`marcel.schreiber@prova-systems.de` ist via K-1.0 Founder-Setup angelegt)
- [ ] Supabase-Schema steht (alle 6 SQLs aus `/supabase-migrations/` ausgeführt)

### Schema-Drift-Wissen

Mega-Prompt #1 erwähnt einige Tabellen-Namen, die so nicht im Schema existieren.
Die Migration-Skripte nutzen die **echten** Schema-Namen aus `/supabase-migrations/`:

| Mega-Prompt-Erwartung | Schema-Realität |
|---|---|
| `workspace_users` | `workspace_memberships` |
| `rechnungen` + `rechnungs_positionen` | `dokumente` (typ=rechnung*) + `dokument_positionen` |
| `audit_log` | `audit_trail` |
| `ki_audit` | `ki_protokoll` |
| `diktate` | `eintraege` (+ `audio_dateien` separat in K-1.5) |
| `auftraege.aktenzeichen` | `auftraege.az` |
| `auftrag_typ='schadensgutachten'` | `auftrag_typ='schaden'` (1:1 ohne Suffix) |

→ Wenn `validate.js` Counts-Mismatch zeigt: erst prüfen ob nicht eine Schema-Tabelle leer war.

---

## Dry-Run-Ablauf

**Default-Modus, kein Risiko:**

```bash
# Alle 7 Skripte sequenziell:
node scripts/migrate/run-all.js

# Einzelnes Skript:
node scripts/migrate/01-sachverstaendige.js
node scripts/migrate/02-kontakte.js
# ...

# Nur ein Subset:
node scripts/migrate/run-all.js --only=01,02
node scripts/migrate/run-all.js --only=06         # nur audit_trail

# Mit Limit (für schnellen Test):
node scripts/migrate/run-all.js --limit=5
```

### Dry-Run-Output

Pro Skript:
- Anzahl gelesen aus Airtable
- Pro-Record-Validation (skip + reason / error / ok)
- 3 Sample-Records als JSON
- Total-Counts: OK / SKIP / ERROR
- Logs in `scripts/migrate/logs/<datum>-<skript>.log`

### Was bei Dry-Run-Output beachten

- **`reason: workspace_not_found`** → SV-User fehlt in Supabase Auth.
  Marcel: erst SV anlegen via Supabase-Dashboard → Authentication → Add User.
  Dann re-run.
- **`reason: validation`** → Pflichtfeld leer in Airtable. Im Log-File mit Liste der Errors.
- **`reason: no_auftrag_link`** (bei eintraege) → Eintrag hat keinen Auftrag-Link in Airtable.

Wenn alle Counts OK > 0 und kaum SKIPs/ERRORs: Live-Run kann gestartet werden.

---

## Live-Migration-Ablauf

⚠️ **Live writes — vor Run Snapshot via Supabase-Dashboard!**

### Reihenfolge ist Pflicht (FK-Abhängigkeiten)

```
1. workspaces        — alle anderen brauchen workspace_id
2. kontakte          — eigenständig
3. auftraege         — braucht workspaces, kontakte
4. eintraege         — braucht auftraege
5. dokumente         — braucht auftraege, kontakte
6. audit_trail       — braucht workspaces (alle anderen)
7. ki_protokoll      — braucht workspaces
```

`run-all.js --live` macht das automatisch in dieser Reihenfolge.

### Live-Run

```bash
# Alle:
node scripts/migrate/run-all.js --live

# Stoppt bei erstem Fehler (vermeidet halbmigrierten Zustand).
# Bei Fehler: Skript mit --only=XX neu laufen lassen nach Fix.
```

### Sicherheits-Hinweise Live

- Einmal `--live` getippt → schreibt in Production-DB. Tippfehler vermeiden.
- Idempotent: bei Re-Run werden Records via deterministischem UUIDv5 erkannt
  und upserted (kein Duplikat).
- Bei Crash mid-Migration: einfach `node run-all.js --live --only=XX` für die
  ausstehende Tabelle neu starten. Vorherige Tabellen werden nicht angefasst.

---

## Validation

```bash
node scripts/migrate/validate.js                # Standard
node scripts/migrate/validate.js --diff-detail  # mit fehlenden Airtable-IDs
```

### Erfolgs-Kriterium

```
Tabelle              Airtable    Supabase    Diff    Status
───────────────────────────────────────────────────────────
SACHVERSTAENDIGE     1           1           0       ✅
KONTAKTE             456         456         0       ✅
SCHADENSFAELLE       1240        1240        0       ✅
EINTRAEGE            3450        3450        0       ✅
RECHNUNGEN           890         890         0       ✅
AUDIT_TRAIL          15234       15234       0       ✅
KI_STATISTIK         234         234         0       ✅

Gesamt: 7/7 grün, 0 Warnung(en), 0 Fehler
```

### Bei Mismatch

- **Diff > 0 (Supabase mehr als Airtable):** Test-Daten in Supabase die nicht
  in Airtable sind. Manuell prüfen.
- **Diff < 0 (Supabase weniger):** echte Migration-Lücke. `--diff-detail` zeigt
  fehlende Airtable-IDs. Mögliche Gründe:
  - SV-User fehlt in Supabase Auth (`reason: workspace_not_found` im Log)
  - Validation-Fehler (`reason: validation` im Log)
  - Airtable-Record hat kein FK-Link zum Parent (z.B. eintrag ohne auftrag)

---

## Rollback-Strategie

### Vor Cutover (alte Welt läuft parallel)

```bash
# Soft-Delete via deleted_at (DSGVO-Audit bleibt):
node scripts/migrate/rollback.js workspaces       # noch nicht gebaut — siehe TODO
node scripts/migrate/rollback.js --all
```

**TODO:** `rollback.js` ist in K-1.1 nicht im Mega-Prompt-Scope. Bei Bedarf:
- Snapshot via Supabase-Dashboard zurückspielen
- ODER: SQL via Dashboard:
  ```sql
  UPDATE workspaces SET deleted_at = NOW() WHERE created_at >= '2026-04-28';
  ```

### Nach Cutover

Snapshot-Restore via Supabase-Dashboard (Backups → Restore).
Nach K-1.5 Cutover: 4-Wochen-Window in dem Restore möglich ist.

---

## Bekannte Fallstricke

### 1. Airtable Linked-Record kann Array oder Single sein
Schema-konform: in `transform.js` werden alle Linked-Records auf Array normalisiert,
dann erste UUID genommen.

### 2. Date-Formate
Airtable: ISO-String oder Date-Object.
Postgres `timestamptz`: ISO-String mit Timezone.
`transformDate()` parsed mit `Date()`-Constructor + `null`-Fallback bei leer.

### 3. ENUM-Werte case-sensitive
Postgres-ENUMs sind exakt. Mapping über `transformEnum(value, enumMap, fallback)`
mit Lower-Case-Fallback.

### 4. Airtable Rich-Text → Postgres TEXT
`stripHtml()` entfernt HTML-Tags, behält Zeilen-Umbrüche.

### 5. JSON-String in Airtable → Postgres JSONB
`parseJsonString()` mit try/catch, Fallback `null`.

### 6. Pagination 100/Page
`airtable-reader.readAllRecords()` paginiert automatisch via offset.

### 7. Rate-Limit 5 req/sec
Throttling im Reader (~4.5 req/sec mit Buffer), exponential backoff bei 429.

### 8. UUID-Bewertung
Manche Airtable-Felder enthalten Airtable-rec-IDs (`recABCdef...`). Wenn diese
in Spalten landen die Postgres als UUID erwartet, fehlt's beim Insert.
Lösung: in `audit_trail.entity_id` werden rec-IDs erkannt und in `payload`
verlagert (nicht als entity_id geschrieben).

### 9. Generated Columns
`auftraege.search_vector` (TSVECTOR) und `ki_protokoll.token_total` werden vom
DB berechnet — wir setzen sie NICHT im Skript.

### 10. NOT NULL Spalten ohne Default
`kontakte.name TEXT NOT NULL` — DB-Trigger berechnet das aus anrede+vorname+
nachname oder firma. Wir setzen einen Fallback im Skript für Sicherheit.

---

## TODO (nicht im K-1.1-Scope, später nachholen)

- [ ] `rollback.js` mit `--all` und tabellen-spezifisch
- [ ] Audio-/Foto-Migration aus Cloudinary (kommt in K-1.5 Cleanup)
- [ ] User-Auto-Create-Modus (`--auto-create-user`) für SVs ohne Auth-Account
- [ ] Migration-Job-Tracking in `import_jobs` + `import_records` Tabellen

---

🎯 **Marcel — sicheres Pattern: erst Dry-Run, prüfen, dann Live, dann validieren.**

**Bei jedem Schritt: ein Sample anschauen, nicht blind durchziehen.**
