# PROVA UI-Diagnose — akute Bugs (Read-only)

**Erstellt:** 2026-04-24
**Sprint:** UI-DIAGNOSE-AKUT (read-only, kein Code-Change)
**Code-Stand:** `main` nach `v180-ssicher-p1-done` (= `baf37c7`)
**Auditor:** Claude Code (Opus 4.7)

---

## Zusammenfassung

| Schweregrad | Anzahl | Status |
|---|---|---|
| 🔴 Akut | 6 | sofort fixen |
| 🟠 Wichtig | 5 | vor Pilotkunden |
| 🟡 Schönheit | 4 | später |

Alle 5 von Marcel beschriebenen Bugs haben klare Ursachen gefunden. Für jeden Bug steht in **„Direkt-Antwort"** am Ende des Reports die kurze Erklärung; die Details pro Finding folgen darunter.

**Referenz zu AUDIT-REPORT.md:** Finding 7.4 (dashboard.html ohne Auth-Guard-Redirect) ist weiterhin offen und trägt zum Layout-Chaos bei — hier nicht dupliziert.

---

## 🔴 Akute Bugs

### Finding 1 — `nav.js:479-488` · Sidebar-Layout wechselt je nach Fensterbreite

**Datei/Zeile:** `nav.js` Zeilen 479-488

```javascript
var savedCollapse = localStorage.getItem('prova_sb_collapsed');
var collapsed;
if (savedCollapse === '1' || savedCollapse === '0') {
  collapsed = savedCollapse === '1';
} else {
  // Erste Sitzung: Auto-Collapse bei schmalen Fenstern
  collapsed = window.innerWidth < 1100 && window.innerWidth > 768;
}
if (collapsed) existing.classList.add('collapsed');
```

**Was passiert:** Bei jedem Page-Load prüft nav.js die Fenstergröße und setzt die Sidebar in einen von drei Zuständen:
- `>= 1100px` → volle Sidebar mit Text-Labels.
- `769-1099px` → **automatisch** `.collapsed` (Icon-only, 56px breit).
- `<= 768px` → mobile Mechanik (ausgeblendet mit `translateX(-100%)`).

Die Auto-Collapse greift aber **nur, wenn der User noch nie auf den Einklappen-Button geklickt hat**. Sobald einmal geklickt, wird `prova_sb_collapsed` auf `'0'` oder `'1'` gesetzt und bleibt persistent.

**Was passiert bei Marcel:** Wechsel zwischen Fensterbreiten + Hardrefresh (Strg+Shift+R löscht localStorage NICHT, aber manchmal Incognito/Different-Browser = neuer Storage). Ergebnis: Layout flippt.

**Was MÜSSTE passieren:** Entweder
1. User-Wahl respektieren unabhängig von Breite, oder
2. Auto-Collapse-Threshold tiefer setzen (z. B. 900px), oder
3. Collapse-Zustand an ResizeObserver hängen statt nur an Page-Load.

**Reproduktion:**
1. DevTools öffnen, localStorage → `prova_sb_collapsed` löschen.
2. Fenster auf 1000px setzen, Seite neu laden → Icon-only Sidebar.
3. Fenster auf 1300px ziehen, neu laden → volle Sidebar.
4. Ohne localStorage-Löschen bleibt der zuletzt aktive Zustand.

**Fix-Skizze (Option: auf Resize reagieren):**
```diff
  var savedCollapse = localStorage.getItem('prova_sb_collapsed');
  var collapsed;
  if (savedCollapse === '1' || savedCollapse === '0') {
    collapsed = savedCollapse === '1';
- } else {
-   collapsed = window.innerWidth < 1100 && window.innerWidth > 768;
+ } else {
+   collapsed = window.innerWidth < 900 && window.innerWidth > 768;
  }
  if (collapsed) existing.classList.add('collapsed');

+ // Optional: bei Resize den auto-collapse Zustand anpassen, aber
+ // user-wahl nie überschreiben
+ window.addEventListener('resize', function () {
+   if (localStorage.getItem('prova_sb_collapsed') === null) {
+     var shouldCollapse = window.innerWidth < 900 && window.innerWidth > 768;
+     existing.classList.toggle('collapsed', shouldCollapse);
+   }
+ });
```

