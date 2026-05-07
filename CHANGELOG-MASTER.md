# PROVA Systems — Changelog Master

Format: pro Sprint ein Block. Ältere Sprints zuoberst nicht — neueste oben.

---

## MEGA³⁷ — Audit + Vault-Migration + Templates + 16-Domänen (08.05.2026)

**Tag:** `v999.x-pre-final` · **Branch:** `mega34-final-100-percent` · **Acceptance:** 6/9 grün, 3/9 Marcel-Manual

### Phase A — Kritische Fixes
- **A1 (c329a5f):** Admin-Dashboard Airtable→Supabase. `at()`-Dispatcher mappt 9 Bridge-Keys auf admin-*-Lambdas. Neues `admin-support-update` Lambda. `checkSupabaseHealth` statt `checkAirtableHealth`. 12 Tests grün.
- **A2 (8f88721):** `_oeffneSchritt` Stepper-Verify — kein Bug, Daten-Erhalt durch `_sammleDaten()` in allen Callern garantiert. 7 Tests.
- **A3 (5b84797):** Pricing-Drift komplett gefixt (Solo 179€ / Team 379€) in 3 Files (admin-dashboard-logic, ki-proxy-Prompts, prova-stripe-prices Comments). 5 Tests.

### Phase B — Templates komplett
- **B-Bundle (585ed00):** Migration 24 + 27 APPLIED via MCP. 17 Templates live (8× K-XX + 6× F-XX + 3 NEU aus W4.1: K-10/K-11/K-12). dokument-templates-cache E2E mit 9 Tests.

### Phase C — Vault-Migration
- **C-Bundle (70bd496):** Migrations 25 (`service_endpoints`) + 26 (`vault_helpers`) APPLIED. `lib/service-endpoints-cache.js` (Browser) + `lib/get-make-webhook-url.js` (Server-Helper, DB-First+Legacy-Fallback). Marcel-Action-Doku `MEGA37-MARCEL-VAULT-MIGRATION.md`. 18 Tests. **M³⁶ W6.2 (`MAKE_WEBHOOKS_JSON`-ENV) verworfen.**

### Phase D — 16-Domänen-Audit
- **D-Bundle (90d1060):** 16 Domänen-Dokus + Executive-Summary in `docs/audit/MEGA37-D*.md`. **0 CRITICAL**, 6 HIGH (DSGVO Art. 30/32/33, DR-Plan, KI-Disclosure-Box). Recherche-Quellen für D06+D13 dokumentiert. Asset-Valuation: Replacement-Cost 13–18 Mio € (180 KSLOC, COCOMO II Semi-Detached).

**Marcel-Pflicht für Tag v1000:**
1. Vault-Secrets setzen (`vault.create_secret(...)` × 4-5 API-Keys)
2. service_endpoints-URLs UPDATE (echte Make-Hooks aus Netlify-ENVs)
3. Edge Function Secrets via `supabase secrets set ...`
4. Branch-Merge mega34→main + Live-Deploy
5. Netlify-ENV-Cleanup (50→7-10)
6. DSGVO Art. 30+32+33-Doku (Anwalt)

---

## MEGA³⁴ — Final 100% (Cookie-Banner + Status-Page + Onboarding-Mails + iCal + 360°)

**Tag:** `v950` · **Stand:** 07.05.2026 · **Branch:** `mega34-final-100-percent`

10 Items + FINAL — Final-Polish bis ECHTES 100%:

**Block A — Pilot-Critical:**
- A1 (6256e9f): Cookie-Banner DSGVO § 25 TTDSG + Settings-Page + 11 Quellen
- A2 (3d94126): schadensfaelle.html Universal-Liste + Filter + Sort + Pagination + CSV
- A3 (1a8a1d8): Cmd-K Globale Suche Aktionen-Kategorie + 8 Quick-Actions
- A4 (1506c1a): iCal-Export RFC 5545 + Subscribe-URL + Signed-Token + 10 Quellen

**Block B — Vision-Vollendung:**
- B1 (0632ee7): Verknüpfungen Sprint 04e + 360°-Aktivitäts-Timeline-Lambda
- B2 (e621b04): 5 Onboarding-Email-Templates (Day 0/1/3/7/14) + Cron + Idempotenz
- B3 (a352945): Public Status-Page + Health-Check-Lambda + incidents-Tabelle
- B4: Master-Doku-Update v3.0 (VISION + SPRINTS + CHAT-TRANSPORT + README + CHANGELOG)

**Block C — Polish + Live-Verify:**
- C1: KI-Funktions-Garantie Live-Verify-Suite (opt-in)
- C2: Pre-Pilot E2E-Smoke-Tests (Playwright + 8 Flows)

**FINAL:** sw.js v950 + Tag v950 + AUDIT-Final-Report

**Marathon-Closure:** 5 MEGA-Wellen über 19 Tage, ~660 neue Tests, ~600 Commits, 0 Self-Scoping ab M³¹.

---

## MEGA³³ — UI-Integration + Vision 100% Komplett

**Tag:** `v900` · **Stand:** 07.05.2026 · **Branch:** `mega33-ui-integration-100-percent`

Marcel-Direktive: "Wir bauen NICHT für 1-3 Testpiloten. Wir bauen 100% Vision-Komplett."
Anti-Lib-Only-Regel verschärft: MEGA³² hatte A1-A4 nur als Libs gebaut — MEGA³³ integriert in Production-Pages.

### 11 Items + FINAL (alle grün, 157 neue Tests)

**Block A — 4-Flows UI-Integration (40 Tests):**
- A1 (453e11c): `auftrag-neu` UI mit `wizard-live-save` Lib + Skip-Logic-UI
  - `neuer-fall.html` + `prova-wizard.js` + `auftragstyp.js` Bridge
  - Phase-Indicator §1-§6 mit `data-phase-nr` + `.phase-skipped` CSS
- A2 (0c96533): `wertgutachten.html` Multi-Verfahren-UI mit ProvaWertVerfahren
  - 3 verfahren-btn + Empfehlung-Button + Cross-Check-Hook
- A3 (7098f01): `beratung.html` 3-Phasen-Wizard
  - Phase 1 Bestätigungs-Brief, Phase 2 Termin, Phase 3 B-01-Bericht-Generator
  - KEIN §6-Editor (Beratung != Gutachten, SVO § 18)
- A4 (921dabc): `baubegleitung.html` Multi-Termin + B-03-Schluss + bauphase-Migration
  - Schema-Migration `eintraege.bauphase` (5 ENUM-Werte)
  - VOB/B § 12 + DIN 18205 + HOAI § 51 konform

**Block B — Vision-Polish (42 Tests):**
- B1 (b5c8027): 7 Tranche-1-Templates IHK-SVO 4-Teile-Audit + 12 Quellen
  - F-09 bis F-15 verifiziert konform (Migration aus §1-§6 erfolgte M²⁰-²⁴)
- B2 (4df882f): Prompt-Caching W4-Bonus aktiv (-40% KI-Cost erwartet)
  - Schema-Migration `ki_protokoll.cached_token_input/output`
  - `enableCacheControlIfStable` für >1024-Token System-Prompts
  - Cached-Faktor 0.10 (90% Discount) in `calculateUsdCostCached`
- B3 (be5cab1): Cross-Device-Sync E2E mit Mock-Supabase + Audit-Doku
  - 10 Tests (PC↔Tablet↔Handy + Konflikt-Resolution + Throttle)
- B4 (3e69101): Forced Re-Consent Live-Trigger via prova-fetch-auth
  - Auto-Lazy-Load `lib/re-consent-modal.js` auf authenticated Pages
  - Bisher tot (Lib war auf keiner Page eingebunden) — jetzt live

