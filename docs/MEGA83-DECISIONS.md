# MEGA⁸³ DECISIONS — Akte-Mission-Control + Freigabe-Wizard + Auth-Bridge

**Stand:** 2026-05-16 · Branch: `feat/mega83-akte-mission-control`
**Vorgaenger:** MEGA82 + MEGA82-Hotfix-1 (v3247, beide in main)
**Geliefert:** A + B + C + D + E = alle 5 Phasen in EINEM Pass (~6 Commits)

---

## Pre-Read ✅

- `CLAUDE.md` + MEGA82-DECISIONS + MEGA82-Hotfix-1-DECISIONS
- `akte-logic.js` — Helper-Layer-Verifikation (alles aus MEGA82 B.1+B.5+B.6+B.7 vorhanden)
- `akte.html` (950 Zeilen — Komplett-Replace zu invasiv → additiv-Refactor gewählt)
- `dashboard.html` MEGA82-Hotfix-1 als Pattern-Vorbild
- `freigabe.html` (801 Zeilen Legacy mit Tab-Navigation Dokument/Freigabe/Audit)
- `lib/supabase-client.js` — **wichtiges Pre-Read-Finding:** Cookie-Adapter ist DA (MEGA39)
- `lib/auth-guard.js`, `app-login-logic.js`, `prova-fetch-auth.js` — Legacy-Bridge-Pfade

---

## Drift im Spec vs. Realität

| Spec-Annahme | Tatsächlich | Action |
|---|---|---|
| Phase C "Cookie-Storage-Adapter neu bauen" | Adapter existiert seit MEGA³⁹ in `lib/supabase-client.js` | → Phase C reduziert zu "Audit + Bridge-Fix" |
| akte.html-Komplett-Replace | 950 Zeilen, invasiv | → Additiv-Refactor (DOM-Inject vor `akte-content`, alte sec-stamm+sec-timeline `display:none`) |
| freigabe.html refactor | 801 Zeilen mit Tab-System | → NEUE `freigabe-wizard.html` (alte freigabe bleibt Legacy) |

---

## Phase A — Akte-Mission-Control ✅ (alle 7 Sub-Items)

**Strategie:** Additiv-Refactor, nicht Komplett-Replace. Neue Zonen werden VOR `akte-content` eingefuegt, alte `sec-stamm` + `sec-timeline` werden auf `display:none` gesetzt (bleiben im DOM fuer Caller-Compat).

| Sub | Inhalt |
|---|---|
| A.1 | DOM-Restructure mit `.ak-stepper-wrap` + `.ak-stamm-bar` + `.ak-stamm-expanded` + `#ak-phase-section` + `.ak-sidebar` + `.ak-modal-overlay` |
| A.2 | `renderAktePhaseStepper(f)` visuell 4/3 Kreise mit done/active/pending States + Click-Handler |
| A.3 | `renderStammdatenBar(f)` kompakt+expandable, `toggleStammdatenBar`, `saveStammdatenField` mit jsonb-Path-Support |
| A.4 | `openAkPhaseModal`/`closeAkPhaseModal`/`confirmAkPhaseModal` ersetzt `confirm()` in `aktePrevPhase`+`akteNextPhase` |
| A.5 | `renderActivitySidebar(f)` 5 Sub-Blocks Promise.all (Activity Multi-Entity-Query mit `.or()` + Dokumente mit typ-Icons + Fristen Color-Code + Termine + Mehr-Drawer) |
| A.6 | `renderPhaseChecklist(f)` mit `AK_CHECKLISTS` (pro Flow+Phase Liste mit required/manual/action) + `_ak_smartDoneSet()` parallel-Query mappt auf done-keys (diktat/foto/skizze/termin/rechnung/versand/pdf/etc.) + manuelle Checks via `auftraege.details->phase_checks` JSONB |
| A.7 | Sticky-Footer (MEGA82 B.5) nutzt jetzt das neue Modal — Phase-Wechsel + Audit-Trail-Persist bleibt |

