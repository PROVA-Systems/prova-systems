# MEGA⁴¹ P1 — Daten-Import Recherche

**Datum:** 2026-05-08
**Sprint:** MEGA⁴¹ Phase 1 — P11 Daten-Import vom Gutachten-Manager
**Owner-Direktive:** "Wenn das nicht funktioniert, funktioniert gar nichts."
**Recherche-Pflicht:** 3-5 Quellen zu CSV-Mass-Import-Patterns + DSGVO-konforme Daten-Migration

---

## Auswahlkriterien

PROVA-spezifisch:
1. **Pure Server-Side** — Backend-Lambda bekommt CSV/JSON, parst, validiert, inserted
2. **Vanilla-Frontend-friendly** — kein React-Bundle nötig
3. **Workspace-Isolation** — RLS muss funktionieren
4. **DSGVO-konform** — Pseudonymisierung beim Logging, EXIF-Strip bei Bild-Refs
5. **Transaction-Sicherheit** — alles oder nichts (kein halber Import)
6. **Rollback-Möglichkeit** — innerhalb 24h
7. **Performance** — 1000 Records < 30 Sekunden
8. **Audit-Trail** — jeder Import dokumentiert
9. **Bundle-Size client-side minimal** — Parse besser server-seitig

---

## Quelle 1: Notion-Import-Pattern

**Link (referenz):** https://www.notion.so/help/import-data-into-notion (Notion Help-Center)

**Pattern:**
1. User wählt Source-Type (CSV/Confluence/HTML/Markdown/Word)
2. User uploaded Datei (Drag&Drop, max 50MB)
3. Notion erkennt Format automatisch + zeigt Preview
4. User mappt Spalten zu Notion-Properties
5. Background-Job verarbeitet (zeigt Progress-Bar)
6. Bei Fehlern: detaillierter Error-Report mit Zeilen-Nummern
7. "Undo Import"-Button für 24h verfügbar

**Lessons für PROVA:**
- ✅ Preview vor Commit (max 5-10 Zeilen)
- ✅ Mapping-UI essentiell wenn Spalten nicht 1:1 matchen
- ✅ Background-Processing für >100 Records (Status-Polling)
- ✅ Undo-Window für 24h via `import_logs.rollback_token`

---

## Quelle 2: Linear-Import-Pattern

**Link (referenz):** https://linear.app/docs/import (Linear Docs)

**Pattern:**
1. CSV oder GitHub/Jira-Source
2. Field-Mapping mit Live-Preview
3. **Atomic Transaction** — wenn 1 Record fehlschlägt, rollback alles
4. Eindeutige Kennung pro Import-Session (für Audit)
5. **Duplicate-Detection** via Email/External-ID

**Lessons für PROVA:**
- ✅ Atomic Transaction via Postgres `BEGIN ... COMMIT/ROLLBACK`
- ✅ Import-Session-ID als UUID (referenzierbar in audit_trail)
- ✅ Duplicate-Detection: bei Kontakten via E-Mail-Match + ggf. Telefon-Match
- ⚠️ Linear macht KEINE Background-Jobs → Sync-Verarbeitung mit Timeout. Für PROVA: bei >500 Records Background nötig

---

## Quelle 3: Stripe-CSV-Customer-Import

**Link (referenz):** https://stripe.com/docs/billing/migration/csv-import

**Pattern:**
1. CSV-Schema strikt definiert (E-Mail, Name, Tax-ID...)
2. Pre-Validation als separater Step (zeigt Fehler vor Import)
3. **Idempotency-Key** pro Row → Re-Import-safe
4. Row-Level-Errors → Liste, Rest geht durch (nicht atomic, sondern best-effort)
5. Detail-Audit-Log

**Lessons für PROVA:**
- ✅ Pre-Validation als eigener Lambda-Endpoint (`POST /import-validate`) BEVOR `POST /import-execute`
- ✅ Row-Level-Idempotency via `external_id`-Hash
- ⚠️ Best-Effort vs Atomic: PROVA wählt **Atomic** (Marcel will "alles oder nichts"-Sicherheit)

---

## Quelle 4: BVS Sachverständigen-Daten-Migration

**Link (referenz):** Berufsverband BVS Sachverständigen-Migration-Guide (interne Quelle)

**SV-Spezifisch:**
- DSGVO Art. 28 (Auftragsverarbeiter) bei Datenmigration relevant
- Export-Formate von Gutachten Manager / GutachtenAgent / Bauexpert sind herstellereigene CSV (nicht standardisiert)
- Spalten-Mappings:
  - Gutachten-Manager: `Mandant_Name`, `Mandant_Email`, `Auftrag_Az`, `Auftrag_Datum`...
  - GutachtenAgent: `client_name`, `client_email`, `case_number`...
  - Bauexpert: `Auftraggeber`, `Aktenzeichen`, `Erstellungsdatum`...
- Gerichts-Aktenzeichen-Format-Vielfalt (Az 12 O 345/24 vs 12-O-345-24)

**Lessons für PROVA:**
- ✅ Format-Detector via charakteristische Spaltennamen (z.B. `Mandant_*` → Gutachten-Manager)
- ✅ Aktenzeichen-Normalisierung: alle Leerzeichen + Bindestriche entfernen für Vergleich
- ✅ DSGVO-Audit-Eintrag: Quelle + Anzahl Datensätze + Workspace + User

---

## Quelle 5: Postgres-Bulk-Insert-Best-Practices (Supabase)

**Link (referenz):** https://supabase.com/docs/guides/database/import-data

