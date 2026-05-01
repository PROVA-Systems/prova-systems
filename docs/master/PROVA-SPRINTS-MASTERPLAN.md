# PROVA Sprints Masterplan

**Stand:** 01.05.2026 abend (Tag 7)
**Single Source of Truth** — siehe `docs/master/README.md`

---

## ⚠️ Wichtige Drift-Notiz

`masterplan-v2/00_MASTERPLAN.md` (25.04., Tag 0) sah einen **21-Tage-Plan mit Sprints SPRINT-01 bis SPRINT-20** vor. Phase A war Security-Fundament (DSGVO, Auth, Rate-Limit) auf Airtable+Make-Stack.

**Realität ab 27.04.:** Marcel hat einen **Voll-Supabase-Refactor** beschlossen (Sprint K-1.0 bis K-1.5). Das war **NICHT in masterplan-v2/ vorgesehen**. Stattdessen wurden die Sprints umbenannt zu K-Sprints.

**Konsequenz:**
- `SPRINT-01` (P3 DSGVO) → done als S-SICHER P3
- `SPRINT-02` (P4A Auth) → done als S-SICHER P4A
- `SPRINT-03` (P4B JWT) → done als S-SICHER P4B
- `SPRINT-04` (P5 Reste) → done als S-SICHER P5
- **SPRINT-05** und folgende → **gepivotet** zu K-1.0 (Supabase-Foundation), K-1.1, K-1.2, K-1.3, K-1.4, K-1.5
- **SPRINT-19** (APP-LANDING-SPLIT) wurde Tag 7 statt Tag 20 → **vorgezogen**

Diese Datei dokumentiert die **echte Sprint-Historie** aus Repo-Wahrheit.

---

## Sprint-Historie (chronologisch, älteste zuerst)

### Phase A — Security-Fundament (Tag 1-4, ~21h, DONE)

| Sprint | Tag | Inhalt | Tag |
|---|---|---|---|
| S-SICHER P3 | ~1 | DSGVO Server-Pseudonymisierung (alle KI-Pfade client+server) | – |
| S-SICHER P4A | ~2 | Auth-Fundament: HMAC-Token, Login-Endpoints, Identity-Bypass geschlossen | `v180-ssicher-p4a-done` |
| S-SICHER P4B | ~3 | Function-JWT + Rate-Limit (24 Functions geschützt) | `v180-ssicher-p4b-done` |
| S-SICHER P5 | ~4 | Reste + Seiten-Audit-Fixes (pdf-proxy, briefvorlagen-sanitize, honorar-tracker, jahresbericht) | (ausstehend) |

**Detail-Log:** `CHANGELOG-MASTER.md` (Repo-Root, Stand 26.04.)

### Phase Pivot — Voll-Supabase-Refactor (Tag 5-7, K-Sprints, DONE)

Nach Marcel-Decision 27.04. (Voll-Supabase):

| Sprint | Inhalt | Tag |
|---|---|---|
| K-1.0 | Supabase-Foundation (Auth, Storage, Edge Functions, Frontend-Lib `lib/`-Stack) | – |
| K-1.1 | Migrations-Pipeline (Airtable → Supabase) | – |
| K-1.2 | Edge Functions (8 Stück, ersetzt Make-Scenarios) | – |
| K-1.3 | Frontend-Pilot Kurzstellungnahme | – |
| K-1.4 | Frontend-Refactor 11 Auftragstyp-Pages + Bürotools | – |
| K-1.5 | Cutover + Make-Deaktivierung | – |
| K-UI | Pure-Supabase-Pages (profil-supabase, kontakte-supabase, briefe, gutachterliche-stellungnahme, onboarding-supabase) | – |

**Detail-Quelle:** `docs/archiv/sprint-prompts/SPRINT-K-*-COMPLETE.md` (verschoben in Cleanup-Sprint)

### Phase 4 — APP-LANDING-SPLIT (Tag 7 vorgezogen, war Tag 20 geplant, DONE)

