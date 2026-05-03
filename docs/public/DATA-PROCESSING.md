# PROVA Datenverarbeitung — Public-Übersicht

**Stand:** 03.05.2026 · Version 1.0
**Zielgruppe:** Pilot-SVs, zahlende Kunden, Auftraggeber-Transparenz

---

## In Kürze

PROVA verarbeitet Sachverständigen-Daten + Akten-Inhalte ausschließlich für die Vertragserfüllung der SV-Software. Hauptspeicher: **Supabase (Frankfurt EU)**. KI-Verarbeitung: **OpenAI (mit Pseudonymisierung)**. Zahlungen: **Stripe (EU)**.

**Keine Tracking-Cookies.** **Keine Daten-Verkäufe.** **Kein Profiling im DSGVO-Sinn.**

---

## Datenkategorien und Speicherorte

### 1. SV-Stammdaten
- Name, Adresse, IHK-Bestellnummer, Qualifikation
- Briefkopf-Daten, Bank-Daten (IBAN/BIC)
- Foto / Stempel / Signatur
- **Speicherort:** Supabase Postgres + Storage (Frankfurt EU)
- **Zugriff:** nur SV selbst (RLS-geschützt) + Marcel-Admin (zur Wartung)

### 2. Auftraggeber- und Akten-Daten
- Auftraggeber: Name, Adresse, Kontakt
- Akten-Inhalte: Diktate, Befunde, Messwerte, §1-§7 Gutachten-Texte
- Foto-Anhänge der Schadensobjekte
- **Speicherort:** Supabase Postgres + Storage (Frankfurt EU)
- **Zugriff:** nur zugehöriger Workspace (RLS-geschützt)

### 3. Diktat-Audio
- Audio-Aufnahmen für Whisper-Transkription
- **Speicherort:** Supabase Storage (Frankfurt EU)
- **Verarbeitung:** OpenAI Whisper (transient, keine OpenAI-Speicherung — Default seit 03/2023)

### 4. KI-verarbeitete Inhalte
- Pseudonymisierte Diktat-Texte für KI-Strukturierungshilfen
- KI-Outputs (mit Platzhaltern wie `[NAME]`, `[EMAIL]`)
- **Speicherort:** transient bei OpenAI (kein Speicher) + `ki_protokoll` (Token-Statistik) bei Supabase
- **Pseudonymisierung:** vor jedem KI-Call server-seitig

### 5. PDF-Gutachten
- Generierte Gutachten, Briefe, Rechnungen
- **Speicherort:** Supabase Storage (Frankfurt EU)
- **Generierung:** PDFMonkey (FR, EU) — temporärer Cache

### 6. Audit-Logs
- Login-Zeitpunkte, IP-Adresse (gekürzt)
- Daten-Export, Daten-Lösch-Anfragen
- KI-Aufrufe (Modell, Tokens — keine Inhalte)
- Stripe-Events
- **Speicherort:** Supabase `audit_trail`-Tabelle
- **Aufbewahrung:** 5 Jahre (DSGVO Art. 5 + §147 AO)

### 7. Zahlungsdaten
- E-Mail-Adresse, Stripe-Customer-ID, Subscription-ID
- **NICHT:** Kreditkartennummern (verarbeitet ausschließlich von Stripe)
- **Speicherort:** Stripe (Dublin, IE) + `workspaces.stripe_*` bei Supabase
- **Aufbewahrung:** 10 Jahre (§147 AO)

---

## Subprozessoren-Liste

Vollständige Transparenz aller Auftragsverarbeiter (Art. 28 DSGVO):

| Subprozessor | Sitz | Datenkategorien | EU/US-Transfer |
|---|---|---|---|
| **Supabase Inc.** | US (Hosting Frankfurt EU) | Stammdaten, Akten, Foto-Files, Audit-Logs, Auth-Tokens | EU-Hosting + SCC + DPA für US-Mutter |
| **OpenAI Ireland Ltd.** | IE (Verarbeitung US) | Pseudonymisierte Diktat-Texte, KI-Prompt-Inputs | SCC + DPA + Pseudonymisierung |
| **Stripe Payments Europe Ltd.** | IE (Dublin) | E-Mail, Zahlungs-Metadaten | EU-Verarbeitung |
| **PDFMonkey SAS** | FR | Auftragsdaten zur PDF-Generierung | EU-Verarbeitung |
| **Make.com (Celonis SE)** | CZ (Prag) | Webhook-Payloads (Trial-Reminder, Founding-Coupon) | EU-Verarbeitung |
| **Netlify Inc.** | US (Edge weltweit) | Frontend-Files (statisch), Function-Logs (anonymisiert) | SCC + DPA |
| **Resend Inc.** | US | E-Mail-Versand-Inhalte | SCC + DPA |
| **IONOS SE** | DE | DNS, Domain-Registry, SMTP | EU-Verarbeitung |

Mit allen Subprozessoren bestehen **Auftragsverarbeitungs-Verträge (AVV)** nach Art. 28 DSGVO.

