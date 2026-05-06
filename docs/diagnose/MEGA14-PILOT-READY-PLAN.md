# MEGA¹⁴ — Pilot-Ready Self-Capacity-Assessment + Plan

**Datum:** 2026-05-06
**Vorgaenger-Tag-Empfehlungen:** v213-v218 (alle lokal, kein Push)
**Modus:** Unlimited-Scope mit Bug-Hunt-Mindset (Pattern aus MEGA¹⁰-¹³)

---

## 1. Brutal-Critique W18-W21 (was uebersehen)

### W18 (KI-History + Autosuggest) — gab 9/10

**Latente Bugs nach Re-Read:**

a) **KI-History Modal hat keine Pagination:**
   - Backend liefert max 200 records (limit hard-coded)
   - Bei aktivem Workspace > 200 Aufrufen/30d → letzte werden NICHT angezeigt
   - User-Confusion: "Wo ist mein Aufruf von gestern?"
   - **Fix in W25:** Pagination ODER Hint "200 von X gezeigt"

b) **KI-History kein Refresh-Button:**
   - Beim Aufruf laedt einmal, dann statisch
   - Wenn User KI-Action im Hintergrund triggered → Liste outdated
   - User muss Modal schliessen + neu oeffnen
   - **Fix in W25:** Refresh-Button im Toolbar

c) **Autosuggest-Wrapper bricht Layout bei inline-display:**
   - `wrapper.style.display = cs.display === 'inline' ? 'inline-block' : cs.display`
   - Aber width=offsetWidth kann 0 sein bei nicht-rendered Elementen
   - Edge-Case: pre-rendered hidden textareas

d) **Autosuggest hat keinen Loading-Indicator:**
   - User tippt 20 Chars, wartet 800ms debounce, dann fetch — kein Hint dass etwas passiert
   - User koennte enter druecken bevor Vorschlag kommt

### W19 (Hamburger + Bottom-Sheet) — gab 9/10

**Latente Bugs:**

a) **Hamburger-Menu hat KEINEN Focus-Trap (Tab-Cycle kann raus):**
   - Genau wie Drilldown vor W20-Fix!
   - **Fix in W25:** _onTabKey wie in admin-drilldown.js
   - WCAG 2.1 Pflicht fuer Modal-Pattern

b) **Bottom-Sheet hat KEINEN Focus-Trap:**
   - Gleiche Issue
   - **Fix in W25**

c) **Bottom-Sheet Swipe-Down nach Window-Resize:**
   - touchStartY ist clientY (viewport-relative)
   - Bei Resize waehrend Touch: Coordinates verschieben
   - Edge-Case bei iOS-Safari-Notch-Rotation
   - **Akzeptiert:** zu obscur, dokumentieren

d) **Hamburger Single-Open-Pattern Race:**
   - User klickt Trigger 2x schnell hintereinander
   - close() (alt) + open() (neu) sequential
   - Visueller Glitch moeglich
   - **Akzeptiert:** Browser-Rendering ist fast immer schneller als 2 clicks

### W20 (Bug-Fix-Sweep) — gab 9/10

**Latente Bugs:**

a) **Whitespace-Normalisierung nur space+tab (`\s`):**
   - `\s` matcht Tab/NBSP/Newline — eigentlich OK
   - Test passte — kein Bug.

b) **isOutageError ueberprueft nur Englisch-Patterns:**
   - "fetch fehlgeschlagen" wuerde nicht matchen
   - Akzeptiert: alle PROVA-Errors in Englisch von OpenAI/Anthropic

### W21 (Bulk-Ops + KPI-Drilldowns) — gab 9/10

**Latente Bugs:**

a) **Admin-Bulk MutationObserver Performance bei Mass-Add:**
   - Wenn 100 Items in Loop appended werden → _addCheckboxesToRows 100x aufgerufen
   - **Fix in W25:** debounce/throttle MutationObserver-Callback

b) **Bulk-Bar-State bei page-reload nicht clean:**
   - selectedIds bleibt im Memory wenn `attach` nochmal aufgerufen
   - State-leak bei dynamic-Page-Changes (SPA-Navigation)
   - **Fix in W25**

