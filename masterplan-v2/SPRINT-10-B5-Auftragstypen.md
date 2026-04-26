# SPRINT 10 — B5 Auftragstypen, Stammdaten & Externe Dokumente

**Tag:** 11  |  **Aufwand:** 7-9h  |  **Phase:** B Produkt-Kern

---

## Ziel
`neuer-fall.html` wird als 2-stufiges Formular gebaut (Auftragstyp wählen → typ-spezifische Stammdaten). Externe Dokumente (Beweisbeschluss, Schadensmeldung, etc.) werden per KI extrahiert und als Vorschlag in Felder eingefüllt. Das Aktenzeichen-Konzept wird auf 3 klare Felder konsolidiert.

---

## Sprint-Start-Ritual
1. **Code-Check:** `app-logic.js` (sammleDaten), `auftragstyp.js`, `new-case.html` bzw. aktuelle Fall-Anlage-Seite
2. **Datenfluss:** Wohin gehen die Stammdaten? Airtable-Felder — welche existieren, welche fehlen?
3. **Scope-Fix:** Nur Fall-Anlage + Externe-Docs-Extraktion + Aktenzeichen-Migration. Nicht Workflow-Phasen (Sprint 11).

---

## Scope

### 1. Stufenmodell `neuer-fall.html` (2,5-3h)

**Schritt 1 — Auftragstyp wählen (Karten-Grid gruppiert nach Flow):**

```
┌─── Welche Art von Auftrag? ────────────────────────┐
│                                                      │
│  Schaden / Mangel begutachten                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ ⚖️   │ │ 🛡️   │ │ 👤   │ │ ⚖️🤝 │ │ 📋   │     │
│  │Ger.  │ │Vers. │ │Privat│ │Schieds│ │Beweis│     │
│  │Bindg.│ │Freies│ │§312g │ │Ver-   │ │§485  │     │
│  │JVEG  │ │Honrar│ │Verbr.│ │einbar.│ │ZPO   │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐                                  │
│  │ ➕   │ │ ⚖️❌ │                                  │
│  │Ergänz│ │Gegen-│                                  │
│  │Bezug │ │Kritik│                                  │
│  └──────┘ └──────┘                                  │
│                                                      │
│  Bewertung                                           │
│  ┌──────┐                                            │
│  │ 💶   │                                            │
│  │Wertg.│                                            │
│  │ImmoWV│                                            │
│  └──────┘                                            │
│                                                      │
│  Beratung (ohne förmliches Gutachten)               │
│  ┌──────┐ ┌──────┐                                  │
│  │ 🏠🔍 │ │ 🔧   │                                  │
│  │Kauf  │ │Sanier│                                  │
│  │Beratg│ │Beratg│                                  │
│  └──────┘ └──────┘                                  │
│                                                      │
│  Baubegleitung & Abnahme                            │
│  ┌──────┐ ┌──────┐                                  │
│  │ 🏗️   │ │ ✓    │                                  │
│  │Baubeg│ │Abnahm│                                  │
│  │Mehrtrm│ │Einzel│                                 │
│  └──────┘ └──────┘                                  │
└──────────────────────────────────────────────────────┘
```

**Stil:** Karte mit Icon + Titel + 1-Zeilen-Subtitle (Hybrid-Stil für ältere SVs + Profi-Überblick).

**Schritt 2 — Stammdaten mit dynamischen Sektionen:**

```
┌─── Schritt 2: Falldaten ─────────────────────────┐
│                                                     │
│ ▼ Externe Dokumente (optional)                    │
│   [ 📎 Beweisbeschluss / Schadensmeldung hochladen ]│
│   ↳ KI extrahiert Daten, Sie bestätigen jedes Feld │
│                                                     │
│ ▼ Auftraggeber                                     │
│   Name *, Email, Telefon, Adresse                 │
│                                                     │
│ ▼ Schadensort (immer gleich)                      │
│   Straße *, PLZ *, Ort *                           │
│                                                     │
│ ▼ Schaden (immer gleich)                           │
│   Schadensart *, Schadensdatum                    │
│                                                     │
│ ▼ [Dynamisch je nach Typ]                          │
│    → siehe Abschnitte unten                        │
│                                                     │
│              [ Fall anlegen ]                       │
└─────────────────────────────────────────────────────┘
```