**Acceptance-Status:**
- AT-1 bis AT-30: alle Helper-Functions + DOM-Markup vorhanden
- AT-31 ff. nicht in Phase A — folgen in Phase B
- AT-23 Mobile-Sidebar als Drawer: aktuell kollabiert als unter-Main-Sektion via existierender `.akte-grid` CSS, eigener Drawer-Toggle DEFER MEGA84

---

## Phase B — Freigabe-Wizard ✅ (alle 5 Sub-Items)

**Neue Page:** `freigabe-wizard.html` (619 Zeilen). Standalone Focus-Mode-Layout ohne Sidebar.

| Sub | Inhalt |
|---|---|
| B.1 | Wizard-Architektur mit Progress-Bar oben, Step-Content-Toggle, Sticky-Footer mit Zurück/Step-Counter/Weiter |
| B.2 | Step 1 §407a-Auto-Pruefung — 5 Checks (Fachurteil/Eigenleistung/Konjunktiv-II-Marker/Kurzbeantwortung/KI-Disclosure), Critical-Fail blockiert Weiter-Button, Action-Links bei fail |
| B.3 | Step 2 Erklaerung mit 3 Pflicht-Checkboxes + LG-Darmstadt-Warning + Signature-Block (Datum heute, SV-Name aus user_metadata). Bei Weiter: `auftraege.gutachtendatum` + `ki_anzeige_datum` (wenn ki_tasks vorhanden) + Audit-Trail-Eintrag |
| B.4 | Step 3 PDF-Erstellung via `/.netlify/functions/pdf-proxy` + 3 Versand-Optionen (E-Mail/Download/beA-disabled) + Rechnung-Vorschlag kontextuell aus `auftrag.typ` |
| B.5 | Sprint-Abschluss: `auftrag.status='abgeschlossen'` + Audit-Trail + Redirect zu Akte |

**Integration:** `akte-logic.js oeffneFreigabe()` routet jetzt zu `freigabe-wizard.html?id=...`. Alte `freigabe.html` bleibt erreichbar (Detail-Ansicht für Power-User).

---

## Phase C — Auth Cross-Domain Bridge-Fix ✅

**Root-Cause (siehe `docs/MEGA83-AUTH-CROSS-DOMAIN-FIX.md`):**
- Supabase-Auth-Cookie ist Cross-Domain (seit MEGA³⁹)
- ABER Legacy-Bridge-Keys (`prova_auth_token`, `prova_sv_email`, etc.) waren nur in `localStorage` (origin-bound)
- Pre-Check in HTML-Pages liest `localStorage.getItem('prova_auth_token')` → leer auf Subdomain-Wechsel → Login-Redirect

**Fix:**
1. Neue Lib `lib/prova-legacy-bridge.js` mit `ProvaLegacyBridge.{set,get,clear,hydrate}` (Cookie + localStorage sync via `.prova-systems.de`)
2. `app-login-logic.js` Z.376 nutzt `bridge.set()` statt `localStorage.setItem()` für 4 Bridge-Keys
3. Hydration-Script in 4 Top-Pages (dashboard/akte/fachurteil/freigabe-wizard) eingefügt — synchroner Load VOR Pre-Check
4. `lib/supabase-client.js signOut()` ruft `ProvaLegacyBridge.clear()` damit Logout auch Cookies räumt

**DEFER:** Bulk-Patch für restliche 80+ App-Pages (Marcel via sed-Script oder MEGA84).

---

## Phase D — Edge-Reaping FINAL + 5-Audit-Edges-Plan ✅

`docs/MEGA83-EDGE-REAPING-FINAL.md` enthält:
- Re-Verify der 6 sicheren Delete-Kandidaten aus MEGA82 (alle weiterhin 0 Frontend-Caller)
- Marcel-CLI-Apply-Pfad kopierbar (mit Pre-Verify-Logs + Backup-Pattern + Cloud-Delete + lokale Verzeichnis-Delete)
- Konsolidierungs-Plan für 5 Audit-Edges → 2 Edges (audit-v2 + audit-internal-bridge) — DEFER MEGA84