c) **Undo-Toast ueberlagert wenn 2 Bulk-Actions schnell:**
   - 1. Action: Toast erscheint
   - 2. Action vor 10s: 2. Toast oben drauf
   - **Fix in W25:** 1. Toast force-execute oder dismiss-old

d) **MutationObserver feuert auch bei eigenen Checkbox-Inserts:**
   - Self-trigger-Loop-Risk
   - Aktuell harmlos weil idempotent (`if querySelector`)
   - **Akzeptiert:** keine Performance-Issue

---

## 2. Token-Capacity-Estimate

Ich bin SEHR tief in dieser Long-Conversation (MEGA⁸ → ¹⁴). Realistische Estimates pro Tier:

- **Tier 6 PDF-Templates** (3-4 wirklich-unique, NICHT cp+sed): ~25-35k Tokens
  - F-05 Mahnung-Stufe-1 (Ton freundlich, "vermutlich übersehen")
  - F-08 Mahnung-Stufe-4 (Ton hart, "Anwalt-Übergabe")
  - FOTO-Dokumentation (separates Format, Bilder-fokussiert)
  - Optional F-01 JVEG-Rechnung (Justizvergütung mit §-Berechnungen)
- **Tier 1 Mobile-UX-Final**: ~20-25k
  - Swipe-Gestures-Library
  - Pull-to-Refresh in 3 weiteren Pages
  - Native-Share-Wrapper
- **Bug-Fix-Sweep aus W18-W21**: ~12-18k
  - Focus-Trap Hamburger+Bottom-Sheet (W19-Fix)
  - KI-History Refresh-Button + Pagination-Hint (W18-Fix)
  - Admin-Bulk State-Cleanup + Undo-Toast-Stack (W21-Fix)
- **Final-Report**: ~8-10k

### PRIMARY GOAL (sicher schaffbar)

**3 Tiers, alle Quality 9/10:**

**P1: W23 — Tier 6 PDF-Templates Deep-Work (3 Templates)**
- F-05 Mahnung Stufe 1 (Ton: verstaendnisvoll, "moeglicherweise uebersehen")
- F-08 Mahnung Stufe 4 (Ton: rechtlich-hart, Anwalt-Andeutung)
- FOTO-Dokumentation (separates Layout: Bilder-Grid statt Text-Block)
- KEIN F-06/F-07 — die waeren tatsaechlich Pattern-Copy von F-05/F-08
- Pro Template: eigene Use-Case-Analyse + spezifische Felder + Mock-Payload
- Tests: Layout-Verifikation + Liquid-Bug-Pattern-Schutz

**P2: W24 — Tier 1 Mobile-UX-Final**
- `lib/swipe-gestures.js`: Touch-basierter Swipe-Detection (left/right)
- `lib/native-share.js`: Wrapper um Web-Share-API mit Clipboard-Fallback
- Pull-to-Refresh in dashboard.html, kontakte.html, briefvorlagen.html (3 Pages)

**P3: W25 — Bug-Fix-Sweep aus W18-W21 Brutal-Critique**
- W19: Focus-Trap fuer Hamburger + Bottom-Sheet (analog W20-Drilldown-Fix)
- W18: KI-History Refresh-Button + Pagination-Hint
- W21: Admin-Bulk MutationObserver-Throttle + Undo-Toast-Stack-Cleanup
- Pre-Post-Test-Pattern (Test failed-vorher-passes-nachher)

### STRETCH GOAL (wenn Tokens reichen)

**S1: W26 — Tier 4 Airtable-Cleanup-Mini**
- 3-5 Functions migrieren auf storage-router-Pattern (NICHT 20+)
- Marcel-Decision welche Functions

### ULTIMATE GOAL (sehr ambitioniert)

- F-01 JVEG-Rechnung — eigenes Format mit JVEG-§-Berechnungen
- Tier 2 Cockpit-Final (Saved-Views, Universal-Search)
- Page-Integration-Sweep (Hamburger in 3 Pages, Bulk-Ops in tickets-Liste)

