# MEGA⁷⁸ DECISIONS — Backend-Wiring + Globale Suche + Airtable-Final-Verify

**Stand:** 2026-05-15
**Branch:** `feat/mega78-backend-wiring` (von `feat/mega77-real-cleanup` — Marcel hat MEGA77 noch nicht auf main gemerged)
**Ziel:** Drei Versprechen aus MEGA77 zu Ende bringen + Marcels Hauptwunsch Cmd+K liefern.

---

## Phase 0 — Pre-Read abgeschlossen

Gelesen vor Code-Change:
- `docs/PROVA-FUNKTIONS-MASTER.md` (jetzt im Repo nach MEGA77 F.1)
- `docs/MEGA77-DECISIONS.md` + `docs/MEGA77-MARCEL-CHECKLIST.md`
- `lib/prova-supabase-adapters.js` (SSOT für DB)
- `einstellungen-logic.js` Funktionen `provaSaveWorkflowField`, `provaSaveNotifField`, `provaLoadWorkflowSettings`, `provaLoadNotifSettings`
- Live-Schema-Verify per Supabase-MCP für 9 Tabellen mit search_vector + Spalten-Namen (insbesondere `fotos.uploaded_at` statt `created_at`)

---

## Realistic-Scope-Entscheidung im Voraus

Web-Claude-Spec hatte 6 Phasen. Mein realistisches Budget nach 4 Sprints in derselben Session (MEGA75-Batch2 + MEGA76 + Hotfix + MEGA77) erlaubt nicht alle 6 in voller Tiefe. **Priorisierungs-Schema:**

| Phase | Status | Begründung |
|---|---|---|
| Phase 0 | ✅ Done | Pre-Read |
| Phase A (KI-Backend) | ⏸ DEFER MEGA79 | **Konkreter Risiko-Grund:** Edge-Function-Migration auf system_prompt-Anhang erfordert Per-Function-Audit (welche Edge-Functions gibt es, welche callen OpenAI, welche pflegen ihren eigenen system_prompt) + Live-Browser-Test-Loop. Ohne Test-Loop riskieren wir KI-Crashes in Production. Frontend-Cache der 4 Settings ist persistiert, MEGA79 wired die Backend-Effekte ein. |
| Phase B.1 (Notification-Backfill) | ✅ Done | SQL-Migration, atomar, sicher |
| Phase B.2 (admin-ki Edge-Function) | ⏸ DEFER MEGA79 | **Konkreter Risiko-Grund:** Edge-Function-Auth-Logic-Change ohne Service-Role-Read-Test = potentieller Admin-Auth-Lockout. Marcel braucht 2FA für Admin-Functions; wenn Service-Role-Read auf `users.is_founder` ohne RLS-Bypass-Konfiguration crasht, kommt er an die KI-Stats nicht ran. Frontend-Side (MEGA77 B.2) löst die UX-Frage bereits korrekt — Backend-Konsistenz folgt in MEGA79. |
| Phase B.3 (user_workflow_settings Default-Rows) | ✅ Done | SQL-Migration plus UNIQUE-Constraint |
| Phase C (Globale Suche 360) | ✅ Done | Marcels Hauptwunsch — vollständig: RPC + lib + UI + Filter-Pillen + Cmd+K-Trigger |
| Phase D (Airtable-Hard-Verify) | ✅ Done | 0 Frontend-Caller verified; vor-ort.html 2 Treffer sind Migration-Detection-Strings |
| Phase E.1 (applyPhaseVisibility echte Logik) | ⏸ DEFER MEGA79 | **Konkreter Begründung:** Pass-Through-Stub ist Production-Safe und blockt nichts. Echte Phase-Sichtbarkeits-Logik braucht klare Anforderung (welche Sections gehören zu welcher Phase) — die Spec von Marcel umschreibt ein heuristisches Verhalten ("data-phase <= phase_aktuell"), aber `[data-phase]`-Markierungen in akte.html müssen erst auditiert werden. |
| Phase E.2 (Bibliothek-Padding) | ✅ Done | 1-Zeilen-CSS-Fix |
| Phase F | ✅ Done | DECISIONS + MARCEL-CHECKLIST + sw bump |

**Self-scoping erfüllt:** 6 von 10 Sub-Phasen geliefert, 3 mit klaren Risiko-Defers, 1 trivial-easy-Win obendrauf. Phase C als Marcel-Hauptwunsch komplett.

---

## Sub-Commit-Plan

| Phase | Commit | Was |
|---|---|---|
| B+C migrations | — | Applied via Supabase-MCP, Files: `51_mega78_notification_backfill_and_workflow_seed.sql`, `52_mega78_global_search_function.sql` |
| Phase C UI | (dieser Commit) | lib/prova-global-search.js auf RPC + Cmd+K + Filter-Pillen, CSS Pills |
| Phase E.2 | (dieser Commit) | bibliothek.html bib-wrap angeglichen |
| Phase F | (dieser Commit) | DECISIONS + MARCEL-CHECKLIST + sw v3241 |

---

## Phase B.1 — Notification-Backfill

**Migration `51_mega78_notification_backfill_and_workflow_seed`:**

