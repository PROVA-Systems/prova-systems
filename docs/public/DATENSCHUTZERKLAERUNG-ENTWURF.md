# Datenschutzerklärung

**Stand:** 03.05.2026 · Version 1.0 (Skeleton, Anwalt-Review pending)

> ⚠️ **DIESES DOKUMENT IST ENTWURF.** Vor Live-Schaltung auf `prova-systems.de/datenschutz` Anwalts-Review zwingend. Kursive gelb markierte Stellen sind Anwalts-Entscheidung.

---

## 1. Verantwortlicher (Art. 4 Nr. 7 DSGVO)

**Marcel Schreiber**
*gelb: vollständige Anschrift einsetzen*

E-Mail: kontakt@prova-systems.de
Telefon: *gelb: TBD*

## 2. Datenschutzbeauftragter

*gelb: Marcel-Solo-Founder ist nach Art. 37 DSGVO ggf. nicht zur Bestellung verpflichtet. Anwalt prüft.*

Bei Datenschutz-Anfragen: datenschutz@prova-systems.de

## 3. Allgemeines zur Datenverarbeitung

PROVA Systems verarbeitet Ihre personenbezogenen Daten gemäß den Bestimmungen der DSGVO und des BDSG. Diese Erklärung informiert Sie umfassend über Art, Umfang und Zweck der Datenverarbeitung.

**Grundprinzipien:**
- Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)
- Zweckbindung (Art. 5 Abs. 1 lit. b DSGVO)
- Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO)
- Pseudonymisierung vor KI-Verarbeitung (Art. 32 Abs. 1 lit. a DSGVO)

---

## 4. Erhebung beim Besuch der Website (`prova-systems.de`)

### 4.1 Server-Logs (Netlify)
Beim Besuch der Website werden automatisch folgende Daten verarbeitet:
- IP-Adresse (gekürzt nach 24h)
- Datum und Uhrzeit des Zugriffs
- Aufgerufene URL
- User-Agent (Browser-Typ + Version)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse — Sicherheit + Performance-Optimierung)
**Speicherdauer:** 90 Tage (Netlify-Standard)
**Subprozessor:** Netlify Inc. (US, SCC + DPA)

### 4.2 Cookies und Local Storage
Wir verwenden **technisch notwendige Cookies und Local-Storage-Einträge** (Art. 6 Abs. 1 lit. f DSGVO + §25 Abs. 2 TTDSG):
- Authentifizierungs-Token (Sitzungs-Verwaltung)
- UI-Einstellungen (Theme, Sprache)
- Workspace-Kontext

**Wir setzen KEINE Tracking-Cookies** (kein Google Analytics, kein Facebook-Pixel, kein Tracking).

Ein Cookie-Banner wird in einem späteren Sprint integriert (`docs/master/PROVA-SPRINTS-MASTERPLAN.md` Sprint 05 P6).

### 4.3 Kontaktformulare
Wenn Sie unser Newsletter- oder Kontaktformular nutzen, werden folgende Daten verarbeitet:
- E-Mail-Adresse
- ggf. Name (optional)
- Anliegen / Nachricht

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) + Einwilligung (Newsletter)

---

## 5. Erhebung bei Nutzung der App (`app.prova-systems.de`)

Bei der Nutzung der PROVA-Software verarbeiten wir personenbezogene Daten in folgenden Bereichen:

### 5.1 Account-Anlage und Profil
- E-Mail-Adresse, Passwort (gehashed mit bcrypt)
- Sachverständigen-Stammdaten (Name, Adresse, IHK-Bestellnummer, Qualifikation)
- Briefkopf-Daten für Gutachten/Rechnungen
- Bankdaten (IBAN/BIC) für Rechnungs-Versand
- Foto/Stempel/Signatur (in Supabase Storage, EU)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
**Speicherdauer:** bis Vertragsende + 30 Tage Grace, dann Hard-Delete (außer gesetzliche Aufbewahrungspflichten)

### 5.2 Auftraggeber- und Akten-Daten
- Name, Adresse, Kontakt der Auftraggeber, Geschädigten, beteiligten Dritten
- Akten-Inhalte: Diktate, Befunde, Messwerte, §1-§7 Gutachten-Texte
- Foto-Anhänge der Schadensobjekte
- Aktenzeichen und Gerichts-Daten (bei Gerichtsgutachten)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO + §203 StGB (Schweigepflicht des SVs)
**Speicherdauer:** 10 Jahre nach Akten-Abschluss (§147 AO + SV-Berufsordnung)

