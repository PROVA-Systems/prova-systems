# PFLICHTFELDER — Schadensgutachten

**Konstellationen:** 5 Auftraggeber-Typen × 6 Schadensarten = 30 Varianten

> **🔄 Korrektur v1.1 (Marcel-Direktive nach K-UI/X2-Korr, 30.04.2026):**
> Pflichtfelder sind in **Stammdaten** (im Adressbuch / kontakte-Tabelle)
> und **Vorgangsdaten** (am Auftrag / auftraege-Tabelle) zu trennen.
> Stammdaten werden EINMAL pro Auftraggeber erfasst und für alle weiteren
> Aufträge wiederverwendet. Vorgangsdaten werden PRO Auftrag neu erfasst.
>
> Beispiel: Allianz Versicherung AG hat 1 Stammdaten-Eintrag, aber 47
> Aufträge mit 47 Schadennummern.
>
> Die Tabellen unten ordnen jedes Pflichtfeld einer Klasse zu (Spalte
> "Klasse"): **STAMM** (im kontakte-Adressbuch) oder **VORGANG** (am
> auftraege-Eintrag) oder **GUTACHTEN** (Inhalt des PDF-Outputs, kein
> DB-Field).

## TEIL 0 — KLASSIFIKATION

| Klasse | Wo gespeichert | Wann erfasst | Beispiele |
|---|---|---|---|
| STAMM | `kontakte`-Tabelle | Einmalig beim Anlegen des Kontakts | Name, Firma, Adresse, Email |
| VORGANG | `auftraege`-Tabelle (Spalten + details JSONB) | Pro Auftrag im Wizard | Schadennummer, Az, Frist, Beweisfragen |
| BETEILIGTE | `auftrag_kontakte` M:N (FK auf kontakte mit rolle ENUM) | Pro Auftrag — wer ist beteiligt | Geschädigter, Klägeranwalt, Bauunternehmen |
| OBJEKT | `auftraege.objekt` JSONB | Pro Auftrag | Objektadresse, Typ, Baujahr |
| BEFUND | `auftraege.details` JSONB + fotos-Tabelle | Phase 3 Ortstermin | Messwerte, Fotos, Schadensbeschreibung |
| GUTACHTEN | Im PDF (kein DB-Feld) | Bei Generierung | §6 Fachurteil, KI-Hilfen |

## TEIL 1 — UNIVERSELLE PFLICHTFELDER (alle Konstellationen)

Quelle: § 407a ZPO + § 9 SVO IHK + IHK Köln-Empfehlung + IfS-Leitsätze

### 1.1 Auftragsbegleitende Angaben
| Feld | Pflicht | Quelle |
|---|---|---|
| Aktenzeichen SV | MUSS | IHK Köln Empfehlung |
| Auftraggeber-Name | MUSS | IHK Köln |
| Auftragserteilungs-Datum | MUSS | IfS-Leitsätze |
| Art der Auftragserteilung | MUSS | IfS-Leitsätze (telefonisch/schriftlich/E-Mail) |
| Aufgabenstellung (Beweisfragen) | MUSS | § 407a Abs 1 ZPO |

### 1.2 SV-Identifikation
| Feld | Pflicht | Quelle |
|---|---|---|
| SV-Name | MUSS | § 407a Abs 3 ZPO (persönliche Erstattung) |
| SV-Anschrift | MUSS | IHK Köln |
| Bestellungsstelle (IHK/HWK/etc.) | MUSS bei ö.b.u.v. | § 36 GewO |
| Sachgebiet der Bestellung | MUSS bei ö.b.u.v. | IHK SVO |

### 1.3 Objekt-Daten
| Feld | Pflicht | Quelle |
|---|---|---|
| Objekt-Adresse | MUSS | IHK Köln |
| Objekt-Bezeichnung | MUSS | IfS-Leitsätze |
| Eigentümer | SOLLTE | IfS-Leitsätze |
| Baujahr (sofern bekannt) | OPTIONAL | sachgebiet-abhängig |

