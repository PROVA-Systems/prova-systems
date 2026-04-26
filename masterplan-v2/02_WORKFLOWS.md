# Workflows — Alle 11 Auftragstypen in 4 Flow-Gruppen

**Aus Code extrahiert:** akte-logic.js Zeile 31-32 definiert die 11 Auftragstypen und ihre Flow-Zuordnung. Memory Session 30 bestätigt die 4-Flow-Architektur.

**Grundprinzip:** Jeder Auftragstyp hat einen **eigenen, logischen, nachvollziehbaren Workflow**. Kein pauschales "Eine Pipeline für alles". Gleichzeitig: **Gemeinsame UI-Komponente** (Timeline) rendert je nach Flow andere Phasen.

---

## Flow-Gruppen-Übersicht

| Flow | Name | Auftragstypen | Charakteristik |
|---|---|---|---|
| **A** | Schaden/Mangel | Gerichtsgutachten, Versicherungsgutachten, Privatgutachten, Schiedsgutachten, Beweissicherung, Ergänzungsgutachten, Gegengutachten | Haupt-Workflow, 9 Phasen, Gutachten-Erstellung |
| **B** | Bewertung | Wertgutachten | Wertermittlung, 6 Phasen, anderer KI-Kontext |
| **C** | Beratung | Kaufberatung, Sanierungsberatung | Kurzformat, 4 Phasen, kein vollständiges Gutachten |
| **D** | Baubegleitung | Baubegleitung, Bauabnahme | Mehrtermin-Logik, Bauphasen-Struktur |

**Quer durch alle Flows (Freistehend):** Briefe, Rechnungen, Angebote, Dokumente, Termine, Kontakte. Das sind keine eigenen Workflows, sondern Werkzeuge die in **jedem** Flow verfügbar sind.

---

## Flow A — Schaden/Mangel (9 Phasen)

### Anwendbar für
1. **Gerichtsgutachten** — §407a ZPO, JVEG-Abrechnung, Beweisbeschluss-gebunden
2. **Versicherungsgutachten** — Freies Honorar, Deckungsanfrage-Workflow
3. **Privatgutachten** — §312g bei Verbrauchern, Widerrufsbelehrung
4. **Schiedsgutachten** — Parteien-Vereinbarung, neutral
5. **Beweissicherung** — §485 ZPO selbstständig oder gerichtlich
6. **Ergänzungsgutachten** — Bezug zu bestehendem Gutachten
7. **Gegengutachten** — Kritik/Erwiderung bestehendes Gutachten

### Phasen

```
Phase 1  Auftrag erfasst            → Neuer Fall angelegt, Stammdaten + typ-spezifische Felder
Phase 2  §407a-Anzeige (wenn nötig) → Bei Gerichtsgutachten: Pflicht-Anzeige an Gericht/Auftraggeber
Phase 3  Ortstermin                 → Einträge (Diktat/Notiz/Skizze), Fotos, Messwerte
Phase 4  KI-Analyse + §6 Fachurteil → KI strukturiert Befunde, SV verfasst §6 persönlich
Phase 5  Freigabe                   → SV prüft, §407a-Checkbox, dann Freigabe
Phase 6  PDF-Erstellung             → PDFMonkey rendert, Anhänge werden beigelegt
Phase 7  Versand                    → E-Mail an Auftraggeber mit PDF
Phase 8  Rechnung                   → Auto-generiert nach Freigabe, SV prüft, verschickt
Phase 9  Zahlung + Archivierung     → Eingang registriert, Fall archiviert
```

### Fristen pro Phase
- **Phase 2:** §407a sofort (gesetzlich "unverzüglich")
- **Phase 4:** Bei Gerichtsgutachten §411-Frist (auto +8 Wochen ab Beweisbeschluss)
- **Phase 8:** Zahlungsziel 14 Tage nach Versand
- **Phase 9:** Mahnwesen auto bei Überschreitung (14/30/45 Tage)

### Besonderheiten pro Typ

**Gerichtsgutachten:**
- Pflicht: Gericht, AZ Gericht, Beweisbeschluss, Beweisfragen
- Abrechnung: JVEG-Modus, Stundensatz + Schreibauslagen
- KI-Offenlegung: Variante "gericht" aus OFFENLEGUNG-Konstante
- §407a-Anzeige zwingend bei Kosten-Überschreitung

**Versicherungsgutachten:**
- Pflicht: Versicherung, Schadensnummer, Policennummer
- Abrechnung: Freies Honorar
- KI-Offenlegung: Variante "versicherung"
- Deckungsanfrage-Workflow optional

**Privatgutachten mit Verbraucher (B2C):**
- Pflicht: Verbraucher-Checkbox → aktiviert §312g
- **Auto-Widerrufsbelehrung** im PDF (2. Seite)
- Abrechnung: Freies Honorar, USt ausgewiesen

