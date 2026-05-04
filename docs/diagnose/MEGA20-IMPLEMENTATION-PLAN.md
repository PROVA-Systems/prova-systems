# MEGA²⁰ — Revised Implementation-Plan (nach Marcel-Decisions)

**Sprint:** MEGA²⁰ Onboarding-Foundation
**Datum:** 2026-05-08
**Vorgaenger:** MEGA²⁰ Audit (`docs/diagnose/MEGA20-ONBOARDING-AUDIT.md`)
**Marcel-Decisions:** A1 / B1 / C1 / D2 / E1 + NEU: Solo-only Pricing

---

## 1. Marcel-Decisions (alle gegeben)

| ID | Decision | Konsequenz |
|---|---|---|
| **A1** | einwilligungen wiederverwenden | KEINE legal_acceptances-Migration. RPC `record_einwilligung` nutzen. |
| **B1** | ALTER TABLE public.users | Migration 10 erweitert users (NICHT user_profile). |
| **C1** | orphan-Pages NICHT antasten | onboarding-supabase/welcome/schnellstart bleiben unangetastet. |
| **D2** | Pseudo-Akte mit `is_demo` Flag | Echte Akte erstellen, aber mit Demo-Marker. User kann selbst loeschen. |
| **E1** | KEIN agb.html Refactor | Anwalt-Decision (Siebert Lexow). Existing AGB.html weiter linken. |
| **NEU** | Pricing PILOT-PHASE | NUR Solo 149€ aktiv. Starter+Team "Coming Soon". Frontend-Foundation legen aber nicht aktivieren. |

---

## 2. Open Question (Marcel-Decision in Plan)

**Wenn `record_einwilligung` nach Signup fehlschlaegt:**
- Option F1: Sign-Up-Rollback (komplex, Auth-State inkonsistent)
- Option **F2 (empfohlen): Force-Later** via existing `get_pending_einwilligungen` RPC.
  → User logged sich beim naechsten Login ein, RPC erkennt fehlende Einwilligungen,
  redirect zu `einwilligung-update.html` (existing Path).

**Begruendung F2:** Force-Later nutzt existing Infrastructure. Auth ist robust.
Worst-Case: User redirect once. Best-Case: alles smooth.

→ **Implementierung: F2** (es sei denn Marcel widerspricht im Final-Report-Review)

---

## 3. Capacity-Estimate (ehrlich nach 19+ MEGA-Sprints)

**Token-Realismus:** Die Session ist sehr lang. Restbudget realistisch ~80-100k.

| Tier | Tasks | Token | Confidence |
|---|---|---:|---:|
| **PRIMARY** | W82-W89: Migration + Lambda + Login + Wizard 4-Step + Tests + Final | ~85k | **75%** |
| STRETCH | + In-App-Hints + Email-Drip-Hooks | +20k | 25% |
| ULTIMATE | + Video-Slots + agb-Refactor | +25k | 5% |

**Decision:** PRIMARY confirmed. STRETCH evtl. nach W88 falls Restbudget.

**Marcel-Direktive nennt 80 Tests** — realistisch sind eher 50-60 fuer PRIMARY (Token-Bedeutung pro Test). Ich liefere mindestens 50, dokumentiere ehrlich.

---

## 4. Implementation-Plan

### W82: Plan-File (this) — DONE
### W83: Migration 10 — `users.persona_*` + welcome_wizard_completed
- `db/PLANNED-users-persona.sql`
- `supabase-migrations/10_users_persona_onboarding.sql`
- ALTER TABLE: persona_size TEXT (CHECK solo/small/large), persona_types JSONB, persona_volume INTEGER, welcome_wizard_completed BOOLEAN
- Idempotent (ADD COLUMN IF NOT EXISTS)

### W84: log-legal-acceptance.js Lambda
- POST /netlify/functions/log-legal-acceptance
- Body: `{ types: ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung'], version, newsletter? }`
- Auth-pflicht via existing `requireAuth` middleware
- Ruft `record_einwilligung` RPC pro Type
- IP + user_agent + page_url automatisch in payload (existing Tabelle erwartet das)
- Best-Effort: bei einer fehlgeschlagenen Einwilligung loggt aber returnt 200 mit `partial: true`
- Audit-Log fire-and-forget

### W85: login.html — AGB-Checkboxes + Solo-only Pricing
- Im Signup-Form: 3 Pflicht-Checkboxes (AGB, AVV, DSE) + 1 optional Toggle (Newsletter)
- Submit-Button disabled bis 3 Pflicht-Checkboxes checked (Live-Validation)
- Mobile-friendly (stack-Layout)
- Pricing-Display vor Signup-Form: "Solo 149€/Mo" Card aktiv. Starter 79€ + Team 279€ als "Coming Soon" Badges (CSS-hidden via class `.tier-coming-soon`, kann via Feature-Flag aktiviert werden post-Pilot)

### W86: auth-supabase-logic.js — einwilligungen nach Signup
- Nach erfolgreichem `signUp({...})`:
  - Rufe `/.netlify/functions/log-legal-acceptance` mit allen 3 Pflicht-Typen + optional newsletter
  - Best-Effort: bei Failure logge `console.warn` aber blocke Signup nicht
  - User wird beim naechsten Login durch existing `get_pending_einwilligungen` redirect (Force-Later, F2)