### 5.3 Diktat-Audio und KI-Verarbeitung
- Audio-Aufnahmen (Diktate)
- Whisper-Transkription via OpenAI (Pseudonymisierung server-seitig nach Transkription)
- KI-Strukturierungshilfen (GPT-4o, GPT-4o-mini) mit pseudonymisierten Inputs

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO + Einwilligung (§407a ZPO Hinweis im Gutachten)
**Speicherdauer Audio:** bis Akten-Abschluss + 6 Monate
**KI-Pseudonymisierung:** alle Namen, Adressen, E-Mails, IBANs, Telefonnummern werden vor Übertragung an OpenAI durch Platzhalter ersetzt (`[NAME]`, `[EMAIL]`, etc.)

### 5.4 Zahlungsdaten
- E-Mail-Adresse für Stripe-Customer-Anlage
- Stripe-Customer-ID, Subscription-ID
- Zahlungsstatus, MRR-Snapshot

**WICHTIG:** Kreditkarten- und SEPA-Daten werden ausschließlich von Stripe verarbeitet (PCI-DSS-Compliance liegt bei Stripe). PROVA hat NIEMALS Zugriff auf Kreditkartennummern.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
**Speicherdauer:** 10 Jahre (§147 AO + §257 HGB)

### 5.5 Audit-Logs
- Login-Zeitpunkte, IP-Adresse (gekürzt), User-Agent
- Daten-Export-Anfragen, Daten-Lösch-Anfragen
- KI-Aufrufe (Modell, Tokens, Kosten — KEINE Inhalte)
- Stripe-Events

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse — Forensik) + Art. 5 Abs. 1 lit. f (Integrität)
**Speicherdauer:** 5 Jahre

---

## 6. Empfänger / Auftragsverarbeiter (Subprozessoren)

Wir setzen folgende Subprozessoren ein, die personenbezogene Daten ausschließlich auf unsere Weisung verarbeiten:

| Subprozessor | Sitz | Datenkategorien | Rechtsgrundlage |
|---|---|---|---|
| **Supabase Inc.** | US (Hosting Frankfurt EU) | Stammdaten, Akten, Foto-Files, Audit-Logs | Art. 6 (1) b + SCC + DPA |
| **OpenAI Ireland Ltd.** | IE (Verarbeitung US) | Pseudonymisierte Diktat-Texte, KI-Prompts | Art. 6 (1) b + SCC + DPA |
| **Stripe Payments Europe Ltd.** | IE (Dublin) | E-Mail, Zahlungs-Metadaten | Art. 6 (1) b — EU-Verarbeitung |
| **PDFMonkey SAS** | FR | Auftragsdaten zur PDF-Generierung | Art. 6 (1) b — EU-Verarbeitung |
| **Make.com (Celonis SE)** | CZ (Prag) | Webhook-Payloads | Art. 6 (1) f — EU-Verarbeitung |
| **Netlify Inc.** | US (Edge weltweit) | Frontend-Files (statisch), Function-Logs | Art. 6 (1) b + SCC + DPA |
| **Resend Inc.** | US | E-Mail-Adressen + Mail-Body-Inhalte | Art. 6 (1) b + SCC + DPA |
| **IONOS SE** | DE | DNS, Domain-Registry, SMTP | Art. 6 (1) b — EU-Verarbeitung |

Vollständige Subprozessoren-Übersicht: `prova-systems.de/data-processing`

---

## 7. Drittstaaten-Transfer (Art. 44 ff. DSGVO)

Daten werden an Subprozessoren in den USA übermittelt (OpenAI Verarbeitung, Netlify, Resend). Der Transfer erfolgt auf Grundlage:

- **Standardvertragsklauseln (SCC) der EU-Kommission** (2021/914 EU-Standardklauseln)
- **Data Processing Addenda (DPA)** mit den Subprozessoren
- **Technische Schutzmaßnahmen:** Pseudonymisierung vor Übertragung an OpenAI, Verschlüsselung in Transit (TLS 1.3) und at Rest (AES-256)

OpenAI nutzt API-Daten standardmäßig **NICHT** für Modell-Training (API-Default seit März 2023).

---

## 8. Speicherdauer (Übersicht)

