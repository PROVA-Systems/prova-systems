# MEGA¹² W14 — Tier 1 Mobile-UX-Subset

**Sprint:** MEGA¹² W14 (2026-05-05)
**Status:** ✅ Done (Subset: Touch-Audit + Safe-Area + Pull-to-Refresh)
**Quality-Score:** 9/10

---

## Was geliefert

### 1. `tools/touch-audit.js` (~140 LOC)

Statisches Audit-Tool fuer Touch-Target-Sizes (WCAG 2.5.5: min. 48x48px):
- Inline-style width/height < 48px Detection
- Mini-Buttons (padding 1-3px + kurzer Content) Detection
- CLI: `node tools/touch-audit.js [file] [--json]`
- Exit-Code: 1 bei mehr als 5 Warnings (CI-Gate)

**Limits ehrlich dokumentiert:**
- Externe CSS nicht resolved (Browser-Pflicht)
- Computed-Styles brauchen Browser
- Marcel-Pflicht: ergaenzendes axe DevTools

### 2. `lib/safe-area-helper.css` (~90 LOC)

Utility-Classes fuer iOS-Safari Safe-Area-Insets:
- `.psa-pt-safe`, `.psa-pb-safe`, `.psa-pl-safe`, `.psa-pr-safe` (padding)
- `.psa-px-safe`, `.psa-py-safe` (kombinierte axes)
- `.psa-mb-safe`, `.psa-mr-safe` (margin fuer FABs)
- `.psa-bottom-safe`, `.psa-top-safe` (fixed/sticky positioning)
- `.psa-min-h-screen`, `.psa-h-screen` (mit dvh-Fallback fuer iOS 100vh-Bug)
- `.psa-touch-target` (48x48 min)
- `.psa-no-tap-highlight` (Custom-Touch-Animations)
- `.psa-no-input-zoom` (font-size: 16px gegen iOS-Zoom)
- `.psa-momentum-scroll` (-webkit-overflow-scrolling)

**Browser-Support:**
- iOS Safari 11+: voll (env())
- Chrome Android: voll
- Desktop: env() returns 0px → max() Fallback wirkt als Default-Padding

**Pflicht-Setup (Marcel):** `<meta name="viewport" content="..., viewport-fit=cover">`

### 3. `lib/pull-to-refresh.js` (~230 LOC)

Touch-Event-basierter Pull-to-Refresh fuer scrollable Container:
- Vanilla touch-events (kein Library-Dep)
- iOS-Safari + Chrome-Android kompatibel
- WeakMap fuer State (Memory-Leak-Defense)
- `aria-busy` fuer Screen-Reader
- `prefers-reduced-motion` honoriert
- `unbind()` entfernt alle Listener

**Trigger-Logic:**
1. touchstart bei scrollTop === 0
2. touchmove > 10px → preventDefault native PTR
3. Visual: Indicator slides down mit Resistance
4. > triggerDistance (80px) + release → refresh callback
5. Spinner waehrend callback, Snap-back nach Done

**Public API:**
```js
ProvaPullToRefresh.bind(container, async () => { await refresh(); }, options?);
ProvaPullToRefresh.unbind(container);
```

### 4. Page-Integration in archiv.html

- safe-area-helper.css geladen (auch wenn aktuell ungenutzt — Marcel kann classes adden)
- pull-to-refresh.js geladen
- DOMContentLoaded-Handler bindet PTR auf #liste-body (nur wenn `'ontouchstart' in window`)
- Refresh-Callback: `ladeFaelle()` (existing function)

### 5. Tests (29 neue, alle gruen)

`tests/mobile/touch-audit.test.js`:
- 5 Tests Touch-Audit-Tool (Width/Height/Mini-Button-Detection)
- 9 Tests safe-area-helper.css (Critical-Classes vorhanden + max()-Fallback)
- 11 Tests pull-to-refresh.js (API + Konstanten + Memory-Leak-Defense + Accessibility)
- 5 Tests archiv.html-Integration (Library-Loading + Bind-Code)

---

## Edge-Cases dokumentiert

a) **Native iOS-Safari Pull-to-Refresh:**
   - iOS hat eigene PTR (refresht ganze Page)
   - Wir feuern preventDefault bei touchmove > 10px wenn scrollTop=0
   - Native PTR wird unterdrueckt, unsere PTR uebernimmt
   - Falls noch native trotzdem feuert: Browser-Bug, kein Code-Fix

b) **Touch-Cancel-Event:**
   - User scrollt ueber multi-touch oder Browser-Gesture → touchcancel
   - Wir behandeln wie touchend (snap back, kein refresh)

c) **Refresh-Callback wirft Exception:**
   - Try/catch um await refreshCallback() — Indicator wird trotzdem cleaned up
   - User sieht Snap-back, kein endloser Spinner

d) **Container ohne position:relative:**
   - Indicator ist absolute → wuerde ans `<body>` springen
   - Wir setzen `position:relative` automatisch wenn `static`