**Ein** Speichern-Button, alles auf einer Seite, SV scrollt durch.

### 2. Typ-spezifische Felder (2h)

**Gerichtsgutachten:**
- Gericht *, AZ Gericht *, Beweisbeschluss-Datum *, Beweisfragen (Liste), §411-Frist (auto +8 Wochen)
- Kammer/Abteilung, Richter (optional)

**Versicherungsgutachten:**
- Versicherung * (Dropdown + Freitext), Schadensnummer *, Policennummer, Sachbearbeiter

**Privatgutachten:**
- **Verbraucher-Checkbox (§312g BGB)** — bei Aktivierung: Widerrufsbelehrung wird automatisch im PDF als 2. Seite angehängt
- Auftrags-Art (Kauf/Reparatur/Beratung)

**Schiedsgutachten:**
- Partei 1 *, Partei 2 *, Schiedsvereinbarung (Dropdown: schriftlich/mündlich)

**Beweissicherung:**
- Antragsgrund *, Drohende-Gefahr-Beschreibung *, §485-ZPO-Checkbox (selbständig/gerichtlich)

**Ergänzungsgutachten:**
- Bezug zu Ursprungs-Gutachten * (Dropdown aus Archiv), Ergänzungs-Aufgabe

**Gegengutachten:**
- Gegenüberstehendes Gutachten * (Upload oder Archiv-Link), Kritikpunkte (Liste)

**Wertgutachten:**
- Bewertungsanlass * (Verkehrswert/Beleihung/Scheidung/…), Wertermittlungstag *, Objekttyp

**Kaufberatung / Sanierungsberatung:**
- Beratungsthema *, Beratungsziel

**Baubegleitung:**
- Bauvorhaben-Adresse (= Schadensort), Bauphasen-Auswahl (Rohbau/Ausbau/Fertigstellung, multi-select), Beteiligte (Architekt/Bauleiter/Bauherr)

**Bauabnahme:**
- Abnahmedatum *, Gewerk *, Mängel-Checkliste-Template (Rohbau/Dach/Außenputz/…)

### 3. Externe Dokumente extrahieren (2-3h)

**Workflow:**
```
SV lädt PDF hoch (Beweisbeschluss, Schadensmeldung, …)
        ↓
Neue Function ki-dokument-extrahieren.js
        ↓
GPT-4o Vision + Text-Layer liest PDF
        ↓
Response: strukturiertes JSON mit Feldern + Quellen-Angabe
        ↓
UI zeigt pro Feld Vorschlag + Quelle (PDF-Seite, Original-Text)
        ↓
SV klickt pro Feld: [✓ Übernehmen] [✏️ Ändern] [✗ Ignorieren]
        ↓
Nur bestätigte Werte landen im Formular
```

**Unterstützte Dokumenttypen:**
- **Beweisbeschluss** → Aktenzeichen Gericht, Gericht, Kammer, Beweisfragen, §411-Frist (auto berechnet), Parteien, Streitwert
- **Schadensmeldung** (Versicherung) → Schadensnummer, Policennummer, Schadensdatum, Versicherungsnehmer, Sachbearbeiter
- **Auftragsschreiben** (Privat/Firma) → Auftraggeber-Daten, Schadensbeschreibung, Honorar-Rahmen
- **Vorgutachten** → Bezugspartei, vorherige Bewertung (für Ergänzungs-/Gegengutachten)

