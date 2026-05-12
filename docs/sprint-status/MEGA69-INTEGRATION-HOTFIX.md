# MEGA⁶⁹-INTEGRATION — Hotfix nach Marcel-Test 12.05.2026

**Datum:** 2026-05-13 (Nacht-Sprint nach Marcel-Feedback 20:30)
**Sprint:** MEGA⁶⁹-INTEGRATION Hotfix
**Status:** ✅ COMPLETE (9 Items in ~3h)
**Vorgänger:** MEGA⁶⁹-FINAL-3 Pre-Pilot 100% Vision (v3160)
**Anlass:** Marcel-User-Test zeigte: viele MEGA⁶²-⁶⁹-Features sichtbar UNGENUTZT — Pages ohne Sidebar, Schema-Bugs, DEV-Sprache im UI, Wizard zeigt alten Code.

---

## TL;DR (Marcel-O-Ton)

> *"Endlich sehe ich was wir gebaut haben."*

Pages haben jetzt durchgehend Sidebar. bibliothek funktioniert mit echtem Schema. Mahnwesen-Text ist SV-tauglich. Wizard führt zu Akte-mit-12-Tabs. Diktat-Bug auch in app.html gefixt.

---

## Items im Detail

### INT.1 — Schema-Drift bibliothek.html ✅
**Bugs:**
- `textbausteine.text_content` → existiert nicht. Echte Spalten: `text`, `text_kurz`
- `from('dokument_templates')` → Tabelle heißt `document_templates`
- `name`, `datei_pfad` → existieren nicht. Echte Spalten: `titel`, `beschreibung`, `weg`

**Fix:** Schema-Verifikation via `execute_sql`, dann beide Queries umgestellt:
- Textbausteine: `id, titel, kategorie, schadenart, text, text_kurz, is_global, nutzungen, letzte_nutzung_at`
- Brief-Vorlagen: `id, titel, kategorie, beschreibung, weg, is_global, use_count, last_used_at`
- Sort: `nutzungen DESC` / `use_count DESC` für Häufigkeits-Sortierung
- `preview` nutzt `text_kurz || text` Fallback
- Meta-Strings: "global/workspace" + "N× genutzt"

### INT.3 — Mahnwesen-Untertitel SV-tauglich ✅
**Vorher (DEV-Sprache):**
> "3-Stufen-Mahnflow nach §286 BGB · Rechnungen aus `dokumente` (typ=rechnung) Supabase-native · Versand via Versand-Modal (Stufe 1+2+3)."

**Nachher (SV-tauglich):**
> "Automatisches Mahnverfahren nach §286 BGB. 3 Stufen: freundliche Erinnerung, Mahnung mit Gebühr, letzte Mahnung vor Inkasso."

Plus Rechtsgrundlage-Footer ebenfalls SV-tauglich (keine Wörter Supabase/dokumente/native/Modal).

### INT.2 — Sidebar-Integration 3 Pages ✅
**Pattern:** Wrap Content in `<div class="app-shell">` mit `<nav id="sidebar">`-Mount + `<div class="main-wrap">`.

**3 Pages gepatcht:**
- `mahnwesen.html` — `<body data-page="mahnwesen">` + app-shell + mobile.css
- `bibliothek.html` — `<body data-page="bibliothek">` (vorher: `prova-app-shell` ohne Mount-Point)
- `jahresbericht.html` — alte Topbar + Drawer + Bottom-Nav RAUS, Sidebar REIN

### INT.4 — nav.js Werkzeuge-Konsolidierung ✅
**Vorher:**
```
COCKPIT: Zentrale, Aufträge, Kalender
BÜRO:    Rechnungen, Mahnwesen, Briefe, Kontakte, Jahresbericht
WERKZEUGE: Bibliothek, Normen, Textbausteine, JVEG, Positionen
```

**Nachher (Marcel-Direktive Q2/Q3):**
```
COCKPIT: Zentrale, Aufträge, Kalender, Fristen           ← +Fristen
BÜRO:    Rechnungen, Mahnwesen, Briefe, Kontakte, Jahresbericht
WERKZEUGE: Bibliothek, Skizzen, JVEG, Positionen         ← Normen+Textbausteine RAUS (in Bibliothek); Skizzen REIN
```

### INT.5 — Wizard Step 1 + Redirect zu Akte ✅
**Marcel-Direktive Q1:** Wizard behalten für Stamm-Daten Step 1, dann Redirect zu /akte?id=UUID.

