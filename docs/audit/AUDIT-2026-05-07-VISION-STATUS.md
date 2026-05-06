# PROVA Vision-Komplettheits-Audit

**Datum:** 2026-05-07
**Auditor:** Claude Code (Repo-First, kein Memory-Layer)
**Methode:** Vollständiger Repo-Audit gegen Vision-Master + Live-Schema-Verify via Supabase-MCP
**Branch:** `mega33-env-konsolidierung` (kein neuer Branch erstellt — nur Audit-Doku committed)
**Status:** WIP — wird per-Section gepusht

---

## Gesamt-Status

*[wird nach allen 19 Bereichen finalisiert]*

---

## Methodik

- Pro Bereich: konkrete Datei-Pfade, Line-Numbers, Test-Namen
- Bei Unsicherheit: explizit "AUDIT-UNKLAR"
- Quellen: Repo (Wahrheit) > Supabase-MCP (Live-DB-Schema) > Master-Docs (Soll-Stand)
- Keine Memory-Annahmen, keine W11/W12/W13-Marketing-Behauptungen

---

## Bereich 1 — Schema (DB)

**Status:** ✅ KOMPLETT
**Komplettheit:** **~98%**
**Methode:** Supabase-MCP `list_tables` Live-Verify gegen `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md`

**Belege:**
- Live-DB: **66 Tabellen** in `public` Schema (cngteblrbpwsyypexjrv, eu-central-1, alle RLS-aktiv)
- Schema-Reference-Doku: `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md` (Marcel-maintained, 644 LOC, 409 Spalten-Einträge)
- Drift-Closure verifiziert in Welle 12b — `docs/audit/MEGA-32-W12-I0-SCHEMA-AUDIT.md`

**Kritische Soll-Tabellen alle vorhanden (Live-Verify):**
- ✅ `workspaces` (3 rows), `users` (3), `workspace_memberships` (3) — Multi-Tenancy Foundation
- ✅ `auftraege` (1 row) — Universal-Tabelle alle 10 Typen
- ✅ `kontakte` (2), `dokumente` (2), `eintraege`, `fristen`, `skizzen` — Audit-Blocker geschlossen (W12b)
- ✅ `audit_trail` (4 rows) — INSERT-only DSGVO Art. 30 + IHK-SVO
- ✅ `ki_protokoll` — Pflicht-Logging-Tabelle laut Regel 16 (existiert, 0 rows aktuell — kein KI-Call live)
- ✅ `system_health` — W12b-I6 Status-Page-Foundation
- ✅ `einwilligungen` — DSGVO Art. 7
- ✅ `impersonation_log` — Login-as-User-Pflicht
- ✅ `feature_events` (2 rows) — Cockpit-Heatmap-Foundation
- ✅ `versicherungs_partner` — AVV-Konformität (Regel 18)
- ✅ `rechtsdokumente` — Forced Re-Consent (Regel 20)
- ✅ `ki_prompt_templates`, `ki_lernpool`, `ki_feedback` — KI-Härtung-Foundation

**ENUMs (43 verifiziert in W12-I0-Audit):** `auftrag_typ` (10), `auftrag_status` (5), `eintrag_typ` (4 NUR), `frist_typ` (8), `frist_status` (4), `health_check_kategorie` (10), `member_rolle` (5), `dokument_typ` (33), `foto_typ` (10), `audit_action` (18), `ki_provider` (3), `ki_modell_typ` (11), `ki_call_status` (5), `prompt_purpose` (12), `termin_typ` (9), `termin_status` (6), etc.

**Lücken:**
- ⚠️ `auftraege.auftraggeber_typ` + `auftraggeber_kontakt_id` existieren NICHT in Production. Migration `2026_05_10_w9_06b_auftraege_extend.sql` ist als `PLANNED — DO NOT APPLY` markiert. Architektur-Alternative: M:N via `auftrag_kontakte`. Marcel-Decision pending. (Beleg: `docs/audit/MEGA-32-W12b-I5-AUFTRAEGE-EXTEND-STATUS.md`)
- ⚠️ `ki_protokoll.cached_tokens_in` Spalte für Prompt-Caching W4-Bonus: AUDIT-UNKLAR — nicht direkt gegrept, separater Schema-Spalten-Audit nötig falls W4 priorisiert wird.

**Acceptance:** Schema ist **Production-stable und Markt-Launch-Ready** (W12b-FINAL bestätigt).

---

## Bereich 2 — KI-Härtung (Sprint 09a/b + Regeln 9-15)

**Status:** 🟡 TEILWEISE
**Komplettheit:** **~70%**