Detaillierte Beschreibung: `prova-systems.de/avv` (nach Anwalts-Review)

---

## Pseudonymisierung vor KI-Verarbeitung

PROVA implementiert **server-seitige Pseudonymisierung** vor jedem Transfer an OpenAI:

### Wie es funktioniert

```
[Originaler Diktat-Text]
"Herr Müller aus 80331 München, Tel. 0176/1234567, hat …"

       ↓  ProvaPseudo.apply() (server-side, regex-basiert)

[Pseudonymisierter Text]
"[NAME] aus [PLZ-ORT], Tel. [TEL], hat …"

       ↓  → Transfer an OpenAI (sieht NUR Platzhalter)

[KI-Response]
"Es liegt nahe, dass [NAME] eine Schimmel-Belastung an [ADRESSE] festgestellt hat …"

       ↓  → Frontend (zeigt Platzhalter)

[SV löst mental auf — kein Reverse-Mapping gespeichert]
```

### Was wird pseudonymisiert
- Personennamen (mit Kontext-Trigger wie „Herr", „Frau", „Dr.", „Auftraggeber")
- E-Mail-Adressen
- IBAN (deutsch + international)
- Telefonnummern (deutsche Formate)
- Adressen (Straße + Hausnummer, PLZ + Ort)

### KEIN Reverse-Mapping
Server speichert keine Map `[NAME-1] → "Max Müller"`. Wenn die Map gestohlen wird → keine Datenwiederherstellung möglich. **DSGVO-best-practice.**

---

## Aufbewahrungsfristen

| Datenkategorie | Frist | Rechtsgrundlage |
|---|---|---|
| User-Account (aktiv) | bis Kündigung + 30T Grace | Vertragserfüllung |
| Akten-Inhalte | 10 Jahre nach Akten-Abschluss | §147 AO + SV-Berufsordnung |
| Audio (Diktate) | bis Akten-Abschluss + 6 Mo | Vertragserfüllung |
| Audit-Logs | 5 Jahre | DSGVO Art. 5 + §147 AO |
| KI-Protokoll (anonymisiert) | 5 Jahre | DSGVO Art. 5 + Cost-Tracking |
| Zahlungsdaten | 10 Jahre | §147 AO + §257 HGB |
| Server-Logs (IP gekürzt) | 90 Tage | Sicherheit |

---

## Datensubjekt-Rechte (DSGVO Art. 15-22)

PROVA implementiert technische Selbstbedienungs-Funktionen:

- **Art. 15 Auskunft:** Profil-Page → "Meine Daten exportieren" → JSON-Export
- **Art. 16 Berichtigung:** Direct-Edit aller PII-Felder im Frontend
- **Art. 17 Löschung:** Profil-Page → "Account löschen" (30T Grace + Hard-Delete)
- **Art. 20 Datenübertragbarkeit:** analog Art. 15, JSON-Format
- **Art. 21 Widerspruch:** datenschutz@prova-systems.de

---

## Cookie- und Tracking-Politik

### Was wir setzen (technisch notwendig)
- Auth-Token (Sitzungs-Verwaltung)
- UI-Einstellungen (Theme, Workspace-Kontext)
- Workspace-ID (Multi-Tenancy)

### Was wir NICHT setzen
- ❌ Google Analytics
- ❌ Facebook-Pixel
- ❌ Tracking-Cookies
- ❌ Werbe-Cookies
- ❌ Cross-Site-Tracking

Cookie-Banner wird in Sprint 05 P6 integriert (für minimale technische Cookies — keine Einwilligungs-Pflicht, aber Transparenz-Hinweis).

---

## Datensicherheit

Vollständige Sicherheits-Übersicht: `prova-systems.de/security` (oder `docs/public/SECURITY.md`)

### Verschlüsselung
- **In Transit:** TLS 1.3 (HSTS preload)
- **At Rest:** AES-256

### Zugriffs-Schutz
- Multi-Tenancy via Row Level Security (60/60 Tabellen, 100% Coverage)
- ES256 JWT mit JWKS-Verify
- 2-Faktor-Authentifizierung für Admin-Account

### Audit
- 22 interne Sicherheits-Audits (Mai 2026)
- Multi-Tenant-Isolation-Tests (33 Tests, CI-integriert)
- Externer Pentest geplant nach erstem Pilot-Cash

---

## Kontakt

**Verantwortlicher:**
Marcel Schreiber
PROVA Systems
*gelb: Anschrift einsetzen*

**Datenschutz-Anfragen:** datenschutz@prova-systems.de
**Sicherheits-Meldungen:** security@prova-systems.de
**Allgemeine Anfragen:** kontakt@prova-systems.de

---

## Versionierung

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 03.05.2026 | Initial-Public-Doc — Sprint S6 Phase 4 |

---

*Datenverarbeitungs-Übersicht 03.05.2026 · Public-Version für Pilot-SV-Vertrauen · DSGVO Art. 13/14-konform*
