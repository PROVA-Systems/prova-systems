# MEGA⁶² Phase 0 — FUNDAMENT (Backend für Asset-Fusion-Pipeline)

**Datum:** 2026-05-12
**Sprint:** MEGA⁶² Phase 0 — DB-Migrations + Edge-Function-Skelette + Platform-Library
**Status:** ✅ COMPLETE
**Vorgänger:** MEGA⁵⁷ (Loading-Order Final Fix)
**Nachfolger:** MEGA⁶³ (Asset-Sub-Functions Full-Impl + Embedding-Pipeline)

---

## TL;DR

Backend-Fundament für das Session-4-NinjaAI-Konzept "HERZSTÜCK Asset-Fusion" steht.
Ebene 2 (befund_fragmente) ist live in Supabase. 4 Edge Functions sind ACTIVE,
zwei davon als Skelett mit `501 NOT_IMPLEMENTED_MEGA63`-Stubs, zwei FULL.

```
EBENE 1: Assets (Diktate · Fotos · Skizzen · Notizen)
       ↓ asset-to-fragments-v1 (Skelett)
EBENE 2: befund_fragmente  ← NEU IN MEGA⁶²
       ↓ fragments-to-befund-v1 (Skelett) + SV-Kuratierung
EBENE 3: Befund-Entwurf (Markdown mit Marker [🔗fragment-uuid])
       ↓ SV-Redaktion + KI-Assistenz (kommt in MEGA⁶³–⁶⁴)
EBENE 4: Gutachten (SV-eigenverantwortlich)
```

§407a-Schutz: `ki_protokoll.wirkung` dokumentiert pro KI-Call ob SV den Vorschlag
übernommen, verworfen oder bearbeitet hat (LG Darmstadt 10.11.2025).

---

## Was wurde geliefert (12 Items)

### Datenbank — 7 Migrations (alle applied + lokale Files synchron)

| # | Migration | Datei | Zweck |
|---|---|---|---|
| 0.1+0.2 | `mega62_befund_fragmente` | `supabase-migrations/41_*.sql` | HERZSTÜCK-Tabelle + RLS-Policies (`get_user_workspaces()` + `is_founder()`-Pattern) + 7 Indizes + Trigger `set_updated_at()` |
| 0.3 | `mega62_ki_protokoll_wirkung` | `42_*.sql` | ENUM `ki_wirkung` + 3 Spalten + Trigger `update_ki_wirkung_timestamp` |
| 0.4 | `mega62_anhaenge_thema7` | `43_*.sql` | Erweiterung statt Duplikat — `absender`, `empfangsdatum`, `aktenzeichen_extern` + 2 Indizes |
| 0.5 | `mega62_shares` | `44_*.sql` | Versand-Stufe-2 Tabelle (Token + bcrypt-Hash + max_zugriffe) + 4 Indizes + RLS |
| 0.6 | `mega62_hnsw_index` | `45_*.sql` | HNSW-Index für `befund_fragmente.embedding` (m=16, ef=64) |
| 0.12 | `mega62_audit_trail_kategorie` | `46_*.sql` | Notion-Pattern: `kategorie`-TEXT-CHECK + heuristische Migration der vorhandenen Rows |
| Fix | `mega62_fix_wirkung_search_path` | `47_*.sql` | Advisor-WARN behoben: `SET search_path = public, pg_temp` |

Plus **RPC `find_similar_fragments`** (SECURITY INVOKER → RLS gilt) als Helper für similarity-v1.

### Edge Functions — 4 deployed in Frankfurt EU (Project `cngteblrbpwsyypexjrv`)

| # | Function | Version | Status | Inhalt |
|---|---|---|---|---|
| 0.7 | `asset-to-fragments-v1` | v1 | ACTIVE (Skelett) | Router 4 asset_typ. Stubs werfen `NOT_IMPLEMENTED_MEGA63_*` → Status 501 |
| 0.8 | `fragments-to-befund-v1` | v1 | ACTIVE (Skelett) | Liest Fragmente, baut Markdown-Liste mit Inline-Markern. Keine KI-Strukturierung |
| 0.9 | `audit-narrative-v1` | v1 | ACTIVE (FULL) | 17 deterministische Templates (auth/create/update/delete/ki_*/pdf_*/export/dsgvo/workspace_*) |
| 0.10 | `similarity-v1` | v1 | ACTIVE (FULL) | pgvector-Wrapper via RPC. Scope: `auftrag` | `workspace`, limit 1..100 |