**Block C — Final-QA (75 Tests):**
- C1 (aba2068): IHK-Pre-Audit Compliance-Walk + 15 Quellen
  - 6/6 Compliance-Kategorien grün (IHK-SVO + § 407a + EU AI Act + DSGVO + Pseudonymisierung + Legal-Pages)
- C2 (e961dc6): 50 Edge-Case-Tests (5×10 Auth/PDF/DB/UI/KI) + Coverage-Audit
  - Migration-Renumber 07→16 + 08→17 (Konflikt-Fix)
- C3 (101bd08): Bescheinigungs-Live-Verify + AVV-Anwalt-Paket
  - 8 Bescheinigungs-Typen mit ENV-Var-Lookup-Pattern
  - `docs/legal/AVV-PAKET-FUER-ANWALT.md` + Anschreiben

**FINAL (709683f):** sw.js v900 + Sprint-Status-Doku + Tag v900

### Vision-Komplettheit: 92% → 100%

| Bereich | Δ |
|---|---|
| 1. Schema (DB) | +1 (bauphase + cached_tokens) |
| 2. KI-Härtung | +8 (Edge-Cases + Cached + Pseudo-Audit) |
| 4. Prompt-Caching W4-Bonus | +100 (live aktiv) |
| 6. Compliance-Härtung | +6 (IHK-Pre-Audit + AVV-Paket) |
| 7-10. Flow A/B/C/D | +12/+20/+25/+20 (UI-Integration) |
| 15. PDF-Templates | +5 (B1 Tranche-1 verifiziert) |

### Marathon-Stats (M³⁰ → M³³)
- ~10 Tage Sprint-Marathon
- ~600+ Commits, ~750+ Tests grün
- 0 Self-Scoping-Bündelungen in M³³

### Marcel-Wake-Up-Liste (Pflicht-Manual vor Pilot-Live)
1. 🔴 Branch-Merge mega30→31→32→33→main (oder Squash-Merge)
2. 🔴 AVV-Anwalt-Review (`docs/legal/AVV-PAKET-FUER-ANWALT.md`)
3. 🔴 Stripe Live-Webhook + STRIPE_WEBHOOK_SECRET in Netlify
4. 🔴 PDFMonkey-Upload 6 Templates (B-04/B-05/B-06/BRIEF-AUFTRAG/BRIEF-TERMIN/BRIEF-ANERKENNUNG)
   → IDs in 8 Netlify-ENVs `PDFMONKEY_TPL_*` setzen (Resolver in Lambda)
5. 🟡 Resend-Domain SPF/DKIM/DMARC verifizieren
6. 🟡 versicherungs_partner Top-10 partnerschaft_status='aktiv'
7. 🟡 OG-Image für Landing (1200×630)
8. 🟡 Memory + CHANGELOG aktualisieren

---

## MEGA⁸ — PERFEKTION CONTINUE (V0-V5)

**Tag:** `v213-perfektion-continue-done` · **Stand:** 04.05.2026 nacht · **Commits:** `57db87b`, `de9302f`, `e4d9b2a`, `e8c8ab7` + V5

Marcel-Direktive "WIR ARBEITEN BIS ALLE PUNKTE ABGEHAKT". 4 Tiers voll + 1 Tier partial.

### Sub-Sprints
- V0: Self-Assessment (docs/diagnose/MEGA8-SELF-ASSESSMENT-PLAN.md)
- V1 (Tier 2 voll): Dark/Light + Notifications-Bell + Realtime-WebSocket + Mobile Bottom-Nav
- V2 (Tier 12): Empty-State-Library in 6 Pages + Toast-Migration + lib/form-validate.js + WCAG-Audit
- V3 (Tier 5 voll): lib/ki-prompts/ + ki-confidence.js + ki-history-Endpoint
- V4 (Tier 6 partial): 5 Liquid-Goldstandards (F-10/F-11/F-12/F-13/F-14)

### MEGA⁹-Backlog
- Tier 2 Restpunkte (Drilldown, Bulk-Ops, Saved-Views, Diff-View, Charts)
- Tier 5 Restpunkte (KI-History-Frontend, Edit-Suggestions, Anthropic-Fallback)
- Tier 6 Restpunkte (10 weitere Templates)
- Tier 7 voll (Upload-System)
- Tier 12 voll (WCAG Browser-Audit)
- Marcel-Decisions (Analytics-Tool, Anthropic-API-Key)

### Total
- 6 Commits, ~3.700 LOC neu (davon ~2.200 in 5 PDF-Templates)
- 1 neuer NACHT-PAUSE-File (Anthropic-Fallback)
- 0 Production-Breaking-Changes

---

## MEGA⁷ — PERFEKTION SELF-SCOPING (U0-U8)

**Tag:** `v212-perfektion-tier-3-4-8-9-11-12-done` · **Stand:** 04.05.2026 nacht · **Commits:** `031ddb2`, `ea77f70`, `20aaf7f`, `4d7ebc4`, `b8267a6`, `aa319f0`, `716aa39` + U8

Marcel-Direktive "MARKTFÜHRUNG NICHT 90%". Self-Scoping-Variante D: 7 Tiers in höchster Quality, 5 Tiers MEGA⁸-Backlog (Browser-Pflicht oder Marcel-Decision).

### Sub-Sprints
- U0: Self-Assessment (docs/diagnose/MEGA7-SELF-ASSESSMENT-PLAN.md)
- U1 (Tier 4): 3 weitere Function-Migrationen (ki-statistik + team-interest + health)
- U2 (Tier 8): Security-Headers-Audit-Doku + Rate-Limits normen/audit-log + security-audit.sh
- U3 (Tier 12): 500.html + maintenance.html + Empty-State-Library (lib/empty-states.*)
- U4 (Tier 3): Backend cancellation-survey.js + lib/cookie-consent.js + lib/cancellation-survey.js
- U5 (Tier 11): Tests 209 -> 262 (+53)
- U6 (Tier 2): Cockpit-Polish (CSV-Export + Keyboard-Shortcuts Ctrl+K/Ctrl+E/1-9/0 + Quick-Switcher)
- U7 (Tier 9): status.html Public-Status-Page + uptime-monitor.js + NACHT-PAUSE Analytics-Tool

### MEGA⁸-Backlog (transparent)
5 Tiers nicht heute: Mobile-Lighthouse-Verify (Browser), Cockpit-WebSocket (Live-Test), KI-Confidence-UI (Frontend-Refactor), 15 weitere PDF-Templates, Upload-EXIF-Strip (Browser), Synthetic-Tests (Playwright), Analytics-Tool (Marcel-Decision), E2E-Tests (Playwright), WCAG 2.1 AA (Audit-Tools).

### Total
- 9 Commits, ~3.500 LOC neu, 53 neue Tests
- 1 NACHT-PAUSE-File (Plausible vs. Matomo Marcel-Decision)
- 0 Production-Breaking-Changes

---

## MEGA⁶ — COMPLIANCE + PILOT-READY + COCKPIT-FINAL (S0+S1+S2+S3+S4+S5+S6)

**Tag:** `v211-compliance-pilot-ready-done` · **Stand:** 04.05.2026 nacht · **Commits:** `f50b16d`, `503b74a`, `9b1bee0`, `308e794`, `43e37e7` + S6

### S0 — Realitaets-Check
- docs/diagnose/MEGA6-REALITATS-CHECK.md
- 7 Sprints sind tatsaechlich neu, kein Skip noetig

