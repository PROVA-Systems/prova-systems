# MEGA⁸²-Hotfix-2 MARCEL-CHECKLIST — AZ-Cleanup + Section-Labels + Kalender

**Stand:** 2026-05-16 · Branch: `feat/mega82-hotfix-2-cleanup-and-calendar`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3248 lädt.

---

## A. Smoke-Tests (8 Punkte)

### 1️⃣ AZ-Field-Label klar als optional

- `/app.html` öffnen → Schritt 1 (Stammdaten)
- AZ-Field-Label: **„Externes Aktenzeichen (optional)"**
- Placeholder: „z.B. Versicherungs-VN oder Gerichts-Az"
- Hint darunter: „Wenn leer: PROVA vergibt automatisch (z.B. SCH-2026-002)…"
- **NICHT mehr:** „Vorgangsnr. PROVA intern" + „↻ Neu"-Button ✅

### 2️⃣ AZ-Auto-Generator entfernt

- Schadenart-Dropdown ändern (z.B. Wasserschaden)
- **Erwartung:** AZ-Feld bleibt LEER (kein Auto-Fill mehr)
- Browser-Console: keine `[generiereAZ]` Calls ✅

### 3️⃣ Neuer Auftrag funktioniert + Toast bei Auto-AZ

- AZ-Feld leer lassen, Schadenart=Schaden, Auftraggeber=Test, „Auftrag anlegen"
- **Erwartung:** Success-Toast „Auftrag SCH-2026-XXX angelegt" (DB-Trigger generiert)
- Navigation zur Akte ✅

### 4️⃣ Konflikt-Test (User gibt kollidierenden AZ ein)

- 2× neuen Auftrag mit gleichem AZ-Input „SCH-2026-001" anlegen
- **Erwartung 1. Insert:** Success „Auftrag SCH-2026-001 angelegt" (falls noch frei)
  ODER Info-Toast bei bereits existentem AZ
- **Erwartung 2. Insert:** Info-Toast „Aktenzeichen SCH-2026-XXX wurde automatisch vergeben (Ihre Eingabe „SCH-2026-001" war bereits vergeben)" (5 Sek sichtbar)
- KEIN 409-Conflict-Error mehr ✅

### 5️⃣ Section-Labels prominent

- `/dashboard.html` öffnen
- Section-Labels „🔥 Heute" / „📁 Aktive Fälle" / „⏱️ Aktivität":
  - **deutlich größer** (15px statt 11px)
  - Icon **prominent** (20px) als Span
  - **Trennlinie** unter Header
  - Color: text (hell), nicht text3 (muted) ✅

### 6️⃣ Kalender-Link in Sidebar

- Sidebar links: „📅 Kalender" Menüpunkt klicken
- **Erwartung:** Routet zu `/kalender.html` (nicht mehr `termine.html`)
- Kalender lädt mit Monats-Grid für aktuellen Monat ✅

### 7️⃣ Kalender zeigt alle 5 Quellen

- Im Kalender (Monats-View):
  - **Termine** als blaue Events (z.B. Ortstermin)
  - **Fristen** als orange Events (heute oder zukünftig)
  - **Fristen <3 Tage / überfällig** als **rote** Events
  - **Rechnungen-Fälligkeiten** als grüne Events
  - **Mahnstufen** als dunkelrote Events
  - **Gutachten-Plan** (gutachtendatum) als lila Events
- Marcels existierende Frist GS-2026-001 vom 16.05.2026 → erscheint heute als **roter Event** ✅
- Filter-Toggles oben funktionieren (z.B. „Fristen" deaktivieren → keine orange/rote Events) ✅

### 8️⃣ Kalender View-Toggle + Filter-Persist

- View-Toggle oben rechts: „Monat" / „Liste"
- Wechsel zu Liste → Tagesgruppierte Ansicht mit Badges
- Heute-Button → Sprung zu aktuellem Monat
- Filter setzen + Reload → Filter bleiben gespeichert (localStorage)
- sw.js: `prova-v3248-mega82-hotfix2-cleanup-and-calendar` aktiv ✅

---

## B. Bei Fehlern

| Symptom | Lösung |
|---|---|
| AZ-Field zeigt noch Auto-Fill | Hard-Reload (Cache), evtl. SW Clear-Storage |
| 409-Conflict trotz Fix | DB-Trigger v2.0 nicht appliziert? Migration `mega82_hotfix_auftraege_az_conflict_resolve` prüfen |
| Section-Labels unverändert | CSS-Cache, F12 → Application → Clear |
| Kalender lädt nicht | F12 → Console: Supabase-RLS-Block? Login refresh |
| Frist nicht im Kalender | F12: prüfen ob `fristen` Query 200 + Daten in Range |

---

## C. Konflikt-Mgmt mit MEGA83

Wenn MEGA83 parallel gemerged wird:
- Konflikte nur in `sw.js` (Version-String) + `docs/SW-VERSION-HISTORY.md`
- Trivially lösbar via Git-Merge (beide Sprints werden behalten, sw.js bekommt höhere Version)
- Empfehlung: **Hotfix-2 zuerst mergen**, MEGA83 rebased oben drauf

---

## D. Nicht in Hotfix-2 enthalten (DEFER MEGA84)

| Item | Status |
|---|---|
| Kalender Wochen-Ansicht | DEFER (Monat + Liste reichen für Pilot) |
| Drag-and-Drop Termin-Verschiebung | DEFER |
| iCal-Export-Button (.ics) | DEFER |
| Direkter Termin-Anlage aus Kalender-Day-Click | DEFER (Klick öffnet Akte, Termin-Anlage via termine.html) |
| Edge-Reaping CLI-Apply | Marcel separat aus `docs/MEGA82-EDGE-REAPING.md` |

---

## E. Apply-Pfad

1. Pull `feat/mega82-hotfix-2-cleanup-and-calendar`
2. Hard-Reload App (Strg+F5 oder SW Clear-Storage)
3. 8-Punkte-Smoke-Test
4. Bei grün: PR mergen in main + Tag `v3248-mega82-hotfix2` setzen
5. (Optional) Hotfix-1 und MEGA83 Branches danach mergen