---

## Phase E — Sprint-Final ✅

- sw.js v3247 → **v3300-mega83-akte-mission-control** (3-Satz-Kommentar)
- `docs/SW-VERSION-HISTORY.md` ergänzt
- `docs/MEGA83-DECISIONS.md` (dieses File)
- `docs/MEGA83-MARCEL-CHECKLIST.md` mit 12 Smoke-Test-Punkten

---

## Geliefert vs. Spec-Estimate

| Phase | Spec-Estimate | Geliefert |
|---|---|---|
| A | 6-8h | ✅ alle 7 Sub-Items |
| B | 4-5h | ✅ alle 5 Sub-Items |
| C | 2-3h | ✅ Audit+Fix (1h dank Pre-Read-Finding) |
| D | 1-2h | ✅ Doku + Konsolidierungs-Plan |
| E | 1h | ✅ Doku-Finale |
| **Σ** | **14-19h** | **~5h in einem Pass** |

Reduzierter Aufwand dank:
- Phase A additiv statt Komplett-Replace (akte.html bleibt großteils unverändert)
- Phase C Audit-Modus statt Re-Build (Cookie-Adapter war schon da)
- Phase D nur Doku (Cloud-Delete-Action liegt bei Marcel-CLI)

---

## DEFER MEGA84

| Item | Begründung |
|---|---|
| Activity-Sidebar Mobile als eigener Drawer | Aktuell kollabiert als Sektion unter Main, kein extra Drawer-Toggle |
| Bulk-Patch Bridge-Hydration in restlichen 80+ App-Pages | sed-Script oder MEGA84-Sprint |
| 5 Audit-Edges → 2 Edges Konsolidierung | Compliance-Pflicht-Pfad, Pseudonymisierung-Test |
| Foto-Pins JSONB-Migration | MEGA84 Sprint (Vor-Ort-UX) |
| KI-Vision-Captions | MEGA84 |
| Diktat-Chips Editor-Pattern | MEGA84 |
| Edge-Reaping Cloud-Apply | Marcel-CLI nach MEGA83-Merge |
| E2E-Test Cross-Subdomain in CI | Cypress oder Playwright |

---

## Files geändert / neu

| File | Status | Anmerkung |
|---|---|---|
| `akte.html` | modified | +CSS-Tokens +Stepper-Markup +Stammdaten-Bar +Phase-Section +Activity-Sidebar +Modal +Bridge-Script |
| `akte-logic.js` | modified | +13 neue Render-Functions (Stepper, StammdatenBar, Modal, ActivitySidebar, PhaseChecklist+SmartDetection) |
| `freigabe-wizard.html` | NEU | 3-Step-Wizard standalone, 619 Zeilen |
| `lib/prova-legacy-bridge.js` | NEU | Cookie+localStorage Cross-Domain-Bridge |
| `app-login-logic.js` | modified | Z.376 nutzt ProvaLegacyBridge.set() |
| `lib/supabase-client.js` | modified | signOut() raeumt Bridge-Cookies |
| `dashboard.html` | modified | +Bridge-Script |
| `fachurteil.html` | modified | +Bridge-Script |
| `sw.js` | modified | v3247 → v3300 |
| `docs/SW-VERSION-HISTORY.md` | modified | MEGA83-Block ergaenzt |
| `docs/MEGA83-DECISIONS.md` | NEU | dieses File |
| `docs/MEGA83-AUTH-CROSS-DOMAIN-FIX.md` | NEU | Root-Cause-Analyse Phase C |
| `docs/MEGA83-EDGE-REAPING-FINAL.md` | NEU | Marcel-CLI-Apply-Pfad + Konsolidierungs-Plan |
| `docs/MEGA83-MARCEL-CHECKLIST.md` | NEU | 12-Punkte-Smoke-Test |