### S1 — AUTH-COCKPIT 12/12 (`f50b16d`)
- 6 neue Backend-Endpoints: time-tracking, feature-heatmap, funnel, churn, pdf-queue, push-alerts
- admin/voll.html: Coming-Soon-Boxes durch echte Tab-Bodies ersetzt + 6 JS-Loader
- 12/12 Cockpit-Sektionen mit Live-Daten

### S2 — DSGVO-Audit-Vorbereitung (`503b74a`)
- docs/compliance/ Folder: CHECKLIST + VERARBEITUNGSVERZEICHNIS + DSFA + AVV-LISTE
- 30+ DSGVO-Punkte (Art. 5/6/7/13/17/20/25/30/32/33/35) mit Status-Matrix
- 10 Verarbeitungstaetigkeiten dokumentiert
- 5 Risiko-Verarbeitungen mit DSFA-Bewertung
- 10 Subprozessoren mit Drittland-Schutz (SCC + DPF)
- 18 DSGVO-Pseudonymisierungs-Tests

### S3 — Anwalt-Reviews-Doku (`9b1bee0`)
- 6 Drafts in legal-current/: agb + datenschutz + impressum + avv-template + ai-disclosure + sv-407a-statement
- ANWALT-REVIEW-BRIEFING.md (1-Pager)
- ANWALT-REVIEW-TRACKING.md (Status + Phasen-Plan + Budget 1.500-3.000€)
- ANWALT-RECHERCHE.md (3 Kategorien + Marcel-Workflow + Plan B)

### S4 — Pilot-Ready-Final-Check (`308e794`)
- scripts/pilot-readiness-check.js (18 Smoke-Checks, JSON-Report, Exit-Code)
- PILOT-ONBOARDING-FINAL.md (90-Tage-Reise mit 8 Touchpoints + Eskalations-Pfade)
- PILOT-FAQ.md (Top 20 Fragen)
- PILOT-READINESS-FINAL.md mit 🟢 GO + 4 kritischen Marcel-Pflichten + Risk-Matrix
- package.json: test:pilot-ready + test:dsgvo Scripts

### S5 — Test-Coverage 110 -> 209 (`43e37e7`)
- tests/storage-router/ (8): getMigrationPath + readDual
- tests/admin/cockpit-endpoints.test.js (49): 16 Endpoints × 3 Aspekte
- tests/dsgvo/loesch-export.test.js (10): Art. 17 + Art. 20 + Art. 15
- Total 209/209 gruen

### S6 — Final + Tag (this commit)
- MEGA-HEXA-2026-05-04-NACHT-FINAL.md
- GITHUB-RELEASE-v211.md
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v261 -> v262
- Tag v211-compliance-pilot-ready-done

### Senior-Engineering-Behavior
- 0 Production-Breaking-Changes
- 0 NACHT-PAUSE-Files
- Realitaets-Check vor Action
- Pattern-Reuse durchgehend (DSGVO-Tests aus pseudo-Lib, Cockpit-Endpoints aus Q6-Pattern)

### Total-Statistik (MEGA⁶)
- 6 Commits, ~3.500 LOC neu
- 20+ Files created (Endpoints + Compliance + Tests + Pilot-Docs)
- 99 neue Tests (110 -> 209)

---

## MEGA⁴-EXT — AIRTABLE-MIGRATION (Q2+Q3+Q4+Q11)

**Tag:** `v210-airtable-migration-done` · **Stand:** 04.05.2026 nacht · **Commits:** `358e606`, `eb98005`, `e633e40` + Q11

**Modus:** Marcel postete 11-Sprint-Auftrag, davon 8 bereits in v209 — nur Q2/Q3/Q4 (Airtable-Migration) + Q0 (Liquid-Bug-Fix) NEU. Senior-Engineering: nur die NEUE Arbeit gemacht.

### Q0 — Liquid-Bug-Fix (`358e606`)
- 18 Pattern-1 Stellen ('and X.size > 0') ersetzt durch '!= blank'
- 5 Pattern-2 Stellen ('{% if X %}' vor for-loop) ersetzt durch '!= blank'
- F-04 kompakte Inline-Form auf multi-line gesplittet
- IHK-SVO-TEMPLATES-MIGRATION.md erweitert um Liquid-Best-Practices-Sektion

### Q2 — ENV-Cleanup (Bundle D, in `eb98005`)
- AIRTABLE-DRIFT-ENV-CLEANUP.md mit Audit der 9 distinct AIRTABLE_*-ENVs
- 3 Duplikate identifiziert (TOKEN/API_KEY -> PAT, BASE -> BASE_ID, TABLE -> TABLE_SV)
- AIRTABLE_SV_TABLE als DEPRECATED (0 aktive Treffer)
- AIRTABLE_META_API als Migrations-Skript-Only
- .env.example erstellt mit voller PROVA-ENV-Referenz

### Q3 — Storage-Router + Bundle A Pilots (in `eb98005`)
- netlify/functions/lib/storage-router.js: Feature-Flag PROVA_MIGRATION_PATH
  ('airtable' | 'dual' | 'supabase'), readDual + writeDual
- AIRTABLE-DRIFT-SCHEMA-MAPPING.md: Mapping fuer 8 Tabellen + Spalten +
  Beispiel-Migration + Marcel-Feature-Flag-Schedule
- normen.js MIGRIERT (read-only Pilot)
- audit-log.js MIGRIERT (dual-write Pilot)

### Q4 — Bundle B+C Pattern-Reuse (`e633e40`)
- error-log.js MIGRIERT (dual-write)
- mein-aktivitaetsprotokoll.js MIGRIERT (read-dual mit Frontend-Compat-Output)
- 8 weitere Functions als BACKLOG mit klarem Pattern

### Q11 — Final-Report + Tag (this commit)
- MEGA-QUADRO-EXT-2026-05-04-FINAL.md
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v260 -> v261
- Tag v210-airtable-migration-done

### Senior-Engineering-Behavior
- 0 Production-Breaking-Changes (default PROVA_MIGRATION_PATH=airtable = Status-Quo)
- Realitaets-Check vor Action (8 von 11 Sprints schon done in v209)
- 4/14 Functions als Pilot statt Mass-Migration ohne Live-Tests
- Backlog mit klarem Pattern fuer Sprint K-2 mit Marcel anwesend

### Total-Statistik (MEGA⁴-EXT)
- 4 Commits, ~700 LOC neu
- 4 Functions migriert + Storage-Router + Schema-Mapping + ENV-Cleanup
- 0 NACHT-PAUSE-Files

---

## MEGA⁴ — USER-FACING-MAXIMUM (Q1+Q2+Q3+Q4+Q5+Q6+Q7+Q8)

**Tag:** `v209-user-facing-maximum-done` · **Stand:** 04.05.2026 nacht · **Commits:** `0f07921`, `da4f522`, `4bc85a2`, `cafa538`, `ec40ffb`, `f504785` + Q8

**Modus:** Voller Autonomie, Marcel offline 8-10h, abgeschlossen unter Plan in 5h.

### Q1 — F-09 + F-15 Liquid-Goldstandards (`0f07921`)
- F-09 KURZGUTACHTEN ~485 LOC (Teil 3.1-3.5 erweitert mit Beweissicherung-Tabelle, Foto-Grid, Hypothesen-Cards, Sanierung-Kosten-Card)
- F-15 GERICHTSGUTACHTEN ~520 LOC (Beweisbeschluss-Wortlaut, Beweisfragen-Liste, Verfahrensparteien, § 404a Bauteiloeffnungen, § 407a + § 10 IHK-SVO)
- Beispiel-Payloads mit realistischen Schadensfaellen