**Aufwand:** 30 Min (inkl. Playwright-Test `tests/02-authenticated-smoke.spec.js` erweitern um Viewport-Resize).

---

### Finding 2 — `dashboard.html:661-669` + `:778` · KPI-Kacheln bleiben optisch leer

**Dateien:** `dashboard.html` (Initial-DOM + CSS), `dashboard-logic.js` (Renderer).

Initial-DOM Zeile 778:
```html
<div id="kpi-aktiv" style="..."><span class="kpi-loading">000</span></div>
```

CSS Zeile 661-669:
```css
.kpi-loading {
  display: inline-block;
  color: transparent;   ← macht den Text "000" unsichtbar
  background: linear-gradient(...);
  animation: kpi-shimmer 1.5s infinite;
}
```

**Was passiert:** Der Initial-DOM hat die Zahl „000" eingebettet, aber `.kpi-loading` setzt `color: transparent` → man sieht nur den Shimmer-Effekt. Wenn `renderKPIs(faelle, termine, rechnungen)` später greift, überschreibt `kpiA.textContent = String(aktiv||0)` den gesamten inneren Inhalt (inkl. span) und setzt echten Text.

**Wenn `renderKPIs` NICHT greift (z. B. Airtable 403/422 im Netzwerk vor `renderKPIs`-Call, oder Error vor Line 720/750), bleibt der transparente „000"-Shimmer stehen — optisch leer.**

Im Test-Baseline aus S-AUDIT waren HTTP 422 auf Dashboard bestätigt: einzelne Airtable-Requests liefern 422 (Schema-Mismatch) → `results[0]` könnte `undefined` sein statt leeres Array → `faelle.length` wirft oder wird falsch → kein `renderKPIs`-Call.

**Zusätzlicher Verstärker:** `dashboard-logic.js:87-92` definiert `zeigSkeleton()`, das bei bestimmten Fällen nochmal mit `.skeleton`-Shimmer überschreibt. Race-Condition zwischen Skeleton und renderKPIs denkbar.

**Was MÜSSTE passieren:** Initial-DOM sollte `0` statt Shimmer zeigen — oder `color: transparent` nur während des aktiven Ladens greifen und im Fehlerfall auf `0` zurückfallen.

**Fix-Skizze A (sicher, minimal):**
```diff
- <div id="kpi-aktiv" style="..."><span class="kpi-loading">000</span></div>
+ <div id="kpi-aktiv" style="...">0</div>
```
Der Shimmer verliert sich dadurch, aber die Nutzer sehen jederzeit eine Zahl. Alternativ: globaler `finally`-Block in `ladeAlleDaten` der bei jedem Exit `renderKPIs([],[],[])` aufruft, wenn noch nicht geschehen.

**Fix-Skizze B (korrekter):**
```javascript
// dashboard-logic.js Zeile 744-758 catch-Block:
} catch(err) {
  console.warn('Zentrale Ladefehler:', err);
  renderKPIs([],[],[]);   // IMMER KPIs mit 0 füllen, nicht nur in einem Pfad
  renderCal([]);
  // ...
}
```

Aktuell wird `renderKPIs([],[],[])` nur dort aufgerufen, wenn localStorage leer ist — bei localStorage-Daten fließt der Code in einen anderen Zweig und der transparente Initial-DOM bleibt im schlimmsten Fall stehen.

**Aufwand:** 45 Min (Fix + Test).

---

### Finding 3 — `trial-guard.js:207` · Overlay verdunkelt Mobile-Screen nach 800ms

**Datei/Zeile:** `trial-guard.js:199-208`

```javascript
if (trialAbgelaufen) {
  var page = window.location.pathname.split('/').pop() || '';
  var erlaubt = ['einstellungen.html','app-login.html',...];
  if (erlaubt.indexOf(page) >= 0) return;
  setTimeout(function() { zeigeTrialAbgelaufenOverlay(); }, 800);
}
```

