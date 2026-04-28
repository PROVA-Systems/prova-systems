# 06-archiv-verworfen — Bescheinigungs-Templates (verworfen)

**Stand:** 29.04.2026 · **Sprint:** K-2.0 Block 1
**Vorher:** `06-bescheinigungen-NEU/` (umbenannt zu archiv-verworfen)

---

## Status

Diese Bescheinigungs-Templates wurden geprüft und teilweise **verworfen**, weil sie nicht mit dem Berufsbild des öffentlich bestellten und vereidigten Bauschaden-Sachverständigen vereinbar sind. Stattdessen wurde in K-2.0 die neue Kategorie **`07-korrespondenz/`** angelegt mit 9 echten DIN-5008-Briefen.

---

## Verworfen (5 Files gelöscht)

### BES-05 — Mängelfreiheits-Bescheinigung
**Begründung:** Die Bauabnahme nach §640 BGB ist Sache von Bauherr und Architekt, nicht des SV. Ein SV kann den Zustand zum Zeitpunkt der Begutachtung dokumentieren, aber keine Mängelfreiheit bescheinigen — das wäre ein Vertragspartner-Akt.

**Quelle:** §640 BGB, BGH-Rechtsprechung zur Bauabnahme (BGH NJW 2014, 1452).

### BES-08 — Schimmelfreiheits-Bescheinigung
**Begründung:** Eine Schimmelfreiheits-Aussage ohne mikrobiologische Beprobung ist juristisch nicht haltbar. Der SV kann sichtbare Befunde dokumentieren, aber keine Negativ-Aussage treffen ohne Labor-Analyse — das wäre eine Aufgabe des biologisch-mikrobiologischen Sachverständigen.

**Quelle:** UBA-Schimmelpilzleitfaden 2017, IfS-Merkblatt 2017 zur Schimmelpilzbegutachtung.

### BES-10 — Standsicherheits-Bescheinigung
**Begründung:** Die Standsicherheit ist Aufgabe von Prüfingenieuren oder staatlich anerkannten Sachverständigen (saSV) nach SV-VO NRW §8a, nicht des Bauschaden-Sachverständigen. Die Begutachtung erfordert eine spezielle Bestellung mit Statik-Sachgebiet.

**Quelle:** SV-VO NRW §8a, BauPrüfVO NRW.

### BES-11 — Bedenkenanzeige nach VOB §4 Abs. 3
**Begründung:** Die Bedenkenanzeige ist eine Pflicht des Auftragnehmers (Handwerker / Bauunternehmer), nicht des SV. Ein SV stellt das Bedenken nicht selbst, sondern dokumentiert höchstens, dass der Auftragnehmer es korrekt ausgesprochen hat.

**Quelle:** VOB/B §4 Abs. 3, BGH NJW 2002, 2470.

### BES-12 — Behinderungsanzeige nach VOB §6 Abs. 1
**Begründung:** Wie BES-11 — die Behinderungsanzeige ist Auftragnehmer-Sache (Bauunternehmer an Bauherr), nicht SV-Aufgabe.

**Quelle:** VOB/B §6 Abs. 1.

---

## Verbleibende Bescheinigungen (legacy, weiter-prüfen)

In diesem Archiv-Ordner verbleiben (Stand 29.04.2026):

- BES-01 SV-Bestätigung (Auftragsbestätigung — wird in K-2.0 durch K-01 ersetzt)
- BES-02 Ortsbesichtigung
- BES-03 Auftragsannahme (überlappt mit K-01)
- BES-04 Termin-Bestätigung (überlappt mit K-02)
- BES-06 Zustands-Bescheinigung (Sonderfall, prüfen ob berufskonform)
- BES-07 Beweissicherungs-Vorlage (überlappt mit F-10 Goldstandard)
- BES-09 Feuchtigkeits-Bescheinigung (Sonderfall mit Messprotokoll OK)

→ **Marcel-TODO:** in K-2.x entscheiden welche der 7 verbleibenden Bescheinigungen produktiv genutzt werden vs. obsolet sind.

---

## Was K-2.0 stattdessen liefert

→ Siehe `/docs/templates-goldstandard/07-korrespondenz/` mit 9 DIN-5008-Briefen:

- K-01 Auftragsbestätigung (mit §407a-KI-Anzeige)
- K-02 Termin-Mitteilung Auftraggeber
- K-03 Termin-Mitteilung Mehrparteien (mit §485-Hinweis)
- K-04 Anforderung Unterlagen (§642-Mitwirkungspflicht)
- K-05 Übergabe-Anschreiben Gutachten
- K-06A/B/C Mahnung Stufe 1/2/3 (§§286/288 BGB)
- K-07 Akteneinsicht Gericht (§299 ZPO)
- K-08 Befangenheitsanzeige (§406 ZPO)
- K-09 Auftragsablehnung (MSVO §9 Wichtige Gründe)

---

🎯 **Diese 5 Files wurden bewusst gelöscht. Bauschaden-SV-Berufsbild beachten.**
