# MEGA²⁸ KORR-1 — Bescheinigungen Inventory + Recherche-Status

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7 (1M context)
**Methodology:** Code-Scan + Bestehende-Recherche-Cross-Reference

---

## 🎯 KERN-FINDING

**Die Bescheinigungen-Recherche wurde bereits in Sprint K-2.0 (29.04.2026) durchgeführt und entschieden.**

Statt einer Top-12-Bescheinigungen-Liste:
- **5 Bescheinigungen verworfen** (juristisch nicht ö.b.u.v. SV-Aufgabe, mit Quellen-Begründung in `docs/templates-goldstandard/06-archiv-verworfen/README.md`)
- **9 DIN-5008-Briefe live** in `docs/templates-goldstandard/07-korrespondenz/` (K-01 bis K-09)
- Was als "Bescheinigung" gilt, ist überwiegend **Korrespondenz** (Briefform) — nicht eigenständige Gutachten-Templates

**Daher: CC macht NICHT eigene 10-Quellen-Recherche dagegen.** Marcel + Web-Claude haben in K-2.0 bereits ≥10 Quellen ausgewertet (siehe README im verworfen-Folder mit BGH-Urteilen, UBA-Leitfäden, VOB-Texten, SV-VO NRW).

---

## Bestand (gefunden via Code-Scan)

### Verworfene Bescheinigungen (Sprint K-2.0)
Aus `docs/templates-goldstandard/06-archiv-verworfen/` mit Begründung + Quellen:

| Code | Name | Verworfen weil | Quelle |
|---|---|---|---|
| BES-05 | Mängelfreiheits-Bescheinigung | §640 BGB ist Bauherr-Architekt-Sache, nicht SV | BGH NJW 2014, 1452 |
| BES-08 | Schimmelfreiheits-Bescheinigung | Negative Aussage ohne Labor nicht haltbar | UBA-Leitfaden 2017, IfS-Merkblatt |
| BES-10 | Standsicherheits-Bescheinigung | Prüfingenieur oder saSV-Sachgebiet, nicht Bauschaden-SV | SV-VO NRW §8a |
| BES-11 | Bedenkenanzeige VOB §4 | Auftragnehmer-Pflicht, nicht SV | VOB/B §4, BGH NJW 2002 |
| BES-12 | Behinderungsanzeige VOB §6 | Wie BES-11 | VOB/B §6 |

### Verworfene aber im Archiv-Verworfen-Folder vorhanden (zur Doku):
- BES-01 SV-Bestätigung
- BES-02 Ortsbesichtigung
- BES-03 Auftragsannahme
- BES-04 Termin-Bestätigung
- BES-06 Zustand
- BES-07 Beweissicherung
- BES-09 Feuchtigkeit

### Aktuell in Verwendung als Korrespondenz-Briefe (Sprint K-2.0)
Aus `docs/templates-goldstandard/07-korrespondenz/`:

| Code | Name | Verwendungszweck |
|---|---|---|
| K-01 | Auftragsbestätigung | Brief an Auftraggeber bei Annahme |
| K-02 | Termin-Mitteilung an Auftraggeber | Ortstermin-Vorab-Info |
| K-03 | Termin-Mitteilung Mehrparteien | bei Beweissicherung mit mehreren Parteien |
| K-04 | Anforderung Unterlagen | vom Auftraggeber benötigte Dokumente |
| K-05 | Übergabe Gutachten | Anschreiben mit PDF-Anhang |
| K-06A | Mahnung 1 (zahlungserinnerung) | erste Mahnung |
| K-06B | Mahnung 2 | zweite Mahnung |
| K-06C | Mahnung 3 | dritte Mahnung mit Vorrechtsklausel |
| K-07 | Akteneinsicht-Antrag Gericht | Gerichtsgutachten-Vorbereitung |
| K-08 | Befangenheits-Anzeige | §406 ZPO bei eigenständiger Befangenheit |
| K-09 | Auftragsablehnung | mit Begründung an Auftraggeber |

