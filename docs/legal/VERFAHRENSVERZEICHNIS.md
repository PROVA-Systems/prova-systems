# Verfahrensverzeichnis (Art. 30 DSGVO)

**Stand:** 2026-05-10 (MEGA²⁸ KORR-22)
**Verantwortlicher:** PROVA-Systems / Marcel Schreiber
**Status:** Vorlage, Anwalt-Review pflicht

---

## 1. Verarbeitungstätigkeit: PROVA-SaaS-Plattform

### 1.1 Bezeichnung
Bereitstellung einer SaaS-Plattform für Bausachverständige zur Erstellung, Verwaltung und Versand von Gutachten, Rechnungen, Briefen und Bescheinigungen mit KI-Strukturhilfen.

### 1.2 Verantwortlicher
- PROVA-Systems / Marcel Schreiber
- {{ANSCHRIFT}}
- {{KONTAKT}}

### 1.3 Datenschutzbeauftragter
- (falls bestellt) {{NAME_DSB}}
- Schwellenwert Art. 37 DSGVO: bei < 20 regelmäßig mit Datenverarbeitung beauftragten Personen entfällt Pflicht-Bestellung

### 1.4 Zwecke der Verarbeitung
- SaaS-Plattform für SV-Workflow
- KI-Strukturhilfen (Pseudonymisierung Pflicht)
- PDF-Generation
- Email-Versand
- Auftrags- und Mandantenverwaltung

### 1.5 Rechtsgrundlagen
- Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) — SV-Plattform-Subscription
- Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) — Service-Optimierung, Sicherheit
- Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) — Marketing-Mails, Cookies-Tracking-relevant
- Art. 9 Abs. 2 lit. b DSGVO (besondere Kategorien) — falls Gesundheitsdaten in Schadensgutachten

### 1.6 Datenkategorien
- **Stammdaten SV:** Name, Anschrift, Email, USt-ID, IBAN
- **Mandanten- und Auftraggeber-Daten:** Name, Anschrift, Email
- **Schadensbezogene Daten:** Befunde, Fotos, Diktate, Messwerte
- **Rechnungs-Daten:** Beträge, Banking
- **Audit-Logs:** pseudonymisiert
- **KI-Verarbeitungs-Logs:** pseudonymisiert + Token-Cost-Metriken

### 1.7 Betroffenenkategorien
- Sachverständige (PROVA-Kunden)
- Auftraggeber von SVs (Versicherungen, Anwälte, Gerichte, Privatpersonen)
- Mandanten (Drittpersonen aus Gutachten-Kontext)

### 1.8 Empfängerkategorien
- Auftragsverarbeiter (siehe AVV §5)
- KEIN Datenverkauf an Dritte
- KEINE Drittland-Übermittlung außer mit SCC + Pseudonymisierung

### 1.9 Drittland-Übermittlungen
- USA (OpenAI, Anthropic, PDFMonkey, Stripe, Netlify) — mit SCC nach Art. 46 Abs. 2 lit. c DSGVO
- Pseudonymisierung pflicht vor Übermittlung an USA-KI-Anbieter (CLAUDE.md Regel 17)

### 1.10 Löschfristen
- **Account-Daten:** Subscription-Laufzeit + 30 Tage Soft-Delete
- **Auftrags-Daten + PDFs:** 5-30 Jahre (BGB-Verjährung + § 407a Beweissicherung) — SV-Pflicht
- **Audit-Trail:** 1 Jahr, danach Anonymisierung
- **Stripe-Daten:** 7 Jahre (Buchhaltungspflicht)

### 1.11 Technische und organisatorische Maßnahmen
Siehe `docs/legal/TOM.md`.

---

## 2. Verarbeitungstätigkeit: KI-Strukturhilfen

### 2.1 Bezeichnung
Bereitstellung von KI-gestützten Strukturhilfen für SV-Gutachten via OpenAI (GPT-4o + Whisper) und Anthropic (Claude Sonnet 4.6).

