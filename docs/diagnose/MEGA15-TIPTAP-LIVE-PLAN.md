# MEGA¹⁵ — TipTap-Editor LIVE Plan

**Datum:** 2026-05-06/07
**Vorgaenger-Tag:** v220 (MEGA¹⁴-Ext W30, Foundation done)
**Modus:** Implementation, NICHT nur Skelett

---

## 1. Honesty-Check (LLM-Realitaet)

Ich bin in einer extrem langen Session (MEGA⁸ → ¹⁴-Ext = 9 volle MEGA-Sprints in einer Conversation). Token-Budget ist dem Ende nahe.

**Marcel will:** TipTap voll integriert in 2-3 Pages + Settings + Onboarding-Wizard + Tests.

**Realistisch in Restbudget:** TipTap-Library + Wrapper + Settings-UI + Backend-Endpoint + 1 Demo-Page-Integration + Final-Report. NICHT alle 5 Prios.

Lieber **ehrlich begrenzen als fake-claimen** — wie in MEGA¹⁴ "lieber 3 Tiers Quality 9/10 als 5 mit 7/10".

---

## 2. Brutal-Critique W28 Foundation

### Was Foundation-Files brauchen fuer Live-Implementation:

a) **db/PLANNED-user_workflow_settings.sql** (W28):
   - Schema solide, Rollback-Plan da
   - **Aber NICHT applied** — muss in `/supabase-migrations/` mit Versionsnummer
   - CLAUDE.md Regel 5 + 35: "Schema-Aenderungen versioniert in /supabase-migrations/, nie direkt im Dashboard"
   - **Action W31:** File kopieren mit nächster Versions-Nummer

b) **lib/workflow-mode-router.js** (W28):
   - resolve-Logic OK
   - openForAuftrag: Mode B/C feuern aktuell info-Toast (Fallback zu A)
   - **Action W35:** echtes Mode-B-Routing (TipTap-Editor laden)

c) **API-Endpoints fehlen komplett:**
   - GET/PATCH `/netlify/functions/user-workflow-settings`
   - GET `/netlify/functions/auftrag-mode-override`
   - **Action W33:** Implementation

---

## 3. Token-Capacity-Estimate

### PRIMARY (sicher schaffbar, ~3 Tasks)
- **W31** (5 Min): Schema-Migration-File ins versionierte Verzeichnis
- **W32** (~30k Tokens): TipTap-Wrapper-Library + CSS
  - CDN-Approach (npm waere mehr Setup, PROVA ist Vanilla-JS)
  - `lib/prova-editor.js` mit StarterKit + Tables + Link + Placeholder
  - `lib/prova-editor.css` (PROVA-Design-System)
  - Tests fuer Pure-Functions (Browser-DOM-Tests via jsdom waeren Overkill)
- **W33** (~10k): Backend `/netlify/functions/workflow-settings.js` (GET + PATCH)

### STRETCH (wenn Tokens reichen)
- **W34** (~10k): Settings-UI in einstellungen.html (Mode-Cards + Save)
- **W35** (~8k): Mode-B-Demo-Integration in briefvorlagen.html (1 Page)
- **W36** (~6k): Final-Report

### ULTIMATE (wahrscheinlich NICHT)
- Onboarding-Wizard
- Mode B in stellungnahme + akte (2 weitere Pages)
- ProvaConfidence/ProvaKIFallback in Editor-Live-Highlights
- ProvaAutosuggest-Integration im Editor

**Realistic:** PRIMARY 3 + STRETCH 3 (W34+W35+W36) = 6 Tasks.

---

## 4. TipTap-Integration: CDN vs. npm

PROVA ist Vanilla-JS (CLAUDE.md). Decisions:

- **CDN-Approach:** TipTap als ESM von esm.sh oder unpkg.com via `<script type="module">`. 
  - Pro: Vanilla-friendly, keine Build-Pipeline
  - Con: ~150KB initial-load, Adblocker-Risk
- **npm + Bundle:** waere "richtiger" — aber PROVA hat kein Bundle-Build aktiv
  - Pro: Tree-shaking, kein CDN-Risk
  - Con: muesste rollup/esbuild setup → CLAUDE.md-Konflikt

**Decision:** CDN-Approach via `<script type="module">` mit esm.sh. Dynamic-Import in Library, sodass nur Pages mit Mode B Bundle laden.

### TipTap-Pakete (CDN)
```html
<script type="module">
  import { Editor } from 'https://esm.sh/@tiptap/core@2';
  import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2';
  import Table from 'https://esm.sh/@tiptap/extension-table@2';
  // ...
</script>
```

### Fallback wenn TipTap nicht laed
- `<textarea>` als Mode-A-Fallback (graceful degradation)
- ProvaUI.toast: "Editor-Modus nicht verfuegbar"

---

## 5. Anti-Patterns vermeiden

❌ **TipTap als globalen Dependency:** nur dynamic-import wenn Mode B aktiv
❌ **Editor ohne Save:** auto-save in localStorage als Defense gegen Page-Refresh
❌ **Custom-Toolbar-Buttons ohne ARIA:** WCAG-Pflicht
❌ **TipTap-Setup ohne placeholder/lang:** Editor schaut leer/seltsam aus

---

## 6. Erwartete Quality-Metrics

- **Tests:** 855 → 900+ (~50 neue)
- **LOC neu:** ~1500 (Editor-Library + CSS + Backend + Settings-UI)
- **TipTap-Integration:** Demo in 1 Page produktionsreif
- **Pattern-Copy:** 0

---

## 7. Was Marcel ehrlich verspreche

✅ Schema-Migration-File ready (Marcel-apply-Pflicht)
✅ TipTap-Wrapper-Library mit funktionierendem CDN-Setup
✅ Backend-Endpoint mit GET+PATCH
✅ Settings-UI in einstellungen.html
✅ Mode-B-Demo in 1 Page (briefvorlagen.html — kompaktester Use-Case)
✅ Final-Report

❌ NICHT heute: Onboarding-Wizard, 2 weitere Mode-B-Pages, ProvaConfidence-Live-im-Editor
   → MEGA¹⁶-Backlog (zusammen mit Mode C Word-Import)

**Honest priorization:** Lieber 1 Page produktionsreif als 3 halbfertig.

---

*Plan-Stand 2026-05-06/07. Start: W31 (Schema-Migration-File).*