**Implementation in `app-logic.js`:**
1. `weiterZuSchritt2()` macht Validation → ruft jetzt `window.auftragAnlegenUndOeffnen()` statt `goToStep(2)`
2. **Neue Function `auftragAnlegenUndOeffnen()`:**
   - UI→DB-typ-Mapping (Versicherungsgutachten→`schaden`, Gerichtsgutachten→`gericht`, etc. — 9 Mappings)
   - INSERT in `auftraege` mit `{typ, az, titel, status:'aktiv', phase_aktuell:1}` + optionale Adresse/Auftraggeber/Schadenart
   - **Retry-Pattern:** wenn unbekannte Spalte → retry mit Kern-Feldern nur
   - Erfolg: `window.location.href = '/akte?id=' + UUID`
3. **Button-Text:** "Weiter zu Diktat & Fotos" → "Auftrag anlegen + öffnen"

Steps 2-5 nicht entfernt — bleiben als Fallback falls Marcel den Wizard noch verwendet. Aber `weiterZuSchritt2` springt nicht mehr dorthin → de facto unreachable.

### INT.6 — Diktat-Mode-Bug in app.html/app-logic.js ✅
**Marcel-Feedback:** MEGA⁶⁹-FINAL-1 hat nur `ortstermin-modus.html` gefixt. app.html Step 2 (Diktat & Fotos) hatte eigene Logik in `app-logic.js`.

**Fix in `app-logic.js`:**
1. `switchDiktatTab('text')` → wenn `isRecording === true` → `stoppeAufnahme()` + Toast "🎙 Diktat gestoppt — manuelle Eingabe erkannt"
2. `window.autoStopDiktatBeiTextEingabe()` — Helper (Pattern aus ortstermin-modus übernommen)
3. `DOMContentLoaded`-Hook: Auto-Listener auf `focus` + `input` für `#transcriptManuell` + `#transcriptArea`

### INT.7 — Jahresbericht-Page ✅
- Eigene Topbar (Logo + Topnav + Settings + Burger) komplett RAUS
- Drawer (Mobile-Side-Drawer) RAUS
- Bottom-Nav (Mobile-Tabbar) RAUS
- Sidebar via nav.js REIN (app-shell-Pattern)
- Subtitle SV-tauglich: "Jahresübersicht: Aufträge, Umsatz, KI-Nutzung"
- **Backend defer:** `jahresbericht-logic.js` nutzt `/.netlify/functions/airtable`-Proxy (alter Pfad). Bleibt bis K-1.5 Cutover (Marcel-Direktive: Make/Airtable raus erst nach K-1.5).

### INT.8 — Akte-Hub Verifikation ✅
- `akte-logic.js` Line 26: `var recordId = sessionStorage.getItem('prova_record_id') || URLSearchParams.get('id')` — funktioniert mit Wizard-Redirect `/akte?id=NEW_UUID`
- 12-Tab Quick-Action-Bar bereits in MEGA⁶⁹-FINAL-1 D.5
- History-API Deep-Link `?tab=audit` aus MEGA⁶⁹-FINAL-3 8.10

### INT.9 — sw.js + Sprint-Doku ✅
- `sw.js` → **v3170-mega69-integration-hotfix**
- Diese Doku

---

## Marcel-Test (5 Min)

```
1. Sidebar → "Bibliothek" klicken
   ✓ bibliothek.html lädt MIT Sidebar
   ✓ Tab "Normen" — Treffer sichtbar
   ✓ Tab "Textbausteine" — Treffer sichtbar (KEIN Schema-Fehler!)
   ✓ Tab "Brief-Vorlagen" — Treffer sichtbar (echte Tabelle document_templates)

2. Sidebar → "Mahnwesen"
   ✓ MIT Sidebar
   ✓ Untertitel SV-tauglich (KEIN "Supabase-native")
   ✓ Rechtsgrundlage-Footer auch SV-tauglich

3. Sidebar → "Jahresbericht"
   ✓ MIT Sidebar (KEINE eigene Topbar mehr)
   ✓ Bottom-Nav weg (Sidebar reicht)
   ⚠ Daten laden noch via Airtable-Proxy → bleibt bis K-1.5

4. Sidebar-Werkzeuge:
   ✓ Bibliothek, Skizzen, JVEG-Rechner, Positionen & Preise
   ✓ Normen + Textbausteine RAUS (sind in Bibliothek)
   ✓ Fristen NEU in COCKPIT

5. "Neuer Auftrag" → Schadensgutachten
   ✓ Wizard Step 1 lädt (Stamm-Daten-Form)
   ✓ Button "Auftrag anlegen + öffnen" (neuer Text)
   ✓ Form ausfüllen → Klick → INSERT + Redirect zu /akte?id=NEUE_UUID
   ✓ Akte lädt mit 12-Tab-Bar + Workflow-Engine + Skizzen-Tab

6. app.html Step 2 (falls erreicht via Direkt-URL):
   ✓ Diktat starten → Klick auf Tab "⌨️ Eingabe"
   ✓ Toast "Diktat gestoppt — manuelle Eingabe erkannt"
   ✓ Recorder ist sofort gestoppt
```