### 1.4 Ortsbesichtigung
| Feld | Pflicht | Quelle |
|---|---|---|
| Besichtigungs-Datum | MUSS | IfS-Leitsätze |
| Besichtigungs-Uhrzeit | MUSS | IfS-Leitsätze |
| Anwesende Personen | MUSS | IfS-Leitsätze |
| Wetter-Bedingungen | SOLLTE bei Außenschäden | Bleutge "Ortsbesichtigung" |
| Verwendete Hilfsmittel | MUSS | IfS-Leitsätze |

### 1.5 Befund + Bewertung
| Feld | Pflicht | Quelle |
|---|---|---|
| Schadensbeschreibung | MUSS | § 407a + IHK Köln |
| Schadens-Fotos | MUSS | IfS-Leitsätze |
| Anknüpfungstatsachen | MUSS | IHK Köln |
| Schadens-Ursachen | MUSS | Beweisfragen-abhängig |
| Bewertungs-Methodik | MUSS | IfS-Leitsätze (Plausibilität) |
| Mehrere Lösungsmöglichkeiten + Wahrscheinlichkeit | MUSS bei Mehrdeutigkeit | Nr. 9.3.7 IHK Köln |

### 1.6 Pflichthinweise (unabhängig von Auftraggeber)
| Feld | Pflicht | Quelle |
|---|---|---|
| §407a-Box (bei Gericht) | MUSS bei Gericht | § 407a Abs 6 ZPO |
| Hilfskräfte-Erwähnung (sofern vorhanden) | MUSS | § 407a Abs 3 ZPO |
| Unterschrift SV | MUSS | IHK Köln + § 411 ZPO |
| Datum der Unterschrift | MUSS | IHK Köln |
| KI-Offenlegung (EU AI Act) | MUSS bei KI-Nutzung | EU AI Act Art. 50 |

---

## TEIL 2 — AUFTRAGGEBER-SPEZIFISCHE PFLICHTFELDER

### 2.1 Auftraggeber: PRIVATPERSON

| Feld | Pflicht | Begründung |
|---|---|---|
| Anrede + Vorname + Nachname | MUSS | natürliche Person |
| Anschrift Auftraggeber | MUSS | Werkvertrag § 631 BGB |
| Telefon | SOLLTE | Erreichbarkeit |
| E-Mail | SOLLTE | Erreichbarkeit |
| ~~Schadennummer~~ | NICHT | Privatperson hat kein Vorgangsnummer-System |
| ~~Versicherungsnummer~~ | NICHT | Privatperson hat keine |
| ~~Aktenzeichen Auftraggeber~~ | NICHT | Privatperson |
| ~~Firma~~ | NICHT | natürliche Person |

**WICHTIG:** Bei Privatperson muss das Frontend KEINE doppelte Eingabe 
(Ansprechpartner + Name/Firma) verlangen — es ist eine Person.

### 2.2 Auftraggeber: VERSICHERUNG

| Feld | Pflicht | Begründung |
|---|---|---|
| Firma (Versicherer-Name) | MUSS | juristische Person |
| Anschrift Versicherer | MUSS | Korrespondenz |
| Ansprechpartner (Sachbearbeiter) | MUSS | Versicherer-Praxis |
| Abteilung | SOLLTE | groß-Versicherer-intern |
| **Schadennummer** | MUSS | Versicherer-Standard, ohne keine Regulierung |
| Versicherungsscheinnummer | MUSS | identifiziert Versicherungsvertrag |
| Versicherungsnehmer (separater Kontakt) | MUSS | i.d.R. ≠ Versicherer |
| Anschrift Versicherungsnehmer | MUSS | für Vor-Ort-Termin |
| Schadens-Datum | MUSS | Versicherungs-Pflichtangabe |
| Schadens-Ort | MUSS | i.d.R. = Anschrift VN |
| ~~Aktenzeichen Anwalt~~ | NICHT (außer wenn Anwalt vermittelt) | |
| ~~Behörden-AZ~~ | NICHT | |

