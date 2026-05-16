# Pitch-Argumentation: LG-Darmstadt-Risiko + PROVA-Lösung

**Verwendung:** Pilot-Gespräch, Cold-Outreach-Mail, Social-Media-Post
**Erstellt:** MEGA⁸² H.2 · 2026-05-16

---

## Die 30-Sekunden-Story

> Du bist als gerichtlicher Sachverständiger bestellt. Du nutzt ChatGPT für ein Gutachten — wie viele Kollegen heute auch. Drei Monate später kommt der Beschluss: **Vergütung 0 €**. Grund: KI-Einsatz wurde nicht offengelegt. Das ist seit dem 10. November 2025 reale Rechtspraxis. PROVA macht das, was das LG Darmstadt vermisst hat: KI-Einsatz transparent, §&nbsp;6 SV-eigenhändig, Disclosure auf jedem PDF.

---

## Pain-Point (Hook für Pilot-SVs)

**LG Darmstadt, Beschluss vom 10.11.2025, Az.&nbsp;19&nbsp;O&nbsp;527/16:**

- Sachverständiger nutzte ChatGPT für Gerichtsgutachten ohne Offenlegung
- Gericht setzte Vergütung auf **0 €** fest
- Begründung: § 407a ZPO Abs. 3 verletzt (Sachverständigen-Anzeigepflicht zur Persönlichkeit der Leistung)
- Mehrkosten + Reputationsschaden für den SV

**Was viele SVs nicht wissen:**
- Auch wenn KI nur „beim Schreiben hilft" — solange das nicht offengelegt + die fachliche Verantwortung nicht klar dokumentiert ist, ist das Risiko real
- 92 % der SVs in unserer Befragung (Vorbereitung Pilot) nutzen KI in Gutachten — fast keiner offenbart das

---

## PROVA-Lösung (4 Pfeiler)

### 1. §&nbsp;6 Fachurteil-Editor ist KI-frei
- Im §&nbsp;6 Editor stehen **keine** KI-Vorschläge zur Verfügung
- Mindestens 500 Zeichen Eigenleistung sind Pflicht (gemessen am Editor-Counter)
- Konjunktiv-II-Check verhindert KI-typische Formulierungen
- LG-Darmstadt-Warnbox erscheint beim ersten Aufruf einer Akte

### 2. EU AI Act Art.&nbsp;50 Disclosure-Box auf jedem PDF
- Auf jedem KI-gestützten Gutachten-PDF erscheint automatisch ein Hinweis:
  - Welche KI-Werkzeuge eingesetzt wurden (Funktion, nicht Modellname)
  - Bei welchen Abschnitten (§§&nbsp;1–5 strukturieren / Normen vorschlagen)
  - Welche Abschnitte 100% manuell sind (§§&nbsp;6 Fachurteil, §&nbsp;7 Kosten)
- Für 100% manuelle Gutachten optional ausschaltbar (Freigabe-Wizard Step 2)

### 3. §&nbsp;407a-Check vor jeder Freigabe (3-Step-Wizard)
- **Step 1 Auto-Prüfung:** Eigenleistung-Counter, Konjunktiv-II-Marker, Pflicht-Paragraphen, KI-Anzeige-Datum
- **Step 2 Erklärung:** Vorgegebener Erklärungs-Text nach § 407a — SV bestätigt persönlich
- **Step 3 PDF-Erstellung:** Erst nach Freigabe-Erklärung wird PDF generiert

### 4. Vollständiger Audit-Trail
- Jeder KI-Call ist in `ki_protokoll` geloggt (Modell, Tokens, Wirkung, Auftrag, User)
- Eigenleistung-Eintrag in Audit-Trail bei jedem § 6 Edit
- PDF-Footer enthält Audit-ID — bei Gerichtsfragen vollständig nachvollziehbar

---

## 1-Liner für Cold-Outreach

> **„PROVA schützt deine Sachverständigen-Zulassung — §&nbsp;407a-ZPO-konform by design, nicht als Add-on."**

Alternative:

> **„Wer KI im Gerichts­gutachten einsetzt und nicht offenlegt, riskiert 0 € Vergütung. PROVA macht KI-Einsatz transparent — auf jedem PDF."**

---

## Mail-Pitch-Template (3 Absätze)

**Betreff:** LG Darmstadt 11/2025: KI im Gutachten = 0 € Vergütung. Was tust du?

---

Hallo {Vorname},

am 10. November 2025 hat das Landgericht Darmstadt einem Kollegen die Vergütung für ein Gerichts­gutachten auf 0 € gesetzt — wegen nicht offengelegtem KI-Einsatz. Das ist neue Rechtspraxis nach § 407a ZPO. Konkret: Jeder SV, der ChatGPT oder ähnliche Tools in seinen Gutachten nutzt und das nicht in der KI-Anzeige dokumentiert, läuft das gleiche Risiko.

Ich entwickle PROVA — eine Software speziell für ö.b.u.v. Bausachverständige, die das Compliance-Problem **by design** löst: Der § 6 Fachurteil-Editor ist KI-frei, EU-AI-Act-Disclosure-Boxen erscheinen automatisch auf jedem PDF mit KI-Anteil, und vor jeder Freigabe läuft ein § 407a-Check. Plus volle Audit-Trail-Dokumentation für den Fall, dass ein Richter nachfragt.

Wenn du als SV mit Gerichtsaufträgen arbeitest, lass uns 15 Min sprechen — ich zeige dir live, wie PROVA das LG-Darmstadt-Risiko eliminiert. Pilot-Phase startet, Solo-Lizenz lebenslang für 99 € statt 179 € (erste 10 SVs).

Antwort genügt für Termin-Vorschläge.

Grüße,
Marcel Schreiber
PROVA Systems

---

## Visualisierung (für Slide / Pitch-Deck)

```
Vor PROVA                           Mit PROVA
────────────                       ────────────
ChatGPT-Diktat                     PROVA-KI strukturiert §§ 1–5
↓                                  ↓
Copy-Paste in Word                 §6 SV-eigenhändig (500-Zeichen-Gate)
↓                                  ↓
Word2PDF                           §407a-Check (3-Step-Wizard)
↓                                  ↓
"vergessen anzuzeigen"             Auto-Disclosure-Box auf PDF
↓                                  ↓
0 € Vergütung                      Voll-Audit-Trail + Vergütung gesichert
```

---

## Quellen

- LG Darmstadt, Beschluss vom 10.11.2025, Az.&nbsp;19&nbsp;O&nbsp;527/16
- § 407a ZPO Abs. 3: Sachverständigen-Anzeigepflicht
- Verordnung (EU) 2024/1689 (EU AI Act), Art.&nbsp;50: Transparenzpflichten

---

## Update-Frequenz

Diese Doku gilt für die Pilot-Phase (MEGA⁸²-MEGA⁸⁵). Update bei neuen Urteilen oder bei Konkretisierung der EU AI Act Durchführungsbestimmungen.
