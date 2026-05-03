# EU AI Act Art. 50 — KI-Transparenz-Disclosure

**Stand:** 04.05.2026 (Draft fuer Anwalt-Review)
**Bezug:** Verordnung (EU) 2024/1689 (KI-Verordnung)

---

## 1. Klassifizierung von PROVA

**PROVA-Funktionen + EU AI Act-Risiko-Stufe:**

| Funktion | Risiko-Stufe | Begründung |
|---|---|---|
| Whisper-Transkription | Limited Risk (Art. 50) | Sprach-zu-Text, keine Bewertung |
| GPT-4o Konjunktiv-II-Pruefung | Limited Risk | Stilistische Hilfe, keine Bewertung |
| GPT-4o Halluzinations-Check | Limited Risk | Faktenpruefung, kein Urteil |
| GPT-4o §407a-Compliance-Check | Limited Risk | Regel-Pruefung, kein Urteil |
| GPT-4o Strukturhilfe (Befunde sortieren) | Limited Risk | Organisations-Hilfe |

**PROVA NICHT in High Risk (Anhang III) weil:**
- Keine automatische Entscheidung mit Rechtswirkung (Punkt 8 Anhang III)
- Keine Polygraph-/Verhaltens-Bewertungen
- Keine Bonitaets-Bewertungen (Punkt 5)
- Keine Notruf-/Strafverfolgungs-Aufgaben (Punkt 6, 7)

**Marcel-Pflicht-Klarstellung:** PROVA-KI ist **Strukturhilfe** für SV. Sie ersetzt nicht das Fachurteil.

---

## 2. Transparenz-Pflichten (Art. 50 EU AI Act)

### 2.1 Kennzeichnung KI-Inhalte (Art. 50 Abs. 2)

PROVA generiert Texte (Strukturhilfen) die in Gutachten einfliessen. Diese werden gekennzeichnet:

**In jedem PDF-Output:**
- **Teil 1.3:** Ex-ante-Anzeige: KI-Systeme werden vor Gutachten-Erstellung dem Auftraggeber angezeigt
- **Teil 4.3:** Ex-post-Dokumentation: konkrete KI-Aufgaben + SV-Eigenleistungs-Anteil

**Wortlaut Teil 1.3 (Beispiel):**
> "Eingesetzte KI-Systeme: OpenAI GPT-4o (Sprachmodell) und OpenAI Whisper (Spracherkennung)... Die sachverständige Beurteilung sowie die Gesamtverantwortung verbleiben ausschließlich beim unterzeichnenden Sachverständigen."

**Wortlaut Teil 4.3 (Beispiel):**
> "OpenAI Whisper: Transkription des SV-Diktats. Output wurde vom SV vor Übernahme geprüft und korrigiert.
> OpenAI GPT-4o: Strukturierung der Befunde, Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Compliance-Check, Rechtschreib- und Grammatik-Hinweise. Keine fachlichen Entscheidungen.
> Eigenleistungs-Anteil: Teil 3.4 (Fachurteil) wurde vollständig und ausschließlich vom unterzeichnenden Sachverständigen persönlich verfasst, ohne KI-Unterstützung."

### 2.2 Hinweis im UI (Art. 50 Abs. 1)

Bei Erst-Login wird der User informiert, dass er mit einem KI-System interagiert (Modal-Dialog).

**Wortlaut UI-Modal:**
> "Sie nutzen jetzt PROVA, eine KI-gestützte Plattform für Sachverständige. Die KI hilft beim Strukturieren, Korrigieren und Pruefen Ihrer Texte — sie macht aber keine eigenständigen fachlichen Bewertungen. Das Fachurteil verbleibt zwingend bei Ihnen als Sachverständiger (§ 10 IHK-SVO + § 407a Abs. 1 ZPO)."

### 2.3 Verantwortungs-Klausel pro KI-Funktion

Jede KI-Funktion zeigt vor Nutzung einen Hinweis:
- "Halluzinations-Check" → "Diese KI prüft Ihren Text auf nicht belegte Aussagen. Das Endergebnis muss vom SV bestätigt werden."
- "Konjunktiv-II-Pruefung" → "Die KI schlaegt Konjunktiv-II-Formulierungen vor. Übernahme nur nach SV-Pruefung."

---

## 3. Marcel-Pflichten als KI-Anbieter

(1) **Risiko-Bewertung jährlich** durchfuehren (DSFA-aehnlich, dokumentiert in `docs/compliance/DSFA-PROVA.md`).

(2) **Logging** aller KI-Calls in `ki_protokoll` (Pflicht aus CLAUDE.md Regel 16).

(3) **Modell-Wechsel** dokumentieren + Pilots informieren.

(4) **Fehlerquoten** monitoren (z.B. Halluzinations-Check-Falsch-Positive).

---

## 4. Sub-Anbieter-Pflichten

OpenAI ist Modell-Anbieter (Provider) i.S.d. EU AI Act. PROVA ist Deployer.

**OpenAI Pflichten:** Modell-Doku, Risiko-Management.
**PROVA Pflichten:** Transparenz, Logging, Verantwortungs-Klausel.

---

**Fragen für Anwalt-Review:**
- Klassifizierung "Limited Risk" korrekt? Oder fällt PROVA unter Anhang III Punkt 8 (Justizpflege) weil Gerichtsgutachten generiert werden?
- Reichen die PDF-Hinweise + UI-Modal für Art. 50 Konformitaet?
- KI-Modell-Wechsel: Pflicht-Re-Consent der Pilots oder reicht Email-Info?

---

*AI-Disclosure-Draft 04.05.2026 — Pflicht-Review vor Pilot-Launch.*
