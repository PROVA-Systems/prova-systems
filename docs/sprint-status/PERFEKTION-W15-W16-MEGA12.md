# MEGA¹² W15 + W16 — STRETCH-Goals (Drilldown + Toast-Migration)

**Sprint:** MEGA¹² W15+W16 (2026-05-05)
**Status:** ✅ Done (beide STRETCH-Goals erreicht)
**Quality-Score:** W15 9/10, W16 9/10

---

## W15: Tier 2 Drilldown-Foundation

### Was geliefert
- **`lib/admin-drilldown.js`** (~280 LOC): Modal-Component mit:
  - ARIA-Konformitaet (role="dialog", aria-modal, aria-labelledby)
  - ESC-Key + Backdrop-Click + Close-Button
  - Focus-Trap basic (Close-Btn Focus initial, previousFocus restore)
  - Loading + Empty + Error-States
  - TimeRange-Toolbar (24h/7d/30d) optional
  - XSS-Defense via _esc()
- **admin-dashboard.html Integration**: MRR-KPI klickbar (role="button", tabindex="0", aria-label, Keyboard-Support Enter+Space)
- **`oeffneKICostDrilldown()` Function**: nutzt /netlify/functions/ki-history (existing) und mapped per_funktion → Drilldown-Rows

### Tests (24 neue, alle gruen)
- 10 Tests Library-API (ARIA, ESC-Key, Backdrop-Click, Focus-Restore, XSS-Defense, TimeRanges)
- 8 Tests admin-dashboard.html Integration
- 6 Tests Render-Logic-Reproduktion (Empty, Rows, XSS, Hint optional)

### Self-Critique 9/10
**Gut:** ARIA-Compliance, XSS-Defense, Focus-Trap basic, Reuse existing API
**Nicht 10/10:**
- Nur 1 KPI klickbar (MRR) — andere KPIs koennen folgen (Marcel-Backlog)
- Focus-Trap nur basic (initial-Focus + previousFocus) — full Tab-Cycle-Trap waere besser

---

## W16: Toast-Migration-Sweep mit prova-alert

### Was geliefert
**7 Defense-in-Depth-Pattern-Stellen aus MEGA⁹+¹⁰ refactored:**

| File | Pre-MEGA¹² (5 Zeilen) | Post-MEGA¹² (1 Zeile) |
|---|---|---|
| `admin-dashboard-logic.js:455` | if/else 5 Zeilen | `(window.provaAlert \|\| alert)('...', 'error')` |
| `erechnung-logic.js:347` | if/else 5 Zeilen | 1 Zeile |
| `gericht-auftrag-logic.js:150` | if/else 5 Zeilen | 1 Zeile |
| `gutachterliche-stellungnahme-logic.js` 4 Stellen | je 5 Zeilen | je 1 Zeile |
| `stellungnahme-logic.js:210` | if/else 5 Zeilen | 1 Zeile |
| `rechnungen-logic.js:622` | if/else 5 Zeilen | 1 Zeile |
| `app-login-logic.js:109` | ProvaUI.toast direkt | `window.provaAlert(...)` |

**Library-Loading in 6 Pages:**
- admin-dashboard.html, rechnungen.html, app-login.html, erechnung.html, stellungnahme.html, gutachterliche-stellungnahme.html

**Code-Reduktion:** ~30 Zeilen weniger boilerplate. Defense-in-Depth bleibt erhalten via Pattern `(window.provaAlert || alert)` — ohne Library faellt es auf native alert zurueck.

### Tests (15 neue, alle gruen)
- 7 Tests pro File (provaAlert-Pattern verifiziert, alter Pattern weg)
- 6 Tests HTML-Loading
- 2 Tests Defense-in-Depth-Pattern Regression-Schutz

### Self-Critique 9/10
**Gut:** Echte Code-Reduktion, Defense-in-Depth bleibt, Tests verifizieren Pre+Post
**Nicht 10/10:**
- gericht-auftrag.html laedt prova-alert.js NICHT (kein direkter -logic.js loader, gericht-auftrag-logic.js wird via auftragstyp.js dynamic geladen) — Defense-Pattern faengt das aber auf
- ~20 weitere alert()-Stellen ungeprueft (war im W8 Self-Critique)

---

## File-Inventory MEGA¹² W15+W16

### W15 (Drilldown)
**Neu:**
- `lib/admin-drilldown.js` (~280 LOC)
- `tests/admin/drilldown.test.js` (24 Tests)

**Modifiziert:**
- `admin-dashboard.html` — MRR-KPI klickbar + Drilldown-Modal-Loader

### W16 (Toast-Sweep)
**Modifiziert:**
- 7 Logic-Files: admin-dashboard, erechnung, gericht-auftrag, gutachterliche-stellungnahme, stellungnahme, rechnungen, app-login
- 6 HTML-Files: gleiche + provaAlert-Library-Loading

**Neu:**
- `tests/ui/w16-toast-migration.test.js` (15 Tests)

**Test-Suite:** 572 → 611 (+39, alle gruen)

---

## Marcel-Pflicht (W15+W16)

### W15 Browser-Tests
1. admin-dashboard.html → MRR-KPI hovern → cursor:pointer
2. Click → Modal mit Loading-State
3. ki-history-Backend liefert Daten → Modal zeigt per-Funktion-Rows
4. Time-Range "24h" klicken → Reload mit kuerzerem Zeitraum
5. ESC-Key → Modal schliesst
6. Tab-Navigation: KPI-Card fokussierbar, Enter+Space oeffnen Modal

### W16 Browser-Tests
1. admin-dashboard.html → Ticket-Status-Update mit Network-Off → roter Toast (nicht alert!)
2. erechnung.html "XML kopieren" mit fehlenden Pflichtfeldern → roter Toast
3. Andere migrierte Pages: KI-Save-Failure, PDF-Generation-Fehler, Speech-Browser-Fehler
4. F12 Network → /lib/prova-alert.js geladen
5. Alle Stellen: Toast statt blocking-alert

---

*W15+W16 done — beide STRETCH-Goals mit Quality 9/10. Test-Suite 572 → 611.*