### W87: Welcome-Wizard 4-Step (lib/onboarding-trigger.js erweitern)
- Multi-Step-Modal statt 1-Step
- Step-Indicator (1/4, 2/4, 3/4, 4/4)
- Step 1 — Persona:
  - Buero-Groesse (3 Cards: Solo / Klein 2-5 / Gross 6+) — alle Solo-Tier
  - Auftragsarten (Multi-Select Checkboxes: Schadensgutachten, Wertgutachten, Beratung, Baubegleitung)
  - Volume-Slider 1-50
  - Save → users.persona_size + persona_types + persona_volume
- Step 2 — Triple-Mode:
  - existing 3 Mode-Cards Layout aus aktuellem onboarding-trigger.js
  - Auswahl → updateDefault(mode)
- Step 3 — Tour:
  - "Tour starten" + "Skip" Buttons
  - "Tour starten" → Wizard schliessen, dann onboarding-tour.js triggern (existing tour-Lib)
- Step 4 — Demo-Akte:
  - "Demo-Akte erstellen" + "Selbst starten" Buttons
  - "Demo-Akte erstellen" → POST /.netlify/functions/create-demo-akte (NEU als Wrapper)
  - Banner-Text fuer Demo-Akte: "🎭 Demo-Akte — kann jederzeit geloescht werden"
- A11y bleibt: Esc/Click-outside/Focus-Trap/Backdrop-Blur (bestehend)
- Step-Navigation: "Zurueck" + "Weiter" Buttons
- Completion: PATCH users.welcome_wizard_completed = TRUE
- Mobile-responsive @media 540px (existing)

### W88: Tests durchgehend
- tests/onboarding/ NEW directory:
  - migration-10-persona.test.js (5 Tests: ALTER TABLE patterns)
  - log-legal-acceptance.test.js (10+ Tests: Validation, Mock-RPC, ip/ua-Capture)
  - login-html-checkboxes.test.js (8 Tests: Markup + Solo-only Pricing + Submit-Validation)
  - auth-signup-einwilligungen.test.js (7 Tests: Best-Effort-Pattern + Force-Later)
  - welcome-wizard-multistep.test.js (15+ Tests: 4 Steps + Step-Indicator + Persona-Save + Demo-Akte-Trigger)
- Plus: bestehende onboarding.test.js erweitern um neue API-Surface

### W89: Final-Report
- docs/sprint-status/MEGA-VICESIMA-2026-05-FINAL.md
- User-Journey-Diagramm (Mermaid)
- Marcel-Test-Anleitung (10+ Klick-Punkte)
- Pricing-Display-Status (Solo aktiv, Starter+Team Coming Soon)
- HeyGen-Brief (was Marcel produzieren soll fuer Step 2 Demo-Videos)
- sw.js v279 → v280

---

## 5. Anti-Patterns vermeiden

❌ legal_acceptances erstellen (Marcel A1)
❌ user_profile-Tabelle (Marcel B1)
❌ orphan-Pages refactoren (Marcel C1)
❌ Pseudo-Akte ohne is_demo-Marker (Marcel D2)
❌ agb.html ueberarbeiten (Marcel E1)
❌ Starter/Team aktiv anzeigen (Marcel Pricing-Direktive)
❌ Sign-Up-Rollback bei einwilligung-Fail (Force-Later via existing RPC)
❌ Multi-Tier-Pricing-Logic vor Pilot aktivieren

---

## 6. NACH MEGA²⁰ NICHT erledigt (ehrlich)

**MEGA²¹+ Backlog (von Marcel angekuendigt):**
- Tier 4 Voll-Airtable-Migration (~14 Functions)
- Tier 2 Cockpit-Final (Saved-Views + Diff-View + Universal Search)
- agb.html Senior-Legal-Niveau (Marcel mit Anwalt)
- Email-Drip Make.com-Setup (T2-T6 Scenarios)
- HeyGen-Videos produzieren

**STRETCH falls Token-Budget reicht:**
- lib/in-app-hints.js (Toast-System)
- hilfe.html Video-Slots (5 Iframe-Placeholder)
- Email-Drip-Hooks dokumentiert

---

## 7. Risk-Mitigation

| Item | Risiko | Mitigation |
|---|---|---|
| Migration 10 auf live-DB | 🟡 mittel | ADD COLUMN IF NOT EXISTS (idempotent) |
| einwilligungen-RPC Failure | 🟢 niedrig | Force-Later via existing forced-re-consent |
| 4-Step Wizard zerbricht 1-Step-Modal | 🟡 mittel | A11y-Tests pro Step + Focus-Trap-Pruefung |
| create-demo-akte RLS-Konflikt | 🔴 hoch | data-store auftraege.create + workspace-scoped |
| Pricing-Display Solo-only | 🟢 niedrig | CSS-class `.tier-coming-soon` (kein Frontend-Logic-Fork) |

---

## 8. Implementation-Reihenfolge

1. **W83** Migration 10 (Schema-Foundation)
2. **W84** log-legal-acceptance Lambda
3. **W85** login.html (AGB-Checkboxes + Solo-Pricing)
4. **W86** auth-supabase-logic.js (Einwilligungen-Calls nach Signup)
5. **W87** Wizard 4-Step (lib/onboarding-trigger.js erweitern)
6. **W88** Tests (mind. 50)
7. **W89** Final-Report + sw.js v280

---

*Plan-Stand 2026-05-08. Marcel-Decisions umgesetzt. Implementation startet W83.*