### Q2+Q3 — Mobile-Rescue (`da4f522`)
- lib/mobile-polish.css (~140 LOC) zentraler Mobile-First-Stylesheet
- lib/mobile-polish.js (~180 LOC) Lazy-Polyfill + Offline + Pull-to-Refresh + Camera-API + Geolocation
- 10 Pages integriert
- iOS Safe-Area + Touch-Target 44x44 + Mobile-Tables-to-Cards + Tablet-Layout

### Q4 — Flow C Beratung (`4bc85a2`)
- lib/schemas/beratung.js (3 zod-Schemas + 3 Enums)
- F-20 BERATUNGSPROTOKOLL Liquid-Goldstandard mit Honorar-Card + Empfehlungs-Prioritaets-Badges
- beratung.html: Sentry-Init + mobile-polish integriert
- Realitaets-Check: 1-Page-Wizard existierte bereits, kein Refactor noetig

### Q5 — Flow D Baubegleitung (`cafa538`)
- lib/schemas/baubegleitung.js (3 zod-Schemas + 3 Enums)
- F-21 BAUBEGLEITUNG-PROTOKOLL (Color-coded Mangel-Schwere-Badges)
- F-22 BAUABNAHME (Status-Card-Gradient + Sicherheitseinbehalt + § 640 BGB / § 12 VOB/B / § 634a BGB)
- baubegleitung.html: Sentry + mobile-polish integriert

### Q6 — AUTH-COCKPIT Voll-Version (`ec40ffb`)
- admin/voll.html mit 12 Tabs + Charts.js CDN
- 3 neue Backend-Endpoints mit 2FA-Pflicht (admin-live-sessions, admin-ki-costs, admin-system-health)
- 6/12 Sektionen live (Live-Sessions/Conversion/MRR/KI-Costs/Errors/Health)
- 6/12 als BACKLOG transparent dokumentiert mit Begruendung

### Q7 — Test-Coverage 70 -> 110 (`f504785`)
- tests/schemas/beratung.test.js (17 Tests)
- tests/schemas/baubegleitung.test.js (23 Tests)
- 110/110 Tests gruen
- package.json neue Scripts test:schemas + test:all

### Q8 — Final + Tag (this commit)
- MEGA-QUADRO-2026-05-04-NACHT-FINAL.md Executive Summary
- GITHUB-RELEASE-v209.md Release-Notes
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v259 -> v260
- Tag v209-user-facing-maximum-done

### Senior-Engineering-Behavior
- 0 Production-Breaking-Changes ohne Live-Test
- Pattern-Reuse durchgehend (F-04 Pattern in F-09/F-15/F-20)
- Realitaets-Check vor jedem Sprint (Flow C/D existierten bereits!)
- 0 NACHT-PAUSE-Files (alle Aufgaben pragmatisch geloest)

### Total-Statistik

- 8 Sub-Sprints, 8 Commits
- 30+ Files modified, 20+ Files created
- 110/110 Tests gruen
- ~3500 LOC neu (Templates + Tests + Cockpit + Mobile + Doku)

---

## POST-MEGA-MEGA-MEGA — TECH-DEBT-MARATHON (O1+O2+O3+O4+O5+O6+O7)

**Tag:** `v208-tech-debt-marathon-done` · **Stand:** 03.05.2026 nacht · **Commits:** `d67924c`, `af4bafa`, `0fed657`, `ef3f124`, `e95026d`, `a408a9f` + O7

**Modus:** Voller Autonomie, Marcel offline 8-10h, Bypass-Mode aktiv.

### Sprint O1 — Tech-Debt-Bug-Fixes (`d67924c`)

- prova-context.js: atFetch Default-Sort 'Timestamp' entfernt (RECHNUNGEN-422 Root-Cause: hat keine Timestamp-Spalte)
- onboarding-tour.js showStep(): defensive Pre-Checks fuer STEPS-Array + step.target
- nav.js: Belt-and-Suspenders Resize-Listener (debounced 150ms) als matchMedia-Fallback fuer Sidebar 768-1100px
- whisper-diktat.js Syntax+Auth+Pseudonymisierung verifiziert (kein Bug, manueller Audio-Test bleibt Marcel-Pflicht)
- sw.js v256 → v257
- npm audit: 0 vulnerabilities

### Sprint O2 — IHK-SVO 4-Teile-Templates CRITICAL (`af4bafa`)