| Sprint | Inhalt | Datum | Tag/Commit |
|---|---|---|---|
| Phase 2 — Inventory | 129 HTML-Pages klassifiziert | 30.04. nachmittag | – |
| Phase 3a — netlify.toml v6.0 | Cross-Domain-Redirects host-conditioned | 30.04. nachmittag | `a37339b` |
| Phase 3b — _redirects | Path-only Aliase | 30.04. nachmittag | `fb46560` |
| Phase 3c — login.html | Neue kanonische Login-Page (PROVA-Branding) | 30.04. nachmittag | `e39c7b6` |
| Phase 3d — auth-guard LOGIN_PAGE | `/login` als kanonische URL | 30.04. nachmittag | `5c86d71` |
| Hotfix redirect-precedence | App-Pfade host-spezifisch in netlify.toml | 30.04. abend | `0d9b206` |
| Phase 4 Final-Merge | sw.js v245, alle Phase-3-Branches in main | 30.04. abend | **Tag `v200-app-landing-split-done`** |

**DONE-Doc:** `docs/sprint-status/PHASE-4-CUTOVER-DONE.md`

### Cutover Block 3 — Login-Loop-Fix (Tag 7 nachts, DONE)

| Sub-Sprint | Inhalt | sw.js | Commit |
|---|---|---|---|
| Phase B-1 | Bridge-Layer + Belt-and-Suspenders Loop-Counter | v248 | `e091986` |
| Phase B-2 — Critical 11 | 11 Hybrid-Pages mit Inline-IIFE-Guard migriert auf `lib/auth-guard.js` | v248 | `0fb80d8` |
| Phase B-2 — Tier 2 | 40 weitere Pages (ohne Inline-Guard) migriert | v248 | `35f661d` |
| Hotfix login-redirect-default | `/dashboard` statt Test-Page | v246 | `c655c29` |
| Hotfix-2 disable auto-redirect | Anti-Loop in auth-supabase-logic.js | v247 | `56db6f4` |

**DONE-Doc:** `docs/sprint-status/CUTOVER-BLOCK-3-DONE.md` · **Sprint-Log:** `docs/sprint-status/NACHT-SPRINT-LOG.md`

### Option C — Server-Side JWT-Verify (Tag 7 mittag, DONE)

Migration vom Bridge-Hack zur Industry-Standard Token-Verifikation.

| Komponente | Was | sw.js | Commit |
|---|---|---|---|
| `netlify/functions/lib/supabase-jwt.js` (NEU) | jose-JWKS-Verify (~107 Z) | – | – |
| `lib/auth-resolve.js` | async, dual-verify (Supabase-First, HMAC-Fallback) | – | – |
| `lib/auth-guard.js writeLegacyBridge` | echter `session.access_token` (kein Hack mehr) | – | – |
| `prova-fetch-auth.js` | Defense-in-Depth: Refresh-vor-Logout | – | – |
| sw.js | bump | v249 | – |
| Final Merge | Branch `fix/option-c-supabase-jwt-server-side` | – | `3b27cd1` |

**DONE-Doc:** `docs/sprint-status/OPTION-C-DONE.md` · **Inventur:** `docs/sprint-status/OPTION-C-INVENTORY.md`
**Tag pending:** `v202-jwt-server-verify` (wartet auf Marcel-Test grün)

### Parallel-Sprint Tag 7 mittag (3 Branches gepusht, KEIN Merge)

| Branch | Inhalt | Status |
|---|---|---|
| `cleanup/cluster-review-auto` | 20 DEAD-Pages weg (-3350 LOC), 3 BLOCKED dokumentiert | pending Marcel-Review |
| `docs/ki-prompts-master-skeleton` | `KI-PROMPTS-MASTER.md` (Sprint-9-Vorbereitung) | pending Marcel-Review |
| `fix/pricing-discrepancy` | `index.html` 25 → 30 Gutachten | pending Marcel-Review |

**DONE-Doc:** `docs/sprint-status/PARALLEL-SPRINT-DONE.md`