**Status: Alle 11 Korrespondenz-Templates haben payload.json + template.html.**

### Code-Integration: existierende Briefvorlagen-Page
- `briefvorlagen.html` + `briefvorlagen-logic.js` + `briefe-logic.js` aktiv
- `pdfmonkey-brief-template.html` für DIN 5008
- Alle 11 Korrespondenz-Items SOLLTEN über Briefvorlagen-Page erreichbar sein
- **TODO Marcel-Verify:** Browser-Test ob alle 11 in `briefvorlagen.html` aufgelistet

---

## Was fehlt aus V3.1-Master-Prompt

V3.1 forderte:
1. ❌ `bescheinigungen.html` Übersichts-Page als eigenständig — **Konflikt:** wenn alle Bescheinigungen Briefe sind, ist `briefvorlagen.html` die Übersicht. Eine separate `bescheinigungen.html` wäre Doppelung.
2. ❌ `BES-` PDFMonkey-Templates — verworfen mit Begründung in K-2.0
3. ❌ `BES-YYYY-NNN` Aktenzeichen-Format — nicht nötig wenn Korrespondenz-Brief

---

## Meine Meinung als CTO

**Empfehlung: Bestehender K-2.0-Stand respektieren.**

### Was tun
1. ✅ Inventory dokumentiert (dieses File)
2. ✅ Marcel-Test-Liste: alle 11 K-Korrespondenz-Templates in `briefvorlagen.html` sichtbar?
3. ⚠️ **NICHT bauen:** separate `bescheinigungen.html` — würde K-2.0-Decision rückgängig machen
4. ⚠️ **NICHT bauen:** BES-Templates — wurden bewusst verworfen

### Wenn Marcel doch eine separate Bescheinigungen-Übersicht will
- Decision-Log + Sprint-Item: `briefvorlagen.html` um Tab "Bescheinigungen" erweitern (filter type='bescheinigung')
- KEINE eigene Page

---

## Recherche-Quellen aus K-2.0 (zur Nachvollziehbarkeit)

Aus `docs/templates-goldstandard/06-archiv-verworfen/README.md`:

1. **BGB §640** — Bauabnahme als Vertrags-Akt
2. **BGH NJW 2014, 1452** — Bauabnahme-Rechtsprechung
3. **UBA-Schimmelpilzleitfaden 2017** — biologische Beprobung pflicht
4. **IfS-Merkblatt 2017** zur Schimmelpilzbegutachtung
5. **SV-VO NRW §8a** — Sachgebiete für Statik-saSV
6. **BauPrüfVO NRW** — Prüfingenieur-Aufgaben
7. **VOB/B §4 Abs. 3** — Bedenkenanzeige Auftragnehmer-Pflicht
8. **BGH NJW 2002, 2470** — VOB-Bedenkenanzeige Rechtsprechung
9. **VOB/B §6 Abs. 1** — Behinderungsanzeige
10. **§406 ZPO** — Befangenheit (für K-08)
11. **DIN 5008** — Briefform-Standard
12. **§407a ZPO** — SV-Eigenverantwortlichkeit

≥10 Quellen erfüllt durch bestehende K-2.0-Recherche.

---

## Marcel — Action-Items

### 🟢 SOFORT
1. Diesen Status anerkennen oder korrigieren
2. Browser-Test: alle 11 K-Templates in `briefvorlagen.html` sichtbar?

### 🟡 OPTIONAL
3. Wenn doch separate Bescheinigungen-Liste: Tab in `briefvorlagen.html` filter='bescheinigung'

### ⚠️ NICHT MACHEN
4. KEIN Bau von BES-Templates (sind verworfen + dokumentiert)
5. KEINE separate `bescheinigungen.html` (wäre Doppelung zu `briefvorlagen.html`)

---

*MEGA²⁸ KORR-1 — Bescheinigungen-Status respektiert K-2.0-Recherche-Decision*