**Schiedsgutachten:**
- Pflicht: Mindestens 2 Parteien, Schiedsvereinbarung
- Beide Parteien erhalten Kopie

**Beweissicherung:**
- Pflicht: Antragsgrund, Drohende-Gefahr-Beschreibung
- §485 ZPO selbständig möglich
- Oft zeitkritisch

**Ergänzungsgutachten:**
- Pflicht: Bezug zu ursprünglichem Gutachten (Dropdown aus Archiv)
- KI bekommt Original-Gutachten als Kontext

**Gegengutachten:**
- Pflicht: Gegenüberstehendes Gutachten, Kritikpunkte
- §6 Fachurteil fokussiert auf Widerlegung

---

## Flow B — Bewertung (6 Phasen)

### Anwendbar für
- **Wertgutachten** — Immobilienbewertung

### Phasen

```
Phase 1  Auftrag erfasst            → Objekt-Daten, Bewertungsanlass, Wertermittlungstag
Phase 2  Objektbesichtigung          → Einträge, Fotos, Daten-Erfassung
Phase 3  Vergleichsobjekte / Daten  → Marktdaten, Vergleichswerte, Mietspiegel
Phase 4  Wertermittlung             → Sachwert/Vergleichswert/Ertragswert-Berechnung
Phase 5  Freigabe + PDF             → Wertermittlungs-Gutachten PDF
Phase 6  Rechnung + Archivierung
```

### Besonderheiten
- KI-Prompt fokussiert auf Bewertung, nicht Schadensanalyse
- Tabellarische Wertermittlungen im PDF
- ImmoWertV-Referenzen

---

## Flow C — Beratung (4 Phasen)

### Anwendbar für
- **Kaufberatung** — Vor-Kauf-Begutachtung eines Objekts
- **Sanierungsberatung** — Empfehlungen für Renovierung/Sanierung

### Phasen

```
Phase 1  Auftrag erfasst            → Beratungsthema, Objekt
Phase 2  Objektbesichtigung          → Einträge, Fotos
Phase 3  Stellungnahme/Beratungs-Report → Kürzeres Format, keine §6-Eigenleistung nötig
Phase 4  Rechnung + Archivierung
```

### Besonderheiten
- Kürzeres PDF-Format (10-20 Seiten statt 30-50)
- Keine §407a-Anzeige
- Tipp-Format statt Fachurteil-Format
- Schnellere Abwicklung (oft in 1-2 Wochen)

---

## Flow D — Baubegleitung (Mehrtermin, eigene Phasenstruktur)

### Anwendbar für
- **Baubegleitung** — Begleitung eines Bauvorhabens
- **Bauabnahme** — Einzelne Abnahme

### Phasen (Baubegleitung)

```
Phase 1  Auftrag erfasst            → Bauvorhaben, Bauphasen-Auswahl, Beteiligte
Phase 2  Termine-Planung            → Mehrere Ortstermine über Wochen/Monate
Phase 3  Laufende Einträge          → Pro Termin: Einträge + Fotos, kumulative Doku
Phase 4  Zwischenberichte           → Optional, nach wichtigen Bauphasen
Phase 5  Abschlussbericht           → Zusammenfassung aller Termine
Phase 6  Rechnung + Archivierung
```

### Phasen (Bauabnahme)

```
Phase 1  Auftrag erfasst            → Gewerk, Abnahmedatum, Mängel-Checkliste
Phase 2  Abnahmetermin              → Einträge, Mängel-Dokumentation
Phase 3  Abnahme-Report mit Mängelliste
Phase 4  Rechnung + Archivierung
```

### Besonderheiten
- **Mehrtermin-Verknüpfung:** Ein Fall hat N Termine, alle an Akte gebunden
- **Kumulative Einträge:** Einträge aus allen Terminen werden gemeinsam dargestellt
- **Bauphasen-Struktur:** Rohbau / Ausbau / Fertigstellung als Phasen-Tags
- **Zwischenberichte:** Eigenständige PDFs zu Zwischen-Meilensteinen
- **Eigenes PDF-Template** mit Bauphasen-Gliederung (existiert: F-20 BAUBEGLEITUNG)

---

## Freistehende Werkzeuge (Quer durch alle Flows)

### Briefe
**Seite:** `briefvorlagen.html`  
**Tabelle:** BRIEFE  
**Template:** BRIEF-MASTER-v1.0 (DIN-5008)

**Verfügbare Brief-Vorlagen:**
- A-03 Auftragsbestätigung
- B-01 Einladung Ortstermin
- D-01 Erstbericht Versicherung
- D-04 Nachforderung Unterlagen
- D-06 Abschlussbericht Versicherung
- E-06 Einverständnis DSGVO
- G-01 Checkliste Wasserschaden
- G-01b Checkliste Sturmschaden
- H-01 Aktennotiz (intern, nicht gesendet)
- H-04 Datenschutz Mandant
- Mahnung Level 1/2/3
- §407a-Anzeige