**UI-Beispiel:**
```
┌─── Beweisbeschluss wurde analysiert ─────────────┐
│                                                    │
│ Gericht:                                          │
│   Vorschlag: LG Köln, 19. Zivilkammer             │
│   Quelle: Seite 1, Kopf: "Landgericht Köln..."    │
│   [✓ Übernehmen] [✏️ Ändern] [✗ Ignorieren]       │
│                                                    │
│ AZ Gericht:                                       │
│   Vorschlag: 19 O 4711/24                         │
│   Quelle: Seite 1, Titel: "Aktenzeichen 19 O..."  │
│   [✓ Übernehmen] [✏️ Ändern] [✗ Ignorieren]       │
│                                                    │
│ §411-Frist:                                       │
│   Vorschlag: 20.05.2026 (8 Wochen ab 25.03.2026)  │
│   Quelle: Seite 3: "binnen 8 Wochen ab Zustellung"│
│   ⚠️ Bitte Frist selbst prüfen                    │
│   [✓ Übernehmen] [✏️ Ändern] [✗ Ignorieren]       │
│                                                    │
│ Beweisfragen (3):                                 │
│   1. "Ist der Feuchteschaden auf..."              │
│   2. "Welche Kosten..."                           │
│   3. "In welchem Zeitraum..."                     │
│   [✓ Alle übernehmen] [Einzeln bearbeiten]        │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Disclaimer permanent sichtbar:** "Erkannte Daten sind Vorschläge der KI. Verbindlichkeit erst nach Bestätigung durch den Sachverständigen."

### 4. Aktenzeichen-3-Felder-Konsolidierung (1h)

**Airtable-Migration SCHADENSFAELLE:**

| Alt | Neu | Bedeutung |
|---|---|---|
| `Aktenzeichen` | `prova_aktenzeichen` | Immer `SCH-YYYY-NNN` |
| `Auftrags_Nr` | `auftraggeber_az` | Was immer der Auftraggeber verwendet |
| `Schadensnummer_Versicherung` | → fließt in `auftraggeber_az` bei Vers. | — |
| `Polizzennummer` | `policennummer` | Nur Versicherung |
| `Versicherungsschein_Nr` | → Alias für `policennummer` | — |

**Migration via Claude Code (Airtable Meta API):**
- Neue Felder anlegen
- Bestehende Werte kopieren
- Alte Felder NICHT sofort löschen (Rollback-Sicherheit), nur als "deprecated" markieren
- Nach 2 Wochen Stabilität: alte Felder entfernen

**UI-Anzeige in Akte:**
```
Fall SCH-2026-031
├── PROVA-Aktenzeichen: SCH-2026-031
├── Aktenzeichen Auftraggeber: 19 O 4711/24
└── Versicherungsnummer: VN-2024-1234567 (nur wenn Vers.)
```

### 5. Auto-Speichern während Eingabe (30 Min)
- Alle 10 Sekunden oder bei Blur: localStorage + Draft-Status in Airtable
- Bei Seitenverlust: Wiederherstellungs-Dialog beim Neu-Öffnen
- Entwurf-Status in SCHADENSFAELLE: `status='entwurf'` bis finale "Fall anlegen"-Klick

---

## Prompt für Claude Code

```
PROVA Sprint 10 — B5 Auftragstypen + Externe Docs + Aktenzeichen (Tag 11)

Pflicht-Lektuere: CLAUDE.md, app-logic.js (sammleDaten-Funktion), 
auftragstyp.js, Masterplan-v2 02_WORKFLOWS.md (11 Typen)

KONTEXT
=======
neuer-fall.html wird 2-stufig mit Auftragstyp-Auswahl + dynamischen Stammdaten.
Externe Docs werden per KI extrahiert (Vorschlaege, keine Auto-Uebernahme).
Aktenzeichen wird auf 3 klare Felder konsolidiert.

SCOPE
=====

Commit 1: Airtable-Schema (Meta API)
- SCHADENSFAELLE neue Felder: prova_aktenzeichen, auftraggeber_az, policennummer
- Typ-spezifische Felder: gericht, az_gericht, beweisbeschluss_datum, beweisfragen,
  versicherung, schadensnummer, sachbearbeiter, verbraucher_checkbox,
  bewertungsanlass, wertermittlungstag, objekttyp, bauphasen, etc.
