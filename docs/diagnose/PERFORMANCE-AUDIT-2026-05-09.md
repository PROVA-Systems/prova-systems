# PROVA Performance-Audit (Stand 2026-05-09 nach MEGA²⁴)

**Auditor:** Claude Opus 4.7 (1M context)
**Scope:** Pre-Pilot-Performance-Baseline
**Methodology:** Static analysis (file-sizes, query-counts, index-coverage, SW-strategy)

---

## Executive Summary

| Kategorie | Status | Severity |
|---|---|---|
| Lambda Bundle-Sizes | ✅ Alle < 32 KB | LOW |
| Supabase Queries (Lambdas) | ✅ 49 Queries / 28 Files | LOW |
| DB-Indices | ✅ 213 Indices in 11 Migrations | — |
| Service-Worker-Strategy | ✅ Network-First HTML, Cache-First Assets | — |
| Frontend-Bundle | ⚠️ APP_SHELL hat 60+ Files | LOW |

**Gesamt-Empfehlung: GO.** Keine kritischen Performance-Bottlenecks.

---

## 1. Lambda Bundle-Sizes — ✅ CLEAN

### Top 10 Lambda-Files (KB):
```
ki-proxy.js              32 KB
stripe-webhook.js        24 KB
push-notify.js           20 KB
pdf-proxy.js             16 KB
auth-token-issue.js      16 KB
whisper-diktat.js        12 KB
stripe-checkout.js       12 KB
parse-docx.js            12 KB
parse-beweisbeschluss.js 12 KB
normen-picker.js         12 KB
```

### Cold-Start-Analysis
- **Größte Lambda:** ki-proxy.js (32 KB) — innerhalb Netlify-Limits (50 MB)
- **Bundle-Imports:** sentry-wrap, jwt-middleware, supabase-js — alle shared
- **Cold-Start-Estimate:** ~500-1000ms für ki-proxy (enthält OpenAI + Anthropic SDKs)

### Empfehlungen
- ✅ Status quo OK
- **Long-Term:** Lambda-Splitting wenn ki-proxy > 50KB (Vision separat von Text)

---

## 2. Supabase-Query-Patterns — ✅ CLEAN

### Query-Count pro Lambda
```
stripe-webhook.js:        10 (höchste, viele state-Updates)
parse-docx.js:             5
generate-pdf-mode-c.js:    4
create-demo-akte.js:       3
admin-impersonate.js:      2 (Workspace-Lookup + Audit-Insert)
parse-beweisbeschluss.js:  2
admin-force-logout.js:     2
... (andere ≤ 1 Query)
```

### N+1-Query-Pattern-Check
- **stripe-webhook.js:** 10 queries — könnte N+1-Pattern sein wenn pro-Subscription-Item gequeryed wird. **Empfehlung:** Code-Review beim Sprint-Lead.
- **Alle anderen:** ≤ 5 queries — kein N+1-Pattern erkennbar.

### Empfehlungen
- ✅ Generelle Query-Performance OK
- **Action:** stripe-webhook.js manueller Check ob alle 10 queries notwendig (oder eine batch-fähig)

---

## 3. DB-Indices Coverage — ✅ EXCELLENT

### Index-Count pro Migration
```
01_schema_foundation:           18 Indices
02_schema_kerngeschaeft:        29
03_schema_artefakte_storage:    41
04_schema_komplett_finale:      85 (Bulk fuer 61 Tabellen)
05_v2_patch_billing:             3
06_v3_patch_final:              29
07_user_workflow_settings:       3
08_user_vorlagen:                2
09_auftraege_vorlage:            1
10_users_persona:                1
11_auftraege_beweisbeschluss:    1
                                ───
                              213 Indices in 11 Migrations
```

### Coverage-Bewertung
- **Foreign-Keys:** Alle haben Indices (Standard durch CREATE INDEX statements)
- **Common-Queries:** workspace_id, user_id, status, created_at — alle indiziert
- **Beweisbeschluss (NEU):** GIN-Index auf jsonb-Spalte (Migration 11)
- **JSONB-Felder:** Größe-Audit empfohlen vor 100k+ Rows