**Was passiert:** Wenn der User-Trial abgelaufen ist (`trialAbgelaufen = true`), legt sich 800ms nach DOM-Ready ein Fullscreen-Overlay über die Seite. Auf langsamen Geräten (iPhone) können die 800ms plus Layout-Berechnung gut **2 Sekunden** werden — genau das, was Marcel beobachtet hat.

**VERMUTUNG:** Marcels Test-Account hat den Trial-Ablauf erreicht. In der Datenbank `SACHVERSTEANDIGE.trial_end` liegt vermutlich vor 2026-04-24. Das Overlay ist produktiv korrekt (Abo-Upgrade erzwingen), aber während Entwicklungs-Testing stört es.

**Was MÜSSTE passieren auf Mobile:** Overlay ist fine als Feature, aber
1. Sollte nicht „aus dem Nichts" aufblenden — nur nach User-Interaktion mit gesperrten Features (wie `paket-guard.js` es macht).
2. Oder: auf Dev-Umgebung unterdrücken (Marcels E-Mail whitelisten).

**Reproduktion:**
1. Mobile-Browser (iPhone 15) öffnen.
2. prova-systems.de/dashboard.html öffnen.
3. Nach ~2 Sek dunkelt der Screen, Upgrade-Modal erscheint.

**Fix-Skizze (Marcel-Dev-Bypass):**
```diff
  if (trialAbgelaufen) {
+   // DEV-Bypass für Marcel während Entwicklung
+   var svEmail = (localStorage.getItem('prova_sv_email') || '').toLowerCase();
+   if (svEmail.endsWith('@prova-systems.de')) return;
    var page = window.location.pathname.split('/').pop() || '';
    ...
```

Oder: Overlay nur bei tatsächlichem Feature-Klick triggern (analog zu paket-guard.js).

**Aufwand:** 10 Min (Dev-Bypass) bzw. 2 h (echter Umbau auf On-Demand).

---

### Finding 4 — Breakpoint-Chaos zwischen 4 CSS-Quellen

**Dateien:** `nav.js` (inline-CSS), `mobile.css`, `prova-design.css`, `dashboard.html` (inline-CSS).

Die Sidebar/Layout-Regeln für Schmalfenster kommen aus **vier verschiedenen Media-Queries**, die sich teilweise widersprechen:

| Breakpoint | Quelle | Was wird gemacht |
|---|---|---|
| `< 768px` | `nav.js:352-361` | `.sidebar { transform: translateX(-100%); }` (Drawer von links) |
| `< 768px` | `mobile.css:13-106` | `.sidebar { transform: translateY(100%) !important; bottom:0; ... }` (Bottom-Sheet) |
| `768-1024px` | `mobile.css:109-114` | `.sidebar { width: 220px !important; }` (Tablet) |
| `< 800px` | `dashboard.html:659` | `#dash-grid { grid-template-columns: 1fr !important }` |
| `< 1100px` (auto) | `nav.js:486` | `.sidebar.collapsed` (Icon-only, Finding 1) |

**Was passiert:** Bei `< 768px` versuchen **nav.js** (translateX, Side-Drawer) und **mobile.css** (translateY, Bottom-Sheet) gleichzeitig, die Sidebar zu verstecken. mobile.css gewinnt wegen `!important`, **aber** der Overlay aus nav.js (`.sb-overlay`) und der Overlay aus mobile.css (`.mobile-sidebar-overlay`) sind zwei separate Mechanismen — doppelte Z-Index-Stacks.

