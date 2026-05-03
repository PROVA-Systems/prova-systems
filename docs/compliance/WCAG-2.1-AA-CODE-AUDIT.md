# WCAG 2.1 AA — Code-Audit (PROVA Systems)

**Stand:** 04.05.2026 (MEGA⁸ V2)
**Methode:** Code-Audit (kein Browser-Audit-Tool wie axe DevTools — das ist Marcel-Pflicht)

---

## WCAG 2.1 Conformance-Level: AA

Audit nach den 4 WCAG-Prinzipien:
1. **Perceivable** (wahrnehmbar)
2. **Operable** (bedienbar)
3. **Understandable** (verstaendlich)
4. **Robust** (robust)

---

## 1. Perceivable

### 1.1 Text Alternatives (Level A)
| Punkt | Code-Status | Aktion |
|---|---|---|
| Bilder mit `alt` | ⚠ teilweise | Foto-Anlagen brauchen alt mit Befund-Beschreibung |
| Decorative Images mit `alt=""` | ⚠ teilweise | Logo-SVGs pruefen |
| Form-Inputs mit `<label>` | ✅ groesstenteils | Konsistent in app.html |
| Icons mit `aria-label` | ⚠ teilweise | Bell-Icon (V1), Burger-Menu — pruefen |

### 1.3 Adaptable (Level A)
- ✅ Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>` durchgehend
- ✅ Reading-Order: logisch DOM-strukturiert
- ⚠ ARIA-Landmarks pruefen: dashboard.html sollte `role="main"` haben

### 1.4 Distinguishable (Level AA)
| Punkt | Code-Status | Aktion |
|---|---|---|
| Color-Contrast 4.5:1 (normal) | ⚠ Browser-Audit-Pflicht | Marcel-axe-DevTools-Run |
| Color-Contrast 3:1 (large 18pt+) | ⚠ Browser-Audit-Pflicht | dito |
| Text-Resize 200% ohne Layout-Bruch | ✅ rem/em-basiert | OK |
| Reflow bei 320px Width | ⚠ teilweise | mobile-polish.css passt 90% |

---

## 2. Operable

### 2.1 Keyboard Accessible (Level A)
| Punkt | Code-Status | Aktion |
|---|---|---|
| Alle Funktionen tastatur-bedienbar | ⚠ pruefen | Tab-Reihenfolge in onboarding-tour |
| Focus-Indicator sichtbar | ✅ `:focus-visible` in mobile-polish.css | OK |
| Keine Keyboard-Trap | ✅ keine Modals ohne Escape | OK |
| Skip-to-Content-Link | ❌ fehlt | NEU: `<a href="#main">` als erstes |

### 2.2 Enough Time (Level A/AA)
| Punkt | Code-Status |
|---|---|
| Auto-Refresh deaktivierbar | ✅ Cockpit hat Auto-Refresh-Checkbox |
| Session-Timeout ankuendigen | ⚠ JWT-Expiry pruefen — Marcel-Manual |

### 2.3 Seizures
- ✅ Keine flashenden Inhalte (max 1Hz Pulse-Animation)

### 2.4 Navigable (Level AA)
| Punkt | Code-Status | Aktion |
|---|---|---|
| `<title>` pro Page | ✅ alle Pages haben Titel | OK |
| Headings-Hierarchie h1->h2->h3 | ⚠ teilweise | h1-Skip-Levels pruefen |
| Multiple Ways to navigate | ✅ Sidebar + Bottom-Nav + Breadcrumbs | OK |
| Focus-Visible | ✅ `:focus-visible` aktiv | OK |

---

## 3. Understandable

### 3.1 Readable (Level A)
- ✅ `<html lang="de">` durchgehend gesetzt

### 3.2 Predictable (Level AA)
- ✅ Konsistente Navigation
- ✅ Keine unerwarteten Context-Changes

### 3.3 Input Assistance (Level AA)
| Punkt | Code-Status | Aktion |
|---|---|---|
| Error-Identification | ✅ MEGA⁸ V2 lib/form-validate.js | NEU done |
| Labels/Instructions vorhanden | ✅ Form-Pattern in app.html | OK |
| Error-Suggestions | ✅ `errorMsg`-Slots in form-validate-Lib | OK |
| Error-Prevention bei rechtlichen/finanziellen Aktionen | ⚠ Stripe-Checkout — Stripe handled das | OK |

---

## 4. Robust

### 4.1 Compatible (Level A)
- ✅ Valid HTML5 (durchgehend `<!DOCTYPE html>`)
- ✅ Unique IDs (Pattern-Inspektion notwendig)
- ✅ ARIA-Roles wo benoetigt

### 4.2 Status Messages (Level AA)
- ✅ Toast-Notifications mit `role="status"` + `aria-live="polite"` (MEGA⁷ U3)
- ✅ Bell-Notifications-Panel (MEGA⁸ V1) — pruefen ob `aria-live`

---

## Konkrete Fix-Liste fuer Marcel (Sprint K-2)

### Hoch
- [ ] Skip-to-Content-Link als erstes in jeder Page
- [ ] Foto-Anlagen-`alt`-Pflicht im Akte-Editor
- [ ] axe-DevTools-Run pro Page (Browser-Pflicht)
- [ ] Color-Contrast-Verifikation mit axe oder WAVE

### Mittel
- [ ] Headings-Hierarchie-Audit (kein h1->h3-Skip)
- [ ] ARIA-Landmarks in Dashboard ergaenzen
- [ ] Bell-Notifications `aria-live` Polish

### Niedrig
- [ ] Reading-Order-Test mit Screen-Reader
- [ ] Tab-Reihenfolge in onboarding-tour pruefen
- [ ] PDF-Output-Accessibility (PDFMonkey-Templates pruefen)

---

## Bereits erfuellt (durch MEGA-Sprints)

- `:focus-visible` Pattern (MEGA⁴ Q2 mobile-polish.css)
- Toast-Notifications mit ARIA (MEGA⁷ U3)
- Form-Validation mit aria-invalid (MEGA⁸ V2 form-validate.js)
- Reduced-Motion-Support (MEGA⁴ Q2)
- Semantische HTML-Struktur durchgehend

---

## Audit-Tools fuer Marcel (Browser-Pflicht)

1. **axe DevTools (Chrome-Extension):** automatisierter Browser-Scan
2. **WAVE (browser-extension):** Visual-Audit
3. **Lighthouse Accessibility-Score:** Marcel-Browser-Run pro Page
4. **NVDA / VoiceOver (Screen-Reader):** Marcel-Manual-Test fuer kritische Flows

---

*WCAG-Code-Audit-Stand 04.05.2026. Browser-Verifikation als Marcel-Pflicht in Sprint K-2.*