**Realistic:** PRIMARY 3 + STRETCH 1 = 4 Tiers in Quality 9/10. ULTIMATE wahrscheinlich nicht.

---

## 3. Tier 6 PDF-Templates Strategie (KRITISCH: NICHT cp+sed!)

### Warum nur 3 statt 10:

Marcel hat in MEGA⁸ V4 5 Templates per cp+sed gemacht — das war Pattern-Copy-Hetze. Marcel hat dafuer 3/10 Quality gegeben.

Bei MEGA¹⁴ mache ich 3 Templates die WIRKLICH verschieden sind in:
- **Use-Case** (wann nutzt SV?)
- **Ton** (freundlich/hart)
- **Layout** (Text-Block vs. Bilder-Grid)
- **Felder** (spezifisch nicht generisch)
- **Mock-Payload** (realistisch)

### Template-Auswahl-Begruendung:

**F-05 Mahnung Stufe 1**
- Use-Case: 1. Mahnung 14 Tage nach Faelligkeit
- Ton: verstaendnisvoll ("vermutlich uebersehen")
- Spezifika: kein Mahn-Zuschlag, hoeflicher Ton, klare Frist (7 Tage)
- Felder: Rechnung-Nummer, Faelligkeitsdatum, Brutto-Betrag

**F-08 Mahnung Stufe 4**
- Use-Case: 4. Mahnung, Anwalt-Andeutung
- Ton: rechtlich-hart, NICHT mehr verstaendnisvoll
- Spezifika: Mahn-Zuschlag von 5€ ggf., Anwalt-Drohung, Verzug-Zinsen
- Felder: alle bisherigen Mahnungen, Mahn-Kosten total, Verzug-Zinsen

**FOTO-Dokumentation**
- Use-Case: Bild-fokussiertes Format, kein Mengenfeld-Text
- Ton: kuehl-objektiv, faktisch
- Spezifika: 2-3 Bilder pro Seite Grid, Bildunterschriften, Datum/Ort/Kameraposition pro Bild
- Felder: Bilder-Array, Bildunterschriften, Aufnahme-Bedingungen

Was Marcel-Backlog bleibt: F-06/F-07/F-16/F-17/F-18/BRIEF — die brauchen entweder echte SV-Erfahrung (F-16/F-17/F-18 = Anhoerungs-Stellungnahmen, Marcel-Pflicht-Definition) oder sind tatsaechlich Pattern-Variants (F-06/F-07 zwischen F-05 und F-08).

---

## 4. Quality-Bar pro Tier (UNVERANDERT)

- Tests mit Bug-Hunt-Mindset
- Library + Page-Integration zusammen
- Pre-Post-Test-Pattern fuer Bug-Fixes
- Refactor-Pass durchgefuehrt
- Self-Critique 8-9/10

---

## 5. Was ich definitiv NICHT mache

- ❌ PDFMonkey-Pushes (Marcel-Manual)
- ❌ Pilot-SV-Einladungen
- ❌ Stripe-Charges
- ❌ DB-Schema-Aenderungen ohne PLANNED-File
- ❌ Push + Tag (Marcel-OK pflicht)
- ❌ App-Icons/Splash-Screens
- ❌ 10 PDF-Templates per cp+sed (Pattern-Copy-Hetze)

---

## 6. Erwartete Quality-Metrics nach MEGA¹⁴

- **Tests:** 723 → 800+ (~80 neue)
- **LOC neu:** ~1500-2000 (3 PDF-Templates sind massiv)
- **Tiers done:** 3 PRIMARY + 1 STRETCH (vielleicht) = 4
- **Production-Bugs gefixt:** 4-5 aus W18-W21 Brutal-Critique
- **Pattern-Copy-Files:** 0 (PDFs sind individuell durchdacht)
- **Total-Completion:** 93% → 96%+

---

*Plan-Stand 2026-05-06. Start: W23 (Tier 6 — F-05 Mahnung Stufe 1).*
