# § 407a ZPO + § 10 IHK-SVO Statement — PROVA Systems

**Stand:** 04.05.2026 (Draft fuer Anwalt-Review)
**Bezug:** § 407a Abs. 1+2+3 Zivilprozessordnung + § 10 IHK-Sachverständigenordnung

---

## 1. § 407a Abs. 1 ZPO — Höchstpersönlichkeit

**Gesetz:** Der Sachverständige ist verpflichtet, das Gutachten höchstpersönlich zu erstatten.

**PROVA-Implementierung:**
- Das **Fachurteil** (Teil 3.4 in jedem PDF) wird vom SV höchstpersönlich verfasst — KI ist NICHT involviert.
- **Eigenleistungs-Schwelle in der UI:** Mindestens 500 Zeichen + 2/3 Qualitäts-Marker (Norm-Verweis, Konjunktiv II, §-Verweis) sind Pflicht für die Freigabe.
- **Override-Modal** bei Unterschreitung erfordert SV-Bestätigung + Audit-Eintrag in `audit_trail`.
- **Copy/Paste** ist erlaubt (Marcel-Decision: SV soll wie gewohnt arbeiten können), aber Paste-Events werden in `audit_trail` geloggt.

**Wortlaut PDF Teil 3.4 (Fachurteil-Kasten):**
> "SV-Fachurteil · KI-frei (Art. 50 EU AI Act, § 10 IHK-SVO)"
> "Die nachstehende Beurteilung wurde vollständig und ausschließlich vom unterzeichnenden Sachverständigen persönlich erstellt, ohne KI-Unterstützung."

## 2. § 407a Abs. 2 ZPO — Anzeige bei Mitarbeit Dritter

**Gesetz:** Bei Mitarbeit Dritter muss dies dem Auftraggeber/Gericht angezeigt werden.

**PROVA-Implementierung:**
- **Standard-Wortlaut** in jedem PDF Teil 1.3:
  > "Mitwirkung Dritter: Keine. Das Gutachten wurde vom unterzeichnenden Sachverständigen höchstpersönlich erstattet."
- Wenn der SV Hilfskräfte einsetzt, kann das Wortlaut-Feld in der App überschrieben werden.

## 3. § 407a Abs. 3 ZPO — Anzeige bei KI-Hilfsmitteln

**Gesetz:** Hilfsmittel sind anzuzeigen.

**PROVA-Implementierung:**
- **Vorab-Anzeige (Ex-ante):** in PDF Teil 1.3 — vor Gutachten-Erstellung an Auftraggeber/Gericht
- **Detail-Doku (Ex-post):** in PDF Teil 4.3 — konkrete KI-Aufgaben + SV-Eigenleistung

**Wortlaut Teil 1.3:**
> "Der vorliegenden Gutachtenerstattung wurde mit Anzeige vom [Datum] an [Auftraggeber/Gericht] gemäß § 407a Abs. 3 ZPO, § 10 IHK-SVO und Art. 50 EU AI Act der Einsatz folgender Hilfsmittel vorab angezeigt..."

**Wortlaut Teil 4.3:**
> Liste aller eingesetzten KI-Systeme + Aufgaben + Verantwortungsklausel (siehe `ai-disclosure.md`)

---

## 4. § 10 IHK-SVO — Höchstpersönlichkeit + Hilfsmittel-Anzeige

**Bezug:** Identisch zu § 407a ZPO Abs. 1 + 3 — IHK-Köln-Sachverständigenordnung.

PROVA-Implementierung gilt sinngemäß.

---

## 5. Anti-Substitution (IHK-Köln-Anforderung)

Damit IHK-Köln nicht den Vorwurf erheben kann, das KI-generierte Gutachten ersetzt die SV-Tätigkeit:

**PROVA-Schutzmaßnahmen:**
- Header + Footer **ab Seite 2** in jedem PDF zeigen SV-Identität (verhindert Anschein von "neutral generiertem" Text)
- Eigenleistungs-Anteil **strikt getrennt** dokumentiert in Teil 4.3
- Fachurteil **explizit als KI-frei gekennzeichnet** in Teil 3.4
- Audit-Trail-Logging der Eigenleistungs-Erstellung (Zeit-Tracking, Paste-Events)

---

## 6. Marcel-Pflichten als SV (klargestellt im Tool)

(1) Vor erstem Pilot-Auftrag: Anzeigepflicht-Wortlaut prüfen + ggf. an Bundesland-spezifische SVO anpassen (PROVA-Default ist IHK-Köln).

(2) Bei Gerichtsgutachten (F-15): Dem Beweisbeschluss-Gericht KI-Hilfsmittel anzeigen (PDF Teil 1.3).

(3) Bei Privatgutachten: dem Auftraggeber per Email vor Gutachten-Auslieferung — automatisches Wording in Teil 1.3 reicht.

(4) **Befangenheits-Erklärung** in Teil 4.2 (§ 407a Abs. 2 ZPO) jährlich review-en + bei Anlass aktualisieren.

---

**Fragen für Anwalt-Review:**

1. **Eigenleistungs-Schwelle 500 Zeichen + 2/3 Marker:** Reicht das, oder benötigen wir striktere Schwellen (z.B. 1000 Zeichen)?
2. **Copy/Paste-Erlaubnis:** Marcel-Decision war "erlaubt mit Audit-Log". Ist das § 10 IHK-SVO-konform, oder muss CSS `user-select: none` rein?
3. **Override-Modal:** Bei Unterschreitung der Schwelle kann SV trotzdem freigeben mit Audit-Log. Reicht das, oder muss System die Freigabe blocken?
4. **EU AI Act Art. 50 + § 407a ZPO:** Doppelte Erfüllung durch identischen Wortlaut OK, oder müssen Wordings getrennt sein?
5. **IHK-Köln Pre-Approval:** Bei wessen Bauverhandlungen kann eine IHK-Praxis die Genehmigung verweigern, wenn KI eingesetzt wird?

---

*SV-§407a-Statement-Draft 04.05.2026 — Pflicht-Review vor Pilot-Launch.*