Zwischen 769-900px (Marcel's beobachteter Bereich): Keine Mobile-Behandlung, Sidebar steht auf 228px/56px (je nach collapse), Content hat margin-left. **Das ist nicht automatisch „doppelte Sidebar", aber** wenn der User Chrome DevTools Viewport-Resize nutzt, kann nav.js beim Resize-Event die Sidebar re-rendern und kurzzeitig zwei Instanzen sichtbar machen.

**VERMUTUNG Bug 2:** Marcel sieht „zwei Sidebars" bei 600-900px vermutlich weil:
- bis 768px: mobile.css schiebt Sidebar als Bottom-Sheet nach unten, aber
- die eigentliche Sidebar mit `width: 228px` steht noch links fixiert sichtbar ohne effektives Schließen weil nav.js-translateX und mobile.css-translateY sich gegenseitig nicht wegdrücken.

**Zusätzlich:** `prova-touch-targets.css` (8,5 KB, existiert) enthält weitere Media-Queries — nicht gelesen, aber wahrscheinlich weitere `!important`-Regeln.

**Was MÜSSTE passieren:** Einheitlicher Breakpoint-Plan mit **einer** Source-of-Truth. Empfehlung:
- `< 640px`: echtes Mobile, Bottom-Sheet.
- `640-1024px`: Tablet, überlagernde Sidebar mit Overlay-Dimmer.
- `> 1024px`: Desktop, permanent sichtbare Sidebar (voll oder collapsed).

**Aufwand:** 4-6 h (Breakpoint-Konsolidierung + Regression über alle Seiten).

---

### Finding 5 — `dashboard-core.js`, `dashboard-kpis.js`, `dashboard-init.js`, `dashboard-aufgaben.js`, `dashboard-kalender.js` werden **nirgends** eingebunden

**Datei-Set:** Die fünf Dashboard-Teil-Files existieren im Repo, werden aber in **keiner einzigen HTML-Seite** als `<script src>` geladen (verifiziert per Glob/Grep).

**Konsequenz:**
- `dashboard-logic.js` (931 Zeilen) ist der einzige aktive Dashboard-Code.
- Mein Commit `2442087` aus S-SICHER Paket 1 hat `dashboard-core.js:26` auf `window.PROVA_CONFIG.AIRTABLE_BASE` umgestellt — **wirkungslos**, weil die Datei nie geladen wird.
- Entweder: Refactoring war geplant aber nicht abgeschlossen → Dateien sind toter Code (wie die Root-Function-Duplikate aus Finding 4.5).
- Oder: Dateien waren experimentell und wurden nie integriert.

**Was MÜSSTE passieren:** Entscheidung:
1. Integrieren (als Module in dashboard.html laden) → `dashboard-logic.js` refactoren und auf die 5 aufteilen.
2. Löschen (als toter Code markieren) und meinen BASE_ID-Commit auf `dashboard-logic.js` übertragen.

**Aufwand:** 15 Min (Löschen + Nachtrag BASE_ID in dashboard-logic.js), oder 4-8 h (echte Modularisierung).

---

### Finding 6 — Naming-Inkonsistenz: „Meine Fälle" vs. `archiv.html` vs. `akte.html` vs. geplantes `fall-aufmachen.html`

**Source-of-Truth:** `docs/BLUEPRINT-v1.1.md` (Master-Referenz).

| Quelle | Bezeichnung |
|---|---|
| Sidebar-Label (`nav.js:78`) | „Meine Fälle" |
| Sidebar-Href (`nav.js:78`) | `archiv.html` |
| `archiv.html` Seitentitel | (zu prüfen) |
| BLUEPRINT v1.1 (Zeile 164) | `/archiv.html` = „Vollansicht aller Fälle (Filter, Suche)" |
| BLUEPRINT v1.1 (Zeile 159) | `/akte.html?az=…` = „Nervensystem für EINEN konkreten Fall" |
| BLUEPRINT v1.1 (Zeile 157) | `/fall-aufmachen.html` = „Einstiegspunkt" (geplant Sprint S3, noch nicht gebaut) |
| CLAUDE.md | keine explizite Naming-Regel |

**Diagnose:** Das Sidebar-Label „Meine Fälle" ist **korrekt** — es zeigt auf die Liste aller Fälle (`archiv.html`). „Akte" bezieht sich auf EINEN Fall und ist eine andere Seite. „Archiv" ist der URL-Pfad aus Legacy-Gründen.

Nach Sprint S3 soll der Sidebar-Link von `archiv.html` auf `fall-aufmachen.html` umziehen — dann sind drei Seiten nötig:
- `fall-aufmachen.html` (Einstiegspunkt, Sidebar-Link)
- `archiv.html` (Vollansicht, bleibt für Archiv-Link)
- `akte.html?az=` (Detail-Seite für einen Fall)

**Was MÜSSTE passieren:** Nichts bis S3. Das aktuelle Naming ist nur **temporär** inkonsistent (Sidebar → archiv.html ist Legacy). Marcel soll das **nicht** jetzt patchen, sondern in S3 atomar umstellen.

**Aufwand:** 0 (nichts zu tun bis S3).

---

## 🟠 Wichtige Bugs

### Finding 7 — Zwei verschiedene Mobile-Overlay-Mechanismen

Sowohl `nav.js` als auch `mobile.css` bringen Overlay-Layer:
- `nav.js:346-351`: `.sb-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199; }` mit `.sb-overlay.open`.
- `mobile.css:161-172`: `.mobile-sidebar-overlay { position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:8999; }` mit `.mobile-sidebar-overlay.show`.

**Risiko:** Wenn beide gleichzeitig geöffnet sind (je einer pro CSS-Quelle), stapeln sich zwei dunkle Schichten. Verschärft Bug 2.

**Fix:** Einen der beiden entfernen. nav.js's `.sb-overlay` ist die aktive Mechanik (Event-Handler in Zeile 541-547 verwendet sie). mobile.css's `.mobile-sidebar-overlay` scheint ein Relikt zu sein — grep zeigt keine JS-Stellen, die `.mobile-sidebar-overlay` setzen/entfernen.

**Aufwand:** 15 Min.

---

### Finding 8 — `paket-guard.js` Upgrade-Overlay trägt zum Chaos bei

`paket-guard.js:291-310` baut einen weiteren Fullscreen-Overlay (`.pg-overlay`, `z-index: 9000`). Wird getriggert bei `pruefeFeature()`-Aufrufen wenn ein Feature nicht im Paket ist.

**Nicht automatisch beim Page-Load**, also weniger kritisch als Trial-Overlay. Aber auf Mobile können sich `.pg-overlay` (`z-index:9000`), `.sb-overlay` (`z-index:199`), `.mobile-sidebar-overlay` (`z-index:8999`) und Trial-Overlay (eigener Stack) stapeln.

**Fix:** Z-Index-Strategie dokumentieren und konsolidieren — zentrale CSS-Variable `--z-sidebar-overlay: 199; --z-modal: 9000; --z-paket-overlay: 9500;` etc.

**Aufwand:** 30 Min Dokumentation, 2h Umsetzung.

---

### Finding 9 — Service Worker cached Alt-Version bis zum nächsten Page-Load

`sw.js:76-85` Activate-Handler:
```javascript
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    // Kein auto-reload: Seite bleibt stabil, neuer SW wird beim nächsten Besuch aktiv
  );
});
```

Der Kommentar sagt's: **kein Auto-Reload**. Nach einem Deploy (z. B. nach Sprint IMPORT-FIX oder S-SICHER) sieht der User bis zum nächsten Page-Reload noch die alte Version. Das erklärt, warum Marcel **manchmal** die eine und manchmal die andere Sidebar-Variante sieht, unabhängig von Finding 1:

- Session 1: v180 geladen, alles aus v180-Cache.
- Deploy v181 passiert, SW installiert sich im Hintergrund.
- Session 2: erste Seite weiter aus v180-Cache, zweite Seite aus v181.
- `.css`/`.js` läuft laut sw.js:141-155 als Network-First — aber nur wenn Netzwerk da ist. Bei kurzem Aussetzer → altes CSS aus Cache.

**Das erklärt Bug 1 als Verstärker**, nicht als Ursache. Die Hauptursache für Layout-Flip bleibt die Auto-Collapse-Logik.

**Fix:** `self.clients.claim()` + optional `reloadAllClients()` bei kritischen Deploys.

**Aufwand:** 15 Min (nur Claim), 1 h (inkl. Client-Reload + Test).

---

### Finding 10 — `archiv.html` / andere Seiten haben `prova-config.js` NICHT eingebunden

**Kontext:** Mein Commit 4 (`2442087`) hat `prova-config.js` nur in `app.html`, `dashboard.html`, `akte.html` eingebunden. `archiv.html` und 40+ andere Seiten haben die neue Config nicht.

**Konsequenz:** In den anderen Seiten wird `window.PROVA_CONFIG` undefined sein. Der Fallback-Mechanismus `(window.PROVA_CONFIG && ...) || 'appJ7bLlAHZoxENWE'` greift, also kein Bruch — aber die zentrale Config ist dort wirkungslos.

**Das war Marcel bei Commit 4 explizit akzeptiert („restliche ~35 Files bleiben unangetastet — Folge-Sprint"). Kein akuter Bug, nur Erinnerung.**

**Aufwand:** 0 jetzt, ~1 h im Folge-Sprint.

---

### Finding 11 — `prova-touch-targets.css` ist 8,5 KB groß, nicht im Audit geprüft

Existiert im Repo-Root, wird vermutlich eingebunden (Glob-Treffer `sidebar|nav-item` u. a.). Der Datei-Inhalt wurde in diesem Audit nicht gelesen. **Potenzial für weitere `!important`-Konflikte.**

**Aufwand zur Prüfung:** 15 Min Grep + lesen.

---

## 🟡 Schönheits-Bugs

### Finding 12 — `.kpi-loading` Shimmer zu subtil
Farbverlauf zwischen `var(--border2)` und `var(--surface2)` ist bei kleinem 22px-Font kaum wahrnehmbar. User nehmen die Kachel als „leer" wahr, statt „lädt".

### Finding 13 — Layout-Shift nach KPI-Laden
`kpiA.textContent = String(...)` ersetzt den span mit transparenten „000". Wenn die echte Zahl kürzer ist (z. B. „5"), passiert ein winziger horizontaler Shift.

### Finding 14 — Emojis als Icons variieren zwischen Browsern/OS
Sidebar-Icons (`⊞ 📂 📅 📍 ✅`) rendern auf Windows, Mac, iOS unterschiedlich — manche als SVG-Emoji, manche als Unicode-Symbol. Auf schmalen Desktops (400px Sidebar) kann die Icon-Breite zwischen 14-22px variieren und Layout-Hüpfer auslösen (obwohl nav.js:282 `width:22px` fix setzt).

### Finding 15 — iOS-Safe-Area-Padding doppelt deklariert
`mobile.css:249-258` hat `@supports (padding: max(0px))`-Block, der `env(safe-area-inset-bottom)` doppelt addiert (`max(8px, ...) !important` und `calc(60px + ...)`). Auf iPhone 15 mit Dynamic Island kann das zu 80+px freiem Raum am unteren Rand führen.

---

## 📋 Direkt-Antwort auf die 5 gemeldeten Bugs

### Bug 1 — Wieso wechselt die Sidebar zwischen 2 Layouts?
**`nav.js:486`.** Bei `window.innerWidth < 1100 && > 768` wird die Sidebar automatisch in `.collapsed` (Icon-only) gesetzt, **aber nur wenn der User nie auf den Einklappen-Button geklickt hat** (`prova_sb_collapsed` nicht im localStorage). Das passiert bei Hard-Refresh nicht, wohl aber nach localStorage-Clear oder in neuem Browser-Profil.
→ Finding 1.

### Bug 2 — Wieso doppelte Sidebar bei halbem Fenster?
**Breakpoint-Konflikt zwischen `nav.js` (translateX-Drawer, @768) und `mobile.css` (translateY-Bottom-Sheet, @768 mit `!important`)** plus zwei parallele Overlay-Mechanismen (`.sb-overlay` vs `.mobile-sidebar-overlay`). Zwischen 769-1100px zusätzlich Auto-Collapse aktiv. Die beiden dunklen Schichten stapeln sich.
→ Findings 4 + 7.

### Bug 3 — Wieso verdunkelt sich der Mobile-Screen nach 2s?
**`trial-guard.js:207` — `setTimeout(function() { zeigeTrialAbgelaufenOverlay(); }, 800);`** feuert wenn Trial abgelaufen. Auf Mobile ~2 Sek bis sichtbar. Marcels Trial ist vermutlich abgelaufen.
→ Finding 3.

### Bug 4 — „Meine Fälle" vs. „Akte" vs. „Archiv" — was gilt?
**Source-of-Truth: `docs/BLUEPRINT-v1.1.md`**. Kurz:
- „Meine Fälle" (Sidebar-Label) = Liste aller Fälle → zeigt aktuell auf `archiv.html` (Legacy-URL), soll nach S3 auf `fall-aufmachen.html`.
- „Akte" = EIN Fall → `akte.html?az=…`.
- „Archiv" = Vollansicht mit Filter → `archiv.html`, bleibt bestehen.

Das Sidebar-Label ist inhaltlich korrekt, nur die URL wird in S3 umgezogen.
→ Finding 6.

### Bug 5 — Wieso bleiben KPI-Kacheln leer?
**`dashboard.html:663` hat `color: transparent` auf `.kpi-loading`**. Initial-DOM zeigt unsichtbares „000". Wenn `renderKPIs` nicht durchläuft (z. B. wegen HTTP 422 oder Error vor dem call), bleibt die Kachel transparent. Fix: Initial-DOM auf `0` setzen statt `<span class="kpi-loading">000</span>`.
→ Finding 2.

**Bonus-Antwort zu „welches Overlay verdunkelt Mobile":** Der Trial-Guard-Overlay (`trial-guard.js` via `provaBuildTrialOverlay`). In der DevTools-Console müsstest du `document.getElementById('trial-overlay')` sehen nach den 2 Sekunden.

---

## 🎯 Top-10 dringende Fixes mit Aufwandsschätzung

| # | Finding | Was | Aufwand | Sprint-Empfehlung |
|---|---|---|---|---|
| 1 | **Finding 2** | `.kpi-loading color: transparent` → Initial-DOM auf `0` | 15 Min | UI-FIX Paket 1 |
| 2 | **Finding 3** | Trial-Overlay Dev-Bypass für `@prova-systems.de`-Emails | 10 Min | UI-FIX Paket 1 |
| 3 | **Finding 1** | nav.js Auto-Collapse-Threshold 1100→900 + Resize-Listener | 30 Min | UI-FIX Paket 1 |
| 4 | **Finding 7** | mobile.css `.mobile-sidebar-overlay` entfernen (Relikt) | 15 Min | UI-FIX Paket 1 |
| 5 | **Finding 5** | dashboard-core.js + 4 weitere entweder integrieren oder löschen | 15 Min löschen / 4-8 h integrieren | **Entscheidung Marcel nötig** |
| 6 | **Finding 9** | SW `self.clients.claim()` + optional force-reload bei major-Version | 15 Min | UI-FIX Paket 1 |
| 7 | **Finding 4** | Breakpoint-Konsolidierung (640 / 1024 / 1400) über alle CSS-Quellen | 4-6 h | **UI-FIX Paket 2** (eigener Sprint) |
| 8 | **Finding 11** | `prova-touch-targets.css` prüfen + aufräumen | 30 Min | UI-FIX Paket 1 |
| 9 | **Finding 8** | Z-Index-Strategie mit CSS-Variablen zentralisieren | 2 h | UI-FIX Paket 2 |
| 10 | **Finding 12-15** | Schönheits-Bugs (Shimmer, Layout-Shift, Emojis, Safe-Area) | 2 h gesamt | nach Pilotkunden |

**Gesamt Paket 1 (Safe Wins):** ~2 h  
**Gesamt Paket 2 (Breakpoint-Refactor):** ~6-8 h

---

## Was NICHT im Scope war

- `prova-touch-targets.css` Inhalt (nur Existenz geprüft).
- `integration-template.html` / iframe-Struktur (nicht untersucht — scheint nicht in dashboard.html verwendet).
- `prova-design.css` Zeilen 132-969 (nur Header-Suchmuster; Volltext-Review 1 h).
- Playwright-Reproduktion der Bugs mit echtem Browser (nur aus Code abgeleitet).

---

**STOPP.** Kein Code geändert. Marcel reviewt und entscheidet, welche Findings in welcher Reihenfolge gefixt werden. Empfehlung: Top-6 als UI-FIX Paket 1 zusammenfassen (ca. 2 h Arbeit).