**Besonderheit Versicherer:** Die Beziehungs-Struktur ist:
```
Versicherer (Auftraggeber)
  ↓ vermittelt SV-Auftrag
Versicherungsnehmer (= Schadens-Geschädigter)
  ↓ wohnt im
Schadens-Objekt
```

→ Frontend muss 2 Kontakte erfassen: VR + VN

### 2.3 Auftraggeber: ANWALT/KANZLEI

| Feld | Pflicht | Begründung |
|---|---|---|
| Kanzlei-Name | MUSS | juristische Praxis |
| Anschrift Kanzlei | MUSS | Korrespondenz |
| Vor-/Nachname Anwalt | MUSS | persönlicher Ansprechpartner |
| Telefon | MUSS | RA-Praxis |
| E-Mail | MUSS | beA-Korrespondenz erweiterbar |
| **Aktenzeichen Anwalt** | MUSS | RA-Aktenzeichen-System |
| Mandant (separater Kontakt) | MUSS | i.d.R. ≠ Anwalt |
| Ggf. Gegner/Streitobjekt | SOLLTE | Kontext |
| ~~Versicherungsnummer~~ | OPTIONAL | nur wenn Anwalt für VR arbeitet |
| Streitwert | SOLLTE | Honorarrelevanz |

**Besonderheit Anwalt:** Beziehungs-Struktur:
```
Anwalt (Auftraggeber, vertretend)
  ↓ vertritt
Mandant (Geschädigter ODER Bauherr ODER Gegner)
  ↓ ggf. im Streit mit
Gegner-Partei
```

### 2.4 Auftraggeber: GERICHT

| Feld | Pflicht | Begründung |
|---|---|---|
| Gerichts-Name | MUSS | Beweisbeschluss-Identifikation |
| Gerichts-Anschrift | MUSS | Beweisbeschluss-Korrespondenz |
| Spruchkörper | MUSS | "12. Zivilkammer" / "5. Senat" |
| Richter (Vorsitz) | SOLLTE | Korrespondenz |
| **Geschäftszeichen Gericht** | MUSS | Beweisbeschluss-AZ ("12 O 234/26") |
| Beweisbeschluss-Datum | MUSS | rechtl. Auftrags-Datum |
| Beweisfragen (vollständig) | MUSS | § 407a Abs 1 ZPO |
| Verfahrens-Parteien (Kläger + Beklagter) | MUSS | Kontext + Befangenheits-Check |
| Anwälte beider Parteien | MUSS | Korrespondenz vor Ortstermin |
| Sachverständigen-AZ (intern) | MUSS | parallele AZ-Vergabe |
| Frist | MUSS | § 407a Abs 1 ZPO |
| Auslagenvorschuss | SOLLTE | § 407a Abs 4 ZPO |

**Besonderheit Gericht:** Mehr Beziehungs-Komplexität:
```
Gericht (Auftraggeber)
  ↓ Beweisbeschluss in Verfahren
Kläger (Partei 1) ↔ Beklagter (Partei 2)
  ↓ ↓
Anwalt 1   Anwalt 2
  ↓ ↓
Beweisobjekt (z.B. Bauwerk im Streit)
```

→ Frontend muss bei Gericht: Gerichts-Kontakt + 2 Parteien + 2 Anwälte 
+ Objekt erfassen können

### 2.5 Auftraggeber: BEHÖRDE