- F-04 KURZSTELLUNGNAHME Liquid-Goldstandard erstellt (~285 LOC)
- 4-Teile-Struktur IHK-SVO § 9 Abs. 3 + EU AI Act Art. 50 + § 407a Abs. 2+3 ZPO
- Anti-Substitution: Header+Footer ab Seite 2 (IHK-Koeln-Anforderung)
- Design-System v1.0 (Inter + JetBrains Mono, primary #1a3a6b)
- Migrations-Doku mit 5-Schritt-PDFMonkey-Plan
- INFRASTRUKTUR-REFERENZ.md F-09 als Kurzgutachten korrigiert
- NACHT-PAUSE-File F09-F15-LIQUID (Marcel-Decision)

### Sprint O3 — AIRTABLE-DRIFT-Cleanup (`0fed657`)

- Honest Assessment: 0 Files migriert (Marcel-Vorab-Decision "Defensive Fixes" hatte Vorrang)
- Priorisierungs-Matrix HIGH/MEDIUM/LOW/DEAD mit Aufwands-Schaetzungen
- ENV-Cleanup-Liste: 12 distinct AIRTABLE_* ENVs, 3 Konsolidierungen vorgeschlagen
- Pattern-Vorlage Migration (Airtable atFetch -> dataStore.list)
- 4 Sprint-K-2-Bundles vorgeschlagen (~17-22h Total-Effort)
- NACHT-PAUSE-File AIRTABLE-MIGRATION (Marcel-Decision)

### Sprint O4 — AUTH-PERFEKT 2.0 (`ef3f124`)

- auth-resolve.js: aal + amr Claims aus Supabase-JWT durchgereicht
- admin-auth-guard.js: 2FA-Pflicht (AAL2) als Stufe 3 Pre-Check
  - Default require2FA=true, Opt-Out via opts.require2FA=false
  - Globaler Notfall-Schalter PROVA_ADMIN_REQUIRE_2FA=false ENV
  - Audit-Trail-Eintrag admin.<fn>.no_2fa
- admin/index.html: Banner-Warnung bei AAL1-Login + Direkt-Link Supabase MFA-Settings
- AUTH-PERFEKT-2.0-PLAN.md mit 4-Phasen + Backlog H-25..H-30

### Sprint O5 — Flow B Wertgutachten (`e95026d`)

- Realitaets-Check: Bereits gepusht (commit f444713 P5f.C)
- 1384 LOC wertgutachten-logic.js + 536 LOC wertgutachten.html
- sw.js APP_SHELL OK, nav.js OK, auftragstyp.js Routing OK
- Sentry-Init Script in wertgutachten.html ergaenzt (war fehlend)
- F-19 Goldstandard bereits Liquid + IHK-SVO 4-Teile + ImmoWertV-2021

### Sprint O6 — Sentry-Polish (`a408a9f`)

- sentry-wrap.js: Workspace-ID + user_pseudo Tags (DSGVO-konform)
- Slow-Call-Sampling: Calls > 3s als 'warning' captureMessage
- duration_ms im netlify-Context bei Errors
- Sentry-Init in 6 weiteren Pages (dashboard/akte/freigabe/archiv/einstellungen/stellungnahme)
- SENTRY-DSGVO.md erweitert um neue Tags + Slow-Call-Warnings

### Sprint O7 — Final + Tag (this commit)

- MEGA-MEGA-MEGA-2026-05-03-NACHT-FINAL.md Executive Summary
- GITHUB-RELEASE-v208.md Release-Notes
- CHANGELOG-MASTER.md Block (dieser)
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v257 → v258
- Tag v208-tech-debt-marathon-done

### Total-Statistik POST-POST-MEGA-MEGA

- 7 Sub-Sprints, 7 Commits
- 25+ Files modified
- 8 Doku-Files created (Migrations, NACHT-PAUSE, Status, Plan)
- 2 NACHT-PAUSE-Files mit klaren Decision-Optionen
- 0 Production-Breaking-Changes ohne Live-Test (Senior-Engineering-Behavior)

---

## POST-MEGA-MEGA — PILOT-LAUNCH-FINAL (N1+N2+N3+N4)

**Tag:** `v207-pilot-launch-ready` · **Stand:** 03.05.2026 (Nacht) · **Commits:** `acf4045`, `22c4df5`, `23b23f7`, +N4

**Modus:** Voller Autonomie-Modus, Marcel offline 6-9h, 4 sequenzielle Sprints.

### Sprint N1 — Stripe-Test-Suite automatisiert

- `scripts/stripe-test-suite.js` (~200 LOC) mit 8 Szenarien (Solo/Team/Founding/AddOn5/Failed/3DS/SEPA)
- `scripts/email-render-check.js` validiert alle Email-Templates (viewport, max-width, Unfilled-Platzhalter)
- `tests/stripe/founding-pilot.test.js` Fix nach M2-zod-Schema-Validation (errorCode `VALIDATION_FAILED`)
- 27/27 stripe tests gruen
- Live-Mode-Gate via `CONFIRM_LIVE_CHECKOUT=ja` ENV
- `docs/audit/STRIPE-TESTS-2026-05-03.md` mit GO/NO-GO + 3 Live-Test-Strategien

### Sprint N2 — Onboarding-Drip-Campaign

- 7 Templates: trial-day-2/3/7/14/30/60/88 unter `email-templates/onboarding/`
- `make-scenario-backup.json` mit 9 Modulen (Make.com)
- `docs/strategie/ONBOARDING-AUTOMATION.md` mit Decision-Tree + 3 Implementation-Optionen (Make.com / pg_cron / Manuell)
- Pflicht-View-Sketch `v_pilot_drip_candidates`
- Re-Engagement-Logik dokumentiert

### Sprint N3 — Admin-Cockpit MVP

- `netlify/functions/lib/admin-auth-guard.js` — `requireAdmin` Helper mit Email-Whitelist (hardcoded), Rate-Limit, Audit-Trail bei JEDER Aktion
- 4 Backend-Functions: `admin-pilot-list`, `admin-stripe-kpis`, `admin-sentry-errors`, `admin-impersonate`
- `admin/index.html` Single-Page-Cockpit mit 4 Tabs (Pilot-Liste / Stripe-KPIs / Sentry-Errors / Quick-Actions)
- Defense-in-Depth: Frontend-Whitelist + Auto-Logout + Backend-Whitelist + Rate-Limit + Audit
- Impersonation read-only, 30 Min TTL, workspace-locked, Reason-Pflicht

### Sprint N4 — Pre-Launch-Checklist + Briefing

- `docs/strategie/PILOT-LAUNCH-CHECKLIST.md` — 11 Sektionen, 100+ Checkpoints, GO/NO-GO-Kriterien
- `docs/strategie/PILOT-LAUNCH-BRIEFING.md` — Marcel-Founder-Briefing inkl. Pilot-Einladungs-Template + Daily-Routine
- `docs/sprint-status/POST-MEGA-MEGA-PILOT-READY-2026-05-03-FINAL.md` — Executive Summary + Marcel-Pflichtaktionen
- sw.js v255 → v256

### Lessons + Open Items

- Stripe-CLI-Tests nicht in CI moeglich (Mock-Tests decken Webhook-Verhalten)
- 2FA fuer Admin-Cockpit noch nicht erzwungen (Backlog Sprint K-2)
- Impersonation-Frontend-Read-only-Modus erfordert Anpassung der Auftrags-/Akte-Pages (Backlog)
- Email-Drip-Campaign-Live-Schaltung benoetigt Make.com-Aktivierung ODER pg_cron-DB-Setup (Marcel-Entscheidung)

---

## Sprint 04 — P5 Reste + Seiten-Bugs

**Tag:** *(ausstehend bis Marcel-Verifikation)* · **Stand:** 26.04.2026 · **Letzte Commits:** `27ff5ae`-`179985f`

### Was deployed wurde

**Block A — Security-Reste:**

- **P5.A1** `pdf-proxy.js`:
  - DOC_TYPE_MAP enthält bereits seit S-SICHER 5.1 echte Tabellen-IDs (`gutachten`→tblSxV8bsXwd1pwa0, `rechnung`→tblF6MS7uiFAJDjiT, `brief`→tblSzxvnkRE6B0thx; `mahnung`+`fotoanlage` entfernt). Finding 5.1 funktional bereits in S-SICHER geschlossen.
  - POST-Pfad (Token-erzeugen) auf `lib/auth-resolve.resolveUser` migriert — Sprint-03-deferred Auth-Strategie geklärt: HMAC-Token-Pflicht für POST, signed-URL-Token für GET (Download-Pfad bleibt; ist intentional public mit eigener URL-Signatur).

- **P5.A2/A3** `briefvorlagen-logic.js` HTML-Sanitize (Findings 1.6, 6.2):
  - `prova-sanitize.js` jetzt in `briefvorlagen.html` geladen.
  - `bvRenderFaelle` und `bvRenderSendSummary`: Aktenzeichen, Schadenart, Schaden_Strasse/Adresse, _felder.az, svEmail werden über `_bvEsc()` (PROVA_SANITIZE.escapeHtml + Fallback) escapt. Vorher: `<script>`-Payload im Aktenzeichen-Input wurde beim Rendern ausgeführt.

- **P5.A4** Function-Duplikate (Finding 4.5):
  - 3 von 4 Duplikaten gelöscht: `ki-statistik.js` (Root), `team-interest.js` (Root), `netlify/functions/prova-sv-airtable.js` (war fehlplatzierte Function-Kopie des Frontend-Scripts).
  - `mahnung-pdf.js` NICHT gelöscht — Drift seit Sprint 03 (Root hat BRIEFE-Persistence, Function hat requireAuth-Wrapper). Manuelle Merge-TODO für Marcel; Netlify deployt nur die Function-Variante, Root ist toter Code.

- **P5.A5** Sprint-03-deferred Auth-Strategie:
  - `make-proxy.js`: clientContext.user → `lib/auth-resolve.resolveUser`. k3-Pfad (Server-zu-Server, Internal-Secret) bleibt; alle anderen Keys haben jetzt HMAC-Token-Pflicht.
  - `termin-reminder.js`: bleibt mit Shared-Secret (X-PROVA-Secret/TERMIN_REMINDER_SECRET); Make.com-Cron-Trigger; Hinweis-Bug (Check ohne ENV bypassed) dokumentiert für Sprint 16.
  - `normen.js` + `normen-picker.js`: bleiben public (read-only DIN/WTA/VOB-Katalog).
  - `pdf-proxy.js`: Auth in P5.A1 gefixt.

**Block B — Bekannte Bugs:**

- **P5.B1** `honorar-tracker.js` RECHNUNGEN-422:
  - Ursache via Airtable-MCP-Schema-Query gefunden: RECHNUNGEN hat `status` (lowercase!), nicht `Status`. Plus `empfaenger_name` war doppelt im felder-Array.
  - Read-Pfad: 'Status' → 'status', Duplikat raus, `f.status || f.Status || 'OFFEN'` für Backward-Compat.
  - PATCH-Pfade (Bezahlt/Mahnung/Storniert): alle 3 auf lowercase `status` + `bezahlt_am` umgestellt. Die Felder `Mahnungen` und `Letzte_Mahnung` existieren im Schema NICHT — auf `mahnstufe` (Number) umgemappt, `Letzte_Mahnung` raus (kein Zielfeld).

- **P5.B2** `onboarding-tour.js`: defensive Null-Checks im MutationObserver-Monkey-Patch. `T = window.PROVA_TOUR; if (!T) return;` verhindert TypeError wenn PROVA_TOUR zwischen Init und Tooltip-Render entfernt wurde.

- **P5.B3** `bescheinigungen.html` entfernt:
  - Sidebar-Link in `nav.js` raus, `bescheinigungen.html` + `bescheinigungen-logic.js` `git rm`, `sw.js` APP_SHELL um die zwei Einträge bereinigt, `netlify.toml` 301-Redirect `/bescheinigungen.html` und `/bescheinigungen` → `/dashboard.html`.

- **P5.B4** `jahresbericht.html` innerHTML-Error:
  - Pre-Flight-Audit deckte auf: HTML hatte NUR Topbar/Drawer/Bottom-Nav, der gesamte Report-Content-Section fehlte. Logic warf "Cannot set properties of null" bei jedem `getElementById('loading-state').innerHTML`.
  - HTML-Patch: `<main>`-Section mit allen vom Logic-File erwarteten Containern (loading-state, report-content, year-bar, bericht-subtitle, kpi-grid, monat-chart, monat-labels, art-chart) eingefügt.
  - Logic-Patch: Alle `getElementById`-Calls über `_jb$()`-Helper + Null-Guard. Sections die in der HTML noch fehlen (status-chart, zeit-card-body, faelle-tbody, etc. — geplant für Sprint 13) werden übersprungen statt zu werfen.

- **P5.B5** Unklar-Tabellen geklärt:
  - `tblaboaRkJjrX3Z4J` = PASSWORD_RESET_TOKENS (token_hash, sv_email, expires_at, …)
  - `tbli4t2WDLeBfuBB2` = LOGIN_ATTEMPTS (email, success, ip_address, failure_reason)
  - Beide bewusst NICHT in `airtable.js`-Whitelist (Backend-only, Direkt-Access via login.js / password-reset-request.js mit env-PAT). Kommentar in `airtable.js:55-58` dokumentiert das korrekt — kein Code-Change.

**Block C — Tests + Audit:**

- **P5.C1** Playwright-Tests an HMAC-Token-Workflow angepasst:
  - 7 Test-Files (01-login, 02-authenticated-smoke, 03-core-workflow, 04-e2e-workflow, 05-security, 06-mobile-ortstermin, 07-doppelklick) bekommen im `addInitScript` einen mock-HMAC-Token: `base64url(JSON-payload).mocksig`.
  - `verifyProvaToken` (Client) prüft nur Format + exp — Sig wird server-seitig geprüft, irrelevant für Page-Render-Tests. `mocksig` ist offensichtlich falsch, sodass Tests die versehentlich Function-Calls machen, klar an 401 erkennen wann's an der falschen Sig liegt.

- **P5.C2** `AUDIT-REPORT.md` Status-Spalte:
  - Alle 36 Findings durchgegangen. **26 ✅ erledigt**, **8 🟡 akzeptiert** (Bridge / dokumentiert), **2 🔴 offen** (Finding 1.7 BASE_ID-Zentralconfig → Sprint 18+; Finding 3.2 Import-Assistent-localStorage → Sprint 5 Datenmigration).

### Cache-Versionen

`prova-v211` (Start) → `v212` (P5.A2/A3 sanitize) → `v213` (P5.B1-B5).

Vorher P5: P4B.8c-Hotfix `v210→v211`.

### Lessons Learned

- **Pre-Flight-Audit ist Gold:** B4 wäre als „Date-Range-Bug" misdiagnostiziert worden, wenn ich nicht erst die HTML auf existierende IDs gegrept hätte. Tatsächlich fehlte die ganze Content-Section. Marcels Pre-Flight-Regel (`grep -l "<script.*[file].*>" *.html`) hat sich erneut bewährt.
- **Schema-Query first:** B1 wurde via Airtable-MCP `list_tables_for_base` in 30 Sekunden gefixt statt in 30 Minuten Browser-DevTools-Trial-and-Error. `Status`/`status`-Schreibweise war auf den ersten Blick nicht offensichtlich.

---

## Sprint 03 — S-SICHER P4B · Function-JWT + Rate-Limit

**Tag:** `v180-ssicher-p4b-done` · **Stand:** 26.04.2026 · **Letzter Commit:** `ad526ea`

### Was deployed wurde

- **Drei neue Backend-Libraries** unter `netlify/functions/lib/`:
  - `jwt-middleware.js` — `requireAuth(handler)` Wrapper. Liest Bearer-Token aus `Authorization`-Header oder Cookie `prova_auth=…`, verifiziert via `lib/auth-token`, packt `tokenPayload` als `context.user` und `context.userEmail` in den Handler. OPTIONS-Preflight wird ohne Auth durchgereicht. Mismatch → 403, fehlend/invalid → 401.
  - `rate-limit-user.js` — In-Memory Rate-Limit-Bucket pro Token-sub. `check(userEmail, max, windowSec, opts)` retourniert `{allowed, retryAfter}`; Lib loggt selbst Audit-Eintrag bei Hit, wenn `opts.event` und `opts.functionName` mitgegeben werden. Bucket-Sharing: provisional + verified + emergency-Tokens teilen sich denselben Bucket per Email — by design, verhindert Notfall-Token-Bypass.
  - `auth-resolve.js` — `resolveUser(event)` mit Token + optionalem `body._userEmail`-Cross-Check (Mismatch → 403). `logAuthFailure(reason, event, extras)` mit pseudonymisierter Email (ProvaPseudo.apply) für Konsole + AUDIT_TRAIL-Insert (typ=`Auth-Required` / `Auth-Mismatch` / `Rate-Limit-Hit` / `Origin-Block`).

- **JWT-Pflicht in 24 user-protected Functions:**
  - Mit Rate-Limit: `ki-proxy` (20/60s), `whisper-diktat` (10/60s), `foto-captioning` (30/60s)
  - Ohne Rate-Limit: `foto-upload`, `airtable`, `akte-export`, `audit-log`, `brief-pdf-senden`, `brief-senden`, `dsgvo-auskunft`, `dsgvo-loeschen`, `emails`, `foto-anlage-pdf`, `foto-pdf`, `jahresbericht-pdf`, `ki-statistik`, `mahnung-pdf`, `mein-aktivitaetsprotokoll`, `rechnung-pdf`, `smtp-senden`, `stripe-checkout`, `stripe-portal`, `zugferd-rechnung`
  - Mit zusätzlichem Origin-Check: `push-notify` — nur Calls von `prova-systems.de`/`app.`/`admin.`/`www.`/`netlify.app`/localhost werden akzeptiert. Origin-Block → 403 ohne Hint warum.

- **`airtable.js` STRICT-Modus:** `body._userEmail`-Pfad und Netlify-Identity-`clientContext.user.email`-Pfad komplett entfernt. HMAC-Token ist Pflicht. Schliesst Audit-Finding 1.1 endgültig (kompletter Multi-Tenant-Bypass via curl + `_userEmail`-Body war Sprint-02 nur als Bridge gelassen).

- **Frontend `provaFetch`-Helper** (`prova-fetch-auth.js`, neu) injiziert `Authorization: Bearer <prova_auth_token>` automatisch in jeden Call zu `/.netlify/functions/`. Bei 401 wird `prova_auth_token` + `prova_user` + `prova_session_v2` gelöscht und zur Login-Page weitergeleitet (`?reason=token_expired`). Sweep über 52 Frontend-JS-Files: alle `fetch('/.netlify/functions/...')` → `provaFetch('...)`. Verifikations-Grep nach Sweep komplett leer. 54 HTML-Dateien laden den Helper über `<script src="prova-fetch-auth.js">` vor `auth-guard.js`.

- **`auth-guard.js` V2-Session weg.** `isValidSession()` von ~70 auf ~15 Zeilen reduziert. HMAC-Token (`prova_auth_token`) ist einziger Auth-Anker. `provaCreateSession` bleibt als no-op-Stub für Backward-Compat (app-login-logic.js ruft das defensiv hinter typeof-Guard). `provaGetSession` liefert jetzt `prova_user` (statt das tote `prova_session_v2`-Objekt). Schliesst Audit-Findings 7.1 / 7.2 / 7.3 endgültig.

### Cache-Versionen

`prova-v208` (Start) → `v209` (P4B.8 provaFetch + Sweep) → `v210` (P4B.9 V2-Session weg).

### Live-Verifikation nach Deploy

```
curl -X POST /.netlify/functions/airtable -d '{"method":"GET","path":"/v0/.../..."}'
→ 401 "Authentifizierung erforderlich"

curl -X POST /.netlify/functions/ki-proxy -d '{}'
→ 401 "Authentifizierung erforderlich"
```

### Akzeptanz-Test-Plan für Marcel (morgen früh)

1. `curl` ohne Token gegen ki-proxy → 401 ✓ (oben verifiziert)
2. `curl` mit Garbage-Token (z.B. `Authorization: Bearer foo`) → 401
3. `curl` mit Notfall-Token gegen ki-proxy → 200 / 4xx je nach Body, kein 401
4. 21 schnelle ki-proxy-Calls in 60s → 21. = 429 + `Retry-After`-Header
5. `fetch` zu push-notify mit `Origin: https://evil.example.com` → 403
6. Browser-App-Tour: Inkognito → Dashboard / Akte / Diktat / Foto / Archiv / Einstellungen / Rechnungen / Termine / Kontakte. Network-Tab muss `Authorization: Bearer eyJ…` in JEDEM `/.netlify/functions/`-Call zeigen. Console keine roten Errors.
7. AUDIT_TRAIL Tabelle: Einträge `typ=Auth-Required` aus Tests 1+2 sichtbar; `typ=Rate-Limit-Hit` aus Test 4.

### Nicht durch — explizit deferred

- **`pdf-proxy.js`** hat eigenen signed-URL-Mechanismus für GETs (Token im Query). POST-only-requireAuth wäre strukturell OK, aber riskant ohne expliziten Test des bestehenden Download-Flows → Sprint 04.
- **`termin-reminder.js`** vermutlich Cron / Make.com-Webhook, nicht user-getriggert → braucht eigene Auth-Strategie (geteiltes Secret oder Stripe-style Signatur).
- **`make-proxy.js`** Make.com-Webhook mit eigener Auth → separate Auth-Strategie.
- **`normen.js` / `normen-picker.js`** Read-only Katalog, öffentlich zugänglich → kein User-Bind, JWT-Pflicht würde Anonyme blocken.
- **Identity-Recovery-Flow:** wenn Marcel nach `recovery_token` im URL-Hash via Identity-Widget passwort zurücksetzt, hat er KEINEN HMAC-Token. Er muss sich danach ein zweites Mal einloggen (über das normale Login-Form). Akzeptiert für Pilot, AUTH-PERFEKT 2.0 macht's sauber.

### Vergangene Iterationen / Lessons Learned

- **P4B.1 → P4B.1d Hotfix.** Initial waren Audit-Logs in den Caller-Functions (ki-proxy etc.) verteilt. Marcel verlangte mid-sprint dass das in den Libs zentral passiert (rate-limit-user lib ruft `logAuthFailure` selbst, alle Caller passen `{event, functionName}` als opts). Plus Pseudonymisierung der Emails vor jedem Logging (Defense-in-Depth gegen Angreifer-Payloads in den Logs). Hotfix bedeutet: keine Aenderung von Funktionalitaet, nur Verlagerung der Verantwortung in die Libs.
- **18 Functions in P4B.7b als Sammel-Commit.** Marcel's Plan listete `ki-proxy/whisper/foto-*/push-notify/airtable` einzeln und den Rest als `~20 weitere Functions`. Sammel-Commit-Pattern ist einfacher zu reviewen als 18 separate Commits, gleicher Effekt.

---

## Sprint 02 — S-SICHER P4A · Auth-Fundament

**Tag:** `v180-ssicher-p4a-done` · **Stand:** 26.04.2026 · **Letzter Commit:** `2dfbc9d`

### Was deployed wurde

- **HMAC-Token-Infrastruktur live** — `lib/auth-token.js` (sign/verify mit `AUTH_HMAC_SECRET` aus Netlify ENV, base64url-Format `payload.signature`, timing-safe Compare). Token-TTL 7 Tage normal, 90 Tage Notfall.
- **Login-Endpoints** — `auth-token-issue` (POST `{email,password}` → HMAC-Token + SV-Daten aus Airtable; provisional-Fallback für unconfirmed Identity-Accounts als Brücke bis AUTH-PERFEKT 2.0) und `auth-token-verify` (POST/GET Token-Verify für Cross-Function-Use).
- **auth-guard.js komplett umgestellt** — primärer Auth-Anker ist jetzt `prova_auth_token` (HMAC, client-seitiger Format+exp-Check, echte Verify server-seitig). V2-Session bleibt als sekundärer Pfad. Legacy-Migration aus `prova_user`-localStorage **entfernt** (Audit-Finding 7.1, "Schwerstes Auth-Problem im Code").
- **Browser-seitiger Identity-Bypass geschlossen** — `app-login.html` nutzte einen Inline-`window.login`, der auf Identity-400 + "confirm" eine eigene Session ohne Server-Token erzeugte (Finding 7.2). Login geht jetzt ausschliesslich über `auth-token-issue`. Provisional-Logik lebt server-seitig (Brücke).
- **Inline-Login-Architektur aufgeräumt** — `app-login.html` Inline-Scripts (170 Zeilen) externalisiert nach `app-login-logic.js`. `app-login.html` jetzt 423 statt 592 Zeilen. `netlifyIdentity.on('login')`-Handler entfernt (Parallel-Pfad weg, nur noch ein Login-Pfad).
- **airtable.js Hybrid-Cross-Check** — neue `resolveUser(event)`-Funktion liest HMAC-Token aus `Authorization: Bearer …` oder Cookie `prova_auth=…`, verifiziert server-seitig, vergleicht `token.sub` gegen `body._userEmail` und `clientContext.user.email`. Mismatch → 403 + AUDIT_TRAIL-Eintrag (typ=`Auth-Mismatch`). Token-sub gewinnt.
- **`_userEmail`-Bridge bleibt** — Sprint 03 (P4B) entfernt den Pfad komplett, dann ist HMAC-Token PFLICHT für jede Function.
- **Notfall-Bookmarklet** — `scripts/generate-emergency-token.js` (90-Tage-Token, `emergency:true`-Marker für AUDIT-Filter). Token wird NIE ins Repo geschrieben — Marcel speichert selbst im Passwort-Manager. Doku in `docs/EMERGENCY-BOOKMARKLET.md`.
- **CLAUDE.md Regel 27** — neue Pflicht: jede Frontend-JS/CSS-Änderung erfordert `sw.js` CACHE_VERSION-Bump im selben Commit (kein Sammel-Bump). Nach verlorenem Block-B-Anlauf hart festgeschrieben.

### Cache-Versionen

`prova-v204` (Start) → `v205` (P4A.4) → `v206` (P4A.5) → `v207` (P4A.5-v2) → `v208` (P4A.6).

### Nicht durch — explizit ausgeklammert

- **Identity-Confirmation-Hintertür** — Marcels Account ist in Netlify Identity *unconfirmed*. `auth-token-issue` hat einen Provisional-Fallback (Identity-400 → Airtable-SV-Lookup → Token mit `verified:false, provisional:true`). Das ist **Brücke**, nicht Endzustand. AUTH-PERFEKT 2.0 (nach Pilot-Phase) baut den Account-Lifecycle korrekt: Bestätigungs-Mail + verifiziertes Login als einziger Pfad. Bis dahin: Provisional-Marker im Token, Frontend kann ein "Bitte E-Mail bestätigen"-Banner darauf bauen.
- **HMAC-Token-only-Auth** — V2-Session als sekundärer Auth-Pfad in `auth-guard.js` bleibt vorerst, weil das Identity-Widget bei Recovery-Reset einen Login triggern kann, der dann über V2-Session aufgefangen wird. Sprint 03 (P4B) entfernt V2 und macht HMAC-Token zum einzigen Anker.
- **`_userEmail` aus airtable.js** — Bridge bleibt bis Sprint 03. Cross-Check schlägt schon bei Mismatch zu, also ist der Schutz aktiv. Vollständige Entfernung wenn alle Frontend-Calls auf Bearer-Header umgebaut sind.

### Vergangene Iterationen / Lessons Learned

- **Block B v1 fehlgeschlagen** — erste Implementierung von P4A.5 modifizierte `app-login-logic.js`, ohne zu verifizieren ob die Datei überhaupt geladen wird. Ergebnis: `app-login.html` lud die Datei nicht via `<script src=…>`, der echte Login lebte inline in der HTML, P4A.5-Edits hatten null Effekt. Rollback durchgeführt, P4A.5-v2 als saubere Externalisierung.
- **Drei Diagnose-Hypothesen** (SW-Cache / `ladePaketUndWeiterleiten` / CORS) waren alle ohne reale Daten — das Problem war ein Vierter, den keine der Hypothesen abdeckte: Editor-Target war tote Datei. Lehre: vor Code-Änderungen `grep -rln "<filename>" --include="*.html"` als Sanity-Check, mindestens.

---

---

# MEGA²⁰-²⁴ Pilot-Hardening-Phase (08-09.05.2026)

## MEGA²³ Nacht-Marathon (08-09.05.2026 nacht)
**Tests:** 1565 → 1670 (+105 neu, 9 fixed) | **sw.js:** v282 → v284 | **Commits:** 6

### Block 1 — Beweisbeschluss-Upload-UI ✅
- `lib/beweisbeschluss-upload.js` (UMD-Pattern, ~370 LOC)
- `gericht-auftrag.html` Integration mit Section "📄 Beweisbeschluss-PDF — Pattern-Extraktion"
- 41 Tests (validate, fileToBase64, renderPreview mit XSS-Escape, collectEdits via DOM-Shim, attach-flow mit fetchImpl-Mock)

### Block 2 — Disclaimer-Wiring ✅
- 7 Pages `<script src="/lib/prova-disclaimer.js" defer>`: stellungnahme, ortstermin-modus, akte, app, freigabe, gutachterliche-stellungnahme, wertgutachten
- 3 Inline-§407a-Disclaimer (class="prova-ki-disclaimer") + Tooltip-title-Attribute auf KI-Buttons
- 21 Tests

### Block 3 — Admin-Cockpit Settings-Tab ✅
- 8. Tab in admin-dashboard.html: System-Info + Feature-Flags + ENV-Status + Sprint-Historie
- SW-Version-Probe via /sw.js?probe= Fetch
- 10 Tests

### Block 4 — KI-Stats Frontend-Charts ✅
- `lib/admin-ki-stats-frontend.js` (UMD): aggregateModelDistribution, aggregateCostsPerUser (Top5), aggregateFotoUsage (10/Monat-Limit), aggregateDiktatStats
- 4 neue Karten in Admin-Cockpit "KI & Workflow"-Tab + Range-Selector
- 19 Tests

### Block 5 — Toast-Migration W5+W16 dual-Pattern Fix ✅
- 7 Pre-existing Test-Fails repariert via `if (window.ProvaUI && window.ProvaUI.toast) ProvaUI.toast(); else (window.provaAlert || alert)();`
- 6 Files: admin-dashboard, erechnung, gericht-auftrag, gutachterliche-stellungnahme, stellungnahme, rechnungen-logic.js

### Block 11 — Email-Notify Login-as-User (DSGVO) ✅
- `netlify/functions/admin-impersonate.js` erweitert mit user_agent + admin_ip in audit_trail
- notifyImpersonation() Helper mit SMTP via nodemailer
- ENV-Gate IMPERSONATION_NOTIFY=on, fire-and-forget
- DSGVO-Hinweis (§32 BDSG / Art. 5 DSGVO) im Email-Body
- 14 Tests

### Block 12 — PILOT-LAUNCH-CHECKLIST ✅
- Erweitert von 32 auf 60 Items in 8 Sektionen
- Neue ENV-Vars (KI_VISION_PROVIDER, IMPERSONATION_NOTIFY, SMTP-Config)
- Stripe Coupon FOUNDING-30, Migration 11, npm install pdf-parse

### Block 13 — Wakeup-Briefing ✅
- `NACHT-MARATHON-REPORT-V2.md` mit GO/NO-GO + Action-Items
- `docs/diagnose/KNOWN-ISSUES.md` mit 5 deferred Issues

## MEGA²⁴ Tag-Marathon (09.05.2026 morgen)
**Tests:** 1670 → 1763 (+93 User-Journey) | **sw.js:** v284 → v285 (geplant) | **Commits:** 9+

### Block 6 — User-Journey-Tests ✅
- 8 End-to-End-Stories in `tests/user-journey/`
- 93 Tests gesamt (Plan war 60+)
- 01-signup-onboarding, 02-mode-a, 03-mode-b, 04-mode-c, 05-foto-vision-claude, 06-beweisbeschluss-upload (Lib-integriert), 07-rechnung-pdf, 08-admin-impersonate

### Block 7 — Security-Audit ✅
- `docs/diagnose/SECURITY-AUDIT-2026-05-09.md`
- 0 Critical/High, 2 Medium (innerHTML-Audit empfohlen, Auth-Coverage-Liste)
- Empfehlung: GO-MIT-FIXES

### Block 8 — Performance-Audit ✅
- `docs/diagnose/PERFORMANCE-AUDIT-2026-05-09.md`
- 56 Lambdas alle < 32 KB, 213 DB-Indices
- Quick-Wins: Sentry lazy-load, App-Icons prunen, sw.js APP_SHELL prunen
- Empfehlung: GO

### Block 9 — Documentation-Sync ✅
- PROVA-SPRINTS-MASTERPLAN.md erweitert (MEGA²⁰-²⁴)
- PROVA-VISION-MASTER.md erweitert (Pricing FINAL, KI-Stack FINAL, Roadmap)
- PROVA-ARCHITEKTUR-MASTER.md erweitert (F-Slot-Mapping, Triple-Mode, KI-Service-Abstraction, Admin-Cockpit 8 Tabs, Beweisbeschluss-Foundation, Disclaimer-System)
- CHANGELOG-MASTER.md (dieser Eintrag)

