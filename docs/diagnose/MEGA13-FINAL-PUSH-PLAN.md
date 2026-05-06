# MEGA¹³ — Final-Push Self-Capacity-Assessment + Plan

**Datum:** 2026-05-05/06
**Vorgaenger-Tag-Empfehlungen:** v213-v217 (alle lokal, kein Push)
**Modus:** Unlimited-Scope mit Bug-Hunt-Mindset (Pattern aus MEGA¹⁰-¹²)

---

## 1. Brutal-Critique W12-W16 (was uebersehen)

### W12 (Anthropic-Fallback) — gab 9/10

**Latente Bugs nach Re-Read:**

a) **isOutageError verfehlt HTTP 408 (Request Timeout):**
   - 408 ist 4xx, aber semantisch ein Timeout-Indicator
   - Mein Code: `if (/OpenAI 5\d\d/i.test(msg))` — 408 fehlt
   - Production-Impact: bei OpenAI-Side-Timeout → kein Fallback, User sieht 408
   - **Fix in W20**

b) **isOutageError verfehlt HTTP 502/503/504 mit anderen Bezeichnungen:**
   - Wenn fetch() selbst einen 502 wirft (Cloudflare-Ursache, nicht OpenAI), waere `Cloudflare 502` — mein Regex fordert `OpenAI 5\d\d`. Edge-Case aber moeglich
   - **Akzeptiert**: Network-Error catches via separate Patterns

c) **Anthropic-Adapter mapped finish_reason = 'tool_use' nicht:**
   - `stop_reason: 'tool_use'` (Anthropic-Tool-Calling) → wird zu 'stop' gemapped
   - Aktuell ungenutzt, aber wenn Tool-Use eingefuehrt wird: silent-incorrect

d) **Audit-Log keine Provider-Spalte:**
   - `_auditFallbackEvent` schreibt in audit_trail aber NICHT in ki_protokoll mit Provider-Info
   - User-Cost-Display zeigt nicht "OpenAI: 0,80€ + Anthropic: 0,15€"

### W13 (Confidence-Badges) — gab 9/10

**Latente Bugs:**

a) **Whitespace-Variants in Halluzinations-Filter:**
   - User-Eingabe: "Mit  Sicherheit" (zwei Spaces) → matcht NICHT `'mit sicherheit'`
   - "Mit\tSicherheit" (Tab) → matcht NICHT
   - Edge-Case bei kopierten Texten

b) **Frontend-Markers haben 24 Eintraege, Backend nur 14:**
   - Backend: kein `wäre`, `dürfte`, `würde` (Umlaute)
   - Production-Impact: Backend-Confidence-Score fuer Umlaut-haltige Outputs zu niedrig
   - Marcel-Backlog: Backend-Marker erweitern

c) **Score-Capping bei -90:**
   - Worst-Case mit allen Penalties: 100 - 25 - 20 - 30 - 30 - 20 = -25 → Math.max(0, -25) = 0
   - OK, keine Bug — aber Doku-Smell

### W14 (Mobile-UX) — gab 9/10

**Latente Bugs:**

a) **Pull-to-Refresh Multi-Touch-Bug:**
   - User pullt mit 1 Finger → start
   - Zweiter Finger touched → e.touches[0] bleibt erster Finger, aber wenn erster Finger losgelassen wird waehrend zweiter da ist, wird touchend NICHT gefeuert (touch counter > 0)
   - Edge-Case: Indicator stuck bei mid-Pull

b) **Safe-Area-Helper-Custom-Properties nicht dokumentiert:**
   - `--psa-pt-base` etc. wurden eingefuehrt aber nicht als API beschrieben
   - User weiss nicht: kann ich die Default-Padding ueberschreiben?

c) **Touch-Audit-Tool false-positive bei Padding 0:**
   - Mein Heuristic: `padding:[123]px` matched. Aber `padding:0` mit `min-height:48` ist OK
   - Heuristic ist konservativ → akzeptiert

### W15 (Drilldown) — gab 9/10

**Latente Bugs:**

a) **Focus-Trap NUR Initial-Focus:**
   - Tab-Cycle aus Modal raus moeglich
   - WCAG 2.1 sagt: Modals brauchen Focus-Trap (Tab-Cycle innerhalb Modal)
   - **Fix in W20**

b) **TimeRange-Buttons aria-pressed fehlt:**
   - Aktive Button hat nur class, keine aria-state
   - Screen-Reader sagt nicht "aktiviert"
   - **Fix in W20**

c) **`open()` ohne config-Validation:**
   - Nur `typeof config.loader !== 'function'` checked
   - Was wenn config.title === undefined? Dann steht 'Drilldown' (default) — OK

### W16 (Toast-Sweep) — gab 9/10

**Latente Bugs:**

a) **gericht-auftrag.html laedt prova-alert.js NICHT** (bereits dokumentiert)
b) **~20 weitere alert()-Stellen ungeprueft** (bereits dokumentiert)

---

## 2. Token-Capacity-Estimate

Ich bin sehr tief in dieser Long-Conversation (MEGA⁸ → ¹³ in einer Session). Realistische Estimates:

- **Tier 5 Rest** (KI-History-Frontend + KI-Edit-Suggestions, voll): ~25-30k Tokens
- **Tier 1 Mobile-UX-Rest** (Hamburger + Bottom-Sheet + Touch-Audit-Fixes): ~20-25k
- **Bug-Fixes-Sweep** (4-5 W12-W15-Bugs aus Critique): ~12-15k
- **Tier 2 Power-Features** (Bulk-Ops + 2 KPI-Drilldowns): ~15-20k
- **Tier 6 PDF-Templates**: BEWUSST ausgelassen (Pattern-Copy-Risiko zu hoch fuer kompetenten Sprint)
- **Final-Report**: ~8-10k

### PRIMARY GOAL (sicher schaffbar)

**3 Tiers, alle Quality 9/10:**

**P1: W18 — Tier 5 KI-Frontend-Rest (KI-History + KI-Edit-Suggestions)**
- `lib/ki-history-frontend.js`: Modal mit chronologischer KI-Interaktions-Liste pro Akte
- `akte-logic.js`-Integration: Button "🤖 KI-Historie" oeffnet Modal
- `lib/ki-autosuggest.js`: Ghost-Text-Pattern fuer Inline-KI-Vorschlaege (Tab/Esc)
- Tests fuer Format-Helpers + Integration

**P2: W19 — Tier 1 Mobile-UX-Rest (Hamburger + Bottom-Sheet + Touch-Audit-Fixes)**
- `lib/hamburger-menu.js`: Smooth-Slide-In + Tap-Outside-to-Close + ARIA
- `lib/bottom-sheet.js`: iOS-style Modal-Pattern + Swipe-down-to-dismiss
- Touch-Audit auf 5+ Pages laufen + Findings dokumentieren
- Page-Integration in archiv.html (Hamburger-Toggle)

**P3: W20 — Bug-Fixes aus Brutal-Critique W12-W15**
- W12: isOutageError 408-Status + 503-Variants
- W13: Whitespace-Variants in Halluzinations-Filter (multi-space, tab)
- W14: PTR Multi-Touch-Bug
- W15: Focus-Trap Tab-Cycle + aria-pressed bei TimeRange-Buttons
- Pro Bug: Test failed-vorher-passes-nachher

### STRETCH GOAL (wenn Tokens reichen)

**S1: W21 — Tier 2 Power-Features**
- `lib/admin-bulk.js`: Multi-Select-Checkboxes + Bulk-Actions-Bar + Undo-Timer
- 2 weitere KPI-Drilldowns in admin-dashboard (Aktive-Kunden, Pipeline)

### ULTIMATE GOAL (sehr ambitioniert)

- KI-Streaming-Response (SSE) — braucht Backend-Refactor, Browser-Test-Pflicht
- Saved-Views-Backend (User-Preferences-Tabelle) — Schema-Pflicht
- Tier 6 PDF-Templates — wenn echte Anwendung mit Schaden-Spezifika

**Realistic:** PRIMARY 3 + STRETCH 1 = 4 Tiers in 9/10. ULTIMATE wird wahrscheinlich nicht.

---

## 3. Quality-Bar pro Tier

Wie bisher:
- Tests mit Bug-Hunt-Mindset (echte Edge-Cases)
- Library + Page-Integration zusammen
- Refactor-Pass durchgefuehrt
- Self-Critique 8-9/10 (brutal-ehrlich)
- Browser-Test-Plan dokumentiert
- 0 Production-Breaking-Changes

---

## 4. Was ich definitiv NICHT mache

- ❌ PDFMonkey-Pushes
- ❌ Pilot-SV-Einladungen
- ❌ Stripe-Charges
- ❌ DB-Schema-Aenderungen ohne PLANNED-File
- ❌ Push + Tag (Marcel-OK pflicht)
- ❌ App-Icons/Splash-Screens generieren
- ❌ Externe Service-Konfiguration

---

## 5. Erwartete Quality-Metrics nach MEGA¹³

- **Tests:** 611 → 700+ (~90 neue)
- **LOC neu:** ~1500-1800
- **Tiers done:** 3 PRIMARY + 1 STRETCH = 4
- **Production-Bugs gefixt:** 4-5 aus eigenem Code (W12-W15)
- **Pattern-Copy-Files:** 0
- **Total-Completion:** 88% → 93%+

---

## 6. NACHT-PAUSE-Items kumulativ → MEGA¹⁴

Nach diesem Sprint bleiben offen (Marcel-Decision):
- Tier 6 PDF-Templates (10 weitere) — Schaden-Spezifika-Decision
- Tier 4 Airtable-Cleanup (20+ Functions) — Service-Mass-Refactor
- KI-Streaming SSE — wenn echtes Streaming gebraucht
- Saved-Views-Backend — Schema-Migration
- Backend-Konjunktiv-II-Marker um Umlaut-Varianten erweitern
- Anthropic-Tool-Use-Mapping (wenn Tool-Calling eingefuehrt wird)

---

*Plan-Stand 2026-05-05/06. Start: W18 (Tier 5 KI-Frontend-Rest).*