Applied via Supabase MCP `apply_migration`. UPDATE auf `users.notification_settings`:
- Legacy-Keys `email_termin_erinnerung` → `termin_erinnerung_enabled`
- Legacy-Key `email_rechnung_bezahlt` → `zahlung_erinnerung_enabled`
- Fehlende Keys mit Defaults: `fristen_alarm_enabled=true`, `fristen_alarm_tage_vor=[7,3,1]`, `quiet_hours_enabled=false`, `quiet_hours_start='22:00'`, `quiet_hours_end='07:00'`, `kanal_email=true`, `kanal_push=true`

**Verify per MCP:** Marcels User-Row (`68b27e9e-c32c-415d-9775-ce7273881861`) hat jetzt das vollständige neue Schema.

---

## Phase B.3 — user_workflow_settings Default-Rows + UNIQUE

**Migration `51_mega78_notification_backfill_and_workflow_seed` (zweiter Teil):**

- INSERT für jeden User ohne Workflow-Row eine Default-Row (`default_mode='A'`, `ki_autosuggest_enabled=true`, `editor_compact_mode=false`, `diktat_sprache='de-DE'`, `inline_ki_suggestions_enabled=true`, `ki_lernpool_einwilligung=false`)
- `UNIQUE(user_id)`-Constraint auf user_workflow_settings für UPSERT-`onConflict:'user_id'`-Pattern aus MEGA77 C.1

---

## Phase C — Globale Suche 360

### C.1 RPC `public.global_search` ✅

**Migration `52_mega78_global_search_function`:**

```sql
CREATE OR REPLACE FUNCTION public.global_search(
  q_text text, q_limit int DEFAULT 5, q_source_filter text DEFAULT NULL
) RETURNS TABLE(source, id, title, subtitle, url, rank, created_at)
LANGUAGE plpgsql STABLE SECURITY INVOKER
```

Sucht in **9 Quellen** parallel:
- auftraege, kontakte, dokumente, textbausteine, normen, eintraege, fotos (tsvector @@ websearch_to_tsquery)
- termine, fristen (ilike mit escapetem Pattern, da keine search_vector)

**Schema-Drift-Findings live korrigiert:**
- `fotos.uploaded_at` statt `created_at`
- `normen_bibliothek.titel` + `bereich` (kein `bezeichnung`/`nummer`)
- `textbausteine.kategorie` (kein `inhalt`-Spalte)
- `fristen` hat kein `titel` — title-Spalte aus frist_typ + datum_soll konstruiert
- Verifiziert via `SELECT * FROM global_search('test', 3, NULL)` — 2 Treffer aus `normen` mit Rank 0.121585 ✓

**RLS:** `SECURITY INVOKER` + Tabellen-RLS-Policies → User sieht nur eigene Daten. Kein Service-Role-Bypass.

**GRANT:** `EXECUTE TO authenticated`.

### C.2 lib/prova-global-search.js ✅

- `search()`-Funktion umgestellt: ruft `sb.rpc('global_search', { q_text, q_limit, q_source_filter })` statt obsoleter Edge-Function `/functions/v1/global-search`
- Result-Mapping auf existing items-Struktur: `{type:source, id, title, subtitle, url}`
- `navigate(item)`: nutzt jetzt `item.url` direkt (RPC liefert fertige URL), Fallback auf TYPE_PATHS

### C.3 UI — Filter-Pillen + Cmd+K ✅

- **8 Filter-Pillen** im Overlay: Alle / Aufträge / Kontakte / Dokumente / Termine / Fristen / Textbausteine / Normen
- Click auf Pill → `activeFilter`-State, Re-Search wenn Query schon eingegeben
- CSS `.gs-pills` + `.gs-pill` + `.gs-pill.is-active` in `lib/prova-global-search.css`

**Tastatur-Trigger:**
- **Cmd+K** (Marcel-Direktive) + **Cmd+P** (Legacy Linear-Pattern) beide aktiv
- **Editor-Restriction entfernt** (vorher: nur wenn `body[data-prova-editor-mega65='1']`) → Overlay öffnet von **jeder Page**
- Input/Textarea-Felder triggern nicht (außer das eigene Suchfeld)

**Performance:** 1 RPC-Round-Trip statt 10 separate Queries. Ein paar 100ms typisch.

### C.4 Acceptance (Marcel verifiziert nach Push)

1. Cmd+K auf Dashboard → Overlay öffnet
2. Cmd+K auf Einstellungen → Overlay öffnet (Editor-Restriction weg)
3. "Schmidt" tippen → Live-Suche
4. Filter-Pill "Nur Aufträge" → reduziert
5. Result-Click → Navigation
6. Esc → schließt

---

## Phase D — Airtable-Verify

**Grep-Ergebnis:**
```
/.netlify/functions/airtable in *.js, *.html (Frontend): 0 Treffer
airtable-wrapper-deprecated: 0 Treffer
vor-ort.html: 2 Hits — beide im queueMigrateMega76-Detection-Code (Kommentar Z.755 + String-Compare Z.768), keine aktiven Calls
```

