# SPRINT 12 — B7 Ausgangs-Dokumente: Rechnungen + Angebote + Bescheinigungen

**Tag:** 13  |  **Aufwand:** 10-12h  |  **Phase:** B Produkt-Kern

---

## Ziel
Alles was nach dem Gutachten rausgeht wird ein-Klick-fähig: Rechnung/Angebot automatisch nach Freigabe, Bescheinigungen als eigenständiger Workflow für kürzere Dokumente (Zustandsbescheinigung, Unbedenklichkeits-, Mängel-, Abnahmebescheinigung).

Bescheinigungen sind nach §36 GewO + Sachverständigenordnungen gesetzlich anerkannte SV-Kerntätigkeit. PROVA deckt sie vollständig ab.

---

## Sprint-Start-Ritual
1. **Code-Check:** `rechnungen-logic.js`, `schnelle-rechnung.html`, `bescheinigungen.html`, BRIEF-MASTER-Template
2. **Datenfluss:** Was existiert an RECHNUNGEN, ANGEBOTEN, BRIEFEN heute?
3. **Scope-Fix:** Rechnungen + Angebote + Bescheinigungen. Nicht Kontakte-Import (Sprint 5), nicht Mahn-Automatik (kommt mit Sprint 15 Operations).

---

## Scope

### Teil A — Rechnungen + Angebote automatisch (5-6h)

#### 1. Auto-Rechnungs-Generierung nach Freigabe
Nach Gutachten-Freigabe (Phase 5 in Flow A): Button **"💶 Rechnung erstellen"** erscheint in Akte.

**Workflow:**
```
Klick auf "Rechnung erstellen"
        ↓
Vorschlags-Rechnung wird generiert aus:
  - Fall-Stammdaten (Auftraggeber, Adresse, AZ)
  - SV-Einstellungen (Bankverbindung, St-Nr, Adresse)
  - Positions-Bibliothek (oft genutzte Leistungen)
        ↓
SV sieht Entwurf mit allen Positionen, editierbar:
  - Position hinzufügen/löschen
  - Menge/Preis anpassen
  - Rabatte
        ↓
[ Abschicken → ]
        ↓
Atomare Operation:
  1. PDFMonkey rendert PDF (F-01 JVEG / F-02 / F-03 / F-05)
  2. IONOS-SMTP sendet Mail an Auftraggeber
  3. RECHNUNGEN.create mit Status "versandt"
  4. Auto-Fristen: Zahlungsziel + Mahnstufen als TERMINE
  5. AUDIT_TRAIL-Eintrag
```

#### 2. JVEG-Modus für Gerichtsgutachten
- Automatisch richtiger Stundensatz (aktuell 120€/h JVEG 2025 nach 9%-Erhöhung)
- Zeit-Erfassung: SV trägt Stunden pro Tätigkeit ein (Ortstermin, Schreibauslagen, Fahrten)
- Auslagen: Fahrtkosten, Fotos, Kopien
- Rechnungs-Template F-01 JVEG

#### 3. Pauschalrechnung (Privat/Beratung)
- Freies Honorar mit USt ausweisbar
- Rechnungs-Template F-02/F-03

#### 4. Angebots-Workflow
Analog zu Rechnung, Unterschiede:
- Status "Angebot"
- Gültigkeit (Standard 30 Tage)
- Annahme-Link in E-Mail
- Bei Annahme: auto-Konversion zu Auftrag (neuer Fall in SCHADENSFAELLE)
- Kopie des Angebots wird archiviert

#### 5. Zahlungsstatus-Verfolgung
- Offen → Bezahlt (manuell markiert oder via Stripe wenn genutzt)
- Teilzahlung unterstützt

#### 6. Mahnwesen (3-stufig)
- Auto-Trigger nach 14/30/45 Tagen
- Briefvorlagen existieren (BRIEF-MASTER-v1.0 Mahnungsstufen 1/2/3 blau/orange/rot)
- Vor Versand: Bestätigungsmodal an SV

#### 7. ZUGFeRD-Validierung
- Templates haben bereits ZUGFeRD-XML-Anteil
- Validieren dass XML korrekt (Python-Script in Tests)

---

### Teil B — Bescheinigungen (5-6h)

#### 1. bescheinigungen.html neu als Selector

**Rechtliche Grundlage:** Bescheinigungen sind explizit als SV-Leistung genannt (§36 GewO, Sachverständigenordnungen).