Smoke-Test ohne Bearer-Token: alle 4 liefern korrekt **401 UNAUTHORIZED** (verify_jwt aktiv).

### Frontend — 1 Library + 1 Test-Page

| Datei | Zweck |
|---|---|
| `lib/prova-platform.js` | ⌘/Ctrl/⌥/Alt-Awareness via `ProvaPlatform.keys.mod`, `.fmt()`, `.kbd()` mit aria-label. `isModPressed(event)` für Listener |
| `tools/test-mega62.html` | Smoke-Test-Page: 5 asset-typ-Tests, 2 frag-Tests, 3 audit-Tests, 2 sim-Tests, Platform-Live-Anzeige |

### Service-Worker

`sw.js` CACHE_VERSION: `prova-v3030-mega57-loading-order-fix` → **`prova-v3040-mega62-phase0-fundament`**

---

## Self-Scoping-Entscheidungen (mit Marcel-OK)

### A) Item 0.4 NICHT als neue Tabelle `externe_dokumente`

`anhaenge` deckt die Use-Cases zu 90% ab:
- `anhang_typ`-Enum enthält bereits `klageschrift`, `klageerwiderung`, `beweisbeschluss`, `fremd_gutachten`, `korrespondenz_*`, `vertrag`, `rechnung_extern`, `protokoll`
- `anhang_herkunft`-Enum: `manuell_upload`, `email_eingang`, `bea_eingang`, `scan`, `api`, `import`
- OCR-Pipeline: `ocr_text`, `ocr_completed_at`, `ocr_confidence` ✓
- KI-Pipeline: `extracted_data` (JSONB), `extraction_at`, `extraction_modell` ✓

Nur 3 Felder fehlten: `absender`, `empfangsdatum`, `aktenzeichen_extern`. Diese sind als
`ALTER TABLE`-Migration eingespielt. **Single Source of Truth** statt zwei parallelen Tabellen.

### B) Item 0.1 — `befund_fragmente` parallel zu Legacy-Tabelle `befunde`

`befunde` hat 0 Rows, kein `workspace_id`, kein RLS-Pattern → Legacy. `befund_fragmente` ist
die neue Asset-Fusion-Pipeline-Output-Tabelle. Beide bleiben bestehen, Abgrenzung im
`COMMENT ON TABLE`-Block dokumentiert (Marcel-Direktive).

### C) Item 0.6 — HNSW für `befund_fragmente`, Legacy-IVFFlat-Tabellen unangetastet

Siehe ausführliche Section **„Vector-Index-Strategie nach MEGA⁶²"** weiter unten.

| Tabelle | Index-Typ | Status |
|---|---|---|
| `befund_fragmente` | HNSW (m=16, ef=64) | **NEU MEGA⁶²** — Default ab jetzt |
| `wissen_diagnostik` | IVFFlat (lists=100) | Legacy aus MEGA³⁹ P3 |
| `ki_lernpool` | IVFFlat (lists=100) | Legacy |
| `normen_bibliothek` | IVFFlat (lists=100) | Legacy |

### D) Item 0.2 RLS-Pattern — `get_user_workspaces()` + `is_founder()`

Bestehendes Helper-Pattern aus `anhaenge`/`dokumente` übernommen statt eigenes
`workspace_memberships`-Subselect. Konsistenter Code, weniger Surprise-Faktor für zukünftige Audits.

### E) Item 0.12 — `kategorie` als TEXT mit CHECK statt eigener ENUM-Typ

Flexibler bei späteren Erweiterungen ohne `ALTER TYPE`-Migrationen. Heuristische
Backfill-Logik über existierende `action`-Enum (5 Templates). Beide bleiben parallel
(`action` granular, `kategorie` für UI-Filter im Historie-Tab).

---

## Vector-Index-Strategie nach MEGA⁶²

### Aktueller Stand (verifiziert via `pg_indexes`, 2026-05-12)

| Tabelle | Index | Parameter | Rows aktuell | Status |
|---|---|---|---|---|
| `befund_fragmente` | `idx_befund_fragmente_embedding_hnsw` | HNSW (m=16, ef_construction=64) | 0 | **NEU MEGA⁶²** |
| `wissen_diagnostik` | `idx_wissen_embedding` | IVFFlat (lists=100) | 0 | Legacy MEGA³⁹ P3 |
| `ki_lernpool` | `idx_lernpool_embedding` | IVFFlat (lists=100) | 0 | Legacy |
| `normen_bibliothek` | `idx_normen_embedding` | IVFFlat (lists=100) | 0 | Legacy |

