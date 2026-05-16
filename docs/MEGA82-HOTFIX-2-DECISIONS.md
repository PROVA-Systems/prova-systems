# MEGA⁸²-Hotfix-2 DECISIONS — AZ-Cleanup + Section-Labels + Kalender-Universal

**Stand:** 2026-05-16 · Branch: `feat/mega82-hotfix-2-cleanup-and-calendar` (von Hotfix-1)
**Parallel-Branch:** `feat/mega83-akte-mission-control` (eigener Sprint, kein Konflikt erwartet)

---

## Pre-Read ✅

- `CLAUDE.md` (Stand nach Hotfix-1)
- `docs/MEGA82-HOTFIX-1-DECISIONS.md`
- `app-logic.js` — AZ-Audit (Web-Claude-Liste verifiziert)
- `dashboard.html` Section-Labels (`.dc-section-label` Tokens)
- `kalender.html` — existierte NICHT, komplett neu zu bauen
- Schema-Wahrheit: termine + fristen + dokumente + auftraege (siehe MEGA83-Pre-Read)

---

## Phase A — AZ-Frontend-Cleanup ✅

### A.1 — Legacy-Auto-Generator no-op
**File:** `app-logic.js` Z.2110-2155
- `generiereAZ(schadenart)`: returns '' (No-Op)
- `aktualisiereAZ()`: returns void (No-Op)
- DOMContentLoaded-Listener auf `f-schadenart`-Change entfernt
- window-Aliases bleiben (No-Op) für Caller-Compat (`onchange="aktualisiereAZ()"` im HTML)

**Begründung:** localStorage-basierter Counter führte zu Workspace-Drift wenn mehrere Devices/Users gleichen Counter hatten. DB-Trigger v2.0 (Migration mega82_hotfix_auftraege_az_conflict_resolve) generiert kollisionsfrei serverseitig.

### A.2 — Field-Label klar als optional
**File:** `app.html` Z.360-367
- "Vorgangsnr. PROVA intern" → **"Externes Aktenzeichen (optional)"**
- Placeholder "WAS-2026-001" → "z.B. Versicherungs-VN oder Gerichts-Az"
- Hint: "Wenn leer: PROVA vergibt automatisch (z.B. SCH-2026-002) — kollisionsfrei via DB-Trigger"
- "↻ Neu"-Button entfernt

### A.3 — Post-Insert Toast bei Mismatch
**File:** `app-logic.js` Z.661+676 (beide Insert-Pfade)
- Wenn `azUserInput && data.az !== azUserInput`:
  → Info-Toast "Aktenzeichen X wurde automatisch vergeben (Ihre Eingabe „Y" war bereits vergeben)" (5 Sek)
- Sonst: Success-Toast "Auftrag X angelegt"

### A.4 — Audit weiterer az-Pfade
Web-Claude-Liste verifiziert:
| Zeile | Pfad | Status |
|---|---|---|
| Z.130, 295, 829, 990 | URL/Default/Foto-Upload/Foto-PDF | nur Read, OK |
| Z.467, 492 | Step-Navigation localStorage-Cleanup | OK |
| Z.590, 661, 676 | INSERT-Pfad | CC's H0+A.3 Pattern OK |
| Z.3110, 3500 | strasse/stellungnahme-cleanup | falsch-positiv |
| Z.3386 | mwTemp | falsch-positiv |

→ Keine weiteren Insert-Pfade die fix brauchen.

**Acceptance A:** Test 3 schaden-Aufträge hintereinander → SCH-2026-002, 003, 004 (kollisionsfrei).

---

## Phase B — Section-Labels prominenter ✅

### B.1 — CSS-Tokens upgegradet
**File:** `dashboard.html` Style-Block
- `.dc-section-label`: 11px → **15px**, uppercase weg, color text3 → **text**
- `.dc-section-label-icon` neu: **20px** Icon-Span
- `.dc-section-row` neu: Trennlinie unter Header + 16px margin-bottom

### B.2 — HTML-Struktur konsistent
Alle 3 Section-Header (Heute / Aktive Fälle / Aktivität) auf neue Struktur:
```html
<div class="dc-section-row">
  <h2 class="dc-section-label">
    <span class="dc-section-label-icon">🔥</span>Heute
  </h2>
  <a class="dc-section-cta">Alle Aufgaben →</a>
</div>
```

JS-Update bei `dc-faelle-label`: `textContent` → `innerHTML` mit Icon-Span (Count-Update behält Icon).