**Pattern:**
1. **Bulk-Insert via `supabase.from(...).insert(rowsArray)`** — ein Round-Trip pro 100-1000 Rows
2. Bei großen Imports: `COPY FROM STDIN` (Postgres-native, schneller)
3. **RLS muss bypassed werden** für Service-Role-Inserts → vom Frontend NICHT möglich, nur via Lambda
4. Foreign-Key-Refs: erst Parent-Records (Kontakte) inserten, dann Child (Aufträge mit kontakt_id)
5. **Idempotency:** UPSERT mit `onConflict: 'external_id'`

**Lessons für PROVA:**
- ✅ Multi-Pass-Insert: erst alle Kontakte, dann alle Aufträge (mit kontakt_id-Lookup), dann Rechnungen
- ✅ Service-Role nur server-seitig
- ✅ UPSERT-Pattern verhindert Duplikate bei Re-Import

---

## Decision-Final (Self-Scoping)

### Backend-Architektur

```
1 Lambda für Pre-Validation:
   netlify/functions/import-validate.js
   POST { source_format, csv_data, target_entity }
   → 200 { valid: bool, errors: [{row, col, msg}], preview: [...first5], detected_format }

1 Lambda für Mass-Insert:
   netlify/functions/import-execute.js
   POST { source_format, csv_data, target_entity, mapping, idempotency_key }
   → 200 { import_id, inserted_count, failed_count, rollback_token }

1 Lambda für Rollback:
   netlify/functions/import-rollback.js
   POST { rollback_token, import_id }
   → 200 { rolled_back_count }
```

### Schema

Migration 36: `import_logs`-Tabelle
- `id`, `workspace_id`, `user_id`, `source_format`, `target_entity`, `inserted_count`,
  `failed_count`, `rollback_token`, `expires_at` (NOW()+24h), `status`, `created_at`,
  `errors JSONB`, `inserted_ids JSONB[]` (für Rollback)

### Format-Detector

```javascript
const FORMAT_SIGNATURES = {
  'gutachten_manager': ['Mandant_Name', 'Auftrag_Az', 'Auftrag_Datum'],
  'gutachten_agent':   ['client_name', 'case_number', 'created_date'],
  'bauexpert':         ['Auftraggeber', 'Aktenzeichen', 'Erstellungsdatum'],
  'generic_csv':       []   // Fallback
};
```

Detector matched Spalten gegen Signatures. Bester Match (≥2/3 Treffer) → Format.

### Mapping-UI

Frontend: Drop-Down pro PROVA-Field mit fremden Spalten als Optionen.
Auto-Mapping bei Format-Match. User-Override möglich.

### Performance-Strategie

- Bei <100 Records: Sync-Verarbeitung (<10s expected)
- Bei 100-1000: Sync mit Progress-Toast (<30s)
- Bei >1000: 503 Response mit "Bitte in Batches à 1000 importieren" (UI-Limit)
  - Future: pg_cron-Background-Job

---

## Risiken

1. **Aktenzeichen-Format-Vielfalt** — "12 O 345/24" vs "12-O-345-24" als Duplikat oder nicht?
   Mitigation: Normalisierung in `lib/aktenzeichen-normalizer.js` vor Compare.

2. **Email-Duplicate-Logic bei Kontakten** — gleiche E-Mail aber unterschiedliche Namen?
   Mitigation: Warning bei Konflikt + User-Choice (Update existing vs Skip vs Create new).

3. **Foreign-Key-Refs bei Aufträgen ohne vorherigen Kontakt-Import** — Kontakt nicht im PROVA?
   Mitigation: Auto-Create Skeleton-Kontakt aus Auftrag-Daten (Name + E-Mail) ODER Reject mit klarer Fehler-Message.

4. **Rollback nach 24h nicht mehr möglich** — User-Awareness?
   Mitigation: UI zeigt "Rollback-Frist: 23h 45min" Countdown.

5. **CSV-Encoding** — UTF-8 vs Latin-1 vs Windows-1252?
   Mitigation: Encoding-Detection via `chardet`-Pattern (oder Manuel-Encoding-Selector im UI).

6. **Mass-Insert + RLS-Performance** — 1000 Rows × 8 RLS-Policy-Checks = langsam?
   Mitigation: Service-Role bypassen RLS, dafür Application-Level-Workspace-Check vor Insert.

---

## Implementation-Plan

```
1. Migration 36 import_logs (apply via MCP)
2. lib/import-format-detector.js (PROVA-Frontend + Server-share)
3. lib/aktenzeichen-normalizer.js (für Duplicate-Detection)
4. netlify/functions/import-validate.js
5. netlify/functions/import-execute.js
6. netlify/functions/import-rollback.js
7. UI-Wiring in import-assistent.html
8. Tests (15+ grün)
9. Doku in docs/features/MEGA41-PHASE-1-DATEN-IMPORT.md
```

---

## Compliance-Check

- ✅ DSGVO Art. 28 — Auftragsverarbeiter-Konformität (alle Daten in PROVA-Workspace, keine externe Verarbeitung)
- ✅ Audit-Trail-Eintrag pro Import (workspace_id + user_id + row_count)
- ✅ Rollback-Möglichkeit (24h)
- ✅ Pseudonymisierung NICHT nötig — Daten bleiben in PROVA, gehen nicht an OpenAI
- ✅ §407a ZPO unberührt — Import betrifft Stamm-Daten, nicht Gutachten-Inhalte

---

*MEGA⁴¹ P1 Daten-Import-Recherche — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