### Master-Doku-Konsolidierung Tag 7 abend (DIESER Sprint)

| Branch | Inhalt | Status |
|---|---|---|
| `docs/master-plan-konsolidiert` | `docs/master/` mit 5 Master-Files + README · Drifts dokumentiert · Selbst-Pflege-Pflicht | **wird in main gemerged** |
| `docs/post-option-c-cleanup-and-update` | obsolet — TODO-Skeletons durch diese Konsolidierung ersetzt | **wird gelöscht** |
| `docs/post-option-c-master-update` | obsolet — cherry-picked + ersetzt | **wird gelöscht** |

---

## Phase B — Produkt-Core (NEXT, post-Option-C)

Nach abgeschlossener Auth-Foundation: Feature-Polish bis Pilot-Ready.

### Pending Sprints (in Reihenfolge)

| Sprint | Aufwand | Inhalt | Voraussetzung |
|---|---:|---|---|
| **06b/06c** | 4-6h | Auftrag-Neu-Wizard Skeleton + Live-Save (LocalStorage → DB-`createDraft`) | Schema-Migration `PLANNED_06b_auftraege_extend.sql` applizieren · UX-Entscheidung COCKPIT vs Sidebar-Split-Button |
| **04e** | 5-7h | Verknüpfungen MEGA — Akten ↔ Beteiligte ↔ Dokumente | nach 06c |
| **04c** | 4-6h | Globale Suche (Volltext über Akten + Kontakte + Dokumente) | – |
| **04d** | 6-8h | Bescheinigungen Top 12 (häufigste SV-Bescheinigungen als Vorlagen) | – |
| **05 P6** | 3-4h | Cookie + iCal — Termin-Export, Cookie-Banner DSGVO | – |
| **09a** | 8h | KI-Werkzeug Kern: §6-Editor, Konjunktiv-II (GPT-4o!), Halluzinations-Check, §407a-Check | `KI-PROMPTS-MASTER.md` ausgefüllt |
| **09b** | 7-9h | KI-Werkzeug Zusatz: Kommas, Grammatik, Absätze, Fachsprache, KI-Kosten-Tracking | nach 09a |
| **10** | 7-9h | Auftragstypen-Stufenmodell + Externe Docs + Aktenzeichen-3-Felder | nach 09 |
| **11** | 9-11h | Workflows + Fristen-System (5 Pipelines, 8 Frist-Typen) + 5 Dashboard-Widgets | nach 10 |
| **12** | 10-12h | Rechnungen + Bescheinigungen-Workflow (3 PDFMonkey + 3 Briefvorlagen) | nach 11 |

### Ungefähr-Aufwand Phase B

**~60-80h** Code-Zeit. Bei 4-6h/Tag = **~2-3 Wochen**.

---

## Phase C — Pilot-Onboarding-Vorbereitung

| Item | Aufwand | Status |
|---|---:|---|
| Stripe-Webhook-Secret erneuern | 30 min | ⏳ |
| Make-Scenario T3 (Trial-Reminders) manuell aktivieren | 30 min | ⏳ |
| Make-Scenario F1 (Founding-Coupon `FOUNDING-99`) manuell aktivieren | 30 min | ⏳ |
| Pilot-Onboarding-Email-Templates | 2-3h | ⏳ |
| AVV-Vertrag pro Pilot-SV elektronisch signieren | n/a (per SV) | ⏳ |
| Erste 2-3 Pilot-SVs identifizieren + kontaktieren | n/a (Marcel) | ⏳ |
| Demo-Fall `SCH-DEMO-001` automatisch beim Onboarding | 2-3h | ⏳ (war Sprint 20 Plan) |

---

## Phase D — Cluster-Review Cleanup (laufend)

Aus `docs/sprint-status/CLUSTER-REVIEW-AUTO.md` (52 DEAD-CANDIDATE-Pages):