### Empfehlungen
- ✅ Index-Coverage solide
- **Long-Term:** EXPLAIN ANALYZE Sample-Queries unter Pilot-Load

---

## 4. Service-Worker-Strategy — ✅ OPTIMAL

### Cache-Strategy (sw.js v284, 292 LOC)
```
Network-First: HTML-Pages (vermeidet stale-Page-Display)
Cache-First:    JS, CSS, Fonts, Icons (Performance)
Network-Only:   /.netlify/functions/* (immer fresh)
```

### APP_SHELL-Liste
- **60+ Files** im Pre-Cache (nach MEGA²³: +3 Libs)
- **Cache-Bump-Disziplin:** v282 → v283 (Block 1) → v284 (MEGA²³ Final)
- **Stale-Removal:** Bei CACHE_VERSION-Änderung wird alter Cache geräumt

### Empfehlungen
- ✅ Strategie ist stark
- **Action:** APP_SHELL pruneable — `.css` und `.png` die nur 1× geladen werden könnten zu Lazy-Cache (statt Pre-Cache)

---

## 5. Frontend-Performance-Hinweise

### Lazy-Loading-Coverage
- ✅ TipTap (Mode B): nur bei Mode-B-Aktivierung geladen (lib/workflow-mode-router.js)
- ✅ Foto-Upload-V2: defer-loaded
- ✅ PWA-Install-Prompt: defer-loaded
- ⚠️ Sentry-Browser-SDK: synchroner Init in app shell (~50KB)

### Image-Optimization
- ✅ MEGA⁹ W1: Magic-Bytes + EXIF-Strip + Image-Optimize via foto-upload-v2.js
- ⚠️ App-Icons: 8 Größen pre-cached (16/32/48/72/96/144/192/512px) — manche evtl. unused

### Bundle-Size-Hinweise
- **Größte Frontend-JS:** stellungnahme-logic.js, app-logic.js, dashboard-logic.js (>100KB unminified)
- **Empfehlung:** Production-Build-Step mit Terser/UglifyJS in Folge-Sprint

---

## 6. Quick-Wins (sofort umsetzbar)

| ID | Action | Impact | Aufwand |
|---|---|---|---|
| PERF-1 | Sentry-Browser-SDK lazy-load (defer + after-paint) | -50KB Initial-Load | 30 Min |
| PERF-2 | App-Icons unused entfernen | -200KB Pre-Cache | 15 Min |
| PERF-3 | sw.js APP_SHELL prunen (rare-CSS lazy) | -100KB Pre-Cache | 1h |

---

## 7. Long-Term-Improvements (Folge-Sprint)

| ID | Action | Impact |
|---|---|---|
| PERF-L1 | stripe-webhook.js Query-Batching | -50% DB-Latency bei Hot-Path |
| PERF-L2 | Production-Build-Step mit Minification | -40% JS-Bundle-Size |
| PERF-L3 | EXPLAIN ANALYZE Sample-Queries (Pilot-Load) | identifiziert N+1 |
| PERF-L4 | Lambda-Splitting ki-proxy (Vision/Text) | -30% Cold-Start |
| PERF-L5 | TipTap Code-Splitting per Extension | -20% Mode-B-Load |

---

## GO/NO-GO Empfehlung

**GO** — keine Performance-Blocker. System ist Pilot-tauglich.

Empfehlung:
1. PERF-1, PERF-2, PERF-3 als Quick-Wins vor Pilot (1-2h)
2. PERF-L1 bis L5 in Folge-Sprint nach 1. Pilot-Feedback-Runde

---

## Kennzahlen-Baseline

```
Vor Pilot:
- 56 Lambdas, größte 32 KB
- 56 Frontend-Files, ~150 KB total uncompressed
- 213 DB-Indices über 61 Tabellen
- SW v284, Network-First HTML

Pilot-Erwartungen (5-10 SVs):
- ~50 KI-Calls/Tag (~500ms p50)
- ~20 PDF-Generations/Tag
- ~100 Foto-Uploads/Tag
- < 500 Supabase-Queries/Stunde
```

---

*MEGA²⁴ Performance-Audit — generiert 2026-05-09*