```
┌─── Bescheinigung erstellen ──────────────────────┐
│                                                    │
│  Welche Art?                                       │
│                                                    │
│  ○ Zustandsbescheinigung (vor Baubeginn)          │
│      Formelles Dokument mit Fotodokumentation      │
│      → eigenes PDFMonkey-Template F-21             │
│                                                    │
│  ○ Unbedenklichkeitsbescheinigung                  │
│      "Keine Beanstandungen festgestellt"           │
│      → kurz: Briefvorlage | formell: Template F-23 │
│                                                    │
│  ○ Mängelbescheinigung                             │
│      Liste dokumentierter Mängel                   │
│      → Briefvorlage erweiterbar zu Gutachten-nahem │
│                                                    │
│  ○ Abnahmebescheinigung                            │
│      Nach Bauabnahme mit Mängelfreiheit            │
│      → eigenes PDFMonkey-Template F-22             │
│                                                    │
│  ○ Schadensbescheinigung für Versicherung          │
│      Kompakt mit Schadensnummer                    │
│      → Briefvorlage                                 │
│                                                    │
│  ○ Fertigstellungsbescheinigung                    │
│      → Briefvorlage                                 │
│                                                    │
│  ○ Andere (freie Briefvorlage)                     │
│      Volle Kontrolle über Inhalt                   │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Routing nach Auswahl:**
- Kurzformen → öffnet Brief-Editor mit passender Vorlage
- Formelle Langformen (F-21/22/23) → öffnet eigenen Editor mit PDFMonkey-Integration

#### 2. Neue PDFMonkey-Templates

**F-21 Zustandsbescheinigung (Beweissicherung vor Baubeginn)**
- Design-System v1.0 verpflichtend
- Deckblatt mit AZ, Auftraggeber, Objekt
- Abschnitt 1: Auftrag & Rahmen
- Abschnitt 2: Ortsbesichtigung (Datum, Teilnehmer)
- Abschnitt 3: Zustandsaufnahme pro Raum (mit Fotos)
- Abschnitt 4: Zusammenfassung
- Anhang: Fotodokumentation (1 Foto/Seite, wie FOTODOKU-MASTER)
- §-Zitate: DIN 4123 (Beweissicherung), BGB
- Umfang: 10-30 Seiten je nach Objektgröße

**F-22 Abnahmebescheinigung**
- Design-System v1.0
- Deckblatt
- Abschnitt 1: Auftrag
- Abschnitt 2: Abnahmetermin (Datum, Teilnehmer, Gewerk)
- Abschnitt 3: Mängelliste (tabellarisch: lfd.Nr, Beschreibung, Beurteilung, Frist)
- Abschnitt 4: Abnahme-Erklärung (mit/ohne Vorbehalt)
- Unterschriften-Block (SV, Auftraggeber, Auftragnehmer)
- Umfang: 3-8 Seiten

**F-23 Unbedenklichkeitsbescheinigung (formell)**
- Design-System v1.0
- 1-2 Seiten
- Deckblatt-Kombination
- Auftrag + Prüfumfang
- Feststellung: "Es wurden keine Beanstandungen festgestellt"
- KI-Box nur wenn KI bei Prüfung genutzt wurde
- SV-Siegel/Stempel

#### 3. Neue Briefvorlagen (in BRIEF-MASTER-v1.0)

- BV-01 Unbedenklichkeitsbescheinigung kurz (1 Seite)
- BV-02 Schadensbescheinigung (1-2 Seiten, mit Schadensnr)
- BV-03 Fertigstellungsbescheinigung (1-2 Seiten)

#### 4. Bescheinigungen-Workflow

**Analog zum Briefe-Workflow:**
1. SV wählt Bescheinigungs-Typ
2. Fall auswählen (oder standalone)
3. Variablen werden automatisch befüllt
4. SV kann editieren
5. [Vorschau anzeigen]
6. [PDF erstellen und versenden] oder [Nur speichern]
7. Archiv in BRIEFE-Tabelle oder eigene BESCHEINIGUNGEN-Tabelle

**Für F-21/22/23:** Eigene BESCHEINIGUNGEN-Tabelle (neu):
- bescheinigungs_nr (Formel: BEG-YYYY-NNN)
- fall_link
- typ (F-21/22/23)
- status (entwurf/versandt/archiviert)
- pdf_attachment
- erstellt_am
- sv_email

#### 5. Honorar-Modell für Bescheinigungen
- Meist Pauschal
- Voreinstellungen in SV-Config: Pauschalen pro Bescheinigungs-Typ
- Rechnungs-Auto-Generierung nach Versand der Bescheinigung

---

## Prompt für Claude Code

```
PROVA Sprint 12 — B7 Rechnungen + Angebote + Bescheinigungen (Tag 13)

Pflicht-Lektuere: CLAUDE.md, rechnungen-logic.js, schnelle-rechnung.html,
bescheinigungen.html, RECHNUNG-MASTER-v1.1, BRIEF-MASTER-v1.0, FOTODOKU-MASTER-v1.0,
Masterplan-v2 02_WORKFLOWS.md

KONTEXT
=======
Rechnungen + Angebote ein-Klick nach Freigabe.
Bescheinigungen als eigener Workflow: gesetzlich anerkannte SV-Leistung
nach §36 GewO (Zustands-, Unbedenklichkeits-, Mängel-, Abnahme-, Fertigstellungs-,
Schadensbescheinigung).

