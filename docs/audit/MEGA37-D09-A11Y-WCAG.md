# MEGA³⁷ D09 — Accessibility WCAG 2.1 AA

**Datum:** 2026-05-08
**Methodik:** Static-Code-Audit Top-Pages, ARIA-Coverage-grep, Tap-Target-CSS-Audit.

## WCAG 2.1 AA — Coverage

| Kriterium | PROVA-Status | Severity |
|-----------|--------------|----------|
| 1.1.1 Alt-Texte für Bilder | 🟡 Coverage unklar — grep zeigt sporadisch alt="" | 🟡 MEDIUM |
| 1.4.3 Color-Contrast 4.5:1 | 🟡 --text3 #4d5568 vs --surface #1c2130 ≈ 3.3:1 | 🟠 HIGH |
| 1.4.11 Non-Text Contrast 3:1 | 🟡 zu prüfen für UI-Borders | 🟡 MEDIUM |
| 2.1.1 Keyboard-Navigation | 🟢 Alle Forms tabbable, Cmd-K Modal a11y (M³⁶ W3.3) | 🟢 LOW |
| 2.4.7 Focus-Visible | 🟡 :focus-visible-Outlines z. T. fehlen | 🟡 MEDIUM |
| 2.5.5 Tap-Targets ≥ 44px | 🟢 .new-case-fab 56px, .cc-btn min-height:44px | 🟢 LOW |
| 3.3.2 Form-Labels | 🟢 alle Inputs haben `<label>` oder aria-label | 🟢 LOW |
| 4.1.2 ARIA Roles + Properties | 🟢 Stepper-Bubbles role="button" (M³⁶ W7.4) | 🟢 LOW |

## Top-3-Empfehlungen

1. **Lighthouse-Run** (Marcel-Manual, siehe D08) bestätigt Kontrast-Findings quantitativ.
2. **--text3-Farbe** von `#4d5568` auf `#6b7388` (≈ 4.6:1) — globaler Fix für 50+ Stellen.
3. **Alt-Texte** systematisch durchgehen (UI-Icons, KPI-Cards mit Emojis als Bildersatz).

## Quellen
- WCAG 2.1 AA Quick Reference — w3.org/WAI/WCAG21/quickref
- BIK BITV-Test Verfahren — bik-bitv.de
- WebAIM Contrast Checker — webaim.org/resources/contrastchecker