**Funktion:** SV wählt Fall, wählt Brief-Typ, Variablen auto-befüllt (Auftraggeber, Adresse, AZ), editierbar, Versand per E-Mail + Archivierung.

### Rechnungen
**Seite:** `rechnungen.html`, `schnelle-rechnung.html`, `kostenermittlung.html`, `erechnung.html`  
**Tabelle:** RECHNUNGEN  
**Template:** RECHNUNG-MASTER-v1.1 (§14 UStG, §286/288 BGB, ZUGFeRD)

**Flows:**
- **Normal-Rechnung:** SV wählt Fall + Positionen → Rechnung-PDF → Versand
- **JVEG-Rechnung:** Bei Gerichtsgutachten, Zeit-basiert
- **Pauschalrechnung:** Für Beratung/Privat
- **Schnellrechnung:** Einmal-Leistung ohne Fall-Zuordnung
- **Angebot:** Status "Angebot" mit Gültigkeitsdatum + Annahme-Workflow
- **Mahnung:** Auto-Trigger nach 14/30/45 Tagen, Mahn-Briefvorlagen

**Auto-Trigger:** Nach Gutachten-Freigabe (Phase 5 in Flow A) erscheint Button "💶 Rechnung erstellen" → befüllt mit Fall-Daten + SV-Einstellungen → SV prüft + verschickt.

### Angebote
Gleiche Tabelle wie Rechnungen, Status-Unterschied.  
**Felder zusätzlich:** `gueltig_bis`, `angebot_status` (offen/angenommen/abgelehnt)  
**Workflow:** SV sendet Angebot → Kunde klickt Annahme-Link in E-Mail → Angebot wird automatisch zu Auftrag (neuer Fall in SCHADENSFAELLE).

### Termine (Kalender)
**Seite:** `termine.html`  
**Tabelle:** TERMINE  
**Integration:** Google-Calendar-Bidirektional (über Make-T3-Szenario, bleibt bei Make)

**Termin-Typen:**
- Ortstermin (an Fall gebunden)
- Gerichtstermin (an Fall + Gerichts-AZ gebunden)
- Internal (nicht an Fall, z.B. Meeting)
- Frist (Deadline, Reminder)

**UI:**
- Monatsansicht + Wochenansicht + Listen-Ansicht
- Drag&Drop zum Verschieben
- Quick-Create via `⌘N` Shortcut oder Klick in leere Stelle
- Termin-zu-Fall-Verknüpfung mit Preview des Falls

**Reminders:**
- Auto-Push 1 Tag vorher
- E-Mail 3 Tage vorher (wenn aktiviert)
- Dashboard-Widget "Heute" + "Diese Woche"

### Dokumente
**Ort:** Pro Fall in `akte.html` eigener Dokumente-Bereich  
**Tabelle:** Anhänge am SCHADENSFAELLE-Record ODER separate Tabelle DOKUMENTE (je nach Implementierung)

**Typen:**
- Schriftstücke extern (Beweisbeschluss, Schreiben, Gutachten-anderer-SV) — PDF-Upload → KI-Klassifizierung → Meta-Daten (erkannte Frist, Typ)
- Schriftstücke intern (SV-generiert) — Gutachten, Rechnungen, Briefe
- Fotos (aus Ortstermin-Modus)
- Skizzen
- Audio (Diktate)
- Messwerte-CSV (wenn importiert)

**UI:**
- Gruppiert nach Typ
- Timeline-sortiert
- Lightbox für Fotos
- PDF-Inline-Preview
- Bulk-Download als ZIP

### Kontakte
**Seite:** `kontakte.html`  
**Tabelle:** KONTAKTE

**Typen:**
- Auftraggeber (Gericht, Versicherung, Privat, Anwalt)
- Geschädigte
- Beteiligte (Architekt, Bauleiter, Zeuge)
- Dienstleister (Handwerker, Labore)

**Felder:** Name, Firma, Anrede, Email, Telefon, Adresse, Notizen, Tags, Letzte Zusammenarbeit, Favorit-Flag.

**Integration:** Kontakt-Bibliothek-Button in allen Brief-/Rechnungs-Editoren → Empfänger 1-Klick einfügen.

### Textbausteine & Floskeln
**Seite:** `textbausteine.html`  
**Tabellen:** TEXTBAUSTEINE (Standard), TEXTBAUSTEINE_CUSTOM (User)

**Kategorien** (Plan):
- Einleitungen
- Fachurteil-Bausteine
- Normen-Referenzen
- Abschluss-Formulierungen
- **Floskeln** (neu — "wir danken für das entgegengebrachte Vertrauen" etc.)
- Mahnungs-Sätze

