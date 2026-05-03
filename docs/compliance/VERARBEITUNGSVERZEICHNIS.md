# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)

**Verantwortlicher:** Marcel Schreiber, PROVA Systems, Hohenzollernring 12, 50672 Köln
**Datenschutzbeauftragter:** [Marcel-Manual nach Pilot >50 Pilots]
**Stand:** 04.05.2026 (MEGA⁶ S2)

---

## Tätigkeit 1 — User-Anlage und Authentifizierung

| Feld | Inhalt |
|---|---|
| **Zweck** | Anlage Benutzerkonto + Authentifizierung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | Email, Passwort-Hash (bcrypt), Vor-/Nachname, ggf. Adresse |
| **Empfänger** | Supabase EU (Frankfurt) — AVV unterzeichnet |
| **Drittland** | Nein (alle Daten EU) |
| **Aufbewahrung** | aktiv = unbegrenzt; nach Loeschung 30T Backup-Retention |
| **TOM** | RLS, Argon2/bcrypt, JWT-Auth, MFA optional |

## Tätigkeit 2 — Auftragsverarbeitung (SV-Akten)

| Feld | Inhalt |
|---|---|
| **Zweck** | Erstellung von Sachverständigen-Gutachten gemäß § 407a ZPO + IHK-SVO |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b + lit. f (berechtigtes Interesse SV-Tätigkeit) |
| **Datenkategorien** | Auftraggeber-Name, Adressen, Schadensbeschreibung, Fotos, Messwerte, Personendaten Dritter (Mieter/Bauherrn) |
| **Empfänger** | Supabase EU + PDFMonkey (PDF-Render) — AVVs |
| **Drittland** | PDFMonkey: USA (mit Standardvertragsklauseln + AVV) |
| **Aufbewahrung** | Mindestens 5 Jahre (BGB-Verjährung Werkvertrag) bis 30 Jahre (§ 407a ZPO Beweissicherung) |
| **TOM** | RLS, Workspace-Isolation, Foto-Storage in privaten Buckets, Pseudonymisierung vor KI-Calls |

## Tätigkeit 3 — KI-gestützte Strukturhilfe (OpenAI)

| Feld | Inhalt |
|---|---|
| **Zweck** | Strukturhilfe fuer SV (Konjunktiv-II-Pruefung, Halluzinations-Check, §407a-Compliance, Rechtschreibung). NIE eigenständige fachliche Bewertung. |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f (berechtigtes Interesse Plattform-Funktion) |
| **Datenkategorien** | Pseudonymisierte Texte (Namen/Adressen/IBAN durch Platzhalter ersetzt) |
| **Empfänger** | OpenAI (USA, mit AVV nach Art. 46) |
| **Drittland** | USA — mit Standardvertragsklauseln + Pseudonymisierung |
| **Aufbewahrung** | OpenAI: 30T (laut DPA), bei Opt-Out aus Training |
| **TOM** | Server-side Pseudonymisierung in `ki-proxy.js`, Audit-Logging in `ki_protokoll`, EU AI Act Art. 50 Disclosure |

## Tätigkeit 4 — Foto-Speicherung Ortstermin

| Feld | Inhalt |
|---|---|
| **Zweck** | Beweissicherung Schadensaufnahme |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b + lit. f |
| **Datenkategorien** | Bilder von Schäden, ggf. Personen-im-Hintergrund (incidentell) |
| **Empfänger** | Supabase Storage EU — privater Bucket `sv-files` |
| **Drittland** | Nein |
| **Aufbewahrung** | identisch Tätigkeit 2 (Akte-Lifecycle) |
| **TOM** | RLS, signed-URLs mit kurzer TTL, Foto-EXIF-GPS-Removal optional |

## Tätigkeit 5 — Email-Versand

