# PROVA SYSTEMS — Funktions-Übersicht

**Was PROVA für Bauschaden-Sachverständige leistet**

**Stand:** 15. Mai 2026 · **Status:** Migrations-fertig, Pilot-vorbereitend
**Autor:** Marcel Schreiber + Web-Claude (Co-Architektur)
**Verbindlich:** Diese Übersicht beschreibt den Zielzustand. Items markiert als 🟢 sind live, 🟡 in Arbeit, 🔵 geplant.

---

## Inhalt

1. [Was ist PROVA?](#1-was-ist-prova)
2. [Wer arbeitet damit](#2-wer-arbeitet-damit)
3. [Die 4-Flow-Architektur](#3-die-4-flow-architektur)
4. [Modul 1 — Aufträge & Wizards](#4-modul-1--aufträge--wizards)
5. [Modul 2 — Erfassung: Diktat, Skizze, Foto, manuelle Eingabe](#5-modul-2--erfassung)
6. [Modul 3 — KI-Werkzeuge (Helfer, nie Autopilot)](#6-modul-3--ki-werkzeuge)
7. [Modul 4 — Fachurteil: das Herzstück](#7-modul-4--fachurteil-das-herzstück)
8. [Modul 5 — Bibliotheken: Normen, Textbausteine, Vorlagen](#8-modul-5--bibliotheken)
9. [Modul 6 — PDF-Erstellung gerichtsfest](#9-modul-6--pdf-erstellung-gerichtsfest)
10. [Modul 7 — Globale Suche](#10-modul-7--globale-suche)
11. [Modul 8 — Kontakte & Import-Assistent](#11-modul-8--kontakte--import-assistent)
12. [Modul 9 — Termine, Fristen, Kalender](#12-modul-9--termine-fristen-kalender)
13. [Modul 10 — Rechnungen & Mahnwesen](#13-modul-10--rechnungen--mahnwesen)
14. [Modul 11 — Briefe & Bescheinigungen](#14-modul-11--briefe--bescheinigungen)
15. [Modul 12 — Cross-Device & Mobile](#15-modul-12--cross-device--mobile)
16. [Modul 13 — Compliance-Layer](#16-modul-13--compliance-layer)
17. [Modul 14 — Founder-Cockpit (Admin)](#17-modul-14--founder-cockpit)
18. [Architektur in 30 Sekunden](#18-architektur-in-30-sekunden)
19. [Roadmap & Status](#19-roadmap--status)
20. [Was PROVA bewusst nicht ist](#20-was-prova-bewusst-nicht-ist)

---

## 1 · Was ist PROVA?

PROVA ist die KI-gestützte SaaS-Plattform, die den **kompletten Berufsalltag** eines öffentlich bestellten und vereidigten Bauschaden-Sachverständigen abbildet — von der Auftragsannahme über das Diktat vor Ort, die Foto-Dokumentation, das Fachurteil, die PDF-Erstellung bis hin zur Rechnung, Mahnung und Archivierung. Alles in einer Plattform, alles miteinander verbunden, alles **gerichtsfest** dokumentiert.

**Der Kerngedanke:**
> Ein Bauschaden-SV soll am PC morgens beginnen, beim Ortstermin auf dem Handy weitermachen, im Auto auf dem Tablet diktieren und abends im Büro abschließen — **ohne dass Daten verloren gehen, ohne Word-Dokumente, ohne Excel, ohne USB-Sticks**.

PROVA ist dabei **kein KI-Autopilot**. Der Sachverständige bleibt der fachlich Verantwortliche, wie es § 407a ZPO vorschreibt. Die KI ist Werkzeug — sie strukturiert Diktate, schlägt Normen vor, prüft Konjunktiv II, fasst zusammen. Aber jede fachliche Entscheidung trifft der Mensch.

---

## 2 · Wer arbeitet damit

### Zielgruppe
- **Öffentlich bestellte und vereidigte Bauschaden-Sachverständige** in Deutschland
- Solo-SVs sowie kleine Büros (1–10 Personen)
- **5–30 Standardfälle pro Monat**
- Tätigkeitsbereiche: Schadensgutachten, Beweissicherung, Wertgutachten, Beratung, Baubegleitung

### Pricing (Stripe Live seit 07.05.2026)

| Tier | Monatspreis | Limit | Zielgruppe |
|---|---|---|---|
| **Solo** | 179 € | 30 Aufträge / Monat | Einzel-SVs |
| **Team** | 379 € | unbegrenzt + bis 5 User | Kleine Büros |

**Add-Ons** (Stripe Add-ons, einmalig zubuchbar):
- 5 Folge-Gutachten: **+25 €**
- 10 Folge-Gutachten: **+45 €**
- 20 Folge-Gutachten: **+80 €**

**Coupons**: `FOUNDING-99` (Solo dauerhaft 99 €/Monat für Early Adopters), `FRIEND-50` (50 % Rabatt für Freundschaftswerbung), `WERBER-MONAT-FREI` (Werber bekommt Monat geschenkt).

---

## 3 · Die 4-Flow-Architektur

Jeder Auftrag in PROVA wird genau einem von vier Flows zugeordnet. Der SV sieht das nicht so technisch, aber **technisch ist die Trennung sauber** — jeder Flow hat seine eigenen Phasen, sein eigenes Aktenzeichen-Format, seine eigene Logik.

### Flow A — Schaden & Mangel 🟢 Live
**9 Phasen mit Skip-Logik.** Der Brot-und-Butter-Workflow.

- Schadensgutachten (Kern, häufigster Typ)
- Beweissicherung (Vor-Ort-Dokumentation)
- Ergänzungsgutachten (Ergänzung zu Erstgutachten, mit Parent-Verlinkung)
- Gegengutachten / Erwiderung
- Technische Stellungnahme (kurz, eigenständig)

**Aktenzeichen-Format**: `SCH-2026-001`, `BEW-2026-001`, `ERG-2026-001`, `GEG-2026-001`, `TS-2026-001`

### Flow B — Bewertung / Wertgutachten 🟡 In Arbeit
**3 Phasen.** Verkehrswertermittlung nach ImmoWertV 2022 und §§ 194-199 BauGB.

- Vergleichswertverfahren
- Sachwertverfahren
- Ertragswertverfahren

**Aktenzeichen**: `WG-2026-001`

### Flow C — Beratung 🟡 In Arbeit
**3 Phasen.** Telefonberatung, Vor-Ort-Beratung, fachliche Auskunft.

- Telefonberatung
- Beratungsleistung
- Kaufberatung
- Sanierungsberatung

**Aktenzeichen**: `BER-2026-001`

### Flow D — Baubegleitung 🔵 Geplant
**3 Phasen + n Eintraege-Sammlung über Monate.** Bauleitung über mehrere Phasen, Projekt-Lebenszyklus.

**Aktenzeichen**: `BB-2026-001`

### Cross-Flow-Werkzeuge (auftragsneutral) 🟢 Live
- **Schnellrechnung** — ohne Auftrag, ad-hoc-Rechnung
- **Briefe & Bescheinigungen** — eigenständig oder mit Auftragsbezug
- **Schiedsgutachten** — eigener Sonderfall-Workflow

---

## 4 · Modul 1 — Aufträge & Wizards

🟢 **Status: Live**

Jeder Auftrag wird in einem **mehrstufigen Wizard** angelegt. Der Wizard:

- führt durch alle Phasen (Stammdaten → Auftrag → Daten → Diktat → Fachurteil → Export)
- vergibt automatisch ein passendes Aktenzeichen
- **speichert alle 30 Sekunden automatisch** (kein "Speichern"-Button nötig)
- erlaubt Phasen-Skipping (nicht alle Phasen sind für jeden Fall relevant)
- merkt sich den letzten Stand — wenn der SV das Browser-Fenster schließt, geht er beim nächsten Mal genau da weiter, wo er aufgehört hat
- ist **kollaborativ** ab dem Team-Tier: zwei Personen können am selben Auftrag arbeiten, jeweils ihre eigenen Eintraege machen

### Phase-Tracker
Eine sichtbare Leiste zeigt dem SV jederzeit, in welcher Phase des Workflows er ist. Erledigte Phasen haben einen grünen Haken, die aktuelle ist gefüllt, kommende sind ausgegraut.

### Auto-Save
Im Hintergrund läuft eine Auto-Save-Logik gegen Supabase. Jede Eingabe wird nach 30 Sekunden persistiert. Bei Verbindungsverlust schaltet das System auf Offline-Queue um und synchronisiert, sobald wieder Netz verfügbar ist.

---

## 5 · Modul 2 — Erfassung

🟢 **Status: Live (Diktat, Foto), 🟡 Skizze in Arbeit**

PROVA bietet **vier gleichwertige Erfassungswege** für Informationen vor Ort und im Büro:

### Diktat
- Browser-basiertes Diktat, direkt im Wizard
- Spracherkennung im Hintergrund über **Whisper**
- Erkennt deutsche Fachsprache (Bauschäden-Vokabular ist trainiert)
- Funktioniert **mobil ohne App** — der SV nimmt sein normales Handy/Tablet, drückt Aufnahme, redet
- Live-Transkription ODER Aufnahme-und-später-Strukturierung
- Audio-Datei wird **verschlüsselt in Supabase Storage** abgelegt (DSGVO, deutsche Region)

### Skizze 🟡 Geplant
- Vor-Ort: SV zeichnet auf Tablet/Handy mit Finger/Stift
- Vor-Ort: SV zeichnet auf Papier, fotografiert und PROVA digitalisiert es
- Skizze wird mit dem Auftrag verknüpft
- Im PDF wird sie als Anlage eingebunden

### Foto-Dokumentation
- Direkt aus der Kamera (mobil) oder per Drag&Drop (PC)
- **EXIF-Strip** automatisch (DSGVO: Geokoordinaten werden entfernt bevor das Bild gespeichert wird)
- Komprimierung auf vernünftige Größen ohne Qualitätsverlust
- Beschriftung je Foto möglich
- Foto-Galerie pro Auftrag mit Lightbox-View
- Reihenfolge im PDF durch Drag-Reorder bestimmbar

### Manuelle Texteingabe
- Reicher Texteditor mit Formatierung
- **Direkter Zugriff auf Textbausteine** (Slash-Befehl `/baustein` oder Side-Drawer)
- **Direkter Zugriff auf Normen** (Slash-Befehl `/norm`)
- Auto-Vervollständigung für häufige Fachbegriffe

### Alle vier Wege sind **miteinander verbunden**
Ein Auftrag kann gleichzeitig Diktate, Skizzen, Fotos und manuelle Texte enthalten. Sie werden alle als **Eintraege** unter dem Auftrag gespeichert (chronologisch, mit Timestamp) und in der späteren PDF-Generierung an die richtige Stelle eingefügt.

---

## 6 · Modul 3 — KI-Werkzeuge

🟢 **Status: Teilweise live, einzelne Werkzeuge in Arbeit**

PROVA nutzt KI **als Helfer, nicht als Autopilot.** Das ist § 407a-ZPO-Pflicht und auch praktisch sinnvoll: Ein Gutachten, das vor Gericht steht, muss vom SV inhaltlich vollständig verantwortet werden.

### Diktat-Strukturierung 🟢
Das rohe Diktat wird in vorbereitete Bausteine sortiert (Sachverhalt, Befund, Bewertung, Hypothesen). Der SV bekommt also keinen Wall-of-Text, sondern bereits sinnvolle Abschnitte, die er nur noch finalisieren muss.

### Konjunktiv-II-Hilfe 🟢
Bei Ursache-Hinweisen muss der SV im Konjunktiv II schreiben (Empfehlung der IHK, gerichtlich anerkannt). PROVA prüft das automatisch und schlägt Umformulierungen vor: "ist möglich" → "wäre möglich", "stammt aus" → "könnte aus … stammen".

### Plausibilitäts-Hinweise 🟢
Wenn z. B. ein Schadensdatum vor dem Baujahr liegt, weist PROVA darauf hin. Wenn das Honorar plausibel scheint im Verhältnis zur Streitwert-Größenordnung. Wenn ein Norm-Zitat veraltet ist.

### Norm-Vorschläge 🟡
Beim Verfassen des Fachurteils schlägt PROVA passende DIN-/VOB-Normen vor, basierend auf der eingegebenen Schadensart. Der SV kann mit einem Klick eine Norm einfügen oder weitere Vorschläge anfordern. **Aber:** der SV entscheidet, welche Norm wirklich passt.

### Rechtschreibung + Grammatik 🟢
Hintergrund-Korrektur ähnlich Word, aber für deutsche Fachsprache trainiert. Markiert Fehler, schlägt Korrekturen vor.

### Formatierung 🟢
Texte werden automatisch nach DIN-5008 oder IHK-Vorgaben formatiert: Absätze, Aufzählungen, Hervorhebungen werden konsistent gerendert.

### Foto-Beschreibung 🔵
KI generiert einen Vorschlag für die Foto-Beschriftung basierend auf Bildinhalt. SV editiert/bestätigt.

### Pseudonymisierung 🟢
Bevor irgendetwas an externe KI-Services geht, werden Personennamen, Adressen, Aktenzeichen automatisch pseudonymisiert. Der SV kann das im Tier "Team" konfigurieren.

### Halluzinations-Verbot 🟢
KI darf **niemals Fakten erfinden**. Wenn etwas nicht im Diktat steht, kommt es nicht ins Gutachten. Hartcodiert im Prompt-Layer. Das ist eine Hauptursache, warum SVs überhaupt eine KI einsetzen können vor Gericht.

### KI-LERNPOOL 🟡
"Andere Ursache"-Einträge der SVs (selten erkannte Spezialfälle) werden anonymisiert gesammelt und füttern künftige Vorschläge. **Wichtig**: das ist **kein** Machine Learning. Das ist Datenbank-Wachstum. Wird sprachlich nie als "KI lernt dazu" beschrieben.

---

## 7 · Modul 4 — Fachurteil: das Herzstück

🟢 **Status: Live**

Das Fachurteil (§ 6 in der IHK-Bauplan-Struktur) ist die zentrale **fachliche Würdigung** im Gutachten. Hier muss der SV nach § 407a ZPO komplett selbst schreiben. PROVA stellt Werkzeuge bereit, aber der Text muss vom SV stammen.

### Eigenleistung-Tracker
- Mindestens **500 Zeichen** muss der SV selbst tippen
- Fortschrittsbalken zeigt: "Sie haben 380 von 500 Zeichen geschrieben"
- KI-Vorschläge werden nicht mitgezählt — nur wirklich getippte Zeichen

### Einpflegen statt Schreiben
Der SV kann mit einem Klick aus den Bibliotheken Inhalte ins Fachurteil einfügen:
- **Textbausteine** aus eigener oder PROVA-Standard-Bibliothek
- **Norm-Zitate** aus der Normen-Datenbank
- **Frühere Fachurteile** aus dem eigenen Archiv (mit Klick "übernehmen + anpassen")

### Drei Verantwortungs-Stufen für KI-Texte
1. **Vorschlag** — KI generiert, SV liest, entscheidet ob er übernimmt
2. **Übernommen** — SV hat den Vorschlag angenommen wie er war
3. **Bearbeitet** — SV hat den Vorschlag inhaltlich verändert

Jede Stufe wird im Audit-Trail festgehalten — wichtig wenn das Gutachten vor Gericht hinterfragt wird.

### Konsistenz-Check § 4 ↔ § 6
PROVA prüft automatisch: Sind die Ergebnisse im Fachurteil konsistent mit den Befunden, die in § 4 (Daten) festgehalten wurden? Wenn nicht, gibt es einen Warnhinweis.

---

## 8 · Modul 5 — Bibliotheken

🟢 **Status: Live**

PROVA hat drei zentrale Bibliotheken, die wiederverwendbares Wissen bündeln. Sie sind alle suchbar, taggbar, durchklickbar — und vor allem **mit einem Klick in jedes Fachurteil einfügbar**.

### Normen-Bibliothek
- **190 Normen** vorbefüllt: DIN-Normen, VOB-Teile, BGB-Paragraphen, ZPO-Paragraphen
- Kategorien: Bauwerksabdichtung, Feuchteschutz, Wärmeschutz, Schallschutz, Brandschutz, Standsicherheit, Estriche, Putze, Beton, Mauerwerk, Holzbau, Metallbau, Fenster/Türen, Dächer, Fassaden, Innenausbau, TGA, Sanitär, Heizung, Elektro, Außenanlagen, JVEG, ZPO/BGB
- Suchbar nach Begriff, Norm-Nummer, Bereich
- **Click-to-insert**: Norm-Text wird formatiert ins Gutachten eingefügt
- Eigene Normen kann jeder SV ergänzen

### Textbausteine
- **100 Bausteine** vorbefüllt: Einleitungen, Sachverhalts-Standards, Befund-Patterns, Bewertungs-Vorlagen, Fachurteil-Schemata, Norm-Zitat-Patterns, Pflicht-Hinweise, Grußformeln, Mahnungs-Texte, Anschreiben, Bescheinigungen, Rechnungs-Floskeln, Fragestellungen
- Eigene Bausteine sind unbegrenzt anlegbar
- **Globale Bausteine** (PROVA-Standard) UND **Workspace-Bausteine** (eigene)
- Suchbar, taggbar, kategorisierbar
- **Variablen-Support**: `{auftraggeber_name}`, `{datum}`, `{aktenzeichen}` werden beim Einfügen automatisch ersetzt
- Nutzungs-Statistik (welche Bausteine nutze ich am häufigsten)

### Vorlagen-Bibliothek (Briefe & Bescheinigungen)
- **22+ PDFMonkey-Templates** im Design-System v1.0:
  - Gutachten-Templates für alle Auftragsarten (F-04 Kurzstellungnahme, F-09 Kurzgutachten, F-10 Beweissicherung, F-15 Gerichtsgutachten, F-19 Wertgutachten, …)
  - Rechnungs-Templates (Standard, JVEG, Stundensatz)
  - Brief-Templates (DIN-5008-konform)
  - Foto-Dokumentations-Vorlage
  - Bescheinigungs-Templates (Auftrags-Annahme, Ortsbesichtigung, etc.)
- **Eigene Vorlagen** kann der SV ergänzen — auch existierende Word-/DOCX-Dokumente hochladen und PROVA macht eine Vorlage daraus
- Alle Vorlagen IHK-konform (Bauplan 2026), § 407a-konform, EU AI Act Art. 50 vorbereitet, DSGVO-konform

---

## 9 · Modul 6 — PDF-Erstellung gerichtsfest

🟢 **Status: Live**

PDFs sind das **wichtigste Ausgabe-Format** für SVs. Ein Gutachten muss vor Gericht standhalten — formal sauber, inhaltlich nachvollziehbar, optisch professionell.

### Was PROVA-PDFs auszeichnet

**Struktur nach IHK-SVO 4-Teile-Bauplan:**
- Teil 1 — Deckblatt + Auftrag
- Teil 2 — Daten (Stammdaten, Objekt, Auftraggeber)
- Teil 3 — Beantwortung der Beweisfragen (inkl. § 3.4 Fachurteil SV-eigenhändig)
- Teil 4 — Zusammenfassung + § 407a ZPO Anzeige + KI-Offenlegung nach EU AI Act Art. 50 + Unterschrift
- Teil 5 (optional) — Anhänge: Fotos, Skizzen, Berechnungen, Normen-Zitate

**Anti-Austausch-Header ab Seite 2** — verhindert, dass jemand einzelne Seiten austauschen kann. IHK Köln empfiehlt das.

**Typografie nach Design-System v1.0**:
- Inter (Lesetext) + JetBrains Mono (Paragraphen & Zahlen)
- PROVA-Blau #1a3a6b für Akzente
- Konsistente Abstände, professionelle Anmutung
- Keine Standard-Office-Schriften (kein Arial-Look)

**§ 407a ZPO-Hinweis-Box** auf jedem Gutachten:
> "Der Sachverständige hat alle in diesem Gutachten enthaltenen fachlichen Aussagen, Bewertungen und Schlussfolgerungen persönlich getroffen. KI-gestützte Hilfsmittel wurden eingesetzt, um Texte zu strukturieren und Normen-Vorschläge zu generieren — sie haben keine fachlichen Entscheidungen getroffen."

**EU AI Act Art. 50 Offenlegung** auf jedem KI-gestützten Dokument:
- Welche KI-Werkzeuge wurden genutzt (Funktion, nicht Modellname)
- Bei welchen Abschnitten
- Wer trägt die Verantwortung (immer der SV)

**Audit-Trail-Verlinkung**: Im PDF-Footer steht eine ID, die im Audit-Trail einen vollständigen Bearbeitungs-Log abrufbar macht. Wer hat wann was geändert. Wann KI gefragt wurde. Ob die Antwort übernommen, bearbeitet oder verworfen wurde.

### Ausgabe-Wege
- **Direkter PDF-Download** für den SV
- **E-Mail-Versand** an Auftraggeber direkt aus PROVA
- **beA / EGVP** für rechtssicheren Versand an Gerichte 🔵 geplant
- **Per Post** — PDF wird optional an einen Post-Dienstleister geleitet

---

## 10 · Modul 7 — Globale Suche

🟡 **Status: In Arbeit (360-Grad-Vollausbau geplant)**

Eine zentrale Suchleiste oben in der App, die **alles in einem Aufwasch** durchsucht:

- Aufträge (nach Aktenzeichen, Titel, Schadensart, Auftraggeber)
- Kontakte (nach Name, Firma, Email, Telefonnummer)
- Termine (nach Datum, Ort, Titel)
- Fristen (nach Datum, Aktenzeichen)
- Dokumente / PDFs (nach Inhalt, dank Volltext-Indizes)
- Textbausteine (nach Titel, Kategorie, Tags)
- Normen (nach Bezeichnung, Bereich, Nummer)
- Briefe und Bescheinigungen
- Rechnungen

**Power-Features:**
- Live-Vorschau beim Tippen
- Fuzzy-Match (Tippfehler werden toleriert)
- Filter-Pillen ("nur Aufträge", "nur Kontakte", "diesen Monat")
- Tastenkombination **`Cmd/Ctrl + K`** öffnet die Suche von überall
- "Was du letzte Woche gemacht hast" — Quick-Access auf zuletzt bearbeitete Items

---

## 11 · Modul 8 — Kontakte & Import-Assistent

🟢 **Status: Live**

Jeder Kontakt ist einmal angelegt und überall im System verfügbar.

### Kontakt-Typen
- Privat
- Firma
- Anwalt / Kanzlei
- Versicherung
- Gericht
- Behörde
- SV-Kollege
- Handwerker
- Sonstiges

### 360-Grad-Sicht
Beim Öffnen eines Kontakts sieht der SV:
- alle Aufträge mit diesem Kontakt (als Auftraggeber oder Geschädigter oder Anwalt)
- alle gesendeten Briefe an diesen Kontakt
- alle Rechnungen an diesen Kontakt + Zahlungsstand
- alle Termine mit diesem Kontakt
- Notizen und Tags

### Auto-Verknüpfung
Wenn beim neuen Auftrag ein bekannter Kontakt eingetippt wird, schlägt PROVA Auto-Complete vor und übernimmt alle Daten (Adresse, Email, Telefon) automatisch.

### Import-Assistent — Migration aus alten Systemen 🟢
Marcels Kernpunkt: SVs sollen ihre Kontakte und alte Akten **mit zwei Klicks** in PROVA bringen können.

**Unterstützte Quellen:**
- Annotext (CSV-Export)
- Heimsoeth-Software (CSV-Export)
- Thurau-Software (CSV-Export)
- Antaris (CSV-Export)
- VCF (vCard, Outlook/Apple)
- Excel / CSV generisch
- Word-Dokumente (Auftragsdaten werden extrahiert)
- DATEV CSV

**Workflow:**
1. SV lädt die Datei hoch
2. PROVA erkennt das Format automatisch
3. Spalten-Mapping wird angeboten (z. B. "Nachname → nachname, Strasse → adresse_strasse")
4. SV bestätigt
5. Vorschau zeigt: 47 Kontakte werden importiert, 3 Duplikate gefunden, 1 fehlerhaft
6. Import läuft im Hintergrund

### Gerichtsdokumente / fremde Dokumente einlesen 🟡
Der SV kann ein Word/PDF-Dokument hochladen (z. B. Beweisbeschluss, Klageschrift, Vorgutachten) und PROVA extrahiert daraus:
- Aktenzeichen des Gerichts
- Beteiligte Parteien
- Beweisfragen (für Gerichtsgutachten)
- Fristen (werden automatisch in den Kalender eingetragen)
- Adressen (werden als Kontakt-Vorschläge angeboten)

Das spart dem SV typisch **15-20 Minuten Erfassungsaufwand** pro Auftrag.

---

## 12 · Modul 9 — Termine, Fristen, Kalender

🟢 **Status: Live (Grundgerüst), 🟡 Erinnerungs-Pipeline in Arbeit**

### Kalender-Ansicht
- Monats-, Wochen-, Tagesansicht
- Termine sind auftragsbezogen (verknüpft mit Aktenzeichen) oder freistehend
- Termin-Typen: Ortstermin, Gerichtstermin, Telefon-Beratung, Video-Beratung, Vor-Ort-Beratung, Beweisaufnahme, Baubegleitung, Intern, Sonstiges
- Termin-Status: Geplant, Bestätigt, Durchgeführt, Verschoben, Abgesagt, Kein Zustandekommen
- iCal-Export per Subscription-Link → Outlook, Google Calendar, Apple Calendar sehen alles automatisch

### Fristen-System (5 Pipelines)
Fristen sind etwas anderes als Termine — sie sind **Stichtage** an denen etwas erledigt sein muss.

**Pipelines:**
- Gerichtliche Frist (Gutachten-Abgabe nach Beweisbeschluss)
- Gutachten-Erstattungsfrist (allgemein)
- Honorarfrist (Forderungs-Fälligkeit)
- Widerspruchsfrist
- Akteneinsichtsfrist
- Zeugen-/Parteien-Frist
- Ortstermin-Frist

### Erinnerungen
Standardmäßig wird **14 / 7 / 3 / 1 Tage vor Fristablauf** erinnert. Konfigurierbar pro Frist.

**Erinnerungs-Kanäle:**
- Notification-Glocke in der App
- Push-Notification auf Mobile
- E-Mail-Erinnerung
- (optional) SMS

### Dashboard-Kacheln
Auf der Hauptseite sieht der SV jederzeit:
- Wie viele Fristen laufen heute ab
- Wie viele in 3 Tagen
- Wie viele Termine heute / morgen / diese Woche

---

## 13 · Modul 10 — Rechnungen & Mahnwesen

🟢 **Status: Live**

> **Marcels Kernforderung: "Mahnwesen geht nicht mehr unter — PROVA hat alles auf dem Schirm und bereitet Mahnungen vor, der SV muss nur noch Knopfdruck machen."**

### Rechnungs-Erstellung
- **Aus Auftrag** automatisch: Stundenzeiten werden gerechnet, JVEG-Stundensatz angewendet, Adresse aus Kontakt übernommen
- **Manuell** über die Schnellrechnung (auftragsneutral)
- **Pauschal-Rechnung** mit fixem Honorar
- **Streitwert-basiert** (für Gerichtsgutachten)
- Honorar-Vorschläge nach BVS-Empfehlungen

### Rechnungs-Formate
- **PDF** mit IHK-konformem Layout
- **ZUGFeRD** (PDF mit eingebettetem XML) — die Steuerprüfer- und Behörden-Variante
- **XRechnung** (XML) — Pflicht-Format für öffentliche Auftraggeber
- **Leitweg-ID** für Behörden-Rechnungen
- **DATEV-Export** für Steuerberater (Stufe 2 geplant)

### Automatisches Mahnwesen
**Die Kern-Magie:**

1. Rechnung wird gestellt mit Fälligkeit 14 Tage (konfigurierbar)
2. Bei Tag 15 nach Fälligkeit: **PROVA bereitet 1. Mahnung vor** und legt sie in den "Versand bereit"-Status. SV bekommt eine Benachrichtigung in der Glocke.
3. SV öffnet die Mahnung, prüft, klickt "Versenden". PDF wird generiert, per E-Mail rausgeht, automatisch in Audit-Trail festgehalten.
4. Bei Tag 30: **2. Mahnung** wird vorbereitet (+5 € Gebühr nach BGB § 286 Abs. 3).
5. Bei Tag 45: **3. Mahnung** vorbereitet (+10 € Gebühr).
6. Bei Tag 60: **Inkasso-Vorschlag** mit Anwalts-Übergabe-Brief vorbereitet.

**SV sieht das jederzeit auf dem Mahnwesen-Dashboard:**
- Welche Rechnungen sind offen
- Welche überfällig
- Welche Mahnungen warten auf Versand
- Welche wurden schon versendet, wann

### Stripe-Integration
- Bei jeder Rechnung wird automatisch ein **Zahlungslink** mitgeschickt
- Auftraggeber zahlt per Karte / SEPA → Geld kommt aufs Konto in 3-5 Werktagen
- PROVA markiert die Rechnung automatisch als bezahlt
- Mahnungs-Pipeline stoppt

### Verzugszinsen
Werden nach § 288 BGB automatisch berechnet (Basiszins +5 % bei Verbrauchern, +9 % bei Unternehmern). Tagesgenaue Rechnung.

---

## 14 · Modul 11 — Briefe & Bescheinigungen

🟢 **Status: Live**

Neben Gutachten muss der SV auch viele kleinere Dokumente schreiben. PROVA hat sie alle als Vorlagen, IHK-/DIN-konform.

### Brief-Vorlagen (13 Standardtypen)
- Auftrags-Ablehnung
- Auftrags-Bestätigung
- Terminabsage
- Zwischenbericht
- Vollmacht
- Datenschutz-Einwilligung (Gericht)
- Widerspruch zum Gegengutachten
- Stellungnahme zum Gegengutachten
- Ergänzungsanforderung
- Rechnungskorrektur
- Begehungsprotokoll
- Abnahmeprotokoll
- § 407a ZPO Anzeige (Pflicht-Brief wenn KI eingesetzt wird)

### Bescheinigungen (Top 12, in Arbeit)
- SV-Bestätigung
- Ortsbesichtigung
- Auftrags-Annahme
- Termin-Bestätigung
- Mängelfreiheit
- Zustand
- Beweissicherung
- Schimmelfreiheit
- Feuchtigkeit
- Standsicherheit
- Bedenken VOB
- Behinderung VOB

### Eigene Vorlagen
Der SV kann auch eigene Vorlagen hochladen (Word/DOCX), PROVA wandelt sie in ein Template um, das dann mit den Variablen `{auftraggeber}`, `{datum}`, `{aktenzeichen}` etc. funktioniert.

### Versand-Wege
- Direkt aus PROVA per E-Mail
- PDF-Download zum manuellen Verschicken
- Postversand-Anbindung 🔵 geplant
- beA/EGVP 🔵 geplant für rechtssichere Übermittlung an Gerichte

---

## 15 · Modul 12 — Cross-Device & Mobile

🟡 **Status: Grundstruktur live, Mobile-Optimierung in Arbeit**

PROVA ist eine **Progressive Web App (PWA)**. Das heißt:
- Keine separate iOS/Android-App nötig
- Installation aufs Smartphone-Home-Screen möglich
- Funktioniert offline (lokaler Cache)
- Synchronisiert automatisch wenn online

### Das typische Szenario
**Morgens im Büro (PC, 09:00):**
- SV erstellt neuen Auftrag SCH-2026-042
- Phase 1 (Stammdaten) + Phase 2 (Auftrag) ausgefüllt
- Auto-Save in die Cloud

**Mittags beim Ortstermin (Handy, 14:00):**
- SV loggt sich ein → "Aufträge in Bearbeitung"
- SCH-2026-042 öffnen → Diktat-Phase
- 5 Minuten Diktat aufnehmen + 12 Fotos mit Beschriftung
- Auto-Save

**Abends zurück im Büro (PC, 17:00):**
- SCH-2026-042 zeigt "Diktat von Mobile vorhanden"
- Diktat ist bereits transkribiert und strukturiert
- SV ergänzt Fachurteil
- PDF generieren → Versenden

### Mobile-Spezifika
- **Handy**: Diktat-First-Ansatz (Hände frei beim Termin)
- **Tablet**: Mittelweg — Diktat + Stift für Skizzen
- **PC**: Volle Funktionalität (Diktat + Tippen + Maus)

### Single-Login
Ein Login, alle Geräte. Session-Liste pro User (sieht eigene aktive Sessions, kann fremde kicken).

---

## 16 · Modul 13 — Compliance-Layer

🟢 **Status: Live (das ist eigentlich die Kern-Differenzierung zu Konkurrenz)**

### § 407a ZPO — Anzeigepflicht
Wenn ein SV als gerichtlich beauftragt arbeitet, muss er **fachliche Entscheidungen persönlich** treffen. KI darf nicht entscheiden. PROVA garantiert das durch:
- Mindest-Eigenleistung im Fachurteil (500 Zeichen reine SV-Eingabe)
- Drei-Stufen-System für KI-Inhalte (Vorschlag / Übernommen / Bearbeitet)
- Pflicht-§-407a-Anzeige im Gutachten-PDF
- Audit-Trail jeder KI-Interaktion

### IHK-Bauplan 2026
- 4-Teile-Struktur strikt eingehalten
- Anti-Austausch-Header ab Seite 2
- Norm-Zitate strukturiert (nicht freie Prosa)
- Pflicht-Hinweise auf KI-Einsatz

### EU AI Act Art. 50
Für jedes KI-generierte oder KI-unterstützte Dokument:
- Offenlegung welche KI eingesetzt wurde
- Welche Aufgabe sie übernommen hat
- Wer die Verantwortung trägt (immer der SV)
- KI-Werkzeug-Beschreibung in **funktionalen Begriffen**, nie Modellnamen ("GPT-4o", "Claude" werden nicht erwähnt)

### DSGVO + AVV
- Alle Daten in **Frankfurt EU-Region** (Supabase)
- Auftragsverarbeitungsvertrag (AVV) verfügbar
- Pseudonymisierung vor KI-Calls
- Recht auf Löschung, Auskunft, Berichtigung (Selbstbedienung im User-Profil)
- DSGVO-Aufbewahrungsfristen konfigurierbar pro Workspace
- Audit-Trail ist DSGVO-Art.-30-konform

### Verbandskonformität
- BVS (Bundesverband ö.b.u.v. SVs) Richtlinien
- BVS-konforme Honorarrechnung
- JVEG-Standard-Stundensätze für Gerichtsgutachten
- Anti-Geldwäsche-Hinweise wo nötig

---

## 17 · Modul 14 — Founder-Cockpit

🔵 **Status: Geplant für nach Stable-Run (admin.prova-systems.de)**

Eine **separate Admin-Domain** nur für den Founder (Marcel). Soll dort sein:

- **Live-KPIs**: MRR, aktive User, neue Trials, Trial-Paid-Conversion, Churn-Rate, Churn-Gründe
- **User-Management**: Liste aller User, Login-as-User (für Support), Tier ändern, Account suspendieren
- **Usage Analytics**: Aufträge pro User, Feature-Heatmap, Drop-off-Funnel, Gutachten-Time-Tracking
- **System Health**: Netlify-Functions-Status, PDFMonkey-Queue, OpenAI-Token-Verbrauch pro User, Supabase-Quota
- **Support Inbox**: alle User-Tickets, Bug-Reports, Feature-Requests an einem Ort
- **Audit Trail Live-Stream**: filterbar pro User, Push-Alerts bei kritischen Events
- **Live Sessions**: wer ist gerade online, welche Page wird gerade benutzt
- **Billing Sync**: Stripe-Status, Zahlungsausfälle, Add-on-Aktivierungen
- **Error Stream**: Console-Errors aller User (anonymisiert)

**Sicherheit**: Marcel = Super-Admin mit Pflicht-2FA. Optionale IP-Whitelist.

---

## 18 · Architektur in 30 Sekunden

```
┌─────────────────────────────────────────────────────────┐
│                       Frontend                          │
│       Vanilla JS, kein Framework, PWA                   │
│       Hosting: Netlify                                  │
│       Domains: prova-systems.de (Landing)               │
│                app.prova-systems.de (App)               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│   Supabase      │      │ Netlify Functions │
│   (Frankfurt)   │      │ (Serverless)     │
│                 │      │                  │
│ • Auth          │      │ • PDF-Generation │
│ • Postgres DB   │      │ • Email-Versand  │
│ • Storage       │      │ • Make.com-Hooks │
│ • RLS           │      │ • Whisper-Proxy  │
│ • Edge Funcs    │      │ • Stripe-Hooks   │
└─────────────────┘      └──────────────────┘
        │                         │
        └────────────┬────────────┘
                     ▼
        ┌────────────────────────┐
        │     Externe Services   │
        │ • PDFMonkey (PDFs)     │
        │ • OpenAI (KI-Werkzeuge)│
        │ • Stripe (Payments)    │
        │ • Make.com (Workflows) │
        │ • Cal.com (Termine)    │
        └────────────────────────┘
```

### Daten-Architektur
**Hauptobjekte in der Datenbank:**

- `workspaces` (Mandanten — Solo-SV oder Team-Büro)
- `users` (Personen, gehören zu Workspaces über Membership-Tabelle)
- `auftraege` (zentrale Auftragsobjekte mit Phasen, Status, jsonb-Details)
- `kontakte` (CRM-Schicht)
- `eintraege` (Diktate, Texte, Fotos, Skizzen — chronologisch pro Auftrag)
- `fotos` (Mediendatei-Referenzen mit Storage-Path)
- `dokumente` (alle generierten PDFs: Gutachten, Rechnungen, Briefe, Bescheinigungen)
- `termine` + `fristen` (Kalender und Stichtage)
- `textbausteine` + `normen_bibliothek` (Bibliotheken)
- `audit_trail` (Compliance-Log über alles)
- `einwilligungen` (DSGVO-Einwilligungen versioniert)
- `support_tickets` (User-Anfragen)
- `ki_lernpool` (anonymisierte Spezialfall-Beispiele)

### Sicherheit
- **Row Level Security (RLS)** auf allen Tabellen — User sieht nur, was zu seinem Workspace gehört
- **Service-Role-Pattern** für Server-Side-Operationen (Edge Functions)
- **2FA optional** (TOTP), für Founder Pflicht
- **JWT-basierte Auth** mit Auto-Refresh

---

## 19 · Roadmap & Status

### Phase A — Sicherheit (Sprint 1-5) ✅ Abgeschlossen
DSGVO-Grundbau, Auth-Schicht, Trial-Guard, Layout-Vereinheitlichung

### Phase B — Produkt-Core (Sprint 6-12) 🟡 Aktuell
- Globale Suche 360-Grad-Ausbau
- Skizze-Funktion fertig
- Bibliothek-Suchen
- Flow-C/D-Pages
- Mobile-Optimierung

### Phase C — Migration + Ops 🟡 Aktuell (MEGA75 + MEGA76 abgeschlossen)
- **Airtable → Supabase Migration abgeschlossen am 15.05.2026** (MEGA76)
- 0 Frontend-Caller verbleiben
- Pilot-Onboarding-Setup
- Support-Setup

### Phase D — Compliance (Sprint 16-17) 🔵 Geplant
- Finales IHK-Audit
- Pre-Pilot-Audit
- DSGVO-Final-Check

### Phase E — Admin + Split + Pre-Audit (Sprint 18-20) 🔵 Geplant
- AUTH-PERFEKT 2.0 (Auth-Rebuild ohne Netlify Identity)
- AUTH-COCKPIT (Founder-Dashboard)
- APP-LANDING-SPLIT (✅ schon live seit 30.04.2026)

### Endzustand "PROVA fertig"
Wenn alles läuft:

```
SV loggt sich morgens ein:
  → Cockpit zeigt 3 Aufträge offen, 2 Termine heute,
    1 Rechnung überfällig (rot), KPI-Cards Umsatz/Aufträge

SV klickt "Neuer Auftrag" → Schadensgutachten:
  → Wizard mit 5-Step-Stepper
  → Phase 1: Stammdaten via Kontakt-Auto-Complete
  → Phase 2: Auftrag-Details
  → Phase 3: Diktat (Web oder Mobile vor Ort)
  → Phase 4: §6 Fachurteil (SV-eigenhändig + Bausteine + Normen)
  → Phase 5: Export → PDF + Versand

SV beim Termin auf dem Handy:
  → Login auf Handy
  → "Aufträge" → richtigen Auftrag öffnen
  → Diktat-Button → spricht 5 Min
  → Foto-Upload → 8 Bilder + Beschriftung
  → Speichern → Cloud-Sync

SV zurück im Büro:
  → PDF generieren (1 Klick)
  → Per E-Mail an Auftraggeber
  → Rechnung erstellen (Auto aus Auftrag)
  → ZUGFeRD-PDF → Stripe-Zahlungslink mitgeschickt
  → Auftraggeber zahlt online
  → Geld auf Konto innerhalb 3 Tagen

Im Hintergrund läuft:
  → Make.com Lifecycle-Workflows (Onboarding-Email,
    Trial-Reminder, Bonus-Add-on-Aktivierung)
  → Audit-Trail loggt jede Aktion
  → KI-LERNPOOL wächst mit "Andere Ursache"-Beispielen
  → Mahnwesen-Cron prüft täglich überfällige Rechnungen
  → Founder-Cockpit zeigt MRR live
```

---

## 20 · Was PROVA bewusst nicht ist

| Was wir nicht bauen | Warum |
|---|---|
| ❌ Native iOS / Android Apps | PWA + Responsive Web reicht für die Zielgruppe |
| ❌ Anwalts-Funktionen (Mandantenakte, Schriftsätze) | Anderer Berufsstand, nicht unsere Zielgruppe |
| ❌ Vollständige Buchhaltung | Wir machen Rechnungs-Export für Steuerberater, mehr nicht |
| ❌ Live-Chats mit anderen SVs | Kein Social-Network |
| ❌ Marketing-Tools (Funnel, Newsletter) | SVs sind keine Marketer |
| ❌ White-Label-Versionen | PROVA ist PROVA, nicht 100 weiße Klone |
| ❌ Drittanbieter-API (im ersten Jahr) | Fokus auf Produkt-Kern |
| ❌ Übersetzungen | Deutschland-only |
| ❌ Free-Tier | Profi-Tool = Profi-Preis. Trial-Phase ja, kostenfrei nein |
| ❌ KI-Autopilot | Verstößt gegen § 407a ZPO. SV-Verantwortung muss bleiben |

---

## Anhang — Konkurrenzdifferenzierung

| Konkurrent | Was sie haben | Was uns unterscheidet |
|---|---|---|
| **Word + Excel** (95% der SVs heute) | Vertrautheit, kostenlos | Keine Compliance-Garantie, kein KI-Support, kein Mahnwesen, keine Cloud, kein Mobile |
| **Heimsoeth / Thurau Software** | Etabliert seit 20 Jahren | Alt, teuer, kein KI, kein Mobile, kein Cross-Device |
| **AnNoText** | Anwalts-Software bekannt | Nicht SV-spezifisch, keine § 407a-Pflicht-Features |
| **Generische CRM-Tools** (Salesforce, Pipedrive) | Flexibel | Keine SV-Compliance, keine IHK-Templates, keine Gutachten-Logik |

**PROVA-USPs**:
1. § 407a ZPO konform by design (nicht Add-on)
2. KI ohne Halluzinationen (Konjunktiv-II-Pflicht, Faktentreue)
3. Cross-Device (PC + Tablet + Handy nahtlos)
4. IHK-konforme Templates (Bauplan 2026)
5. EU AI Act Art. 50 vorinstalliert
6. Solo-Tier möglich (179 € / Monat ist für einen Profi-SV erschwinglich)
7. All-in-One (Auftrag + Diktat + KI + PDF + Rechnung + Mahnung + Audit-Trail)
8. Moderne UX (kein Word-Zustand der 90er)

---

## Schlusswort

PROVA ist kein Produkt das in einem Monat fertig wird. Es ist die **systematische Digitalisierung eines Berufs**, der jahrzehntelang mit Word, Excel und USB-Sticks gearbeitet hat — und für den es bisher keine echte Profi-Software gab. Jeder Sprint, jeder Marathon, jede Schema-Migration bringt uns näher an den Zustand, in dem ein SV morgens den Browser aufmacht und sagt: "Endlich. Genau so wie ich's brauche."

Was wir uns wochenlang erarbeitet haben — die Vision, die Architektur, die 4 Flows, die Compliance-Schicht, die KI-Werkzeuge, die Bibliotheken, die Cross-Device-Strategie, die Mahnwesen-Automation, die Founder-Cockpit-Ideen — das alles ist hier dokumentiert. Es ist viel. Aber es ist auch alles **nötig**, weil ein professionelles SV-Tool nicht mit einem halben Auftrag-Wizard auskommt.

**Die kommenden Tage:**
1. Marcel-Smoke-Test der MEGA76-Migration
2. Squash-Merge in main, Stable-Run-Beobachtung
3. Marcel räumt Airtable manuell ab (ENVs, Base archivieren, Make.com)
4. Nächster Marathon: Skizze + Global-Search-360-Ausbau + Flow C/D
5. Wenn alles läuft und Bildmaterial bereitsteht → Präsentation auf Basis dieses Dokuments

**Ziel bleibt:** Die führende SaaS für Bauschaden-Sachverständige in Deutschland.

---

*Dokument generiert 15. Mai 2026 · Web-Claude + Marcel Schreiber · Stand-Aktualisierung bei jedem Sprint-Abschluss*
