# TEIL B · Thema 1 — KI maximal helfen, aber nur wo erlaubt

**Die Frage:** Was darf KI im Gutachten-Workflow JETZT, was nicht? Welche neuen Hilfen sind erlaubt, die PROVA noch nicht bietet?

---

## Die juristische Rückwand (entscheidet alles)

Nach Cluster 1 der Recherche steht fest:

| Gesetzliche Norm | Was sie sagt | Konsequenz für PROVA |
|---|---|---|
| §407a Abs. 3 Satz 1 ZPO | SV darf Auftrag NICHT übertragen | KI darf nie eigenständig entscheiden |
| §407a Abs. 3 Satz 2 ZPO | Mitarbeit Dritter muss offengelegt werden (außer "untergeordnete Bedeutung") | ki_protokoll muss *konkret* sein, nicht pauschal |
| §8a JVEG | Vergütung entfällt bei Unverwertbarkeit | Audit-Trail + Kennzeichnung = Versicherung |
| LG Darmstadt 10.11.2025 | "Mit KI erstellt" reicht nicht als Offenlegung | Wir müssen pro Textabschnitt nachweisen können |
| EU AI Act Art. 50 Abs. 4 | Öffentliches Interesse → Kennzeichnungspflicht, außer mit redaktioneller Kontrolle | SV-Signatur ist die redaktionelle Kontrolle |

**Die Leitlinie:** KI ist Hilfsmittel, nie Urheber. Der SV bleibt *geistiger Autor*. PROVAs Aufgabe: die Hilfe so gestalten, dass der SV die Autorenschaft **tatsächlich und nachweisbar** behält.

---

## Die 12 erlaubten Hilfen (10 die du hast + 12 die du haben könntest — ich erkläre welche)

### Was ist heute schon erlaubt und genutzt in PROVA (aus Master-Doku)?

1. **Transkription Diktat → Text** (Whisper, pseudonymisiert) — unstrittig erlaubt, da nur Medienkonvertierung
2. **Foto-Klassifikation** (z.B. "das ist ein Riss in einer Wand") — erlaubt als Hilfsdienst
3. **Skizzen-Digitalisierung** (Handzeichnung → Vector)
4. **Fachbegriffs-Vorschläge** (z.B. "Korrosionsgrad Stufe 2 statt Rost")
5. **Stammdaten-Extraktion** aus Beweisbeschluss (Auftraggeber, Az., Datum)
6. **Cross-Referencing Befund ↔ Befund** (über pgvector)
7. **Rechtschreib-/Grammatik-Check** (LanguageTool)
8. **Export-Hilfe** (Deckblatt automatisch, Inhaltsverzeichnis, PDF-Layout)
9. **Anonymisierungs-Vorschlag** für Veröffentlichung
10. **Vollständigkeitsprüfung** ("du hast zu Beweisfrage 3 nichts geschrieben")

Das ist die bestehende Basis. Alle 10 sind §407a-konform, weil sie **Hilfsdienste untergeordneter Bedeutung** sind ODER weil der SV die Endentscheidung trifft.

### 12 neue Hilfen — was JETZT dazukommen kann

