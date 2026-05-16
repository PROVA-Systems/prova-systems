# MEGA⁸²-Hotfix-1 MARCEL-CHECKLIST — Dashboard-Clean + AZ-Fix

**Stand:** 2026-05-16 · Branch: `feat/mega82-hotfix-1-dashboard-clean`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3247 lädt.

---

## A. Smoke-Tests (12 Punkte)

### 1️⃣ AZ-Fix: Neuer Auftrag ohne 409 Conflict

- `/app.html` öffnen
- Schritt 1: Auftragsart=Schadensgutachten, Schadenart="Test-AZ-Fix", Auftraggeber="Test"
- AZ-Felder LEER lassen (keine `f-schadensnummer`, keine `f-gerichts-az`)
- „Auftrag anlegen + öffnen" klicken

**Erwartung:**
- F12 Network: POST /rest/v1/auftraege → 201 (kein 409!)
- Toast: „Auftrag angelegt: SCH-2026-002" (oder nächste freie Nr)
- Navigation zur Akte ✅

### 2️⃣ AZ-Trigger respektiert User-Input

- Neuen Auftrag anlegen, aber `f-gerichts-az` mit "TESTAZ-MEGA82" befüllen
- Submit
- Toast: „Auftrag angelegt: TESTAZ-MEGA82"
- DB: az = TESTAZ-MEGA82 (Trigger respektiert non-empty Input) ✅

### 3️⃣ Dashboard zeigt 5 Sektionen (nicht 13)

- `/dashboard.html` öffnen
- Sichtbar von oben nach unten:
  1. Header mit „Guten Morgen, Marcel" + „+ Neuer Fall" Button
  2. Status-Zeile: „X Benachrichtigungen · Y Frist heute · Z Mahnung offen" oder „Alles erledigt. Schönen Tag!"
  3. 🔥 Heute (Hero-Card mit Fristen+Termine+Notif)
  4. 4 KPI-Kacheln (Aktive Fälle, Mahnungen, offen €, KI-Calls 30T)
  5. 📁 Aktive Fälle (Liste max 5 mit AZ+Titel+Progress)
  6. ⏱️ Aktivität (max 5 Einträge mit kompakten Texten)

**NICHT MEHR sichtbar:**
- ❌ „Anstehende Fristen" mit T-NaN
- ❌ „Workflow-Übersicht" mit 6 Widget-Boxen
- ❌ „Was steht an?" mit Empty-State-Bug
- ❌ Rechte Spalte mit „Schnellzugriff" + dritte Fristen-Box

### 4️⃣ Kein T-NaN mehr

- F12 → in Page-Search „T-NaN" → 0 Treffer ✅
- F12 → in Page-Search „NaN" → 0 Treffer (außer evtl. Console-Warnings) ✅

### 5️⃣ Aktive Fälle: 4-Phasen-Anzeige (nicht 9!)

- Dashboard → „📁 Aktive Fälle" Sektion
- Pro Zeile: 4 Segmente (▰▰▱▱), rechts „Phase 2/4" (Flow A) oder „2/3" (Flow C)
- KEIN „5/9" oder „6/9" mehr ✅

### 6️⃣ Aktive Fälle: Klick öffnet Akte

- Klick auf „SCH-2026-001" Zeile → Akte mit dieser ID öffnet
- KEIN Loop zurück auf neuer-fall.html oder app.html ✅

### 7️⃣ KPI-Kacheln zeigen ECHTE Zahlen

- Aktive Fälle: tatsächlicher Count aus auftraege (kein „—")
- Mahnungen: 0 oder reale Anzahl (KEINE graue „Loading"-Box dauerhaft)
- Offen €: „0 €" oder reale Summe als Euro
- KI-Calls 30T: Anzahl aus ki_protokoll

**Empty-State-Test:** Bei 0 → wirklich „0" anzeigen, nicht „—" oder „Lädt…" ✅

### 8️⃣ Heute-Hero zeigt nur relevante Items

- Wenn Fristen+Termine+Notif alle 0: ☀️ „Keine Aufgaben für heute. Schöner Tag!"
- Wenn Fristen heute/überfällig: rote ⚠️-Icon vorne, „Frist überfällig" oder „Frist heute"
- Wenn Termine heute: 📅-Icon, „09:30 · Ortstermin"
- Wenn Notifications: 🔔-Icon mit Count
- Reihenfolge: überfällig → heute → Termin → Notif ✅

### 9️⃣ Aktivität: kompakte Texte (Marcel-Format)

Erwartete Texte:
```
✅ "27.04. · Eintrag in Akte GS-2026-001 hinzugefügt"
✅ "vor 2 Std · Akte SCH-2026-001 geöffnet"
✅ "gestern · Notiz aktualisiert"
```

**NICHT:**
```
❌ "Du hast am 27.04.2026 um 19:27 einen Eintrag (workspace) angelegt"
❌ "Du hast die Akte f34f6213-4481-42…"
```

Aktennamen sind klickbar (blau) und navigieren zu `/akte?id=...` ✅

### 🔟 Mobile (≤ 768px)

- F12 → Device Toolbar → iPhone 12 Pro
- KPI-Grid: 2x2 statt 4x1
- Heute-Cards: Full-Width
- Aktive Fälle: AZ kompakter, Progress-Bar bleibt sichtbar
- Sidebar: Hamburger-Menü ✅

### 1️⃣1️⃣ sw.js v3247 lädt

- F12 → Application → Service Workers
- Active: `prova-v3247-mega82-hotfix1-dashboard-clean`
- Wenn alt: Clear storage → Hard-Reload

### 1️⃣2️⃣ Console sauber

- F12 → Console nach Dashboard-Load
- Keine kritischen Errors (Warnings wie `[dc heute] ...` mit error-Param sind OK bei leeren Daten)
- Speziell **keine** `Cannot read properties of null` Errors mehr von alter dashboard-logic.js
- Plus: AZ-Insert-Test (Punkt 1) → keine 409-Errors in Network-Tab ✅

---

## B. Bei Fehlern

| Symptom | Lösung |
|---|---|
| Dashboard zeigt noch alte 13 Sektionen | Hard-Reload (Strg+F5), evtl. SW Clear-Storage |
| AZ-Insert immer noch 409 | DB-Trigger nicht appliziert? `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%auftraege_autogen_az%';` |
| Heute-Hero leer obwohl Fristen da | Console nach `[dc heute]` Errors checken |
| KPI-Kachel zeigt „—" dauerhaft | Console nach `[dc kpi]` Errors — meist Schema-Drift oder RLS-Block |
| Aktive Fälle Progress-Bar fehlt | Helper-Layer nicht geladen — Console nach `getAktePhasenForAuftrag is not a function` |

---

## C. Nicht in Hotfix-1 enthalten (DEFER MEGA83)

| Item | Status |
|---|---|
| Akte-UI-Refactor (B.2-B.9 aus MEGA82) | DEFER MEGA83 |
| Login Cross-Domain (F.1) | DEFER MEGA83 |
| Edge-Reaping CLI-Apply | Du machst via CLI nach Hotfix-Merge |
| LG-Disclosure-Box auf 9 PDF-Templates | Optional Hotfix vor Pilot |
| Backend §§-Notation (A.4) | DEFER MEGA83 |

---

## D. Apply-Pfad

1. Pull `feat/mega82-hotfix-1-dashboard-clean`
2. Hard-Reload App
3. 12-Punkte-Smoke-Test
4. Bei grün: PR mergen in main + Tag v3247 setzen
5. Optional vor Pilot: PDF-Templates patchen (siehe `docs/AUDIT-PDF-DISCLOSURE.md`)
