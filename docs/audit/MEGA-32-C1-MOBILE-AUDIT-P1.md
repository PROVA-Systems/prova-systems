# MEGA³² C1 — Mobile P1+P2 Audit + Touch-Targets + Sidebar-Resize-Fix

**Datum:** 2026-05-07

## P1 Mobile-Layout-Audit

### Pages getestet (Smoke via grep)

| Page | Mobile-Layout | Touch-Targets | Issues |
|---|---|---|---|
| dashboard.html | ✅ Responsive | ✅ ≥44px | — |
| akte.html | ✅ section-card-Pattern | 🟡 partial | back-btn könnte größer |
| stellungnahme.html | ✅ neue 60vw → 1fr unter 768px | ✅ Editor groß | KI-Toolbar mobile-tighten |
| freigabe.html | 🟡 deploy-steps mobile? | 🟡 partial | btnFreigeben prüfen |
| einstellungen.html | ✅ flex-wrap | ✅ es-btn | — |
| index.html (Landing) | ✅ DM Sans + Sections | 🟡 pricing-cards stack | OK |

### Touch-Target-Hardening

CSS-Helper hinzugefügt (`mobile-polish.css` extension):

```css
.btn, .topbar-btn, .tool-button, .section-toggle, .ctx-btn {
  min-width: 44px;
  min-height: 44px;
}
```

## P2 Sidebar-Resize-Bug-Fix

**Bug aus Memory-Notiz:** `nav.js:479-488` Auto-Collapse-Logic greift nur bei
page-load, nicht bei Window-Resize.

**Fix:** Window-Resize-Listener mit Debounce (250ms).

```js
let _resizeDebounce;
window.addEventListener('resize', () => {
  clearTimeout(_resizeDebounce);
  _resizeDebounce = setTimeout(applyAutoCollapse, 250);
});
```

## Lighthouse Mobile-Score Baseline

**TBD Marcel Manual-Test:** Vor Pilot-Live mit Lighthouse Mobile-Audit prüfen.
Zielwerte: Performance ≥80, Accessibility ≥90, SEO ≥95.

## Safe-Area-Insets für iOS

`lib/safe-area-helper.css` ist bereits in APP_SHELL — gilt für Bottom-Nav + Modal-Buttons.

---

*MEGA³² C1 — Co-Authored-By Claude Opus 4.7*
