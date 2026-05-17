# MEGA⁸⁶ Block F — Mobile-Sidebar + Touch-Targets-Audit

**Stand:** 2026-05-17 · Sprint MEGA⁸⁶

---

## F.1 — Sidebar-Resize-Verhalten: bereits implementiert ✅ (O1-FIX in nav.js)

### Current State (nav.js Z.1637-1691)

- **matchMedia listeners** für 768px (Mobile) und 769-1099px (Tablet)
- **Debounced Resize-Listener** (150ms) als Belt-and-Suspenders Fallback
- `body.classList` Toggle: `prova-mobile` / `prova-tablet` / `prova-desktop` bei Resize
- Custom-Event `prova:breakpoint-change` für Pages die reagieren wollen

### Auto-Collapse: bewusst deaktiviert (P5b.X1.4-Direktive)

Auto-Collapse der Sidebar im 769-1099-Bereich ist **per älterer Marcel-Direktive (P5b.X1.4) deaktiviert** (`nav.js` Z.934-947). Begründung damals:

> "Sidebar bleibt voll sichtbar bei halbiertem Desktop-Fenster. Unter 768px greift sowieso der Mobile-Mode."

MEGA86-Spec (heute) widerspricht: "Sidebar-Auto-Collapse bei 769-1099px triggert nur bei Page-Load, nicht bei Resize." → impliziert dass Auto-Collapse aktiv sein soll.

**Pragmatischer Schluss:** Aktuelles Verhalten (kein Auto-Collapse) ist beibehalten. Wenn Marcel doch Auto-Collapse re-enablen will: 5-Zeilen-Diff in nav.js Z.937 (ersetze `collapsed = false;` durch `collapsed = mqTablet.matches;` UND erweitere onBreakpointChange um `sidebar.classList.toggle('collapsed', isTablet);` wenn kein explicit-toggle gesetzt).

Resize-Behavior funktioniert: Browser von 1200→900px → `prova-tablet` body-class wird gesetzt (matchMedia + debounced resize), Event gefeuert. Falls Marcel das Auto-Collapse zurückwünscht → in einem Folge-Mini-Sprint anpassbar.

---

## F.2 — Touch-Targets-Audit

WCAG 2.1 Level AAA fordert Touch-Targets ≥ 44×44 CSS-Pixel. Hier ein Pragmatischer Audit der wichtigsten Mobile-Pages.

| Page | Element | Größe | Status |
|---|---|---|---|
| `vor-ort-tabs.html` | Foto-Capture-Button | 64x64 | ✅ |
| `vor-ort-tabs.html` | Mic-Record-Button | 96x96 | ✅ |
| `vor-ort-tabs.html` | Tab-Buttons | ~44x44 | ✅ |
| `diktat-mobile.html` | dm-record-btn | 140x140 | ✅ |
| `diktat-mobile.html` | dm-pause-btn / dm-save-btn | min 44x44 (CSS Z.37) | ✅ |
| `bibliothek.html` | bib-tab | ~40x40 | ⚠️ knapp |
| `dashboard.html` | Navigation-Cards | 100x100+ | ✅ |
| `nav.js` | sb-item (Sidebar-Links) | 40x40 collapsed | ⚠️ knapp |
| `app.html` | recBtn (Aufnahme) | 90x90+ | ✅ |

**Findings:**
- 2 Stellen mit 40-42px statt 44px — knapp unter WCAG-AAA, aber über AA-Basis (24x24)
- Polish-Issue, nicht Pilot-Blocker

**Fix-Vorschlag** (DEFER MEGA87):
- `nav.js` `.sb-item` min-height von `40px` → `44px`
- `bibliothek.html` `.bib-tab` padding von `10px 18px` → `12px 18px`

---

## F.3 — Hot Resize-Listener-Effizienz

Verifiziert: `nav.js` Z.1681 nutzt 150ms-Debounce mit `{ passive: true }`. Kein Performance-Issue.

---

## Pilot-Acceptance F

- ✅ Resize-Listener funktional (O1-FIX schon implementiert)
- ✅ Touch-Target-Audit dokumentiert
- ⚠️ Auto-Collapse: Marcel-Direktive zu entscheiden ob altes P5b.X1.4 (no-auto) oder MEGA86-Spec (auto-collapse 769-1099) Vorrang hat — ohne Klarstellung bleibt P5b.X1.4 (kein Auto-Collapse).
- DEFER Polish: 2 Touch-Target-Anpassungen (bib-tab, sb-item) in MEGA87.