### Begründung HNSW-Default ab MEGA⁶²

1. **Skalierung** — Prognose: 100 SVs × 5 Aufträge/Monat × 50–300 Fragmente = **100k+ Rows/Monat**, nach 12 Monaten **1,2+ Mio Rows**. HNSW skaliert besser bei dieser Größe.
2. **Update-Performance** — Asset-Upload → Fragment-Extraktion → INSERT ist Insert-Heavy. IVFFlat braucht periodisches Re-Indexing bei vielen Inserts (lists werden unbalanciert). HNSW handhabt Inserts/Updates/Deletes deutlich besser ohne Re-Build.
3. **Recall** — HNSW liefert konsistent >95% Recall auch bei Millionen Rows. IVFFlat fällt bei steigender Größe ab wenn `lists`-Parameter nicht angepasst wird.
4. **Ninja Session 4 Thema 3** — HNSW (m=16, ef_construction=64) explizit als Standard ab MEGA⁶² empfohlen.
5. **`vector_cosine_ops`** — Cosine-Similarity, Standard für embedding-search.

### Parameter-Trade-Offs (für spätere Tuning-Sprints)

- `m=16` Default — ausgewogenes Recall/Speed. Alternative bei Memory-Issues: `m=8` (kleinerer Index). Bei Recall-Bedarf: `m=32` (mehr Memory).
- `ef_construction=64` — Build-Zeit vs. Index-Qualität. Default solide.

### Migrations-Pfad Legacy-Tabellen → HNSW (geplant MEGA⁷⁵, Q3 2026)