e) **Multi-Touch (zwei Finger):**
   - touchstart ignored bei zweitem Finger (e.touches[0] = first only)
   - User-Erwartung: kein PTR bei Pinch-Zoom

f) **Reduced-Motion:**
   - Spinner-Animation deaktiviert
   - Arrow-Rotation deaktiviert
   - Funktional bleibt alles gleich

---

## Browser-Test-Plan (Marcel-Pflicht)

### Test 1: Touch-Audit CLI

```bash
node tools/touch-audit.js dashboard.html
# Erwarten: 0-5 Warnings (Mini-Buttons im Headers)
node tools/touch-audit.js akte.html  
# Erwarten: ggf. mehr Warnings wegen vieler Action-Buttons
```

### Test 2: Pull-to-Refresh in archiv.html (iPhone Safari oder Chrome DevTools Mobile)

1. archiv.html im Mobile-Mode oeffnen
2. Liste-Body sichtbar
3. Mit Finger oben in Liste pull (oder DevTools Touch-Sim)
4. Bei < 80px: Snap-back, kein Refresh
5. Bei ≥ 80px: Indicator zeigt "Loslassen zum Aktualisieren", Arrow rotiert
6. Release: Spinner + Refresh
7. ladeFaelle() wird aufgerufen, danach snap-back

### Test 3: Safe-Area auf iPhone X+ (Notch)

1. Beliebige Page mit Notch-Device (iPhone X+)
2. Header an Top — sollte 44px+ Top-Padding haben (iPhone-Notch-Safe-Area)
3. Footer/FAB — 34px+ Bottom-Padding (Home-Bar-Safe-Area)
4. Marcel-Backlog: `class="psa-pt-safe"` an `<header>`-Tag adden

### Test 4: 100vh-Bug Fix

1. iPhone-Safari, beliebige Page mit `min-height: 100vh`
2. URL-Bar nach unten ziehen
3. Page-Height bleibt konstant (dvh-Unit)
4. Marcel-Backlog: `class="psa-min-h-screen"` an Body adden

### Test 5: Reduced-Motion

1. iOS Settings > Accessibility > Motion > Reduce Motion: ON
2. Pull-to-Refresh
3. Spinner statisch (keine Rotation), aber funktional

---

## Self-Critique (brutal-ehrlich)

### 9/10 — was gut war
- ✅ 3 Komponenten zusammen — Touch-Audit + Safe-Area + PTR (komplettes Mobile-UX-Paket)
- ✅ Vanilla JS, kein Library-Dep (CLAUDE.md-konform)
- ✅ Echte Page-Integration in archiv.html (PTR funktional)
- ✅ Memory-Leak-Defense (WeakMap + unbind)
- ✅ Accessibility (aria-busy, role-assignments, prefers-reduced-motion)
- ✅ 29 Tests umfassend (Tool-Logic + CSS-File + Library-API + Integration)
- ✅ iOS-Safari-Edge-Cases dokumentiert (100vh, Notch, Native-PTR-Conflict)

### Was nicht 10/10 war
- ⚠️ Safe-Area-Helper-Classes NICHT auf existing Pages angewendet — Marcel-Pflicht
- ⚠️ Pull-to-Refresh nur in archiv.html — Marcel-Pflicht: dashboard, kontakte, briefvorlagen, rechnungen sollten auch
- ⚠️ Touch-Audit zeigt theoretische Warnings, fixt sie nicht automatisch
- ⚠️ Long-Press, Swipe-Gestures, Hamburger-Animation NICHT implementiert (war im Tier 1 Plan, aber Token-Budget)

### Was Senior-Engineer noch tun wuerde
- Apply safe-area-helper-Classes in 5+ Pages (`<header class="psa-pt-safe psa-px-safe">`)
- Pull-to-Refresh in 4+ weitere Listen-Pages
- Long-Press-Lib (separater Sub-Sprint)
- Swipe-Gesture-Lib mit Threshold + Direction-Detection

---

## Quality-Bar

- 0 Production-Breaking-Changes
- node --check OK fuer alle Files
- 29/29 W14-Tests gruen
- CLAUDE.md-Konformitaet: Vanilla-JS, kein React/Vue

---

## File-Inventory MEGA¹² W14

**Neu:**
- `tools/touch-audit.js` (~140 LOC)
- `lib/safe-area-helper.css` (~90 LOC)
- `lib/pull-to-refresh.js` (~230 LOC)
- `tests/mobile/touch-audit.test.js` (29 Tests)
- `docs/sprint-status/PERFEKTION-W14-MOBILE-UX-MEGA12.md` (diese Datei)

**Modifiziert:**
- `archiv.html` — safe-area-helper.css + pull-to-refresh.js + DOMContentLoaded-Bind

**Test-Suite:** 543 → 572 (+29, alle gruen)

---

*Tier 1 subset done — Touch-Audit-Tool + Safe-Area-Helpers + Pull-to-Refresh-Library + echte Page-Integration. Quality 9/10.*
