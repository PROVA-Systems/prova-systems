# MEGA³⁷ D13 — PROVA-Compliance §407a + IHK-SVO + UStG + DIN

**Datum:** 2026-05-08
**Methodik:** Gesetzes-Recherche (5 Quellen) + PROVA-Code/Template-Audit.

## §407a ZPO — Sachverständigen-Pflichten

| Anforderung | PROVA-Status | Severity |
|-------------|--------------|----------|
| Eigene Bearbeitung — keine Auftragsweitergabe | 🟢 Workspace-Isolation, KI nur als Hilfsmittel | 🟢 LOW |
| Hilfspersonen mit Tätigkeitsumfang nennen | 🟡 KI als "Hilfsperson"? — Disclosure auf PDF empfohlen | 🟠 HIGH |
| Frist-Verlängerung-Antrag rechtzeitig | 🟢 K-11 Template (M³⁷ B3) | 🟢 LOW |
| Befangenheits-Anzeige | 🟢 K-08 Template | 🟢 LOW |
| Rückfrage bei Auftragsumfang-Unklarheit | 🟢 K-04 Template | 🟢 LOW |
| Kostenanzeige bei Disproportion | 🟢 K-10 Honorar-Vorschuss (M³⁷ B3) | 🟢 LOW |

### KI-Eigenleistung (CLAUDE.md Regel 11)
- 500 Char-Min Eigentext + 2/3 Qualitäts-Marker als Gate ✅
- Override mit Modal + audit_trail-Eintrag ✅
- Copy/Paste-Events geloggt ✅

### Halluzinationsverbot (Regel 10)
- KI darf nichts erfinden — Halluzinations-Check vor Freigabe ✅
- ki-funktions-garantie.test.js Test 2 verifiziert ✅

## EU AI Act Art. 50 (siehe D06)
- Disclosure-Box auf KI-PDF: 🟠 HIGH (Pflicht ab August 2026)

## IHK-SVO

| Anforderung | Status |
|-------------|--------|
| 4-Teile-Struktur (§1 Anlass / §2 Befund / §5 Beweisfragen / §6 Fachurteil) | 🟢 In Templates F-04/F-09 |
| Schweigepflicht-Hinweis | 🟡 Im PDF-Footer? Verify |
| Unparteilichkeit | 🟢 Befangenheits-Anzeige K-08 |

## UStG §14 — Rechnungs-Pflichtangaben (11 Felder)
| Feld | PROVA-Status |
|------|--------------|
| Name + Adresse beider Parteien | 🟢 |
| USt-ID oder Steuer-Nr. | 🟢 |
| Rechnungs-Datum + Nummer | 🟢 |
| Leistungs-Beschreibung | 🟢 |
| Leistungs-Zeitraum | 🟢 |
| Netto-Betrag | 🟢 |
| Steuersatz | 🟢 |
| Steuer-Betrag | 🟢 |
| ZUGFeRD/XRechnung-Format | 🟡 ZUGFeRD 2.x für Team-Paket (Verify) |

E-Rechnungs-Pflicht in Deutschland B2B ab 2025 (Übergang bis 2026/2027 für KMU).

## DIN 5008 (Geschäftsbrief)
- 11 Korrespondenz-Briefe folgen DIN 5008 (verifiziert in W4.1-Recherche). 🟢

## Top-3-Empfehlungen
1. **KI-Disclosure-Box** in jedem KI-generierten Gutachten-Abschnitt (EU AI Act Pflicht ab Aug 2026): "Dieser Abschnitt nutzt KI-Hilfen für Konjunktiv-II-Prüfung / Halluzinations-Check / etc."
2. **ZUGFeRD-Verify** auf jeder Rechnung (Lambda erechnung-generate-Tests).
3. **§407a Hilfsperson-Klausel** auf PDF: KI = nicht-eigenständiger Helfer mit Tätigkeitsbereich-Beschreibung.

## Quellen
1. [§ 407a ZPO — gesetze-im-internet.de/zpo/__407a.html](https://www.gesetze-im-internet.de/zpo/__407a.html)
2. [BMF FAQ E-Rechnung — bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html)
3. [Ausstellen von Rechnungen — lstn.niedersachsen.de — §§14, 14a UStG](https://lstn.niedersachsen.de/steuer/steuermerkblaetter_und_broschueren/ausstellen-von-rechnungen-i-s-der-14-14a-ustg-67823.html)
4. [§ 407 ZPO — dejure.org/gesetze/ZPO/407.html](https://dejure.org/gesetze/ZPO/407.html)
5. [EU AI Act Art. 50 — siehe D06 für Quellen-Verweis](MEGA37-D06-DSGVO-EU-AI-ACT.md)
