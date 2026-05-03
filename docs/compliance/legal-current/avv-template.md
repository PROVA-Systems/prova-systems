# Auftragsverarbeitungs-Vertrag (AVV) — PROVA Systems ↔ Pilot-SV

**Stand:** 04.05.2026 (Draft fuer Anwalt-Review)
**Pflicht nach Art. 28 DSGVO**

---

## Praeambel

Der Sachverständige ("Verantwortlicher") nutzt PROVA Systems ("Auftragsverarbeiter") als SaaS-Plattform zur Verarbeitung personenbezogener Daten seiner Auftraggeber. Diese Vereinbarung regelt die Auftragsverarbeitung gemaess Art. 28 DSGVO.

---

## § 1 Vertragspartner

**Verantwortlicher:** [Pilot-SV-Name + Anschrift + IHK-Bestellung]

**Auftragsverarbeiter:**
Marcel Schreiber, PROVA Systems
Hohenzollernring 12, 50672 Köln
Email: kontakt@prova-systems.de

---

## § 2 Gegenstand + Dauer

(1) Gegenstand: Verarbeitung personenbezogener Daten von Auftraggebern und Dritten (z.B. Mietern) im Rahmen der Sachverständigen-Tätigkeit des Verantwortlichen.

(2) Dauer: solange aktive Subscription des Verantwortlichen + 30T Backup-Retention nach Vertragsende.

---

## § 3 Art + Zweck der Verarbeitung

(1) **Art:** Speicherung, Strukturierung, Pseudonymisierung, KI-gestützte Analyse, PDF-Generierung, Email-Versand, Audit-Logging.

(2) **Zweck:** Erstellung von Sachverständigen-Gutachten gemäß § 407a ZPO + § 6 IHK-SVO.

(3) **Datenkategorien:**
- Auftraggeber-Daten (Name, Adresse, Kontakt)
- Schadensbeschreibungen (frei text)
- Fotos (incidentell mit Personen)
- Diktat-Audios + Transkriptionen
- Befunde + Messwerte
- ggf. Bauakten + Vorgutachten

(4) **Betroffene:** Auftraggeber des SVs + Dritte (Mieter, Handwerker, Bauleitung, etc.).

---

## § 4 Pflichten des Auftragsverarbeiters

(1) Verarbeitung **nur auf Weisung** des Verantwortlichen. Weisungen erfolgen durch Nutzung der Plattform-Features (Auftrag anlegen, KI-Hilfe nutzen, PDF generieren).

(2) **Vertraulichkeit:** alle PROVA-Mitarbeiter sind zur Vertraulichkeit verpflichtet (aktuell nur Marcel Schreiber).

(3) **Technisch-organisatorische Maßnahmen** gemäß Anlage 1.

(4) **Sub-Auftragsverarbeiter:** Liste in Anlage 2 (10 Anbieter mit Genehmigung des Verantwortlichen, Aenderungen werden mit 14T Vorlauf angezeigt).

(5) **Unterstuetzungspflicht** bei:
- Auskunftsanfragen Betroffener (Art. 15)
- Loeschungs-Anfragen (Art. 17)
- Datenuebertragbarkeit (Art. 20)
- Datenschutz-Folgenabschätzungen (Art. 35)

(6) Meldung von Datenschutz-Verletzungen innerhalb 24h nach Kenntnisnahme.

(7) Loeschung oder Rueckgabe aller Daten nach Vertragsende (auf Wunsch des Verantwortlichen, Default: Loeschung).

---

## § 5 Pflichten des Verantwortlichen

(1) Eigene Pflichten nach DSGVO (Art. 13/14 Information der Betroffenen, Rechtsgrundlage etc.).

(2) Anweisung der KI-Strukturhilfe-Nutzung mit Datenminimierungs-Prinzip.

(3) Sicherstellung dass Auftraggeber Plus Dritte ueber die Verarbeitung informiert sind.

---

## § 6 Sub-Auftragsverarbeiter

Der Verantwortliche genehmigt mit Vertragsabschluss die in Anlage 2 genannten Sub-Auftragsverarbeiter. Aenderungen werden mit 14T Vorlauf per Email angezeigt — Widerspruch fuehrt zu Sonderkuendigungsrecht.

Aktuelle Sub-Auftragsverarbeiter (Stand 04.05.2026):
- Supabase Inc. (Datenbank, EU/Frankfurt)
- Sentry GmbH (Error-Tracking, DE)
- Stripe Inc. (Zahlung, USA + EU mit SCC)
- OpenAI L.L.C. (KI-Strukturhilfe, USA mit SCC + Pseudonymisierung)
- PDFMonkey (PDF-Generierung, USA mit SCC)
- Resend Inc. / IONOS SE (Email, USA/DE)
- Netlify Inc. (Hosting, USA mit SCC)
- Make.com / Celonis (Workflow, EU + USA, auslaufend)

---

## § 7 Drittland-Transfer

Drittland-Transfers (USA): durch Standardvertragsklauseln (SCC) + EU-US Data Privacy Framework (DPF) + Pseudonymisierung wo möglich.

---

## § 8 Haftung + Vertragsstrafe

Haftung gemäß Art. 82 DSGVO. PROVA versichert sich gegen Datenschutz-Verstöße.

---

## § 9 Schlussbestimmungen

(1) Aenderungen schriftlich oder elektronisch.

(2) Bei Widerspruch zwischen Hauptvertrag (AGB) und dieser AVV: AVV vorrangig.

(3) Anwendbares Recht: Deutsches Recht. Gerichtsstand: Köln.

---

## Anlage 1 — Technisch-organisatorische Maßnahmen (TOM)

Siehe `docs/compliance/DSGVO-AUDIT-CHECKLIST.md` Sektion Art. 32.

## Anlage 2 — Sub-Auftragsverarbeiter

Siehe `docs/compliance/AVV-LISTE.md`.

---

**Fragen für Anwalt-Review:**
- Verantwortlicher-Auftragsverarbeiter-Rollenklarheit korrekt? (PROVA = AV, SV = V)
- § 4 Abs. 1: Reicht "Weisung durch Plattform-Nutzung", oder explizite Auftrags-Vereinbarung pro Akte?
- § 6 Sub-AVs: Reicht 14T Anzeige, oder Pflicht-Vorab-Zustimmung?

---

*AVV-Template-Draft 04.05.2026 — Pflicht-Review vor Pilot-Onboarding.*