| Item | Anzahl | Status |
|---|---:|---|
| **20 SAFE-DELETE** Pages weg | 20 | ✅ Branch `cleanup/cluster-review-auto` (pending Merge) |
| **3 BLOCKED** Pages entscheiden (`ortstermin-arbeitsblatt`, vorlage-10/11) | 3 | ⏳ Marcel-Review |
| **2 pdfmonkey-Templates** entscheiden (DELETE oder `docs/templates-source/`) | 2 | ⏳ Marcel-Review |
| **18 DELETE-AFTER-WIZARD** Pages | 18 | ⏳ nach `app.html`-Migration (Cutover-Block-3 Tier A war anders skopiert) |
| **2 KEEP-DEPRECATE** Pages (`briefvorlagen.html`, `kontakte.html`) | 2 | ⏳ nach Cutover-Sweep der JS-Refs |
| **6 INVESTIGATE** Pages (vorlage-09, mahnung-1/2/3, mahnwesen, schnelle-rechnung) | 6 | ⏳ Marcel-Klärung |

---

## Phase E — Compliance & Operations (Plan v2.1, post-Pilot ergänzen)

| Sprint | Inhalt | Aufwand |
|---|---|---:|
| 15 | Operations: Sentry, Backup, Status-Page, Stripe-Secret-Rotation | 6-7h |
| 16 | Compliance I: §407a-Pre-Send-Checkbox, EU AI Act PDFs, AGB-Versionierung, AVV-Update | 6-7h |
| 17 | Compliance II: DSGVO Art. 15/17/20 End-to-End, Einwilligungs-Management | 4-5h |
| 18 | AUTH-COCKPIT (`admin.prova-systems.de`) + KI-Kosten-Widget pro User | 7-8h |
| 20 | Pre-Audit + Demo-Fall + Übergabe | 6-7h |

> ⚠️ **Drift-Notiz:** Sprint 19 (APP-LANDING-SPLIT) war Tag 20 geplant, wurde Tag 7 vorgezogen. Sprint-Liste oben übernimmt die alte Nummerierung — die Reihenfolge ist nicht zwingend.

---

## Phase F — Post-Pilot Backlog

Nach erfolgreichem 10-SV-Pilot:

- **AUTH-PERFEKT 2.0** (Sprint ~22?) — Multi-Role-System, Workspace-Switcher, Identity-Confirmation-Flow
- **Legacy-Cleanup** — `lib/auth-token.js` HMAC-Fallback entfernen wenn alle Functions Supabase-only · `prova-fetch-auth.js` durch `lib/data-store.js` ersetzen · `auth-guard.js` (Legacy root) löschen
- **Headless-Login-Smoke-Test** (Playwright) in `scripts/smoke-test-cutover.sh`
- **Logic-Files modernisieren** — `localStorage.prova_sv_email` → `await getCurrentUser()`
- **Admin-Subdomain** (`admin.prova-systems.de`) live
- **Konfigurierbare Dashboard-Widgets** (Drag&Drop + Toggle)
- **Tier-2-Widgets:** KI-Tipps, Norm des Tages, Persönliche Stats, Foto-Galerie
- **Hilfe-Erklär-Bereiche** (Typ B) + Live-Hilfe-Button (Typ C)
- **Google/Outlook-Kalender-Sync** (heute: Make-T3)
- **Konfigurierbare Live-KI-Funktionen** (mehr Profi-Modus-Granularität)

---

## Tag-Liste (Major-Tags chronologisch)

| Tag | Datum | Inhalt |
|---|---|---|
| `v180-ssicher-p2-done` | ~24.04. | S-SICHER P2 Block |
| `v180-ssicher-p2-6-done` | ~24.04. | S-SICHER P2.6 |
| `v180-ssicher-p4a-done` | 26.04. | Auth-Fundament |
| `v180-ssicher-p4b-done` | 26.04. | Function-JWT + Rate-Limit |
| `v200-app-landing-split-done` | 30.04. abend | Phase 4 Cutover komplett |
| `v201-loop-eliminated` *(geplant)* | 01.05. nachts | Cutover Block 3 (NICHT gesetzt — Marcel-Test schickte zu Option C) |
| `v202-jwt-server-verify` *(pending)* | 01.05. mittag | Option C deployed, wartet auf grünen Marcel-Test |

