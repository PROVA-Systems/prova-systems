# PROVA Sicherheits-Übersicht

**Stand:** 03.05.2026
**Zielgruppe:** Pilot-SVs, zahlende Kunden, IT-Audits

---

## In Kürze

- **🇪🇺 EU-Hosting** (Frankfurt) für alle Akten-Daten
- **🔒 Verschlüsselung** TLS 1.3 in Transit + AES-256 at Rest
- **👥 Multi-Tenancy** via Datenbank-Row-Level-Security (60/60 Tabellen, 100% Coverage)
- **🤖 Pseudonymisierung** vor jedem KI-Call (kein Klartext-Name an OpenAI)
- **📜 Audit-Trail** für alle sicherheitsrelevanten Aktionen (5 Jahre Aufbewahrung)
- **🔐 ES256 JWT** mit JWKS-Verifikation (asymmetric, Industry-Standard)
- **✅ 22 interne Sicherheits-Audits** durchgeführt (Mai 2026)
- **🏛 DSGVO-konform** (AVV mit allen Subprozessoren, Pseudonymisierung)

---

## Architektur-Sicherheit

### Datenhosting
- **Akten + Stammdaten:** Supabase Postgres (Frankfurt EU)
- **Foto-Anhänge + Audio:** Supabase Storage (Frankfurt EU)
- **PDF-Templates:** PDFMonkey (FR, EU)
- **Zahlungsabwicklung:** Stripe Payments Europe Ltd. (Dublin, IE)

### Authentifizierung
- **Supabase Auth** mit ES256 JWT (asymmetric Elliptic-Curve, Industry-Standard 2025+)
- **JWKS-Verifikation** server-seitig in jeder Function (Public-Key-Rotation automatic)
- **Multi-Faktor-Authentifizierung (2FA)** verpflichtend für Founder-Account

### Multi-Tenancy
- **Row Level Security (RLS)** auf allen 60 Datenbank-Tabellen
- **100% RLS-Coverage** verifiziert durch automatisierte Tests (33 Cross-Tenant-Tests, CI-integriert)
- Workspace-Isolation: User in Workspace A kann **nicht** auf Daten von Workspace B zugreifen
- Verifiziert via `workspace_id IN (SELECT get_user_workspaces())` in jeder Policy

### Verschlüsselung
- **In Transit:** TLS 1.3 erzwungen (HSTS mit `preload`-Direktive)
- **At Rest:** AES-256 (Supabase-Standard)
- **API-Keys:** in Netlify Vault gespeichert, niemals im Code

### KI und Datenschutz
PROVA pseudonymisiert **vor jeder KI-Verarbeitung** server-seitig:
- Namen → `[NAME]`
- E-Mail-Adressen → `[EMAIL]`
- IBANs → `[IBAN]`
- Telefonnummern → `[TEL]`
- Adressen → `[ADRESSE]`

OpenAI sieht **nur Platzhalter**, niemals Klartext-Personenbezug. **Kein Reverse-Mapping** wird gespeichert — der Sachverständige löst Platzhalter mental auf.

OpenAI nutzt API-Daten standardmäßig **nicht für Modell-Training** (API-Default seit März 2023).

---

## Audit-Status (Mai 2026)

| Audit | Coverage | Status |
|---|---|---|
| **OWASP ASVS 5.0 Level 1** | 138 Items, 88% Compliance | ✅ |
| **OWASP LLM Top 10 (2025)** | 10/10 Risiken bewertet | ✅ |
| **Supabase RLS-Coverage** | 60/60 Tabellen RLS aktiv | ✅ |
| **Multi-Tenant-Isolation-Tests** | 33 automatisierte Tests | ✅ |
| **Stripe-Webhook-Tests** | 18 Unit-Tests grün | ✅ |
| **Secret-Scan + Dep-Vuln** | npm audit clean | ✅ |
| **CSP + Security-Headers** | A-Grade (securityheaders.com) | ✅ |

**Letzter Audit-Durchlauf:** 02.-03.05.2026 (intern)
**Geplanter externer Pentest:** nach erstem Pilot-Cash (~3-5 Tage Boutique-Pentester)

---

## Subprozessoren

PROVA nutzt folgende Subprozessoren für die Datenverarbeitung. Alle haben einen **Auftragsverarbeitungs-Vertrag (AVV) nach Art. 28 DSGVO**:

| Anbieter | Rolle | Sitz |
|---|---|---|
| Supabase Inc. | Datenbank + Storage + Auth | US (Hosting Frankfurt EU) |
| OpenAI Ireland Ltd. | KI-Strukturierungshilfen | IE (Verarbeitung US, mit Pseudonymisierung) |
| Stripe Payments Europe Ltd. | Zahlungsabwicklung | IE (Dublin) |
| PDFMonkey SAS | PDF-Generation | FR |
| Make.com / Celonis SE | Workflow-Automation | CZ |
| Netlify Inc. | Hosting + Edge | US (mit DPA) |
| Resend Inc. | Transaktional-E-Mails | US (mit DPA) |
| IONOS SE | DNS + SMTP | DE |

Volle Transparenz: `prova-systems.de/data-processing`

---

## Backups und Disaster-Recovery

- **Tägliche Backups** der Datenbank (Supabase Pro-Plan, 7 Tage Retention)
- **Geplant: wöchentlicher pg_dump** zu separater Cold-Storage (Backblaze) — Backup-2-of-3-Regel
- **RTO** (Recovery Time Objective): < 30 Min
- **RPO** (Recovery Point Objective): < 24 Stunden
- **Restore-Drill** durchgeführt im Mai 2026

---

## Verantwortliche-Disclosure / Sicherheitslücken-Meldung

Sicherheitslücke gefunden? Bitte **vor öffentlicher Bekanntgabe** melden:

- **E-Mail:** security@prova-systems.de
- **PGP-Key:** *gelb: TBD Marcel veröffentlicht PGP-Key*
- **Antwort innerhalb:** 72 Stunden
- **Bug-Bounty:** noch nicht etabliert. Anerkennung in Hall-of-Fame.

Wir bitten um:
- Detaillierte Beschreibung der Schwachstelle
- Reproduktions-Schritte
- Mögliche Auswirkung
- Ihre Kontaktdaten (für Rückfragen + Anerkennung)

---

## Compliance-Frameworks

PROVA orientiert sich an folgenden Standards:

- **DSGVO** (Pflicht-Framework EU)
- **§203 StGB** (Schweigepflicht öbuv-SVs)
- **§407a ZPO** (KI-Hinweis-Pflicht bei Sachverständigengutachten)
- **OWASP ASVS 5.0** (Application Security Verification Standard, Level 1)
- **OWASP LLM Top 10 (2025)** (LLM-spezifische Risiken)

In Vorbereitung:
- **NIS2-Richtlinie** Self-Assessment (für Pilot-SVs ggf. relevant)
- **BSI IT-Grundschutz** Self-Assessment (optional)

---

## Verantwortlicher

**Marcel Schreiber**
PROVA Systems
*gelb: vollständige Anschrift wird in finalisierter Version eingesetzt*

E-Mail: kontakt@prova-systems.de
Sicherheits-Kontakt: security@prova-systems.de
Datenschutz: datenschutz@prova-systems.de

---

*PROVA Security 03.05.2026 · 1-Pager-Format für Pilot-SV-Vertrauen · Volle Detail-Doku: `docs/master/PROVA-ARCHITEKTUR-MASTER.md`*