### 2.2 Zwecke
- Konjunktiv-II-Validierung (§6 Fachurteil)
- Halluzinations-Checks
- Norm-Vorschläge
- Foto-Schaden-Erkennung
- Diktat-Transkription

### 2.3 Rechtsgrundlage
Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung im Rahmen der PROVA-Subscription).

### 2.4 Datenkategorien
- **Pseudonymisiert** an KI-Anbieter:
  - Pseudonymisierte Texte (Personennamen → `[PERSON_X]`)
  - Pseudonymisierte Adressen
  - Foto-Daten (EXIF-stripped, Personen-Detection-Blur geplant)
  - Audio-Files (für Whisper, Klartext-IDs durch Pseudo-IDs ersetzt)

### 2.5 Drittland-Übermittlung
- OpenAI (USA): mit SCC + Pseudonymisierung
- Anthropic (USA): mit SCC + Pseudonymisierung

### 2.6 Löschfristen
- KI-Logs (`ki_protokoll`): 1 Jahr für Cost-Tracking + Audit, danach Anonymisierung
- KI-Anbieter-Aufbewahrung: gemäß deren DPAs (typisch 30 Tage)

---

## 3. Verarbeitungstätigkeit: Zahlungsabwicklung

### 3.1 Bezeichnung
Abwicklung von Subscription-Zahlungen via Stripe.

### 3.2 Datenkategorien
- Name, Email
- Banking/Karten-Daten (Stripe-managed, NICHT in PROVA-DB!)
- Subscription-Status

### 3.3 Aufbewahrung
- Stripe: 7 Jahre (Buchhaltungspflicht)
- PROVA: nur Stripe-Customer-IDs + Subscription-Status, KEINE Banking-Klartextdaten

---

## 4. Verarbeitungstätigkeit: Email-Versand

### 4.1 Bezeichnung
Email-Versand für SV-Korrespondenz, Welcome-Mails, Referral-Programm, System-Notifications.

### 4.2 Empfänger
- IONOS-SMTP (Deutschland)
- Optional: Resend (USA mit SCC) — falls Marcel-Decision

### 4.3 Datenkategorien
- Empfänger-Email
- Betreff + Body (kann Klartextdaten enthalten — Begrenzung empfohlen)

### 4.4 Aufbewahrung
- `email_log`-Tabelle: 90 Tage Audit, dann Löschung

---

## 5. Datenschutz-Folgenabschätzung Art. 35 DSGVO

**Status:** Pflicht-Prüfung pending. Hohes Risiko für Betroffene aus:
- Verarbeitung von Gesundheitsdaten in Schadensgutachten (Art. 9)
- Profiling? Nein — keine automatisierten Entscheidungen mit rechtlicher Wirkung
- Großmaßstäbliche Verarbeitung? Nein — kleine Pilot-Phase mit ≤ 10 SVs

**Marcel-TODO:** Bei Skalierung > 100 SVs DSFA-Erstellung erforderlich.

---

## 6. Verzeichnis der Auftragsverarbeitungs-Tätigkeiten (im Auftrag des SV)

PROVA verarbeitet als Auftragsverarbeiter Daten im Auftrag der SVs. Pro SV-Workspace separates Verzeichnis im PROVA-System (Tabelle `audit_trail` + `ki_protokoll`).

---

## 7. Aktualisierung

Aktualisierung dieses Verzeichnisses bei:
- Neuen Verarbeitungs-Zwecken
- Änderung der Subprozessoren
- Schema-Änderungen mit Datenschutz-Auswirkung
- DSGVO-Updates (Gesetzgebung)

Quartalsweise Marcel-Review.

---

⚠️ **Anwalt-Review pflicht vor Pilot-Launch.**

*MEGA²⁸ KORR-22 — Vorlage von Claude Opus 4.7 (1M context)*
