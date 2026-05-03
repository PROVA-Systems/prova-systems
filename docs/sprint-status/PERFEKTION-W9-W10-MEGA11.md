# MEGA¹¹ W9 + W10 — STRETCH-Goals (KI-Cost-Display + PWA-Foundation)

**Sprint:** MEGA¹¹ W9+W10 (2026-05-04)
**Status:** ✅ Done (beide STRETCH-Goals erreicht!)
**Quality-Score:** W9 8/10, W10 8/10

---

## W9: Tier 5 KI-Cost-Display (~120 LOC + Modal)

### Was geliefert
- **`lib/ki-cost-display.js`** (~150 LOC): Frontend fuer existing /netlify/functions/ki-history.js (MEGA⁸ V3)
- **Modal in einstellungen.html**: KI-Nutzung-Sektion + Cost-Modal mit Time-Range-Filter
- **CSS-only Charts** (Vanilla-JS-Direktive): Bar-Chart fuer Kosten-pro-Funktion mit linear-gradient-fill
- **18 Tests**: Format-Helpers (fmt/fmtTokens/fmtEur/escapeHtml) + Integration-Verifikation in HTML
- **XSS-Defense**: escapeHtml-Test mit `<img onerror=alert(1)>`-Vector

### KPI-Cards
4 KPIs: Anrufe gesamt | Kosten gesamt | Tokens In | Tokens Out (alle aus ki_protokoll-Aggregation).

### Time-Range-Filter
Dropdown: 24 Stunden | 7 Tage | 30 Tage. Refresh-Button.

### Edge-Cases
- Empty-State bei keinen Calls
- Error-State bei API-Fail
- ESC-Key schliesst Modal
- aria-label fuer Modal + Close-Button

### Self-Critique 8/10
- ✅ Echte Page-Integration (Modal in echter Page)
- ✅ Pure-CSS-Charts (Vanilla-Direktive)
- ✅ XSS-Defense durch escapeHtml mit Test
- ⚠️ Charts sind nur Bar (kein Line/Pie) — Marcel-Backlog wenn gewuenscht
- ⚠️ Kein Drill-Down auf einzelne Calls (records werden empfangen aber nicht gerendert)

---

## W10: Tier 1 PWA-Foundation (~250 LOC + Manifest + Meta)

### Was geliefert
- **`lib/pwa-install-prompt.js`** (~190 LOC): Install-Prompt-Banner mit smart-Show-Logic
  - 3+ Visits Required (kein eager-Show)
  - 7-Tage-Cooldown nach Dismiss
  - iOS-spezifischer Hint (Teilen-Symbol → Home-Bildschirm)
  - Chrome/Edge: native beforeinstallprompt-Event
  - Skip wenn schon installiert (display-mode standalone)
- **manifest.json erweitert**: scope, id, prefer_related_applications: false
- **dashboard.html Meta-Tags erweitert**:
  - theme-color light + dark variants (prefers-color-scheme media-query)
  - apple-touch-icon mit explicit sizes 180x180
  - PWA-Install-Prompt Script geladen
- **27 Tests**: Library-Existence + API-Contract + Manifest-Vollstaendigkeit + dashboard-Integration + offline.html

### Smart-Show-Logic
```
isInstalled() → skip
wasDismissedRecently() → skip
visits < 3 → skip
deferredPrompt available OR isIOS() → setTimeout(show, 5000)
```

### Edge-Cases
- iOS: kein Auto-Event, statisches Hint
- Firefox: kein Install (returns false from canInstall())
- localStorage geblockt → fail silent
- Banner-aria-label fuer Accessibility
- ESC-Key NICHT implementiert (Banner ist non-modal)

### Self-Critique 8/10
- ✅ Smart Visit-Counter + Dismiss-Cooldown (User-friendly)
- ✅ iOS-spezifische UX (Apple-Native-Pattern)
- ✅ Manifest-Test verifiziert ALL Pflicht-Felder
- ⚠️ Echte PWA-Icon-Sets (8 Groessen) fehlen — Marcel-Asset-Pflicht
- ⚠️ iOS-Splash-Screens (12 Devices) NICHT generiert (braucht Marcel-Asset-Pipeline)
- ⚠️ Nur dashboard.html PWA-erweitert — andere Pages (akte/archiv) sollten dasselbe (Marcel-Pflicht-Backlog)

---

## Tests-Status nach W9+W10

W9: 18 neue Tests (alle gruen)
W10: 27 neue Tests (alle gruen)

**Test-Suite:** 436 → 481 (+45 Tests)

---

## File-Inventory MEGA¹¹ W9+W10

**Neu:**
- `lib/ki-cost-display.js` (~150 LOC)
- `lib/pwa-install-prompt.js` (~190 LOC)
- `tests/ki/ki-cost-display.test.js` (18 Tests)
- `tests/pwa/pwa-install-prompt.test.js` (27 Tests)
- `docs/sprint-status/PERFEKTION-W9-W10-MEGA11.md` (diese Datei)

**Modifiziert:**
- `einstellungen.html` — KI-Cost-Modal + Script-Loading
- `dashboard.html` — Theme-Color light+dark + PWA-Install-Script
- `manifest.json` — scope + id + prefer_related_applications
- `sw.js` — v266 → v267 + 6 neue Lib-Files in APP_SHELL

---

## Marcel-Pflicht (W9+W10)

### W9 Browser-Tests
1. einstellungen.html → Sektion "KI & Diktat" → Button "💰 Anzeigen"
2. Modal oeffnet → Time-Range "7 Tage" default → Lade KI-Cost-Daten
3. Wenn keine Daten: Empty-State mit Bot-Icon
4. Wenn Daten: 4 KPI-Cards + Bar-Chart pro Funktion
5. ESC-Key oder ✕-Button schliesst

### W10 Browser-Tests
1. dashboard.html oeffnen 3x in Inkognito (visits-counter trigger)
2. Erwarten: nach 5s Install-Prompt-Banner unten
3. iOS-Safari: Hint "Teilen → Home-Bildschirm"
4. "Spaeter" klicken → 7 Tage kein Re-Show
5. Chrome: "Installieren" → native Install-Dialog
6. Nach Install: app-mode standalone, kein Banner mehr

### Marcel-Asset-Pflicht (PWA)
- 8 Icon-Groessen als PNG (16, 32, 96, 128, 144, 192, 256, 384, 512)
- 12 iOS-Splash-Screens (verschiedene iPhone+iPad-Aufloesungen)
- Maskable-Icon-Variant fuer Android Adaptive-Icons

---

*W9 + W10 done — beide STRETCH-Goals erreicht. Quality 8/10 jeweils. Final-Report W11 folgt.*
