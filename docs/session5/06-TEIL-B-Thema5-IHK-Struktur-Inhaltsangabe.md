# TEIL B · Thema 5 — Inhaltsangabe + Struktur: IHK-konform?

**Die Frage (Marcel):** *"Aktuell haben wir 5 Teile: Deckblatt / Stammdaten / Sachverhalt / Feststellungen / Beantwortung Beweisfragen / Anhänge. Passt das zu den bindenden IHK-Vorgaben?"*

---

## Die direkte Antwort

**Nein, die IHK-Empfehlung definiert 4 Teile, nicht 5. Aber das ist keine rechtliche Pflichtverletzung — es ist eine Verfeinerung, die du gut verteidigen kannst.**

## Der Abgleich (IHK Köln — Quelle 4 Teil A)

| IHK-Empfehlung (4 Teile) | PROVA aktuell (5 Teile) | Abweichung? |
|---|---|---|
| I. **Deckblatt** (Titel, Auftraggeber, Az., SV-Daten) | I. Deckblatt | — |
| II. **Daten und Sachverhalt** (Ortsbesichtigung, Zeugen, Unterlagen, Beweisfragen, Befund) | II. Stammdaten + III. Sachverhalt + IV. Feststellungen | PROVA splittet in 3 Teile → feiner |
| III. **Beantwortung der Beweisfragen** (inkl. fachlicher Würdigung) | V. Beantwortung Beweisfragen | Merge bei PROVA nicht gegeben (§5 Befund separat von §6 Fachurteil) |
| IV. **Zusammenfassung + Unterschrift** | VI. Zusammenfassung + Unterschrift | — |
| Anhänge (nicht Teil der 4) | Anhänge separat | — |

Du siehst: die IHK-Teile **II (Daten und Sachverhalt)** und **III (Beantwortung)** fassen das, was du in **II + III + IV + V** aufgeteilt hast, zu zwei breiteren Kapiteln zusammen.

---

## Warum PROVAs 5-Teile-Verfeinerung nicht nur okay, sondern besser ist

1. **Trennung Objektiv vs. Subjektiv.** 
   PROVAs Teil IV "Feststellungen" (= Befund) ist rein beobachtend. Teil V (Beantwortung/Fachurteil) enthält die subjektive Würdigung. Diese Trennung ist juristisch *sauberer* — ein Anwalt kann den Befund-Teil angreifen, ohne das Fachurteil in Frage zu stellen, und umgekehrt.

2. **§407a-Alignment.**
   Die KI-Hilfe ist unterschiedlich erlaubt in Befund vs. Fachurteil. Beim Befund (Objektiv) darf KI mehr helfen (Transkription, Foto-Beschreibung, Messwert-Plausibilität). Beim Fachurteil (Subjektiv) muss SV den Kern selbst formulieren. Die Trennung in zwei Kapitel *erzwingt* diese Disziplin im UX.

3. **Recherche bestätigt:** 
   Die BVS-Richtlinie "Dokumentation und Revisionierbarkeit" 2011 (Quelle 6 Teil A) fordert, dass Befunde zu Beobachtungen rückverfolgbar sein müssen — das geht einfacher mit einem eigenen Befund-Kapitel als mit einem gemergten.

4. **Das LG Darmstadt 2025 (Quelle 2) würde PROVAs Trennung begrüßen.**
   Der kritisierte Fall war, dass KI "Würdigung mit Befund vermischt hat". Saubere Trennung beugt vor.

---

## ABER: IHK-Export-Modus muss trotzdem angeboten werden

Einige SV arbeiten mit der IHK-Empfehlung als Vorgabe. Manche Gerichte erwarten explizit die 4-Teile-Form. Lösung:

### Export-Modus A: "PROVA-nativ" (5 Teile, default)
Wie jetzt. Teile I / II / III / IV / V / VI mit eigener Kapitelstruktur.

### Export-Modus B: "IHK-konform" (4 Teile, umgemappt)
Beim Export wird umstrukturiert:
- PROVA I → IHK I (Deckblatt)
- PROVA II + III + IV → IHK II (Daten und Sachverhalt, mit Unter­kapiteln 1. Stammdaten, 2. Sachverhalt, 3. Feststellungen)
- PROVA V → IHK III (Beantwortung, aber mit Integration der Feststellungen: im neuen IHK III steht der Feststellungs-Teil als Unterkapitel "3. Befund", dann "4. Fachurteil")

**Technisch:** Ein Export-Config-Schema. Keine doppelte Datenhaltung.

**Default:** PROVA-nativ. SV wechselt zu IHK-Modus via Export-Dialog-Dropdown. In den User-Settings kann die Präferenz gespeichert werden.

---

## Die Inhaltsangabe (Inhalts­verzeichnis) — Marcels zweite Frage

> *"Wie bekommen wir es am Ende hin IHK-konforme Inhaltsangaben auf dem Deckblatt (oder gleich dahinter)?"*

### Struktur der Inhaltsangabe

Variante 1 (auf Deckblatt):
```
Seite 1 — Deckblatt
  ├── Titel
  ├── Auftraggeber / Az.
  ├── SV-Daten
  ├── Datum
  ├── INHALTSANGABE (5-6 Zeilen, Level 1 nur)
  └── Unterschrift
```