| # | Hilfe | Warum erlaubt | Risiko | Empfehlung |
|---|---|---|---|---|
| **N1** | **Befund-Fragment aus Diktat extrahieren** (ein Diktat → n atomare Beobachtungen mit Timestamp & Provenance) | Medien-Konvertierung + Strukturierung. Die *Inhalte* stammen vom SV. | Fehlextraktion → SV muss kuratieren | **Pilot direkt** |
| **N2** | **Foto → automatische Beschreibungs-Kandidaten** (3 Varianten, SV wählt/schreibt neu) | Hilfsdienst, SV entscheidet. Cluster 1/Quelle 8 (BVS Optische Bau-Forensik 2025) erlaubt das explizit | KI halluziniert Details → Varianten-UI macht das sichtbar | **Pilot direkt** |
| **N3** | **Inline-Formulierungshilfe** ("mach diesen Satz juristisch präziser") als Vorschlag mit Akzeptieren/Ablehnen | Redaktionelle Glättung. Art. 50 Abs. 4 Satz 2 deckt das ab. | Zu stark glätten → Befund verzerrt | **Pilot direkt**, aber: nur auf Selection, nie ungefragt |
| **N4** | **Konsistenz-Check zwischen Befund und Fachurteil** ("im Befund steht X, im Fachurteil nimmst du Y an — widerspricht sich?") | Reiner Prüf-Assistent, keine inhaltliche Änderung | Fehlalarme nerven | **Pilot ja**, aber default OFF, aktivierbar |
| **N5** | **Zitat-Vorschläge aus eigener Fach-Bibliothek** (DIN, BVS-Standpunkte, BGH-Urteile) — wenn der SV zu einer Thematik schreibt, schlagen wir vor, was in seiner Bibliothek dazu passt | Tatsächlich neutraler Retrieval-Service, keine Rechtsanwendung | Falsche Zitate → Schaden | **Pilot ja**, aber MUST-HAVE: Vorschau der Zitat-Stelle vor Einfügen |
| **N6** | **Messwert-Plausibilitätsprüfung** ("Rissbreite 15mm ist außerhalb des üblichen Bereichs — wolltest du 1,5mm schreiben?") | Reiner Typo-Schutz, wie Rechtschreibkorrektur | Kaum Risiko | **Pilot direkt** |
| **N7** | **Datum/Zeugen-Extraktion aus Diktaten** ("am 15. Mai 2025 um 10:30 Uhr war anwesend: Herr Müller") als Kandidaten für Stammdaten-Tabelle | Datenkonvertierung, kein Urteil | Fehlzuordnung → SV kuratiert | **Pilot direkt** |
| **N8** | **Zusammenfassungs-Entwurf für Teil IV** (nachdem Teil III fertig ist, generiert KI eine Zusammenfassung, SV korrigiert) | §407a-grenzwertig — Zusammenfassung ist bereits Urteil. Art. 50 Abs. 4 Satz 2 mit redaktioneller Kontrolle (SV muss wirklich prüfen) ist tragfähig. | Hoch: Wenn SV "nur durchwinkt", ist Darmstadt-Fall provoziert | **Pilot NEIN**. Frühestens Q3 2026 mit UI, die Durchwinken verhindert (Pflichtfeld: "Ich habe jede Aussage geprüft") |
| **N9** | **Übersetzungs-Hilfe** für fremdsprachige Unterlagen (Dolmetscher-Ersatz light) | Reiner Konvertierungs-Service | Bei juristischen Texten: Fehlübersetzung kritisch | **Pilot ja für Alltags-Text**, NEIN für Urteile/Verträge (da muss es ein Dolmetscher sein) |
| **N10** | **Skizzen-Annotation** ("auf dieser Skizze sind 3 Risse markiert — übernehmen als Befund-Fragmente?") | Hilfsdienst | Fehlerkennung | **Pilot ja**, mit Bestätigungs-Schritt |
| **N11** | **"Was fehlt noch?"-Checkliste** basierend auf Gutachten-Typ (z.B. bei Schimmel-Fall: Raumtemperatur? Feuchte­messung? Wärmebild?) | Checklist aus Regelwerk, keine Rechtsanwendung | Keine | **Pilot direkt**, aber Regeln müssen kuratiert sein (nicht KI-generiert) |
| **N12** | ~~**Paragraphen-Vorschläge aus BGB/ZPO**~~ ("hier könntest du §634 BGB anwenden") | **§407a-Graubereich**: Rechtsanwendung ist Kern der SV-Leistung | Sehr hoch: wenn KI falsch zitiert, übernimmt SV ungeprüft | **NEIN — rate ich ab**. Alternative: *Gerichtsurteils-Ähnlichkeits­suche* (ähnliche Fälle anzeigen) ohne Paragraphen-Vorschlag. Der SV zieht die juristische Schluss­folgerung selbst. |

**Summa: 11 neue Hilfen empfohlen, 1 abgeraten (N12).**

---

## Die Kategorien-Systematik (für UI-Gruppierung in Thema 4)

Die 22 Hilfen (10 alt + 12 neu) lassen sich in 4 Klassen einteilen:

| Klasse | Natur | UI-Platz | Beispiele |
|---|---|---|---|
| **A: Konvertierung** (unstrittig erlaubt) | Medium A → Medium B, kein Urteil | Automatisch im Background | N1, N7, N10, Transkription, Skizze-Digitalisierung |
| **B: Vorschlag** (Akzeptieren/Ablehnen) | KI schlägt vor, SV entscheidet | Inline (Bubble/Slash) | N2, N3, N5, N11, Fachbegriffs-Vorschläge |
| **C: Prüfen/Warnen** (passiv, kein Eingriff) | KI findet Auffälligkeiten, markiert | Sidebar-Hinweise | N4, N6, Vollständigkeitsprüfung |
| **D: Erzeugen** (Risiko-Klasse) | KI schreibt Absatz | Nur mit explizitem "Entwurf generieren"-Button + Prüf-Pflicht | N8 (Q3 2026, nicht Pilot) |