| Feld | Pflicht | Begründung |
|---|---|---|
| Behörden-Name | MUSS | öffentliche Stelle |
| Anschrift Behörde | MUSS | Korrespondenz |
| Sachbearbeiter | MUSS | Ansprechpartner |
| Abteilung/Referat | MUSS | Behörden-Struktur |
| **Behörden-Aktenzeichen** | MUSS | öffentl. Vorgangs-System |
| Verwaltungsverfahren-Nummer | SOLLTE | wenn vorhanden |
| Rechtsgrundlage des Auftrags | SOLLTE | z.B. § 24 LBO |
| Betroffener Bürger (separater Kontakt) | OFT | öffentl. Verfahren |

---

## TEIL 3 — SCHADENSARTEN-SPEZIFISCHE PFLICHTFELDER

### 3.1 WASSERSCHADEN

| Feld | Pflicht | Quelle |
|---|---|---|
| Schadens-Datum | MUSS | Versicherungs-relevant |
| Schadens-Ursache (Verdacht) | MUSS | Erstbefund |
| Wassereintritts-Stelle | MUSS | Lokalisation |
| Betroffene Räume/Bauteile | MUSS | Schadens-Umfang |
| Feuchte-Messwerte | MUSS | Bauphysikalische Pflicht |
| Mess-Datum + Mess-Hilfsmittel | MUSS | Reproduzierbarkeit |
| Schimmel-Verdacht | SOLLTE | Gesundheitsrelevanz |
| Sanierungs-Vorschläge | SOLLTE | bei Auftrag-Inhalt |
| Trocknungsmaßnahmen-Status | SOLLTE | Schadens-Stand |

### 3.2 BRANDSCHADEN

| Feld | Pflicht | Quelle |
|---|---|---|
| Brand-Datum | MUSS | Versicherungs-relevant |
| Brand-Ursprung (Verdacht) | MUSS | Schaden-Genese |
| Brand-Ursache (Verdacht) | MUSS | i.d.R. außerhalb SV-Kompetenz |
| Brandschutz-Inspektion (durch Feuerwehr) | MUSS dokumentiert | Behörden-Aktenlage |
| Polizei-Aktenzeichen (sofern Brandstiftung) | MUSS sofern vorhanden | Strafverfahren |
| Betroffene Bauteile | MUSS | Schadens-Umfang |
| Konstruktive Schäden (Statik) | MUSS bei Bedarf | Statiker-Hinzuziehung |
| Ruß-Kontamination | MUSS | Sanierungs-Relevanz |
| Sanierungs-Aufwand | SOLLTE | bei Auftrag-Inhalt |

### 3.3 BAUMÄNGEL (BGB §633)

| Feld | Pflicht | Quelle |
|---|---|---|
| Bauvorhaben-Bezeichnung | MUSS | Werkvertrag-Identifikation |
| Bauherr | MUSS | i.d.R. = Auftraggeber/Geschädigter |
| Bauunternehmen | MUSS | Verursacher-Identifikation |
| Vertragsart (BGB / VOB/B) | MUSS | Rechtsgrundlage |
| Mangel-Beschreibung | MUSS | Werkvertrags-Sprache |
| Soll-Beschaffenheit (Vertrag) | MUSS | Vertragsbasis |
| Ist-Beschaffenheit (vor Ort) | MUSS | Befund |
| Verstoß gegen Norm/Regel der Technik | MUSS bei Vorliegen | DIN-Verweise |
| Mängelbeseitigungs-Kosten | SOLLTE | bei Auftrag-Inhalt |
| Wertminderungs-Berechnung | SOLLTE | bei Auftrag-Inhalt |
| Abnahme-Datum | MUSS | Verjährungs-Berechnung |

### 3.4 SCHIMMELSCHADEN

