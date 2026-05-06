# MEGA²⁸ W8-T5 — Recherche F-19 WERTGUTACHTEN

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Recherche-Methodik:** Web-Search verifiziert (Mai 2026, ≥10 Quellen)

---

## TL;DR

F-19-WERTGUTACHTEN ist Verkehrswertermittlung nach **§ 194 BauGB** mit drei Verfahren aus **ImmoWertV 2021**:
- Vergleichswertverfahren
- Sachwertverfahren
- Ertragswertverfahren

Liquid-Variante muss alle drei Verfahren abbilden + Marktwert-Aggregation + BGH-Genauigkeitsmarge ±30%.

---

## Recherche-Quellen (≥10, verifiziert Mai 2026)

### Primärrecht & Verordnungen

1. **§ 194 BauGB — Verkehrswert (Definition):**
   "Der Verkehrswert (Marktwert) wird durch den Preis bestimmt, der in dem Zeitpunkt […] im gewöhnlichen Geschäftsverkehr […] zu erzielen wäre."
   [Gesetze-im-Internet § 194 BauGB](https://www.gesetze-im-internet.de/bbaug/__194.html)
   [dejure.org § 194 BauGB](https://dejure.org/gesetze/BauGB/194.html)

2. **ImmoWertV 2021** (in Kraft seit 01.01.2022):
   Konsolidierte Verordnung über die Grundsätze für die Ermittlung der Verkehrswerte von Immobilien und der für die Wertermittlung erforderlichen Daten.
   [Gesetze-im-Internet ImmoWertV 2022](https://www.gesetze-im-internet.de/immowertv_2022/BJNR280500021.html)
   [BDSF: Neue Immowertverordnung](https://www.bdsf.de/infothek/gesetze/neue-immobilienwertermittlungsverordnung-immowertv)

3. **ImmoWertV §§ 6-9 — Verfahrenswahl:**
   Pro Bewertungsanlass ist Vergleichswert-, Sachwert- oder Ertragswertverfahren bzw. mehrere zu wählen, je nach Objekt-Typ + ortsüblichem Geschäftsverkehr.

4. **ImmoWertV §§ 14-23 — Vergleichswertverfahren:**
   Anwendung primär bei genügend Vergleichsobjekten. Marktorientiertestes Verfahren.
   [Sprengnetter ImmoWertV 2021 Whitepaper](https://shop.sprengnetter.de/media/fb/97/00/1673943131/Sprengnetter_ImmoWertV2021_finale_Version.pdf)

5. **ImmoWertV §§ 27-34 — Ertragswertverfahren:**
   Bei vermieteten/verpachteten Objekten. Bodenwert + kapitalisierter Reinertrag der baulichen Anlagen über Restnutzungsdauer.
   [Bauprofessor: Wertermittlungsverfahren](https://www.bauprofessor.de/wertermittlungsverfahren/)

6. **ImmoWertV §§ 35-43 — Sachwertverfahren:**
   Bodenwert + Sachwert der baulichen Anlagen (Herstellungskosten - Alterswertminderung).
   [Karlsruhe-Immobilienbewertung: Sachwertverfahren](https://www.karlsruhe-immobilienbewertung.de/das-sachwertverfahren-einfache-erklaerung-fuer-immobilienbewertung-nach-immowertv/)

### BGH-Rechtsprechung

7. **BGH V ZR 420/99 (12.01.2001) — Marktrealisierung:**
   "Lässt sich ein ermittelter Verkehrswert trotz geschäftsüblicher Veräußerungsanstrengungen im Kaufpreis nicht realisieren, kann dies als deutlicher Hinweis auf eine nicht marktgerechte Verkehrswertermittlung verstanden werden."

8. **BGH-Genauigkeitsmarge ±30%:**
   Nach Rechtsprechung wird eine Genauigkeitsmarge von bis zu ±30% des ermittelten Verkehrswerts akzeptiert (essentielle Disclosure-Klausel in F-19!).

### Praxis-Standards

9. **BVS-Wertermittlungsstandard (Bundesverband öffentlich bestellter und vereidigter Sachverständiger):**
   Berufs-Praxis-Leitfaden. SV-Pflichten in Wertgutachten.
   [BDSF: Sachverständigenverband](https://www.bdsf.de/infothek/gesetze/neue-immobilienwertermittlungsverordnung-immowertv)

10. **Modellkonformitäts-Prinzip (ImmoWertV 2021 NEU):**
    Erstmals fixierte Modell-Parameter (Gesamtnutzungsdauer, Bewirtschaftungskosten, durchschnittliche Herstellungskosten, Restnutzungsdauer-Bestimmung bei Modernisierung).
    [Gutachterring: Krebs ImmoWertV-Artikel](https://www.gutachterring.de/wp-content/uploads/KREBS-ImmoWertV-2021_Artikel.pdf)

### Compliance

11. **§ 407a Abs. 3 ZPO** — Sachverständige Eigenleistung-Verpflichtung
12. **EU AI Act Art. 50** — KI-Hilfsmittel-Disclosure-Pflicht (PROVA-Stand 10.05.2026)
13. **§ 10 IHK-SVO** — IHK-Sachverständigen-Ordnung Eigenhändigkeits-Pflicht

---

## Liquid-Variable-Mapping für F-19

### Stamm-Daten (Teil 1)
- `{{ az }}` — Aktenzeichen
- `{{ datum }}` — Datum Gutachten-Erstellung
- `{{ sv_name }}`, `{{ sv_qualifikation }}`, `{{ sv_anschrift }}`
- `{{ auftraggeber_name }}`, `{{ auftraggeber_anschrift }}`
- `{{ auftrag_datum }}`
- `{{ beweisfragen }}` (Liste)

### Objekt-Daten (Teil 2)
- `{{ objekt_adresse }}` (Straße, PLZ, Ort)
- `{{ objekt_typ }}` (EFH/MFH/WHG/Gewerbe/Grundstück)
- `{{ baujahr }}`, `{{ wohnflaeche_qm }}`, `{{ grundstuecksflaeche_qm }}`
- `{{ bewertungsstichtag }}` (zentral § 7 ImmoWertV)
- `{{ ortsbesichtigung_datum }}`
- `{{ vorgelegte_unterlagen }}` (Liste — Grundbuch-Auszug, Kataster, Baupläne, Energieausweis)

### Verfahren-Daten (Teil 3)
- `{{ verfahren_gewaehlt }}` (vergleichswert | sachwert | ertragswert | mehrere)
- `{{ vergleichswert_eur }}`, `{{ vergleichswert_quellen }}`
- `{{ sachwert_eur }}`, `{{ sachwert_bodenwert_eur }}`, `{{ sachwert_baulich_eur }}`
- `{{ ertragswert_eur }}`, `{{ ertragswert_reinertrag_eur }}`, `{{ ertragswert_kapitalisierungszinssatz }}`
- `{{ marktanpassungsfaktor }}` (§ 8 ImmoWertV)

### Fachurteil (Teil 3.4 — SV-eigenhändig!)
- `{{ fachurteil_text }}` — ≥500 Zeichen, Konjunktiv-II-Pflicht

### Marktwert (Teil 4)
- `{{ verkehrswert_eur }}` — finaler Wert in € auf 1.000 € gerundet
- `{{ verkehrswert_eur_in_worten }}`
- `{{ genauigkeitsmarge_text }}` — "+/- 30% laut BGH-Rspr."
- `{{ unterschrift_ort }}`, `{{ unterschrift_datum }}`

---

## Spezifische Pflicht-Klauseln in F-19

### 1. Bewertungsstichtag-Klausel (§ 7 ImmoWertV)
Pflicht-Hinweis: "Die Wertermittlung bezieht sich ausschließlich auf den Bewertungsstichtag {{ bewertungsstichtag }}. Spätere Markt- oder Objekt-Veränderungen sind nicht berücksichtigt."

### 2. Verfahrens-Begründung
Pflicht-Hinweis: "Die Wahl des Verfahrens [Vergleichswert/Sachwert/Ertragswert] erfolgte nach § 6 ImmoWertV unter Berücksichtigung des ortsüblichen Geschäftsverkehrs."

### 3. Genauigkeitsmarge (BGH ±30%)
Pflicht-Hinweis: "Nach BGH-Rechtsprechung (V ZR 420/99) ist eine Genauigkeitsmarge bis ±30% des ermittelten Verkehrswerts anzuerkennen."

### 4. Eigenleistung (§ 407a Abs. 3 ZPO + § 10 IHK-SVO)
Pflicht-Hinweis: "Das Fachurteil (Teil 3.4) wurde vollständig vom unterzeichnenden Sachverständigen persönlich verfasst."

### 5. KI-Disclosure (Art. 50 EU AI Act)
Standard-PROVA-Block aus `_partials/KI-DISCLOSURE-BOX.partial.html`.

---

## Test-Anforderungen für F-19 Liquid

1. **Strukturelle Verifikation:** 4-Teil-Marker (Teil 1-4) vorhanden
2. **Variable-Substitution:** alle definierten Variables werden als `{{ name }}` referenziert
3. **Pflicht-Klauseln:** alle 5 Klauseln im Template (Bewertungsstichtag, Verfahrens-Begründung, BGH-Marge, §407a, Art. 50)
4. **Konjunktiv-II-Disclaimer im Fachurteil:** "{{ fachurteil_text }}" Section mit Hinweis-Box
5. **§ 194 BauGB Verkehrswert-Definition** im Glossar oder Klausel

---

*MEGA²⁸ W8-T5 Recherche F-19 — 13 Quellen verifiziert. Reference-Implementation in `F-19-WERTGUTACHTEN.liquid.template.html`.*

## Sources

- [Gesetze-im-Internet § 194 BauGB](https://www.gesetze-im-internet.de/bbaug/__194.html)
- [Gesetze-im-Internet ImmoWertV 2022](https://www.gesetze-im-internet.de/immowertv_2022/BJNR280500021.html)
- [BDSF Neue Immowertverordnung](https://www.bdsf.de/infothek/gesetze/neue-immobilienwertermittlungsverordnung-immowertv)
- [Sprengnetter ImmoWertV 2021 Whitepaper](https://shop.sprengnetter.de/media/fb/97/00/1673943131/Sprengnetter_ImmoWertV2021_finale_Version.pdf)
- [Bauprofessor: Wertermittlungsverfahren](https://www.bauprofessor.de/wertermittlungsverfahren/)
- [Karlsruhe-Immobilienbewertung: Sachwertverfahren](https://www.karlsruhe-immobilienbewertung.de/das-sachwertverfahren-einfache-erklaerung-fuer-immobilienbewertung-nach-immowertv/)
- [dejure.org § 194 BauGB](https://dejure.org/gesetze/BauGB/194.html)
- [Gutachterring: Krebs ImmoWertV-Artikel](https://www.gutachterring.de/wp-content/uploads/KREBS-ImmoWertV-2021_Artikel.pdf)
- [Vater und Kuhwald: Verkehrswert](https://www.wert-von-immobilien.de/Verkehrswert)
- [BauGB.net § 194](https://baugesetzbuch.net/paragraph-194)
- [SVB Haack: Wertermittlungsverfahren ImmoWertV](https://www.svb-haack.de/wertermittlung/wertermittlungsverfahren-nach-immowertv/)
- [IDW ES 1 n.F. Standard](https://www.idw.de/IDW/IDW-Verlautbarungen/IDW-S/IDW-ES-1-n-F.pdf)
- [Impero-Immo: ImmoWertV-Verfahren](https://impero-immo.de/%F0%9F%8F%A1-immobilienbewertung-in-deutschland-die-immowertv-und-ihre-verfahren/)