**Integration:** Textbaustein-Bibliothek-Button in allen Text-Editoren.

### Normen
**Seite:** `normen.html`  
**Tabelle:** NORMEN

**Kategorien:**
- DIN (Bau-Normen)
- WTA (Merkblätter)
- VOB (Bauvertragsrecht)
- BGB (Zivilrecht)
- ZPO (Prozessrecht) — **§-Verweise ebenfalls hier als eigene Kategorie**
- HOAI (Honorar)
- JVEG (Gerichts-Honorar)

**Integration:** Normen-Bibliothek-Button in allen Text-Editoren → 1-Klick-Zitat oder Auszug.

### Positionen & Preise
**Seite:** `positionen.html`  
**Tabelle:** POSITIONEN_DATENBANK

**Verwendung:** In Rechnungen + Angeboten als Bibliothek-Einfüge-Quelle. SV baut über Zeit eigene Positions-Liste auf (häufige Leistungen wie "Ortstermin Pauschal 3h", "Schreibauslagen", etc.).

---

## Gemeinsame Komponenten über Flows

### Phasen-Timeline (akte.html)
**Eine generische Komponente**, die je nach `fall.flow` (A/B/C/D) andere Phasen rendert. Phasen-Daten kommen aus einer zentralen Config:

```javascript
const FLOW_PHASES = {
  A: [
    { nr: 1, name: "Auftrag erfasst", icon: "📋" },
    { nr: 2, name: "§407a-Anzeige", icon: "⚠️", conditional: "ist_gerichtsgutachten" },
    { nr: 3, name: "Ortstermin", icon: "📍" },
    { nr: 4, name: "KI-Analyse + §6", icon: "🤖" },
    { nr: 5, name: "Freigabe", icon: "✓" },
    { nr: 6, name: "PDF-Erstellung", icon: "📄" },
    { nr: 7, name: "Versand", icon: "📨" },
    { nr: 8, name: "Rechnung", icon: "💶" },
    { nr: 9, name: "Archiviert", icon: "🗂️" }
  ],
  B: [ /* 6 Phasen Wertgutachten */ ],
  C: [ /* 4 Phasen Beratung */ ],
  D: [ /* 6 Phasen Baubegleitung */ ]
};
```

### Fristen-Integration
Jede Phase kann kritische Fristen haben:
- Auto-berechnet (z.B. §411-Frist = Beweisbeschluss + 8 Wochen)
- Manuell gesetzt (z.B. eigene Deadline für Bericht)
- Sichtbar an Timeline + Dashboard + Kalender
- Push-Reminder 7 Tage vor + 1 Tag vor

### Skip-Logik
Nicht alle Phasen müssen durchlaufen werden (Beispiel: Privatgutachten ohne §407a). Die Timeline zeigt "Übersprungen" statt "Ausstehend" bei Skip-bedingten Phasen.

---

## Datenmodell-Zusammenhang

```
SACHVERSTAENDIGE (SV-Accounts)
    ↓ 1:N
SCHADENSFAELLE (Fälle, alle Flows)
    ├→ flow: 'A' | 'B' | 'C' | 'D'
    ├→ auftragsart: 'gerichtsgutachten' | 'wertgutachten' | ... (11 Werte)
    ├→ phase_aktuell: 1-9
    │
    ├─ 1:N → EINTRAEGE (Diktate, Notizen, Skizzen)
    ├─ 1:N → TERMINE (Ortstermine, Gerichtstermine, Fristen)
    ├─ 1:N → RECHNUNGEN (inkl. Angebote)
    ├─ 1:N → BRIEFE (Versendete Briefe)
    ├─ N:M → KONTAKTE (via Fall-Rolle: Auftraggeber, Geschädigter, etc.)
    └─ 1:N → AUDIT_TRAIL (Lückenloses Log)
```

---

## Workflow-Abdeckungs-Status vor Masterplan-v2

| Flow | Status heute | Was fehlt |
|---|---|---|
| **A** | 🟢 Größtenteils funktionsfähig | §407a-Pre-Send-Checkbox, Phasen-Fristen-Anzeige, Auto-Rechnung |
| **B** | 🟡 Lokal gebaut (Session 32), nicht gepusht | Push-Deploy, Flow-spezifische Timeline |
| **C** | 🔴 Nur rudimentär | Kompletter Flow + Phasen + UI |
| **D** | 🔴 Nur rudimentär (baubegleitung.html existiert) | Mehrtermin-Logik, Zwischenberichte, Bauphasen-Struktur |

**In Sprint 11 (B6) werden alle 4 Flows sauber gebaut** und in die gemeinsame Timeline-Komponente gebracht.

---

**Dieses Dokument ist Pflicht-Lektüre vor Sprint 11 (B6 Workflow-Sauberkeit).**
