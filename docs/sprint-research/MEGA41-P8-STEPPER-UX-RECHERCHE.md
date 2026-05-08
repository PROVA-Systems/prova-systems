# MEGA⁴¹ P8 — Stepper-UX Recherche

**Datum:** 2026-05-08
**Sprint:** MEGA⁴¹ Phase 8 — P3 Workflow-Stepper-Polish (Konsistenz)
**Recherche-Pflicht:** 4-5 etablierte SaaS analysieren

---

## Kontext

Audit-Befund: 4 Workflow-Pages (Schaden A / Wert B / Beratung C / Baubegleitung D) haben **inkonsistente Stepper-Adoption**:
- `neuer-fall.html`: 12 Stepper-Refs (gut entwickelt)
- `wertgutachten.html`: 4 Refs (basics)
- `beratung.html`: 3 Refs (minimal)
- `baubegleitung.html`: 0 Refs (KEIN Stepper!)
- `schadensfaelle.html`: 0 Refs (KEIN Stepper!)

**Problem:** Etablierte SVs haben unterschiedliche Erfahrungen je nach Flow → UX-Inkonsistenz.

---

## Quelle 1: Linear — Issue-Erstellung

**Pattern beobachtet:**
```
[Title-Input] → Auto-detect Type (story/bug/feature)
              → Inline-Validation während Tippen
              → "Save Draft" auto-triggered nach 5s Inactivity
              → "Cmd+Enter" submits
```

**Kein klassischer Stepper** — stattdessen Single-Page-Form mit progressivem Disclosure.
**Lesson:** Bei kurzen Flows (≤3 Felder) NICHT in Stepper zwingen. Stepper nur bei ≥4 Sektionen.

---

## Quelle 2: Notion — Page-Creation

**Pattern beobachtet:**
```
[Template-Picker] → 6 Karten (Empty / Wiki / Doc / Task / DB / Calendar)
                  → Klick → direkt Editor (kein Stepper)
                  → Side-Panel "Setup" mit weiteren Feldern (optional)
```

**Lesson:**
- Template-Picker als ersten Schritt → Type wird visuell gewählt
- "Optional"-Felder als Side-Panel, nicht als Pflicht-Stepper-Stop
- Direkt-zur-Action statt erst-konfigurieren

---

## Quelle 3: Stripe Checkout — Payment-Setup

**Pattern beobachtet:**
```
[Step 1: Email] → [Step 2: Card] → [Step 3: Address] → Confirm
   ↑ ← Zurück immer möglich
   ↑ Progress-Bar mit %-Anzeige (0/33/66/100)
   ↑ Save-Status: "Ihre Eingaben werden gespeichert"
   ↑ Pflichtfelder: rotes Border bei Touch + leer
```

**Lesson — Stripe-Goldstandard:**
- Buttons IMMER an gleicher Position: Zurück links, Weiter rechts
- Progress-%-Indikator essentiell bei >2 Steps
- Validation-Feedback inline (rot-Border + Error-Text unter Field)
- Save-Status oben sichtbar
- Esc → Cancel-Confirm-Dialog

---

## Quelle 4: Asana — Task-Creation

**Pattern beobachtet:**
```
[Modal-Form] → Single-Page (kein Stepper)
             → 3 Felder pflicht: Title / Project / Assignee
             → Side-Tab "More" für 8 weitere optional
             → Auto-Save bei jedem Blur
```

**Lesson:** Bei <5 Pflichtfeldern → Single-Page-Form, kein Stepper.

---

## Quelle 5: Vercel-Dashboard — Deploy-Flow

**Pattern beobachtet:**
```
[Step 1: Repo-Connect] → [Step 2: Build-Settings] → [Step 3: ENV-Vars] → Deploy
   ↑ Stepper TOP, immer sichtbar
   ↑ Click auf vorigen Step → springe zurück
   ↑ Klick auf zukünftigen (gesperrten) Step → kein Effekt
   ↑ Mobile: Stepper kollabiert zu "Schritt 2 von 3"
```

**Lesson:**
- Stepper NUR clickable für completed/active Steps (nicht future)
- Mobile-Compact: "Schritt N von M" + nur active Step-Title
- "Save Draft & Exit"-Button immer verfügbar (Pause/Resume)

---

## Decision-Final (Self-Scoping für PROVA)

### Stepper-Pattern für PROVA

```
[Step 1] ─ [Step 2] ─ [Step 3] ─ [Step 4]
  ✓        active    pending   pending
            ▼
[Form-Fields für Step 2]
                                              [Zurück] [Weiter →]
```

**Konkrete Entscheidungen:**

1. **Button-Position fix:** Zurück links, Weiter rechts (Stripe)
2. **Progress-%:** sichtbar bei ≥3 Steps (Stripe)
3. **Stepper-Klickbar:** nur completed Steps zurück-klickbar (Vercel)
4. **Pause/Resume:** localStorage-Draft "Save & Exit"-Button (Vercel)
5. **Mobile-Compact:** "Schritt N von M" + nur active Step-Title (Vercel)
6. **Validation:** inline rot-Border + Error-Text (Stripe)
7. **Save-Status:** Top-Bar zeigt "Auto-gespeichert vor Xs" (Linear)
8. **Keyboard:** Tab navigiert Felder, Enter weiter, Esc → Cancel-Confirm
9. **Accessibility:** `<nav role="progressbar" aria-valuenow="33" aria-valuemax="100">`
10. **Single-Page-Fallback:** bei <4 Pflichtfeldern KEIN Stepper (Asana)

---

## Implementation-Plan P8

```
1. lib/wizard-stepper.js (Public API):
   - mount({el, steps[], onChange, onSubmit, draftKey})
   - nextStep() / prevStep() / goToStep(idx)
   - validateStep(idx) → {valid, errors}
   - saveDraft() / loadDraft()
   - destroy()

2. lib/wizard-stepper.css:
   - Stepper-Bar mit completed/active/pending States
   - Progress-Bar mit %-Anzeige
   - Mobile-Breakpoint (700px) → Compact-Mode
   - prefers-reduced-motion respektiert

3. Demo-Wire in 1 Page (z.B. neuer-fall.html — am weitesten entwickelt)
   → andere 3 Pages: Welle 2-Refactor

4. Tests (8+):
   - mount + steps[] korrekt gerendert
   - nextStep / prevStep
   - goToStep nur completed/active
   - validateStep
   - saveDraft via localStorage
   - loadDraft restore
   - Keyboard-Navigation (Enter/Esc)
   - Accessibility-Attribute (aria-valuenow)
```

---

## Risiken

1. **Migration der 3 unsteppered Pages** (baubegleitung/schadensfaelle/beratung) ist scope-creep für M⁴¹.
   Mitigation: nur Foundation in M⁴¹, Migration in Welle 2.

2. **Auto-Save-Konflikt** mit existierender `auto-save.js`-Lib.
   Mitigation: wizard-stepper nutzt eigenen `draftKey`-Prefix `wizard_draft_`.

3. **Accessibility-Regression** bei bestehenden Pages.
   Mitigation: lib ist additiv (neue Pages adoptieren), bestehende bleiben unangetastet bis Welle 2.

---

*MEGA⁴¹ P8 Stepper-UX-Recherche — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