---

## sw.js Cache-Version-Historie

| Version | Datum | Anlass |
|---|---|---|
| v204-v211 | ~Apr 25-26 | S-SICHER P4A/P4B |
| v240-v241 | ~K-UI | Profil-Briefkopf, Kontakte-Stamm/Vorgangsdaten-Korrektur |
| v243-v244 | 30.04. | APP-LANDING-SPLIT 3d, nav.js Logout/Logo |
| v245 | 30.04. abend | Hotfix redirect-precedence |
| v246 | 01.05. morgens | Hotfix login-redirect-default |
| v247 | 01.05. morgens | Hotfix-2 disable auto-redirect |
| v248 | 01.05. nachts | Cutover Block 3: Bridge + Belt-and-Suspenders |
| **v249** | **01.05. mittag** | **Option C: Server-Side Supabase-JWT-Verify (jose JWKS)** |

---

## Offene Branches (nicht in main)

| Branch | Inhalt | Marcel-Action |
|---|---|---|
| `fix/option-c-supabase-jwt-server-side` | Option C Code (gemerged in main) | nach Tag setzen → löschen |
| `cleanup/cluster-review-auto` | -20 DEAD-Pages | mergen oder verwerfen |
| `docs/ki-prompts-master-skeleton` | KI-PROMPTS-MASTER.md im Root | mergen |
| `fix/pricing-discrepancy` | 25 → 30 Gutachten in index.html | mergen |
| `feature/sprint-06b-auftrag-neu-skeleton` | Wizard-Skeleton (UX-Entscheidung pending) | nach Entscheidung mergen |
| `docs/marcel-selbsthilfe` | Branch existiert nicht — File ist als untracked in Repo | committen wenn gewünscht |
| `docs/post-option-c-master-update` | obsolet (cherry-picked) | **löschen** |
| `docs/post-option-c-cleanup-and-update` | obsolet (Skeletons durch diesen Sprint ersetzt) | **löschen** |
| **`docs/master-plan-konsolidiert`** | **DIESER Sprint** | **mergen** |

---

## Stand-Notizen (chronologisch, neueste oben)

**01.05.2026 abend (Tag 7):**
- Master-Doku-Konsolidierung in `docs/master/` (dieser Sprint)
- Drifts vs `masterplan-v2/` dokumentiert
- Selbst-Pflege-Pflicht in `docs/master/README.md` etabliert

**01.05.2026 mittag (Tag 7):**
- Option C deployed (sw.js v249, Branch `fix/option-c-...` gemerged)
- 3 Parallel-Sprint-Branches gepusht (Cluster, KI-Prompts, Pricing)
- Master-Files-v2-Versuche (post-option-c-master-update + cleanup-and-update) abgebrochen wegen TODO-Skeletons

**01.05.2026 nachts (Tag 7):**
- Cutover Block 3 in main (sw.js v248)
- Login-Loop architektonisch eliminiert (51 Pages migriert)
- Bridge-Layer + Belt-and-Suspenders aktiv

**30.04.2026 abend (Tag 6):**
- Phase 4 APP-LANDING-SPLIT live (Tag `v200`)
- 9 Commits in main gemerged
- Smoke-Test 15/15 PASS

**27.04.2026:**
- CLAUDE.md v3.0 — Voll-Supabase-Refactor + Make-Out-Decision
- Sprint K-1.0 startet

**25.04.2026 (Tag 0):**
- `masterplan-v2/00_MASTERPLAN.md` v2.1 finalisiert (21-Tage-Plan)
- KI-Funktions-Garantie als Regel etabliert

---

*Sprints-Masterplan 01.05.2026 abend · Single Source of Truth · Aktualisiert von Claude Code nach jedem Sprint*