**Pilotregel:** Klasse A, B, C sind vom Tag 1 an drin. Klasse D kommt erst mit UI-Schutz.

---

## Die §407a-Compliance-Matrix (für jede Hilfe im ki_protokoll)

Jeder ki_protokoll-Eintrag muss pro Aktion festhalten:

```
ki_protokoll {
  id: uuid
  auftrag_id: uuid
  timestamp: timestamptz  (Europe/Berlin)
  kategorie: A | B | C | D
  aktion: enum (transkription, vorschlag_formulierung, zitat_vorschlag, ...)
  input_hash: sha256  (was hat KI gesehen — NICHT Klartext)
  output_zusammenfassung: text  (max 200 Zeichen, was hat KI gemacht)
  wirkung: enum (automatisch_uebernommen, vorgeschlagen_akzeptiert, 
                 vorgeschlagen_abgelehnt, vorgeschlagen_bearbeitet, 
                 passiv_prueffeld)
  bearbeitungszeit_ms: int
  provider_codename: text  (interne Codes, nie "openai"/"anthropic" im UI)
}
```

**Das neue Feld `wirkung`** ist der Darmstadt-Schutz. Beim Export kann man aggregieren:
- 4.2% aller Sätze hatten KI-Formulierungsvorschläge (davon 73% akzeptiert, 27% bearbeitet)
- 12 Zitate wurden aus der Fach-Bibliothek vorgeschlagen (alle vom SV geprüft)
- 0 Absätze wurden von KI generiert und ungeprüft übernommen

Das ist in einem einzigen Absatz im Gutachten-Zertifikat darstellbar — und gerichts­fester Beweis der SV-Urheberschaft.

---

## Die Roten Linien (wo KI NIE eingreifen darf)

1. **Beweisfrage-Beantwortung ohne SV-Bestätigung.** KI darf Entwurf bauen (N8, später), aber nie "fertig" markieren.
2. **Rechtsanwendung** (N12). Gerichtsurteils-Ähnlichkeitssuche okay, Paragraphen-Empfehlung nein.
3. **Unterschrift.** Nur qualifizierte SV-Signatur (SmartCard/D-Trust), nie KI-generierte Pseudo-Signatur.
4. **Export ohne ki_protokoll.** Wenn kein Protokoll vorhanden, Export blockieren (mit Begründung).
5. **Modifikation von Fotos/Skizzen** (außer Zuschnitt/Drehung dokumentiert). KI-Bildmanipulation = Beweisfälschung.
6. **Lernen aus Kundendaten** (PROVA-Regel 5). KI bekommt pseudonymisierte Daten, aber nichts davon fließt in Training.

---

## Konkrete Empfehlung — was im Pilot live gehen sollte

Sofort (Sprint 1-2 nach Pilot-Start):
- **N1 Befund-Fragment** — kernbestandteil HERZSTÜCK
- **N2 Foto-Beschreibungs-Kandidaten**
- **N3 Inline-Formulierungshilfe** (nur auf Selection)
- **N6 Messwert-Plausibilität**
- **N7 Datum/Zeugen-Extraktion**
- **N10 Skizzen-Annotation**
- **N11 "Was fehlt?"-Checkliste**

Später (Sprint 3-6):
- **N4 Konsistenz-Check** (default OFF)
- **N5 Zitat-Vorschläge** (braucht kuratierte Bibliothek pro SV)
- **N9 Übersetzungs-Hilfe** (Alltagstext)

Explizit NICHT im Pilot:
- **N8 Zusammenfassungs-Entwurf** (zu hohes §407a-Risiko ohne ausgereiften UI-Schutz)
- **N12 Paragraphen-Vorschläge** (abgelehnt)

---

## Die unterschätzte Wirkung: PROVA als "Darmstadt-Versicherung"

Das Vertriebs-Argument, das aus dieser juristischen Situation resultiert:

> *"Mit PROVA kannst du jederzeit beweisen, dass jeder Satz von dir stammt. Jede KI-Berührung ist protokolliert. Jede Übernahme bestätigt. Das ist nicht Pflicht, das ist **dein Schutz**, wenn das nächste Darmstadt-Urteil fällt — und es wird fallen."*

Das ist nicht Feature-Marketing. Das ist Existenz-Sicherheit für den SV. Preis­elastisch.

Weiter in Thema 2 — der Audit-Trail, der das sichtbar macht.