SCOPE
=====

## Teil A — Rechnungen (5-6h)

Commit 1: Auto-Rechnungs-Button in akte.html nach Freigabe
- Erscheint nur wenn status='freigegeben' oder 'exportiert'
- Klick oeffnet Rechnungs-Editor mit vorbefuellten Daten

Commit 2: Rechnungs-Editor
- Positions-Bibliothek integriert (aus Sprint 8)
- Editable Tabelle: Position, Menge, Einzelpreis, Gesamt
- JVEG-Modus bei Gerichtsgutachten (Stundensatz 120€, siehe BVS-Erhoehung 2025)
- Pauschalrechnung bei Privat/Beratung
- ZUGFeRD-XML automatisch generiert

Commit 3: rechnung-erstellen.js (wenn noch nicht da aus Sprint 14)
- Atomare Operation: PDF + Mail + Airtable + Fristen + Audit
- Bei Fehler in einem Schritt: Rollback

Commit 4: Zahlungsstatus-Verfolgung
- Offen → Bezahlt (manuell oder via Stripe-Webhook)
- Dashboard-Widget "Offene Rechnungen" mit Summe

Commit 5: Mahnwesen 3-stufig
- Auto-Trigger 14/30/45 Tage
- Vor Versand: Modal an SV
- Briefvorlagen Mahnung 1/2/3 (existieren in BRIEF-MASTER)

Commit 6: Angebots-Workflow
- Status "Angebot" mit gueltig_bis
- Annahme-Link in Email (eigene Netlify-Function angebot-annehmen.js)
- Bei Annahme: auto-Fall-Anlage

## Teil B — Bescheinigungen (5-6h)

Commit 7: bescheinigungen.html neu als Selector
- 7 Bescheinigungs-Arten als Radio-Auswahl
- Routing: Briefvorlage oder eigener Editor

Commit 8: 3 neue PDFMonkey-Templates (Design-System v1.0!)
- F-21 ZUSTANDSBESCHEINIGUNG mit Foto-Anhang
- F-22 ABNAHMEBESCHEINIGUNG mit Maengelliste
- F-23 UNBEDENKLICHKEITSBESCHEINIGUNG formell
- Test-JSON fuer jedes Template

Commit 9: 3 neue Briefvorlagen in BRIEF-MASTER-v1.0
- BV-01 Unbedenklichkeit kurz
- BV-02 Schadensbescheinigung
- BV-03 Fertigstellungsbescheinigung

Commit 10: BESCHEINIGUNGEN-Tabelle (Airtable Meta API)
- bescheinigungs_nr (Formel BEG-YYYY-NNN)
- fall_link, typ, status, pdf_attachment, erstellt_am, sv_email

Commit 11: bescheinigung-erstellen.js Netlify Function
- Analog zu brief-pdf-senden.js
- Template-Auswahl, Daten einsetzen, PDF, optional Mail

Commit 12: Honorar-Auto fuer Bescheinigungen
- In SV-Einstellungen: Pauschalen pro Bescheinigungs-Typ
- Nach Bescheinigungs-Versand: Rechnungs-Vorschlag mit Pauschale

Commit 13: Tests + sw.js bump

QUALITAET
=========
- Rechnungen: §14 UStG Leistungszeitraum Pflicht
- Bescheinigungen F-21/22/23: Design-System v1.0 Einhaltung
- Alle PDF-Generierungen via PDFMonkey (nicht pypdf)
- Mahn-Trigger idempotent

TAG: v180-ausgangs-docs-done
```

---

## Acceptance
1. SV gibt Gutachten frei → "Rechnung erstellen"-Button erscheint
2. Klick öffnet Rechnungs-Editor mit vorbefüllten Daten
3. Rechnung wird generiert, versandt, in Airtable gespeichert
4. Bei 14 Tagen Überfälligkeit: Modal "Mahnung 1 senden?"
5. Angebot erstellen → Annahme-Link → bei Klick auto-Fall
6. Bescheinigungen-Selector mit 7 Arten funktioniert
7. F-21 Zustandsbescheinigung generiert korrekt mit Foto-Anhang
8. F-22 Abnahmebescheinigung mit Mängelliste
9. F-23 Unbedenklichkeitsbescheinigung formell
10. BESCHEINIGUNGEN-Tabelle wird gefüllt
11. Design-System v1.0 in allen neuen Templates eingehalten

## Rollback
`git reset --hard v180-workflow-fristen-done`

---

## Abhängigkeiten
- Sprint 8 (Bibliothek) für Positions-Bibliothek
- Sprint 11 (Fristen) für Zahlungsziel-/Mahn-Fristen
- BRIEF-MASTER-v1.0, FOTODOKU-MASTER-v1.0 müssen aktuell sein