Pro Tabelle:
- **IF** Row-Count > 50.000 **OR** `slow_query_log` zeigt Hits → DROP IVFFlat-Index, CREATE HNSW-Index mit gleichen Parametern wie `befund_fragmente`.
- **IF NICHT** → IVFFlat bleibt (kein „fix-was-funktioniert"-Prinzip).

### Lessons Learned

- **HNSW als Default für ALLE neuen pgvector-Tabellen ab MEGA⁶².**
- IVFFlat nur noch wenn: <10k Rows **UND** Read-Only-Workload **UND** Memory-kritisch.
- Bei Konflikt: Marcel-Direktive „DU FRAGST bevor existing changes" verhindert Scope-Creep durch sofortige Migration aller Legacy-Indizes.

---

## Pilot-relevante Risiken (aus Ninja TEIL-E im Hinterkopf)

| # | Risiko | Status in MEGA⁶² |
|---|---|---|
| 4 | Edge-Function-Timeout bei 200 Fotos × Vision-Call (~7 Min, Limit 150s) | DEFER MEGA⁶³ — Parallelisierung (10 gleichzeitig) wird beim Bau der Sub-Functions designed |
| 9 | pgvector bei 50k+ Fragmenten | HNSW-Index ist da ✓ |
| 10 | PDF-Export-Timeouts | DEFER — Async-Pipeline kommt in eigenem Sprint (Background-Job-Queue) |

---

## Marcel-Test (~5 Min)

```
1. F12 → Application → Service Workers → Unregister
2. F12 → Application → Storage → Clear site data
3. Reload — sw.js sollte v3040-mega62 zeigen
4. https://app.prova-systems.de/tools/test-mega62.html
5. Login (falls noch nicht angemeldet)
6. ProvaPlatform-Tabelle: prüfe keys.mod = "Ctrl" auf Windows, "⌘" auf Mac
7. Buttons 0.7 — alle 4 valid asset_typ liefern 501 NOT_IMPLEMENTED_MEGA63_*
8. Button asset-unknown liefert 400 UNKNOWN_ASSET_TYPE
9. Buttons 0.8 — frag-empty=400 BAD_REQUEST, frag-nofound=404 NO_FRAGMENTS_FOUND
10. Buttons 0.9 — audit-recent + audit-inline liefern deutsche Narrative
11. Buttons 0.10 — sim-dummy=200 mit count=0 (Tabelle leer), sim-bad-scope=400
```

Erfolgs-Marker: alle 4 Edge Functions antworten in <2s, keine 500er, alle CORS-Header da.

---

## Bekannte Lücken / TODOs für MEGA⁶³+

| Item | Sprint | Begründung |
|---|---|---|
| `asset-to-fragments-v1` Sub-Functions (Audio/Photo/Sketch/Note) | MEGA⁶³ | Volle Extraktion mit KI-Modellen (Frankfurt EU) + Embedding-Pipeline |
| `fragments-to-befund-v1` KI-Strukturierung | MEGA⁶³ | Bisher pure Listung — Markdown-Bühne mit Inline-Markern kommt mit Editor |
| Fragment-Bühne-UI + Marker-System im Editor | MEGA⁶⁴ | Nach Ninja Session 5 |
| Externe Dokumente Vollausbau (Beweisbeschluss-Parser etc.) | Q3 2026 / MEGA⁷⁵ | `anhaenge` ist Schema-bereit |
| `shares` Aktivierung (Versand-Stufe 2) | Q2/Q3 2026 | Schema steht, Frontend + Edge-Function kommen separat |
| IVFFlat → HNSW Migration für `wissen_diagnostik`, `ki_lernpool`, `normen_bibliothek` | MEGA⁷⁵ (Q3 2026) | Pro Tabelle: ab >50k Rows oder bei Slow-Query-Hits. Pattern wie `befund_fragmente`. |
| Workspace_id-Eintrag in `audit_trail` mit `entity_typ='auftrag'` Test | MEGA⁶³ | Heuristische Migration könnte JSONB-Pfad `payload->>auftrag_id` verfehlen |
| `find_similar_fragments` Performance bei 100k+ Rows | Monitor | HNSW-Index sollte reichen |

---

## Sicherheit + Compliance

- **RLS auf allen neuen Tabellen aktiv** (`befund_fragmente`, `shares`) — `get_user_workspaces()`-Pattern
- **Multi-Tenancy via workspace_id** — keine eigene Filterung im Code, RLS handelt es
- **§407a-Beweiskette** in `befund_fragmente.quelle_*`-Spalten + `ki_protokoll.wirkung`
- **EU AI Act Art. 50** in `audit_trail.eu_ai_act_disclosed` + `befund_fragmente.ki_generiert`
- **DSGVO Art. 17** Soft-Delete via `deleted_at` auf beiden neuen Tabellen
- **search_path-Pin** auf beiden plpgsql-Functions (Advisor-WARN behoben)
- **CORS** wie bestehende Edge Functions (`Access-Control-Allow-Origin: '*'`, K-1.5 TODO für Origin-Einschränkung)
- **verify_jwt=true** auf allen 4 neuen Edge Functions — alle liefern 401 ohne Bearer

---

## Acceptance

| Kriterium | Status |
|---|---|
| 7 Supabase-Migrations applied | ✅ |
| 4 Edge Functions deployed + ACTIVE | ✅ |
| `lib/prova-platform.js` ausgeliefert + `node --check` grün | ✅ |
| `tools/test-mega62.html` Smoke-Test-Page | ✅ |
| `docs/sprint-status/MEGA62-PHASE-0-FUNDAMENT.md` | ✅ dieses |
| `sw.js` CACHE_VERSION bumpen auf v3040-mega62 | ✅ |
| RLS aktiv + Advisor-WARN behoben | ✅ |
| Marcel-Test offen | ⏳ Klick-Liste oben |

---

## TAG-Empfehlung

`v3040-mega62-phase0-fundament` nach Marcel-OK + Push.

---

## File-Liste (Marcel-Übersicht)

### NEU
```
supabase-migrations/
  41_mega62_befund_fragmente.sql
  42_mega62_ki_protokoll_wirkung.sql
  43_mega62_anhaenge_thema7.sql
  44_mega62_shares.sql
  45_mega62_hnsw_index.sql
  46_mega62_audit_trail_kategorie.sql
  47_mega62_fix_wirkung_search_path.sql

supabase/functions/asset-to-fragments-v1/index.ts
supabase/functions/fragments-to-befund-v1/index.ts
supabase/functions/audit-narrative-v1/index.ts
supabase/functions/similarity-v1/index.ts

lib/prova-platform.js
tools/test-mega62.html
docs/sprint-status/MEGA62-PHASE-0-FUNDAMENT.md  (dieses)
```

### GEÄNDERT
```
sw.js                    CACHE_VERSION: v3030-mega57 → v3040-mega62-phase0-fundament
```

### IN SUPABASE (nicht im Repo — über MCP applied)
```
RPC public.find_similar_fragments(uuid, text, int) — via mega62_similarity_rpc-Migration
Edge Functions v1: asset-to-fragments-v1, fragments-to-befund-v1, audit-narrative-v1, similarity-v1
```

---

*Ende MEGA⁶² Phase 0 — bereit für Marcel-Smoke-Test und MEGA⁶³.*