- Migration: bestehende Werte aus Aktenzeichen/Auftrags_Nr/Polizzennummer kopieren

Commit 2: neuer-fall.html Stufe 1 (Auftragstyp-Grid)
- 4 Flow-Gruppen als Sektionen
- 11 Karten mit Icon + Titel + 1-Zeilen-Subtitle
- Bei Klick: Transition zu Stufe 2, Auswahl gespeichert

Commit 3: neuer-fall.html Stufe 2 (Stammdaten)
- Gemeinsame Sektionen: Externe Docs (optional), Auftraggeber, Schadensort, Schaden
- Dynamische Sektion je nach Auftragstyp
- Ein "Fall anlegen"-Button unten

Commit 4: Typ-spezifische Feld-Definitionen
- auftragstyp.js oder neues Modul: FELDER_PRO_TYP = {gerichtsgutachten: [...], ...}
- Rendering-Logik: Felder werden dynamisch gerendert
- Validierung pro Typ

Commit 5: ki-dokument-extrahieren.js (neue Function)
- Input: PDF (Base64) + Dokument-Typ-Hint
- GPT-4o Vision mit spezifischem Prompt pro Typ
- Response: strukturiertes JSON mit Vorschlaegen + Quellen-Angabe (Seite, Textausschnitt)
- JWT-Pflicht, Rate-Limit 3/Min/User, DSGVO-Pseudonymisierung

Commit 6: UI externe-docs-extraktion
- Upload-Button in neuer-fall.html
- Nach Upload: Ladeanzeige, dann Vorschlags-Panel
- Pro Feld: [✓ Uebernehmen] [✏️ Aendern] [✗ Ignorieren]
- §411-Frist mit Warnung "Bitte selbst pruefen"
- Disclaimer permanent sichtbar

Commit 7: sammleDaten() anpassen
- Je nach auftragstyp: korrekte Felder einsammeln
- Alle 3 Aktenzeichen-Felder sauber trennen
- Bei Verbraucher-Checkbox: §312g-Flag setzen

Commit 8: Auto-Speichern
- Debounce 10s, bei Blur
- localStorage + Airtable-Draft
- Wiederherstellungs-Dialog bei Re-Open

Commit 9: sw.js bump + Tests
- Playwright: alle 11 Typen durchklicken
- PDF-Upload mit Testdokument
- Aktenzeichen-Anzeige in Akte korrekt

QUALITAET
=========
- Keine Auto-Uebernahme von KI-Vorschlaegen
- Alle Pflichtfelder markiert (*)
- Validierung client + server
- Mobile: Formular scrollbar, Karten als Liste
- Aktenzeichen-Migration idempotent (2x laufen OK)

TAG: v180-auftragstypen-done
```

---

## Acceptance
1. SV klickt "Gerichtsgutachten" → sieht Gerichts-Felder (Gericht, AZ, Beweisfragen)
2. SV klickt "Privatgutachten" + Verbraucher-Checkbox → Widerrufsbelehrung-Flag gesetzt
3. Alle 11 Typen durchklickbar ohne Error
4. PDF-Upload Beweisbeschluss → KI extrahiert Daten → SV bestätigt → Formular befüllt
5. Akte zeigt 3 Aktenzeichen-Felder korrekt
6. Bestehende Fälle: Aktenzeichen migriert, Anzeige funktioniert
7. Auto-Speichern + Wiederherstellung funktioniert

## Rollback
`git reset --hard v180-ki-full-done` + Airtable-Migration NICHT zurück (alte Felder existieren noch)

---

## Abhängigkeiten
- Sprint 1 (DSGVO-Pseudonymisierung) — für externe Dokumente
- Sprint 3 (JWT) — für ki-dokument-extrahieren.js
- Sprint 9 (KI-Werkzeug) — Pattern für KI-Vorschlag-UI
