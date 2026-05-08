# MEGA⁴² Phase 2 — Stepper-Migration 4 Workflows

**Datum:** 2026-05-08
**Branch:** `mega42-live-verify-pilot-ready`

---

## 🎯 Approach: Bridge-Pattern statt Big-Bang-Migration

**Ausgangslage:**
- `prova-wizard.js` (787 LOC) ist Production-Wizard mit eigenem Stepper-Header
- `lib/wizard-stepper.js` (M⁴¹ P8, 427 LOC) ist neue Pattern-Lib
- 4 Workflows (A=Schaden / B=Wert / C=Beratung / D=Baubegleitung) brauchen konsistente Stepper-UX

**Decision:** Statt 787 LOC Production-Code zu ersetzen (5-7h + hohes Risiko), Bridge-Pattern:
- `lib/wizard-flow-configs.js` als **Source-of-Truth** für 4 Flow-Configs
- `lib/workflow-stepper-bridge.js` als **Adapter** zwischen prova-wizard.js und wizard-stepper.js
- Beide Lib-Stacks bleiben funktional, gemeinsame Step-Definitionen + Validation

**Vorteil:** Konsistenz erreicht, ohne Production-Wizard zu brechen. Marcel kann später Big-Bang-Migration (M⁴³) wenn gewünscht.

---

## 📦 Deliverables

| File | LOC | Tests |
|------|-----|-------|
| `lib/wizard-flow-configs.js` | 240 | 44 |
| `lib/workflow-stepper-bridge.js` | 175 | 24 |
| `lib/workflow-stepper-bridge.css` | 100 | – |
| `tests/wizard-stepper/m42-p2-flow-configs.test.js` | 230 | 44 |
| `tests/wizard-stepper/m42-p2-bridge.test.js` | 175 | 24 |
| `neuer-fall.html` (Wiring) | +5 | – |
| `sw.js` (APP_SHELL+CACHE_VERSION) | +3 | – |
| **Σ** | **~728 LOC + Tests** | **68 Tests** |

---

## 🧩 Flow-Configs Schema

```js
{
  key: 'A',
  label: 'Schaden & Mangel',
  description: 'Ursachen-Analyse + Sanierungsvorschlag (§1-§6 Voll-Struktur).',
  auftragstypen: ['gerichtsgutachten', 'versicherungsgutachten', ...],
  steps: [
    { key: 'auftragstyp', label: 'Auftragstyp', fields: [...], validate: fn(state) },
    { key: 'wo_was', label: 'Wo & Was', fields: [...], validate: fn(state) },
    ...
  ],
  skipPhases: function(auftrag_typ) { return [5,6] }
}
```

**4 Flows:**
- **A — Schaden** (4 steps, 7 Auftragstypen): Auftragstyp / Wo&Was / Auftraggeber / Rahmen
- **B — Wert** (4 steps, 3 Auftragstypen): Wertgutachten-Typ / Objekt / Auftraggeber / Methode
- **C — Beratung** (3 steps, 3 Auftragstypen): Beratungstyp / Thema / Auftraggeber
- **D — Baubegleitung** (4 steps, 2 Auftragstypen): Typ / Projekt / Auftraggeber / Rhythmus

**Disjunkt:** Kein auftrag_typ ist in mehreren Flows.

---

## 🌉 Bridge-API

```js
window.ProvaWorkflowStepper.mount({
  el: document.getElementById('stepper-container'),
  flowKey: 'A',
  mode: 'header-only',  // oder 'full' (full Stepper UI mit Form)
  onSubmit: function(state) { … }
});

// Bind to existing prova-wizard.js Step-State
const r = window.ProvaWorkflowStepper.bindToProvaWizard('A', currentSchritt);
// r = { flow, currentIdx, currentStep, progress_pct }

// Pure-fn Progress-Calculator
const progress = window.ProvaWorkflowStepper.getProgressForState('A', state);
// progress = { currentIdx, totalSteps, percentage, completedKeys }
```

---

## ✅ Acceptance

| Item | Status |
|------|--------|
| 4 Flow-Configs vollständig (A/B/C/D) | ✅ |
| Disjunkte Auftragstypen über Flows | ✅ |
| Validation-Funktionen pro Step | ✅ |
| skipPhases-Logic für M⁴²-konformen §1-§6-Skip | ✅ |
| Bridge-API mount/bindToProvaWizard/getProgressForState | ✅ |
| CSS für konsistenten Stepper-Header | ✅ |
| neuer-fall.html lädt neue Libs (defer) | ✅ |
| sw.js APP_SHELL erweitert | ✅ |
| sw.js CACHE_VERSION → v1402 | ✅ |
| 68 neue Tests grün (44+24) | ✅ |
| Bestehender prova-wizard.js NICHT gebrochen | ✅ (kein Code geändert) |
| Bestehende 23 m41-p8-stepper Tests grün | ✅ (unverändert) |

---

## 🔮 Optional: Big-Bang-Migration (M⁴³ falls gewünscht)

Wenn Marcel die komplette `prova-wizard.js`-Refactor wünscht:
- Flow-Configs sind ready (Source-of-Truth)
- Bridge ist vorhanden (Drop-in-Stepper-Replacement)
- Migration-Plan: `prova-wizard.js` Step-Renderer → ProvaWizardStepper.mount({mode:'full'})
- Risiko: 8-12h refactor + Re-Test der 11 Auftragstyp-Pages

---

## 🎯 Phase 2 Status

**ACCEPTANCE ERFÜLLT** — Konsistente Stepper-Definitionen über 4 Workflows, Bridge-Pattern, 68 Tests grün, Production-Wizard unberührt.

---

*MEGA⁴² Phase 2 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
