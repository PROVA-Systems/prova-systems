# Auftragsverarbeitungs-Vertrag (AVV) — Anlage zum Hauptvertrag

**Stand:** 03.05.2026
**Version:** 1.0 Skeleton (Anwalt-Review pending — siehe gelb markierte Stellen)
**Zwischen:** PROVA Systems (Auftragnehmer) und SV-Büro (Auftraggeber/Verantwortlicher)

> ⚠️ **DIESES DOKUMENT IST ENTWURF.** Vor erstem Pilot-SV-Einsatz **DSGVO-Anwalt-Review pflicht.** Kursive gelb markierte Stellen sind Anwalts-Entscheidung. Marcel-Aktion: Termin DSGVO-Anwalt buchen (siehe `docs/audit/MARCEL-PFLICHT-AKTIONEN.md`).

---

## Präambel

Dieser Auftragsverarbeitungs-Vertrag (nachfolgend „AVV") konkretisiert die datenschutzrechtlichen Verpflichtungen, die sich aus der Auftragsverarbeitung im Rahmen der Nutzung der PROVA-Software ergeben. Er ist Anlage zum Hauptvertrag und wird gemäß Art. 28 DSGVO geschlossen.

---

## §1 Gegenstand und Dauer

### 1.1 Gegenstand
Auftragsverarbeitung personenbezogener Daten im Rahmen der Bereitstellung der PROVA-Software-as-a-Service-Plattform für öffentlich bestellte und vereidigte Sachverständige (ö.b.u.v. SV) im Bereich Bauschäden.

### 1.2 Art und Zweck
- Erfassung und Speicherung von Sachverständigen-Stammdaten
- Verwaltung von Bauschadens-Akten (Auftraggeber, Befunde, Diktate, Fotos, Gutachten)
- KI-gestützte Strukturierungshilfen mit Pseudonymisierung vor jeder KI-Verarbeitung
- PDF-Erstellung von Gutachten, Briefen und Rechnungen
- E-Mail-Versand und Termin-Verwaltung
- Zahlungsabwicklung über Stripe

### 1.3 Dauer
Laufzeit des Hauptvertrags (Solo/Team/Founding-Abo). Endet automatisch mit Beendigung der PROVA-Nutzung.

---

## §2 Kategorien betroffener Personen

- **Auftraggeber des SVs** — Privatpersonen, Unternehmen, Behörden, Versicherungen
- **Geschädigte / Eigentümer** — wenn nicht identisch mit Auftraggeber
- **Beteiligte Dritte** — Bauunternehmen, Architekten, weitere Sachverständige (Anschriften, Kontakte)
- **Prozess-Beteiligte** — Gerichte (Aktenzeichen, Adresse), Anwälte, Versicherungen

---

## §3 Kategorien personenbezogener Daten

### 3.1 Stammdaten
- Name, Adresse, Telefon, E-Mail
- ggf. Geburtsdatum (bei Privat-Auftraggebern)
- Berufsbezeichnung / Firmierung

### 3.2 Vertragsdaten
- Auftragstyp und Aktenzeichen
- Honorar-Daten (JVEG-Sätze, Rechnungsbeträge)
- Schadenart (Wasserschaden, Schimmel, etc.)

### 3.3 Inhaltsdaten
- Diktat-Audios (Whisper-Transkription)
- Sichtbefunde und Messwerte
- Foto-Anhänge der Schadensobjekte
- Texte des Sachverständigen-Gutachtens (§1-§7)

### 3.4 Bankdaten
- IBAN/BIC für Rechnungsstellung (NICHT Kreditkarten — diese liegen ausschließlich bei Stripe)
- Zahlungsstatus

### 3.5 Nutzungsdaten
- Login-Zeitpunkte, IP-Adressen (nur in Audit-Log, gehasht/gekürzt)
- KI-Nutzungs-Statistik (anonymisiert)

### 3.6 NICHT erhoben werden
- Gesundheitsdaten (außer wenn explizit für Schadensbewertung relevant)
- Strafregister-Daten
- politische / religiöse / sexuelle-Orientierung-Daten
- biometrische Daten

---

## §4 Pflichten des Auftragnehmers (PROVA Systems)

### 4.1 Verarbeitung nur auf dokumentierte Weisung
PROVA verarbeitet personenbezogene Daten ausschließlich nach dokumentierter Weisung des Verantwortlichen. Weisungen ergeben sich aus diesem Vertrag und aus der bestimmungsgemäßen Nutzung der Software.

### 4.2 Vertraulichkeit
- Marcel Schreiber als Solo-Founder: NDA zwischen Mitgesellschaftern und Freelancern
- Mitarbeiter und Auftragnehmer (Freelancer) sind zur Verschwiegenheit verpflichtet
- *gelb: Anwalt-Review: Mustertext für DSGVO-Vertraulichkeitserklärung Mitarbeiter*

### 4.3 Technische und organisatorische Maßnahmen
Siehe Anlage 1 (TOM).

### 4.4 Subprozessoren
Siehe Anlage 2 (Subprozessoren-Liste).

### 4.5 Unterstützung bei Datensubjekt-Anfragen
PROVA stellt technische Funktionen bereit:
- DB-Function `dsgvo_user_export()` für Art. 15 Auskunft
- DB-Function `dsgvo_user_loeschen()` für Art. 17 Löschung
- Direct-Edit aller PII-Felder im Frontend für Art. 16

### 4.6 Meldung von Datenschutz-Verletzungen
- Binnen 72h nach Kenntniserlangung an Verantwortlichen
- Per Email an Verantwortlichen-Email aus Hauptvertrag
- Kontakt: security@prova-systems.de
- Detaillierter Plan: `docs/public/INCIDENT-RESPONSE.md`

### 4.7 Prüfungs-Rechte
Verantwortlicher hat Recht auf Audit-Nachweise + ggf. Vor-Ort-Audit (mit angemessener Vorankündigung, max. 1×/Jahr, auf eigene Kosten).

---

## §5 Rückgabe und Löschung nach Vertragsende

### 5.1 Daten-Export
Auf Anforderung Daten-Export als JSON-Archiv binnen 14 Tagen nach Vertragsende.

### 5.2 Löschung
Hard-Delete der personenbezogenen Daten **30 Tage nach Vertragsende** (Grace-Period).

### 5.3 Aufbewahrungs-Pflichten
Davon ausgenommen sind Daten, die einer gesetzlichen Aufbewahrungspflicht unterliegen:
- Audit-Logs: 5 Jahre (DSGVO Art. 5 Abs. 1 lit. f + §147 AO)
- Zahlungsdaten: 10 Jahre (§147 AO + §257 HGB)
- Akten-Inhalte: 10 Jahre nach Akten-Abschluss (§147 AO + SV-Berufsordnung)

---

## §6 Haftung

*gelb: Anwalt-Review — folgender Text ist Vorschlag, Anwalt entscheidet ob angemessen:*

Beschränkung auf 12 Monatsbeiträge des Hauptvertrags (außer bei Vorsatz oder grober Fahrlässigkeit). Kein Schadensersatz für entgangene Aufträge oder Reputationsschäden, wenn diese durch KI-Hilfsmittel-Versagen entstehen, da Pilot-Status bekannt ist und KI-Funktions-Garantie-Tests erfolgten.

---

## §7 Schlussbestimmungen

### 7.1 Schriftform
Änderungen dieses AVV bedürfen der Schriftform.

### 7.2 Gerichtsstand
*gelb: Anwalt-Review — Vorschlag: Marcels Sitz (TBD beim Anwalts-Termin festlegen)*

### 7.3 Anwendbares Recht
Deutsches Recht unter Ausschluss des UN-Kaufrechts.

### 7.4 Salvatorische Klausel
Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.

---

# Anlage 1 — Technische und Organisatorische Maßnahmen (TOM)

## 1. Vertraulichkeit (DSGVO Art. 32 Abs. 1 lit. b)

### Zugangskontrolle
- HTTPS / TLS 1.3 erzwungen für alle Verbindungen
- HSTS-Header mit `preload`-Direktive
- Strict-Transport-Security: `max-age=31536000; includeSubDomains; preload`

### Zugriffskontrolle
- Multi-Tenancy via Supabase Row Level Security (RLS)
- 60 Tabellen — alle 60 mit RLS aktiviert (100% Coverage, Audit 03.05.2026)
- Authentifizierung: Supabase Auth ES256 JWT (asymmetric, JWKS-Verify)
- 2-Faktor-Authentifizierung verpflichtend für Founder-Account (Marcel)
- Service-Role-Key NUR server-seitig, niemals im Frontend

### Verschlüsselung
- Daten in Ruhe: AES-256 (Supabase Postgres + Storage)
- Daten in Transit: TLS 1.3
- Pseudonymisierung vor jedem KI-Call (Server-Side, regex-basiert)

## 2. Integrität (DSGVO Art. 32 Abs. 1 lit. b)

- Versionskontrolle aller Code-Änderungen via Git
- Audit-Trail jeder sicherheitsrelevanter Aktion (Login, Daten-Export, KI-Aufruf, Stripe-Event)
- Append-Only-Logs (Audit-Trail INSERT-Policy mit user_id-Konsistenz-Check, Migration pending)
- Stripe-Webhook-Signature-Verify (HMAC-SHA256)

## 3. Verfügbarkeit (DSGVO Art. 32 Abs. 1 lit. b)

- Hosting: Supabase Pro-Plan mit täglichem Backup (7 Tage Retention)
- Multi-Region-Edge-Hosting: Netlify Frontend + Supabase Frankfurt
- Geplant: wöchentlicher pg_dump zu eigener Cold-Storage (Backblaze, S3-kompatibel) — *gelb: Marcel-Aktion ausstehend*

## 4. Belastbarkeit (DSGVO Art. 32 Abs. 1 lit. b)

- Service-Role nur server-side (RLS-Bypass nur für autorisierte Webhooks/Migrations)
- Rate-Limiting auf KI-Endpoints + Auth-Endpoints (in Ausarbeitung — siehe Audit 4)
- Idempotency-Keys für Stripe-Webhook + Checkout

## 5. Wiederherstellung nach Zwischenfall (DSGVO Art. 32 Abs. 1 lit. c)

- Supabase-Backup-Restore-Drill: durchgeführt (TBD Marcel — `docs/audit/2026-05-02-backup-restore-drill.md`)
- Recovery Time Objective (RTO): < 30 Min
- Recovery Point Objective (RPO): < 24h (täglicher Backup)

## 6. Verfahren regelmäßiger Überprüfung (DSGVO Art. 32 Abs. 1 lit. d)

### Interne Audits (durchgeführt 02.05.→03.05.2026)
- 22 Audits nach OWASP ASVS 5.0 Level 1
- OWASP LLM Top 10 (KI-spezifische Risiken)
- Supabase RLS-Coverage 60/60 Tabellen
- Multi-Tenant-Isolation-Test-Suite (33 automatisierte Tests, CI-integriert)

### Externe Audits (geplant)
- Externer Pentest nach erstem Pilot-Cash (ca. 3.000-5.000€)
- Boutique-Pentester bevorzugt (siehe `docs/strategie/PENTEST-BRIEFING.md`)
- Wiederholungs-Audit jährlich

### Continuous Monitoring
- GitHub Actions: Multi-Tenant-Isolation-Tests bei jedem PR
- npm audit: bei jedem Deploy

---

# Anlage 2 — Subprozessoren-Liste

| Subprozessor | Sitz | Datenkategorien | Rechtsgrundlage | Transfer-Mechanismus |
|---|---|---|---|---|
| **Supabase Inc.** | US (Hosting Frankfurt EU, AWS eu-central-1) | Stammdaten, Akten, Foto-Files, Audit-Logs, Auth-Tokens | Art. 6 Abs. 1 lit. b | EU-Hosting, US-Mutter via SCC + DPA |
| **OpenAI Ireland Ltd.** | IE (API-Endpoints US) | Pseudonymisierte Diktat-Texte, KI-Prompt-Inputs | Art. 6 Abs. 1 lit. b + Pilot-SV-Einwilligung §407a | EU-Mutter, US-Verarbeitung via SCC + Pseudonymisierung |
| **Stripe Payments Europe Ltd.** | IE (Dublin) | Email, Stripe-Customer-ID (NICHT Kreditkarten) | Art. 6 Abs. 1 lit. b | EU-Verarbeitung |
| **PDFMonkey SAS** | FR | Auftragsdaten zur PDF-Generierung, Briefkopf-Daten | Art. 6 Abs. 1 lit. b | EU-Verarbeitung |
| **Make.com (Celonis SE)** | CZ (Prag) | Webhook-Payloads (Trial-Reminder, Founding-Coupon) | Art. 6 Abs. 1 lit. f | EU-Verarbeitung |
| **Netlify Inc.** | US (Hosting San Francisco + Edge weltweit) | Frontend-Files (statisch), Function-Logs (anonymisiert) | Art. 6 Abs. 1 lit. b + lit. f | US-Verarbeitung via SCC + DPA |
| **Resend (Resend Inc.)** | US | E-Mail-Adressen + Mail-Body-Inhalte | Art. 6 Abs. 1 lit. b | US-Verarbeitung via SCC + DPA |
| **IONOS SE** | DE | DNS, Domain-Registry, SMTP | Art. 6 Abs. 1 lit. b | EU-Verarbeitung |

**Aktualisierte Liste:** `docs/master/PROVA-ARCHITEKTUR-MASTER.md` Subprozessoren-Sektion

### Marcel-Pflicht-Aktionen (Subprozessor-DPAs)

- [ ] OpenAI Business-Account anlegen + DPA anfordern
- [ ] PDFMonkey DPA anfordern (info@pdfmonkey.io)
- [ ] Resend DPA anfordern (über Dashboard)
- [ ] Netlify Pro Plan verifizieren (DPA inklusive)
- [ ] Make.com DPA prüfen
- [ ] Supabase Standard-AVV Status verifizieren
- [ ] Stripe-AVV bereits durch Akzeptanz Stripe-Terms geschlossen

---

# Anlage 3 — Pseudonymisierungs-Verfahren

PROVA implementiert Pseudonymisierung als Defense-in-Depth vor jedem Transfer an KI-Subprozessoren (OpenAI):

### Server-Side-Pseudonymisierung
**Datei:** `netlify/functions/lib/prova-pseudo.js`

### Erkannte Pattern (Regex)
1. **IBAN** (deutsch + international): `\bDE\s?\d{2}(?:\s?\d{4}){4}\s?\d{2}\b` → `[IBAN]`
2. **E-Mail**: `[\w.+-]+@[\w-]+(?:\.[\w-]+)+` → `[EMAIL]`
3. **Telefon** (deutsche Formate, +49, 0…, 0176…): → `[TEL]`
4. **PLZ + Ort**: `\b\d{5}\s+[A-ZÄÖÜ]…` → `[PLZ-ORT]`
5. **Straße + Hausnummer**: `…(?:straße|weg|platz|allee|…)\s+\d+` → `[ADRESSE]`
6. **Personen-Namen mit Kontext-Trigger**: `(?:Herr|Frau|Dr\.|Auftraggeber|…)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+){0,4})` → `[NAME]`

### Reverse-Audit
Nach Pseudonymisierung prüft `ProvaPseudo.audit()` ob noch erkennbare PII durchrutscht. Bei Treffer: Console-Warning + ggf. Alert.

### KEIN Reverse-Mapping
Server speichert keine Map `[NAME-1] → "Max Müller"`. KI-Output enthält nur Platzhalter — SV löst mental auf. Begründung: keine Reverse-Map kann gestohlen werden, DSGVO-best-practice.

---

# Unterschriften

**Auftragnehmer:**
PROVA Systems
Marcel Schreiber, Founder
*gelb: Adresse — Anwalt finalisiert*

Datum: ____________________  Unterschrift: ____________________

**Verantwortlicher:**
*[SV-Büro-Name + Adresse — vom Pilot-SV ausgefüllt]*

Datum: ____________________  Unterschrift: ____________________

---

*AVV-Vorlage 03.05.2026 · Anwalt-Review pending — gelb markierte Stellen finalisieren · Skeleton-Status 1.0*