| Feld | Inhalt |
|---|---|
| **Zweck** | Versand von Gutachten + Rechnungen + Onboarding-Mails |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b (Auftragserfuellung) + lit. a (Marketing-Optin) |
| **Datenkategorien** | Email, Name, Anhaenge (PDFs) |
| **Empfänger** | IONOS-SMTP (DE) ODER Resend (DE/EU) — AVVs |
| **Drittland** | Nein |
| **Aufbewahrung** | SMTP-Logs 30T (IONOS), Audit-Trail unbegrenzt |
| **TOM** | TLS, Authentifizierung User-spezifisch, kein Multi-Recipient-Smuggling (zod-Validation) |

## Tätigkeit 6 — Stripe-Zahlungsabwicklung

| Feld | Inhalt |
|---|---|
| **Zweck** | Bezahlung Pilot-Subscriptions |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b |
| **Datenkategorien** | Email, Stripe-Customer-ID, Subscription-Status |
| **Empfänger** | Stripe (USA, EU-Datenresidenz fuer Karten via Stripe Connect optional) |
| **Drittland** | USA (Standardvertragsklauseln + AVV) |
| **Aufbewahrung** | Stripe: 7 Jahre fuer Buchhaltung |
| **TOM** | Webhook-Signatur-Verifikation, idempotency-keys, kein PAN/CVC im PROVA-System |

## Tätigkeit 7 — Sentry Error-Tracking

| Feld | Inhalt |
|---|---|
| **Zweck** | Fehleranalyse + Stabilitäts-Monitoring |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f (berechtigtes Interesse IT-Sicherheit) |
| **Datenkategorien** | Stack-Traces, HTTP-Method/Path, pseudonymisierte User-Email + Workspace-ID |
| **Empfänger** | Sentry GmbH (DE, ingest.de.sentry.io) — AVV |
| **Drittland** | Nein (DE-Region) |
| **Aufbewahrung** | 90T |
| **TOM** | beforeSend-PII-Filter (Header/Body/Email redacted), Pseudonymisierung Tags |

## Tätigkeit 8 — Audit-Logging

| Feld | Inhalt |
|---|---|
| **Zweck** | Nachweispflicht (Art. 5 Abs. 2) + Sicherheits-Forensik |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f + Art. 5 Abs. 2 (Rechenschaftspflicht) |
| **Datenkategorien** | sv_email, typ-Event, IP-Hint (3 Octets), Details-JSON |
| **Empfänger** | Supabase EU |
| **Drittland** | Nein |
| **Aufbewahrung** | 1 Jahr (technisch); danach Anonymisierung |
| **TOM** | RLS, IP-Maskierung (3 Octets statt voll), kein PAN/SECRET-Logging |

## Tätigkeit 9 — Backup + Disaster-Recovery

| Feld | Inhalt |
|---|---|
| **Zweck** | Wiederherstellbarkeit (Art. 32 lit. b) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f (Datensicherheit) |
| **Datenkategorien** | Vollständige DB-Snapshots |
| **Empfänger** | Supabase EU (Frankfurt-Region) |
| **Drittland** | Nein |
| **Aufbewahrung** | 7T Default (Free-Tier), bis 30T konfigurierbar (Pro-Tier) |
| **TOM** | AES-256 at-rest, Pseudonymisierungs-Verlust bei Restore akzeptiert (gleiche Schutzstufe) |

## Tätigkeit 10 — DSGVO-Auskunft + Loeschung

| Feld | Inhalt |
|---|---|
| **Zweck** | Erfuellung Betroffenenrechte (Art. 17, 20) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c (gesetzliche Pflicht) |
| **Datenkategorien** | Selbst-Daten des Betroffenen |
| **Empfänger** | nur Betroffener selbst (per Email-Bestaetigung) |
| **Drittland** | Nein |
| **Aufbewahrung** | Anfrage-Log 1J, Daten selbst entfernt |
| **TOM** | dsgvo-handler-Endpoints mit Auth + Audit-Trail |

---

## Subprozessoren-Liste (Art. 28)

Siehe `docs/compliance/AVV-LISTE.md`.

---

*Verzeichnis-Stand 04.05.2026 — review jaehrlich.*
