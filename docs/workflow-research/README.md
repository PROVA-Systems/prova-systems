# PROVA Workflow-Research

**Zweck:** Recherche-fundierte Pflichtfeld-Matrix pro Auftrags-Typ als 
Vorbereitung für Conditional Forms im Frontend.

**Methodik:** Mindestens 10 fundierte Quellen pro Aussage. Primär 
IHK-Sachverständigenordnungen, IfS-Leitsätze, Gesetzestexte (ZPO, BGB, 
JVEG), Verbände (BVS, AIBau), Gerichtsurteile.

**Pilot:** 01-SCHADENSGUTACHTEN als Methodik-Beispiel. Andere Auftrags-
Typen folgen nach gleichem Muster.

## Struktur pro Auftrags-Typ

```
NN-AUFTRAGSTYP/
├── METHODIK.md            Wie recherchiert wurde
├── PFLICHTFELDER.md       Pflicht vs Optional je Konstellation
├── CONDITIONAL-MATRIX.md  Wenn-Dann-Logik
├── QUELLEN.md             Alle Recherche-Belege mit URLs
└── PHASEN-FELDER.json     Maschinenlesbar für Conditional-Forms-Frontend
```

## Verbindliche Regeln

1. Keine Aussage ohne Quelle
2. Bei Widersprüchen: Quellen vergleichen + abwägen + dokumentieren
3. "Sollte" vs "Muss" muss klar getrennt sein (rechtliche Pflicht 
   vs Empfehlung)
4. Bei Updates: alte Versionen archivieren

## Architektur-Prinzipien (Marcel-Direktive nach K-UI/X2-Korr)

**Stammdaten ≠ Vorgangsdaten.** Diese Trennung ist fundamental und gilt für
alle Auftrags-Typen, nicht nur Schadensgutachten.

### Beispiel — Allianz Versicherung AG

Die Allianz Versicherung AG ist **EIN Eintrag** im Adressbuch (kontakte-Tabelle).
Sie kommt aber für **viele Aufträge** als Auftraggeber vor — und jeder Auftrag
hat eine **andere Schadennummer**.

```
kontakte:
  ┌──────────────────────────────────┐
  │ id: kont-allianz                 │
  │ typ: versicherung                │
  │ firma: "Allianz Versicherung AG" │
  │ adresse_strasse, plz, ort, ...   │  ← Stammdaten, ändern sich selten
  └────┬─────────────────────────────┘
       │ FK: auftraggeber_kontakt_id
       │
  auftraege:
  ┌──────────────────────────────────┐    ┌──────────────────────────────────┐
  │ az: SCH-2026-001                 │    │ az: SCH-2026-047                 │
  │ schadennummer: HUK-12345         │    │ schadennummer: HUK-99887         │
  │ versicherungsnummer: VS-2024-A1  │    │ versicherungsnummer: VS-2025-B7  │
  └──────────────────────────────────┘    └──────────────────────────────────┘
            ↑ Vorgangsdaten in details JSONB — pro Auftrag anders
```

### Konsequenzen für Conditional Forms

- **Phase 1A — Auftraggeber-Picker:** Wizard zeigt entweder Kontakt-Picker
  (existing kontakte-Eintrag) oder "Neuer Kontakt" mit reinen Stammdaten-Feldern.
  KEINE Schadennummer/Aktenzeichen/Frist-Felder hier.
- **Phase 1B — Vorgangsdaten:** typ-spezifisch. Bei Versicherung-Auftrag erscheinen
  schadennummer + versicherungsnummer Pflicht. Bei Gerichts-Auftrag: gericht_az +
  beweisbeschluss_datum + beweisfragen + frist_gutachten.
- **kontakte-Tabelle bleibt schlank:** keine vorgangsspezifischen Spalten in
  kontakte. Schon vor X2-Korrektur in Frontend implementiert (kontakte-supabase.html
  zeigt seit X2-Korr nur Stammdaten + dynamisches firma-Label "Kanzlei" bei Anwalt).

### Quellen für diese Trennung

- IHK-SVO §9 Abs 3 — Vollständigkeitsgebot pro Gutachten (jeder Auftrag eigene
  Identität)
- §407a Abs 1 ZPO — Gericht setzt **pro Verfahren** Frist + Beweisfragen
- DSGVO Art 5 Abs 1 lit c — Datenminimierung (Vorgangsdaten nur am Vorgang)
- Marcel-Beobachtung 30.04.: Allianz hat 47 Aufträge mit 47 Schadennummern,
  Schema-Mismatch wäre 47x dieselbe Adresse