### B.3 — Empty-States prominenter
- `.dc-empty`: 13px → 14px, text3 → text2
- `.dc-empty-icon`: 36px Block-Icon davor
- Empty-Strings "Noch keine Aufträge" + "Noch keine Aktivität" mit Icons

### B.4 — Mobile-Responsive
- `@media max-width:768px`: section-label 14px, icon 18px, row 12px margin

---

## Phase C — kalender.html universal ✅ (komplett NEU)

### C.1 — 5-Quellen-Aggregation
**Master-Loader:** `loadCalendarEvents(rangeStart, rangeEnd)` mit `Promise.all`:
- termine (alle ausser durchgefuehrt/abgesagt/kein_zustandekommen)
- fristen (alle innerhalb Range)
- dokumente.rechnung* (Faelligkeit + bezahlt_at IS NULL)
- dokumente.mahnung_1..3 (mahn_datum_letzte)
- auftraege.gutachtendatum (Meilenstein)

Mit `auftraege(az)`-Join für Cross-Reference im Title.

### C.2 — Event-Format normalisiert
```js
{ id, kategorie, title, date, time?, href, cat, color }
```

5 Color-States: termin (Blau) / frist (Orange) / frist-urgent (Rot bei <3T oder überfällig) / rechnung (Grün) / mahnung (Dunkelrot) / gutachten (Lila)

### C.3 — Filter-UI
5 Toggle-Checkboxes oben, persist via `localStorage.prova_kalender_filters` JSON.

### C.4 — Click-Verhalten
Event-Klick öffnet `href` (meist Akte). Tooltip via title-attribute. Heute-Button springt zu heute.

### C.5 — View-Modi
**Monats-Grid (default):**
- 7×n Mo-So-Header
- other-month / today / hover-States
- Max 3 Events pro Tag, dann "+X mehr"-Link zu Listen-View

**Listen-View:**
- Gruppiert nach Datum mit Color-Bar + Badge je Kategorie
- "HEUTE"-Marker auf today

`localStorage.prova_kalender_view` persist.

### C.6 — Heute-Marker
`.today`-Class mit Accent-Color in beiden Views.

### Routing-Updates
- `nav.js` Z.106 (Sidebar) + Z.1186 (Search-Menu) + Z.1707 (Mobile-Bottom): `termine.html` → `kalender.html`
- `prova-layout.config.js` shell-Array: `kalender.html` ergänzt
- `sw.js` APP_SHELL: `/kalender.html` ergänzt
- `termine.html` bleibt für Termin-Detail/Anlage

### Mobile-Responsive
- 60px Day-Cells, 9px Events, kleinerer Weekday-Header

---

## Konflikt-Mgmt mit MEGA83

| File | Hotfix-2 | MEGA83 | Konflikt? |
|---|---|---|---|
| `app-logic.js` | A | nein | nein |
| `dashboard.html` | B | nein | nein |
| `kalender.html` | C (neu) | nein | nein |
| `nav.js` | C (3 Zeilen) | nein | nein |
| `prova-layout.config.js` | C (1 Zeile) | nein | nein |
| `sw.js` | C+D | E | **JA** Version-String → letzter Merge gewinnt |
| `docs/SW-VERSION-HISTORY.md` | D | E | **JA** trivially mergeable |

**Lösung:** Marcel merged Hotfix-2 zuerst (kleiner, schneller). MEGA83 rebased oben drauf.

---

## DEFER MEGA84

- Kalender-Termin-Anlage direkt aus Day-Click (statt nur Detail-Öffnen)
- Drag-and-Drop für Termin-Verschiebung
- Wochen-Ansicht (zwischen Monat und Liste)
- iCal-Export-Button (.ics-Generator für Outlook/Apple/Google)
- E2E-Test Cross-Subdomain
- Bulk-Patch Bridge-Hydration in restlichen 80+ Pages (von MEGA83)

---

## Files geändert / neu

| File | Status |
|---|---|
| `app-logic.js` | modified (Z.2120 + Z.661+676) |
| `app.html` | modified (Z.360-367 Field-Label) |
| `dashboard.html` | modified (Section-Labels + Empty-States) |
| `kalender.html` | **NEU** (475 Zeilen) |
| `nav.js` | modified (3 Routing-Updates) |
| `prova-layout.config.js` | modified (shell-Array) |
| `sw.js` | modified (v3247 → v3248) |
| `docs/SW-VERSION-HISTORY.md` | modified |
| `docs/MEGA82-HOTFIX-2-DECISIONS.md` | **NEU** |
| `docs/MEGA82-HOTFIX-2-MARCEL-CHECKLIST.md` | **NEU** |