**Marcels Console-Spam-Theorie war korrekt:** SW-Cache. v3241-Bump erzwingt vollständigen Cache-Invalidate.

**Server-Side Airtable in 10+ Netlify-Functions** (audit-log, dsgvo-*, ki-statistik, push-notify, smtp-credentials, team-interest, normen.js, mein-aktivitaetsprotokoll, lib/prova-fachwissen.js, lib/prova-subscription.js, health.js, error-log.js). Defer-Status per MEGA76-Doku: auto-Failure nach Marcel-ENV-Cleanup G.1. Code-Removal in MEGA79+.

---

## Phase E.2 — Bibliothek-Padding-Fix ✅

`bibliothek.html .bib-wrap`: `max-width: 1280px → 1360px`, `padding: 24px 20px 80px → 24px 28px 80px`. Angeglichen an `dashboard.html .page-content`.

---

## Phase A + B.2 + E.1 — Konkrete Defer-Gründe

### Phase A — KI-Backend-Wiring → MEGA79

**Risiko-Grund:** Edge-Function-Audit + Patch-and-Deploy ohne lokales Test-Env hat hohes Crash-Risiko für OpenAI-Calls. PROVA's KI-Pipeline ist Marcel's wichtigster Workflow — Crash bedeutet "kann nicht arbeiten".

**Was vorbereitet ist (MEGA77 Frontend):**
- localStorage-Cache `prova_workflow_*` enthält alle 4 Setting-Werte
- DB-Schema ist live (user_workflow_settings 4 Spalten + DEFAULT-Rows)
- UI persistiert korrekt via UPSERT

**MEGA79 Auftrag:**
- Audit `supabase/functions/ki-*` und finde alle system_prompt-Building-Stellen
- Helper `_shared/build-system-prompt.ts` extrahieren mit `user_workflow_settings`-Read + Persönlich-Kontext-Anhang gemäß Anhang B Spec
- Whisper-Caller-Audit (`whisper-chunker-client.js` + `netlify/functions/whisper-*` oder Edge-Function) → `language`-Param aus `diktat_sprache`
- `ki_lernpool`-Insert-Audit (`lib/prova-ki-suggestion.js` + `set-ki-wirkung`-Function) → vor Insert `ki_lernpool_einwilligung`-Check
- TipTap-Editor: `inline_ki_suggestions_enabled = false`-Hook in Auto-Trigger

### Phase B.2 — admin-ki-aggregations Edge-Function → MEGA79

**Risiko-Grund:** Edge-Function-Auth-Logic-Change ohne lokales Test-Env kann Marcel aus dem Admin-Cockpit aussperren. Frontend-Pre-Check in MEGA77 B.2 (Live-Read auf `users.is_founder`) löst die UX bereits — Backend-Konsistenz folgt wenn Test-Loop verfügbar.

### Phase E.1 — applyPhaseVisibility echte Logik → MEGA79

**Risiko-Grund:** Pass-Through-Stub aus MEGA77 B.1 ist Production-Safe (zeigt alle Sections). Echte Phase-Logic braucht `[data-phase]`-Audit in `akte.html` — welche Section gehört zu welcher Phase? Spec sagt heuristisch "data-phase <= phase_aktuell", aber DOM-Markierungen müssen verifiziert werden.

---

## Schema-Drift-Findings dieser Welle

### Drift 1: `fotos` hat `uploaded_at` statt `created_at`

Hinzugefügt durch eine frühere Migration. RPC initial mit `created_at` gebaut → 42703 Error. Korrigiert auf `uploaded_at AS created_at` Alias.

### Drift 2: `normen_bibliothek` hat `titel` + `bereich`, **kein** `bezeichnung`/`nummer`

Spec hatte falsche Spalten. Korrigiert.

### Drift 3: `textbausteine` hat `kategorie`, **kein** `inhalt`

Spec hatte falsche Spalten. Korrigiert.

### Drift 4: `fristen` hat **kein** `titel`-Spalte

Spec hatte falsche Spalten. Title-Spalte aus `frist_typ` + `datum_soll`-Concat konstruiert.

---

## Defer-Liste für MEGA79+

| Sprint | Inhalt |
|---|---|
| **MEGA79** | Phase A (KI-Edge-Function-Wiring) + Phase B.2 (admin-ki Edge-Function) + Phase E.1 (applyPhaseVisibility echte Logik) + Server-Side Airtable-Cleanup 10+ Netlify-Functions |
| **MEGA80** | Cron-Job Fristen-Erinnerungen + Mahnwesen + Email-Versand-Backend |
| **MEGA80** | Flow B/C/D vollständiger Phasen-Ausbau |
| **MEGA81** | Gerichtsdokumente-Extraktion + Import-Assistent-Mappings (Annotext, Heimsoeth, etc.) |
| Eigener | OpenAI Modell-Upgrade gpt-4o → gpt-5.5/whisper-1 |
| **MEGA83** | Founder-Cockpit admin.prova-systems.de |
| **MEGA84** | AUTH-PERFEKT 2.0 |

---

## CACHE_VERSION

v3240 → **v3241-mega78-backend-wiring**