**Belege:**
- ✅ `KI-PROMPTS-MASTER.md` (402 LOC) — **inhaltlich gefüllt**, NICHT mehr Skeleton. W3-I0-Update auf GPT-5.x + Claude 4.x, Modell-Mapping pro Action dokumentiert.
- ✅ `netlify/functions/ki-proxy.js` mit MODELS-Konstante (Zeile 107+) — Multi-Provider OpenAI primary + Anthropic fallback
- ✅ Pseudonymisierung-Foundation: `netlify/functions/lib/prova-pseudo.js` + Server-Side-Wrap in ki-proxy.js (Zeile 23-25, 227-237). DSGVO-konform via PROVA_PSEUDO regex-basiert.
- ✅ Test-Suiten: `tests/ki-proxy/model-compliance.test.js`, `tests/ki/anthropic-wrapper.test.js`, `tests/ki/ki-proxy-fallback.test.js`, `tests/ki-cost/cost-calc.test.js`, `tests/ki-konsistenz/konsistenz-check.test.js`, `tests/sv-eigenleistung/validator.test.js`
- ✅ Konjunktiv-II-Check via gpt-5.5 (statt mini, Regel 14 erfüllt) — siehe MODELS.fachurteil/pruefung/konsistenz alle 'gpt-5.5'

**Lücken:**
- 🔴 KEIN dedizierter Tests-Folder `tests/halluzination/` oder `tests/konjunktiv/` — Tests sind in `tests/ki-proxy/`, `tests/ki-konsistenz/` und `tests/sv-eigenleistung/` verteilt. **AUDIT-UNKLAR:** ob die 5-Test-Suite (Funktionalität / Edge-Cases / Präzision / Konsistenz / Zeit) pro KI-Funktion vollständig erfüllt ist (Regel 15).
- 🟡 `tests/ki-stats/ki-stats.test.js` deckt Cost-Tracking — aber **AUDIT-UNKLAR** ob `ki_protokoll`-Inserts in JEDEM ki-proxy-Call (Pflicht-Logging Regel 16): grep `from('ki_protokoll')` in ki-proxy nötig.
- 🟡 §407a-Pre-Send-Check: `lib/prova-disclaimer.js` existiert, aber Modal-Pflicht vor Freigabe AUDIT-UNKLAR (Bereich 5/6).

**Acceptance:** KI-Foundation ist da, Modell-Migration W3-I0 dokumentiert + im Code aktiv. **Test-Coverage gegen Regel-15-5-Test-Suite muss separat verifiziert werden** vor Pilot-Live.

---

## Bereich 3 — KI-Modell-Migration W3-I0 (NEU aus Chat)

**Status:** 🟡 TEILWEISE — Foundation da, Smart-Router separates Modul fehlt
**Komplettheit:** **~75%**

**Belege:**
- ✅ Modell-Mapping in `KI-PROMPTS-MASTER.md` Zeile 28-39 dokumentiert
- ✅ Modell-Strings im Code: `netlify/functions/ki-proxy.js` Zeile 107-126 (MODELS + MODELS_FALLBACK Konstanten)
- ✅ Anthropic-Adapter: `tests/ki/anthropic-wrapper.test.js` belegt Wrapper-Existenz
- ✅ Fallback-Tests: `tests/ki/ki-proxy-fallback.test.js`
- ✅ ANTHROPIC_API_KEY ENV: gelistet als existing in `docs/setup/ENV-KONSOLIDIERUNG-MEGA33.md` (Pflicht-ENV)

**Lücken:**
- 🔴 KEIN separates `lib/ai-router.js` als isolierter Smart-Router-Modul. Der `chooseModel()`-Equivalent ist inline in ki-proxy.js via `MODELS[action]`-Lookup verteilt. Funktional gleichwertig, aber kein dediziertes Router-Lib-File für Reuse durch andere Lambdas.
- 🟡 User-Setting "ki_modus" (schnell/präzise) — AUDIT-UNKLAR — keine Settings-Spalte `users.ki_modus` direkt sichtbar (kein `user_workflow_settings.ki_modus`).
- 🟡 Health-Check pro Provider — `system_health` Tabelle existiert (W12b-I6), aber AUDIT-UNKLAR ob OpenAI- + Anthropic-Probes separat geloggt werden vs. nur "openai" + "claude" als kategorie-Werte.

**Acceptance:** Migration-Code aktiv, Tests grün, **dediziertes ai-router.js Lib-File wäre Refactoring-Polish** (nicht blocking für Pilot).

---