| Feld | Pflicht | Quelle |
|---|---|---|
| Befall-Lokalisation | MUSS | Schadens-Umfang |
| Befall-Fläche (m²) | MUSS | Sanierungs-Aufwand |
| Schimmelpilz-Art (sofern bestimmbar) | SOLLTE | Gesundheits-Relevanz |
| Feuchte-Messwerte | MUSS | Ursache-Bewertung |
| Feuchte-Quelle (Verdacht) | MUSS | Bauphysik vs Nutzung |
| Lüftungs-/Heiz-Verhalten | SOLLTE | Mietrechts-Relevanz |
| Schimmelpilz-Probe (Labor) | OPTIONAL | bei Bedarf |
| Sanierungs-Empfehlung | MUSS bei Auftrag-Inhalt | DIN-konform |
| Gefährdungs-Klasse (BGI 858) | SOLLTE | Sanierer-Auswahl |

### 3.5 ELEMENTAR-/STURMSCHADEN

| Feld | Pflicht | Quelle |
|---|---|---|
| Elementar-Ereignis | MUSS | Versicherungs-Klassifikation |
| Datum + Uhrzeit | MUSS | Wetter-Korrelation |
| Wetter-Daten (DWD-Bestätigung) | SOLLTE | Beweissicherung |
| Schadens-Lokalisation | MUSS | Befund |
| Vorschäden | MUSS | Versicherungs-Abgrenzung |
| Vorzustand des Gebäudes | SOLLTE | Mitschulds-Frage |
| Reparatur-Kosten | SOLLTE | bei Auftrag-Inhalt |

### 3.6 SETZUNGS-/RISSSCHÄDEN

| Feld | Pflicht | Quelle |
|---|---|---|
| Riss-Lokalisation (alle Stellen) | MUSS | Befund |
| Riss-Breite (mm) | MUSS | Bewertungs-Basis |
| Riss-Verlauf (vertikal/horizontal/diagonal) | MUSS | Ursache-Indiz |
| Riss-Beobachtungs-Dauer | SOLLTE | Bewegungs-Frage |
| Setzungs-Messung (sofern erfolgt) | SOLLTE | Beweissicherung |
| Bodenverhältnisse | SOLLTE | Geotechnik-Hinzuziehung |
| Konstruktion/Statik | MUSS bei Bedarf | Statiker-Hinzuziehung |
| Erschütterungs-Quellen extern (Bauarbeiten Nachbar) | MUSS bei Bedarf | Verursacher-Frage |

---

## TEIL 4 — KONSTELLATIONS-MATRIX (Beispiele)

### Beispiel A: Privatperson + Wasserschaden
- Auftraggeber-Felder: 2.1 Privatperson  
- Schadens-Felder: 3.1 Wasserschaden
- ENTFERNT: ~~Schadennummer~~, ~~Versicherungsscheinnummer~~, ~~Anwalt-AZ~~
- ZUSÄTZLICH: ~~Versicherungsnehmer~~ (= Auftraggeber selbst)

### Beispiel B: Versicherung + Wasserschaden  
- Auftraggeber-Felder: 2.2 Versicherung
- Schadens-Felder: 3.1 Wasserschaden
- DAZU: Versicherungsnehmer als 2. Kontakt erforderlich
- DAZU: Schadennummer + VS-Nummer Pflicht

### Beispiel C: Gericht (BGB-Mängelprozess) + Baumängel
- Auftraggeber-Felder: 2.4 Gericht
- Schadens-Felder: 3.3 Baumängel
- DAZU: Beide Parteien + beide Anwälte als Kontakte
- DAZU: §407a-Box auf PDF Pflicht

### Beispiel D: Anwalt (vertritt Bauherr) + Baumängel + Setzungsschäden
- Auftraggeber-Felder: 2.3 Anwalt
- Schadens-Felder: 3.3 Baumängel + 3.6 Setzungsschäden (kombiniert)
- DAZU: Mandant als 2. Kontakt
- DAZU: Anwalts-AZ

→ Insgesamt: 5 × 6 = 30 mögliche Konstellationen, alle mit eindeutiger 
Pflichtfeld-Definition.

---

**Quellen:** siehe QUELLEN.md (30+ recherche-belegte Quellen)
