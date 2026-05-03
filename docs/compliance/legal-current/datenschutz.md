# Datenschutzerklärung — PROVA Systems

**Stand:** 04.05.2026 (Draft fuer Anwalt-Review)
**Verantwortlicher:** Marcel Schreiber, PROVA Systems, Hohenzollernring 12, 50672 Köln, Email: kontakt@prova-systems.de

---

## 1. Allgemeines

Diese Datenschutzerklärung gilt für die Nutzung von prova-systems.de + app.prova-systems.de.

## 2. Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)

Marcel Schreiber, PROVA Systems
Hohenzollernring 12, 50672 Köln
Email: kontakt@prova-systems.de

## 3. Datenschutzbeauftragter

Bei der derzeitigen Unternehmensgröße (<20 Mitarbeiter) besteht keine Pflicht zur Bestellung. Bei Aufnahme >50 Pilots wird ein DSB extern bestellt.

## 4. Welche Daten verarbeiten wir?

### 4.1 Bei Registrierung
- Email, Passwort-Hash (bcrypt), Vor-/Nachname
- Berufliche Adresse + IHK-Bestellungs-Stelle
- Stripe-Customer-ID (nach erstem Bezahl-Vorgang)

### 4.2 Bei Auftragsbearbeitung
- Auftraggeber-Daten (eingegeben durch SV)
- Schadensbeschreibungen, Befunde, Fotos
- Diktat-Audios (transkribiert via Whisper)
- KI-Verarbeitungs-Protokolle (`ki_protokoll`)

### 4.3 Bei Plattform-Nutzung
- Audit-Trail-Events (typ + sv_email + IP-Hint 3 Octets)
- Sentry Error-Tracking (mit PII-Filter)
- Stripe-Webhook-Events

## 5. Zwecke + Rechtsgrundlagen

| Zweck | Rechtsgrundlage |
|---|---|
| Vertragserfuellung (Account, Auftraege) | Art. 6 Abs. 1 lit. b |
| KI-Strukturhilfe | Art. 6 Abs. 1 lit. f + Pseudonymisierung |
| Audit-Logging | Art. 6 Abs. 1 lit. f (IT-Sicherheit, Art. 32) |
| Stripe-Zahlung | Art. 6 Abs. 1 lit. b |
| Email-Newsletter | Art. 6 Abs. 1 lit. a (Einwilligung, opt-in) |

## 6. KI-Verarbeitung (EU AI Act Art. 50)

PROVA nutzt OpenAI GPT-4o + Whisper als **Strukturhilfen**. Sie machen KEINE eigenständigen Bewertungen. Das Fachurteil verbleibt zwingend beim Sachverständigen.

**Schutzmaßnahmen:**
- Server-side Pseudonymisierung VOR Übertragung an OpenAI (Namen → [PERSON], Adressen → [STRASSE], IBAN → [IBAN])
- OpenAI-DPA mit Standardvertragsklauseln
- Audit-Logging in `ki_protokoll`
- EU AI Act Art. 50 Disclosure in jedem PDF (Teil 1.3 + Teil 4.3)

## 7. Subprozessoren

Siehe `avv.html` (Anlage 2). Aktueller Stand:

| Anbieter | Sitz | Zweck |
|---|---|---|
| Supabase Inc. | EU (Frankfurt) | Datenbank + Auth + Storage |
| Sentry GmbH | DE | Error-Tracking |
| Stripe Inc. | USA + EU | Zahlung |
| OpenAI L.L.C. | USA | KI-Strukturhilfe (mit Pseudonymisierung) |
| PDFMonkey | USA | PDF-Generierung |
| Resend Inc. / IONOS | USA / DE | Email |
| Netlify Inc. | USA | Hosting |
| Make.com | USA + EU | Workflow-Automation (auslaufend) |

Drittland-Transfer in USA: Standardvertragsklauseln (SCC) + EU-US Data Privacy Framework (DPF) + Pseudonymisierung wo technisch möglich.

## 8. Speicherdauer

| Datenkategorie | Aufbewahrung |
|---|---|
| Account-Daten | Solange aktive Subscription + 30T Backup-Retention |
| Auftrags-Daten + PDFs | 5-30 Jahre (BGB-Verjährung Werkvertrag bis § 407a-Beweissicherung) |
| Audit-Trail | 1 Jahr (technisch), danach Anonymisierung |
| KI-Protokolle (`ki_protokoll`) | 6 Monate (Cost-Tracking + Migration-Verifikation) |
| Stripe-Daten | 7 Jahre (Buchhaltungs-Pflicht) |
| Sentry-Errors | 90 Tage |

## 9. Betroffenenrechte

Sie haben Anspruch auf:
- **Auskunft** (Art. 15) — via `dsgvo-auskunft`-Endpoint oder Email
- **Berichtigung** (Art. 16) — direkt in Account-Settings oder via Email
- **Loeschung** (Art. 17) — via `dsgvo-loeschen`-Endpoint
- **Datenuebertragbarkeit** (Art. 20) — JSON-Export via Account-Settings
- **Widerspruch** (Art. 21) — jederzeit per Email
- **Beschwerde bei Aufsichtsbehoerde:** LDI NRW (Düsseldorf)

## 10. Cookies + Tracking

PROVA setzt **keine Marketing-Cookies**. Nur funktional notwendige Cookies (Session-Token).

Kein Google Analytics, kein Facebook Pixel, kein Hotjar.

Sentry setzt KEINE Cookies (DSGVO-konforme Konfiguration).

## 11. Datensicherheit (TOM)

- Verschluesselung at-rest: AES-256 (Supabase)
- Verschluesselung in-transit: TLS 1.3
- RLS (Row-Level-Security) workspace-isoliert
- MFA fuer Admin-Zugriff
- Pseudonymisierung vor Drittland-Transfer
- Backup mit Point-in-Time-Recovery (Supabase)
- Sentry beforeSend-PII-Filter

## 12. Aenderungen

PROVA behaelt sich vor, diese Datenschutzerklärung anzupassen. Nutzer werden bei wesentlichen Aenderungen via Email + Forced-Re-Consent informiert.

---

**Fragen für Anwalt-Review:**
- Sind alle Subprozessoren mit Drittland-Status korrekt benannt?
- KI-Verarbeitung: Reicht das berechtigte Interesse + Pseudonymisierung, oder zusätzliche Einwilligung pro Auftrag?
- Speicherdauer-Tabelle vollständig?
- Cookie-Banner-Pflicht trotz fehlender Tracking-Cookies?

---

*Datenschutzerklärung Draft 04.05.2026 — Pflicht-Review vor Pilot-Launch.*