Variante 2 (Seite 2):
```
Seite 1 — Deckblatt (kompakt)
Seite 2 — Inhalts­verzeichnis (Level 1 + Level 2)
Seite 3+ — Inhalt
```

**Empfehlung:** Variante 2 (eigene Seite). Grund: auf einem Deckblatt gehört Seelenruhe, kein Inhalts-TOC. Außerdem: bei längeren Gutachten (>50 Seiten) reicht 5-6 Zeilen TOC nicht.

### Wie wird das Inhalts­verzeichnis generiert?

**Nicht manuell.** Auto-generiert aus der Dokumentstruktur:
1. Kapitel-Überschriften (H1-H2) werden beim Export gescannt
2. Seitenzahlen bestimmt (nach PDF-Rendering, daher: 2-Pass-Render)
3. TOC-Seite eingefügt mit Levels, Punkten, Seitenzahlen

**Formatierung:**
```
I.   Deckblatt ...................................... 1
II.  Stammdaten .................................... 3
     1. Auftraggeber ............................... 3
     2. Auftragsgegenstand ......................... 4
III. Sachverhalt ................................... 5
     1. Beweisfragen .............................. 5
     2. Ortsbesichtigung .......................... 6
     3. Beigezogene Unterlagen .................... 8
IV.  Feststellungen ................................ 9
     1. Allgemein ................................. 9
     2. Außenbereich .............................. 10
     3. Innenbereich .............................. 14
V.   Beantwortung der Beweisfragen ................. 18
     1. Zu Frage 1 ................................ 18
     2. Zu Frage 2 ................................ 20
VI.  Zusammenfassung ............................... 23
Anhang A: Fotodokumentation ........................ A-1
Anhang B: Messprotokolle ........................... B-1
Anhang C: Literatur (nach DIN 1505) ................ C-1
```

DIN-1505-konforme Zitierweise im Anhang C (Quelle 22 Teil A).

---

## Die IHK-Vorgaben sind Empfehlungen, nicht Gesetz

**Wichtig festzuhalten:** Die IHK-Empfehlung ist eine *Empfehlung*. Rechtlich bindend ist nur:
- §411 ZPO (schriftliches Gutachten, allgemeine Form)
- §9 Abs. 3 SVO (Sachverständigen-Ordnung, "für Sachkundigen nachvollziehbar")
- BVS-Richtlinien (nur für BVS-Mitglieder bindend, und nur intern)

**Konsequenz:** PROVAs 5-Teile-Struktur ist rechtlich zulässig. Die IHK-Kompatibilität ist ein *Bonus*, keine *Pflicht*.

Vertriebs-formulierung dafür:
> *"PROVA strukturiert Gutachten klarer als die IHK-Empfehlung — mit getrenntem Befund und Fachurteil. Auf Wunsch exportieren wir aber auch im IHK-Standard-Format, falls dein Gericht das vorgibt."*

---

## Was das Deckblatt haben muss (nach IHK + BVS)

Von Quelle 4 (IHK Köln) und Quelle 7 (BVS Beweissicherung):

- Titel: "Sachverständigen-Gutachten" (nicht "Gutachten", nicht "Expertise" etc.)
- Bezeichnung "Schriftliches Gutachten gem. §411 ZPO" (wenn Gerichts­gutachten)
- Auftraggeber (Gericht + Az. oder Privatkunde + Rechnungsanschrift)
- SV-Daten: Name, öffentliche Bestellung (Beschluss-Datum, Kammer), Anschrift, Fachgebiet
- Datum der Erstellung
- Anlass + Fragestellung in Kurzform (2-3 Zeilen)
- Optional: QR-Code oder URL zum Online-Verifizierungs-Link (Optional-Feature für PROVA)

---

## Konkrete Schritte (Teil F)

1. Export-Config-Schema: "prova-native" vs. "ihk-konform"
2. Template-Engine: beide Varianten als Jinja/Handlebars-Templates
3. TOC-Auto-Generator (2-Pass-PDF-Render)
4. DIN-1505-Zitierweise im Literatur-Anhang
5. Deckblatt-Generator mit allen Pflichtfeldern + Validator (Warnung wenn unvollständig)
6. User-Setting: Default-Export-Modus (speichern pro SV)

Aufwand: **M** (2-3 Wochen), reine Export-Arbeit, keine tiefe Architektur-Änderung.

---

## Die eine Stelle, wo ich WIDERSPRECHE

Du hast in der Frage "IHK-konform" fast schon als Pflicht formuliert. Ich sage: **IHK-konform ist Option, nicht Default.** Deine 5-Teile-Struktur ist das bessere Produkt. Stell's selbstbewusst raus.

Wenn ein Kunde fragt "aber meine Kammer sagt 4 Teile", antworte: *"Kein Problem — ein Klick, schon hast du das 4-Teile-Layout im PDF. Im System arbeitest du weiter mit der sauberen 5-Teile-Trennung, das hilft dir beim Denken."*

Das ist keine Feature-Nuance, das ist eine Produkt-Positionierungs-Entscheidung.