| Datenkategorie | Speicherdauer | Rechtsgrundlage |
|---|---|---|
| User-Account (aktiv) | bis Kündigung + 30T Grace | Vertragserfüllung |
| Akten-Inhalte | 10 Jahre nach Akten-Abschluss | §147 AO + SV-Berufsordnung |
| Audio (Diktate) | bis Akten-Abschluss + 6 Mo | Vertragserfüllung |
| Audit-Logs | 5 Jahre | DSGVO Art. 5 + §147 AO |
| KI-Protokoll (anonymisiert) | 5 Jahre | DSGVO Art. 5 + Cost-Tracking |
| Zahlungsdaten | 10 Jahre | §147 AO + §257 HGB |
| Server-Logs (IP) | 90 Tage | Sicherheit |
| DSGVO-Einwilligungen | 5 Jahre nach Widerruf | Nachweisbarkeit |

---

## 9. Ihre Rechte (Art. 15-22 DSGVO)

Sie haben jederzeit folgende Rechte gegenüber uns als Verantwortlichem:

### 9.1 Auskunftsrecht (Art. 15)
Recht auf Auskunft über die zu Ihrer Person gespeicherten Daten.
**Selbstbedienung:** Profil-Page → "Meine Daten exportieren" → JSON-Export
**Manuell:** datenschutz@prova-systems.de

### 9.2 Berichtigungsrecht (Art. 16)
Recht auf unverzügliche Berichtigung unrichtiger Daten.
**Selbstbedienung:** alle PII-Felder im Frontend editierbar.

### 9.3 Löschungsrecht / "Recht auf Vergessenwerden" (Art. 17)
Recht auf Löschung personenbezogener Daten unter den Voraussetzungen des Art. 17.
**Selbstbedienung:** Profil-Page → "Account löschen" (30 Tage Grace + Hard-Delete)
**Einschränkung:** Akten-Inhalte und Zahlungsdaten unterliegen gesetzlichen Aufbewahrungspflichten und können nicht vor Ablauf dieser Fristen gelöscht werden.

### 9.4 Einschränkung der Verarbeitung (Art. 18)
Recht auf Einschränkung in den vorgesehenen Fällen.
**Anfrage:** datenschutz@prova-systems.de

### 9.5 Datenübertragbarkeit (Art. 20)
Recht auf Erhalt der bereitgestellten Daten in einem strukturierten, gängigen Format.
**Format:** JSON (analog zu Art. 15)

### 9.6 Widerspruchsrecht (Art. 21)
Recht auf Widerspruch gegen Verarbeitungen aufgrund Art. 6 Abs. 1 lit. f.

### 9.7 Recht auf Beschwerde (Art. 77)
Recht auf Beschwerde bei einer Aufsichtsbehörde:
- Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), wenn Marcel-Sitz Bayern ist
- *gelb: Anwalt finalisiert die zuständige Aufsichtsbehörde basierend auf Marcel-Sitz*

### 9.8 Widerruf der Einwilligung (Art. 7 Abs. 3)
Erteilte Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden.

---

## 10. Automatisierte Entscheidungsfindung / Profiling (Art. 22)

PROVA verwendet **keine** automatisierten Einzelfall-Entscheidungen oder Profiling im Sinne von Art. 22 DSGVO. KI-Strukturierungshilfen sind reine Vorschlags-Tools — die fachliche Bewertung trifft ausschließlich der Sachverständige.

(Marcel-Direktive Regel 8: „KI macht NIE eigenständige fachliche Bewertungen — nur strukturierte Hilfen".)

---

## 11. Datensicherheit

### Technische Maßnahmen
- TLS 1.3 / HTTPS erzwungen
- AES-256 Verschlüsselung in Ruhe (Supabase Postgres + Storage)
- Pseudonymisierung vor KI-Verarbeitung
- Multi-Tenancy via Row Level Security (60/60 Tabellen)
- Audit-Trail jeder sicherheitsrelevanten Aktion

### Organisatorische Maßnahmen
- 2FA für alle Admin-Accounts
- DSGVO-Schulungen
- Mitarbeiter-Vertraulichkeits-Erklärungen
- Regelmäßige interne Sicherheits-Audits

### Subprozessor-DPAs
Mit allen Subprozessoren bestehen Auftragsverarbeitungs-Verträge (AVV) gemäß Art. 28 DSGVO.

---

## 12. Aktualität dieser Erklärung

**Stand:** 03.05.2026 · Version 1.0

Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn rechtliche oder technische Änderungen dies erfordern. Die jeweils aktuelle Version finden Sie unter:
`https://prova-systems.de/datenschutz`

Bestehende User werden bei wesentlichen Änderungen via E-Mail informiert und ggf. um erneute Einwilligung gebeten.

---

*Datenschutzerklärung-Entwurf 03.05.2026 · Anwalt-Review pending vor Live-Schaltung*