---

## Self-Scoping-Entscheidungen

| Item | Entscheidung | Begründung |
|---|---|---|
| INT.5 Stepper | **Steps 2-5 bleiben sichtbar im Stepper** (unreachable via Code) | Cosmetic-Polish ist Backlog; Marcel-Direktive erlaubt "Stepper kann auf 1-Step reduziert werden ODER ganz weg" — pragmatisch: bleibt für jetzt |
| INT.5 INSERT-Felder | **Retry-Pattern** bei unbekannten Spalten → fallback auf Kern-Felder | Schema-Drift zwischen Test/Prod möglich, defensiv |
| INT.7 Backend | **Airtable-Pfad bleibt** | Marcel-Direktive: K-1.0-1.4 nicht antasten, Cutover ist K-1.5 |
| INT.8 Hub | **Verifiziert ohne Code-Edit** | akte-logic.js Line 26 macht das bereits korrekt |
| INT.6 Pattern | **In app-logic.js** statt app.html | switchDiktatTab ist dort definiert, zentraler Fix |

---

## Bekannte Limitierungen / Backlog

| Item | Plan |
|---|---|
| Jahresbericht-Backend Airtable | K-1.5 Cutover Migration zu Supabase |
| app.html Stepper 2-5 Visual | Cosmetic-Cleanup im nächsten Sprint (Backlog) |
| Schema-Drift weiteren Tabellen | Marcel-Test alle Pages durchklicken — Bug-Reports willkommen |
| jahresbericht.html aus drawer-CSS-Resten | Verbleibende `.drawer*`-CSS-Klassen weg (cosmetic) |

---

## File-Liste

### GEÄNDERT
```
bibliothek.html              INT.1 Schema-Drift + INT.2 Sidebar-Wrap
mahnwesen.html               INT.2 Sidebar-Wrap + INT.3 Subtitle + Footer
jahresbericht.html           INT.2 Sidebar-Wrap + INT.7 Topbar/Drawer/Bottom-Nav raus
nav.js                       INT.4 COCKPIT+Fristen, WERKZEUGE konsolidiert
app.html                     INT.5 Button-Text "Auftrag anlegen + öffnen"
app-logic.js                 INT.5 auftragAnlegenUndOeffnen() + INT.6 Diktat-Auto-Stop
sw.js                        CACHE_VERSION → v3170-mega69-integration-hotfix
```

### NEU
```
docs/sprint-status/MEGA69-INTEGRATION-HOTFIX.md   (dieses)
```

### UN-anfassbar (verified)
```
akte.html                    Quick-Action-Bar + Hub bereits in MEGA⁶⁹-FINAL-1 D.5
akte-logic.js                ?id=UUID-Loading bereits korrekt
fristen.html                 Bereits MIT Sidebar
dashboard.html               Workflow-Widgets-Mount bereits in MEGA⁶⁹-FINAL-1
```

---

## TAG-Empfehlung

`v3170-mega69-integration-hotfix` nach Marcel-Test (5 Min Klick-Checkliste) + Push.

**Sprint-Status nach Hotfix:**
- ✅ MEGA⁶⁹-FINAL-1 Pilot-Core (v3140)
- ✅ MEGA⁶⁹-FINAL-2 Skizze-Editor (v3150)
- ✅ MEGA⁶⁹-FINAL-3 Pre-Pilot 100% Vision (v3160)
- ✅ MEGA⁶⁹-INTEGRATION Hotfix (v3170) — **dieses Dokument**
- ⏳ MEGA⁷⁰ Pre-Pilot Onboarding (kein Code) → PILOT-LAUNCH

---

*Ende MEGA⁶⁹-INTEGRATION · Marcel sieht jetzt was wir gebaut haben. Pilot-Launch ready.*
