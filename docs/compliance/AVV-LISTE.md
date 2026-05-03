# AVV-Liste — Auftragsverarbeitungs-Verträge (Art. 28 DSGVO)

**Stand:** 04.05.2026 (MEGA⁶ S2)
**Verantwortlicher:** PROVA Systems / Marcel Schreiber

---

## Subprozessoren-Übersicht

| Anbieter | Region | Zweck | AVV-Status | Datenkategorien | Drittland-Schutz |
|---|---|---|---|---|---|
| **Supabase Inc.** | EU (Frankfurt) | Datenbank + Auth + Storage | ✅ unterzeichnet | Alle Stamm- und Auftragsdaten | n/a (EU) |
| **Sentry GmbH** | EU (DE, ingest.de.sentry.io) | Error-Tracking | ✅ unterzeichnet (DPA via dashboard) | Stack-Traces, pseudonymisierte User-IDs | n/a (DE) |
| **Stripe, Inc.** | USA (mit EU-Datenresidenz möglich) | Zahlungsabwicklung | ✅ Standardvertragsklauseln + DPA | Email, Karten-Token, Subscription-Status | SCC + Adequacy-Decision EU-US Data Privacy Framework |
| **OpenAI L.L.C.** | USA | KI-Strukturhilfe (GPT-4o, Whisper) | ✅ Standardvertragsklauseln + DPA | Pseudonymisierte Texte (keine Klardaten!) | SCC + Pseudonymisierung |
| **PDFMonkey** | USA | PDF-Generierung | ✅ Standardvertragsklauseln + DPA | Akten-Daten zur PDF-Erstellung | SCC |
| **Make.com (Celonis)** | EU + USA | Workflow-Automation (Sprint K-1.5 Cutover-Phase) | ✅ DPA | Trigger-Daten (z.B. Akten-IDs) | SCC + EU-Default |
| **Resend** | USA / EU | Transaktions-Email | ✅ DPA (EU-Region nutzbar) | Email + PDF-Anhaenge | SCC |
| **IONOS SE** | EU (Karlsruhe) | Email-SMTP + Domain | ✅ AVV in Hosting-Vertrag | Email-Versand-Logs | n/a (EU) |
| **Netlify, Inc.** | USA | Hosting + CDN | ✅ Standardvertragsklauseln + DPA | nur statische Assets + Function-Aufrufe | SCC |
| **Cloudflare** | indirekt via Netlify | CDN + DDoS-Schutz | ✅ DPA (Netlify-vertraglich) | Request-Headers | SCC |

---

## AVV-Detail-Information pro Subprozessor

### Supabase Inc. (Datenbank + Auth + Storage)

- **Sitz:** USA, Datenresidenz EU (Frankfurt)
- **Sub-Subprozessoren:** AWS (Frankfurt) — verifiziert ueber Supabase-Dashboard
- **AVV-Datum:** [Marcel-Pflicht: in Supabase Dashboard → Settings → DPA → Sign Date dokumentieren]
- **Datenkategorien:** Vollstaendige PROVA-DB (Workspaces, Users, Auftraege, Audit-Trail, Storage-Files)
- **Aufbewahrung:** Solange aktive Subscription + 30T Backup-Retention nach Cancellation
- **Loesch-Pflicht:** Auf Anfrage Marcel via Supabase-Support
- **TOM:** AES-256 at-rest, TLS 1.3, RLS, MFA fuer Admin-Console

### Sentry GmbH (Error-Tracking)

- **Sitz:** Deutschland, Datenresidenz Deutschland (ingest.de.sentry.io)
- **Sub-Subprozessoren:** keine
- **AVV-Datum:** [Marcel-Pflicht: in Sentry Dashboard → Settings → Legal → Sign DPA]
- **Datenkategorien:** Stack-Traces, HTTP-Method/Path, pseudonymisierte User-Email-Tags, Workspace-IDs
- **Aufbewahrung:** 90T (Default-Sentry-Plan)
- **PII-Filter:** beforeSend in `lib/sentry-wrap.js` (PROVA-Eigenleistung)

### Stripe Inc. (Zahlungen)

- **Sitz:** USA (Subsidiary Stripe Payments Europe DAC fuer EU)
- **Sub-Subprozessoren:** AWS, Cloudflare (laut Stripe-DPA Anlage 1)
- **AVV-Datum:** [Marcel-Pflicht: bei Stripe-Account-Anlage automatisch akzeptiert]
- **Datenkategorien:** Email, Karten-Token (kein PAN/CVC bei PROVA), Subscription-Status
- **Aufbewahrung:** 7 Jahre (Buchhaltungs-Pflicht)
- **Drittland-Schutz:** EU-US Data Privacy Framework + SCC (Modules 2 + 3) + Pseudonymisierung wo möglich

### OpenAI L.L.C. (KI-Verarbeitung)

- **Sitz:** USA
- **Sub-Subprozessoren:** Microsoft Azure (laut OpenAI Enterprise DPA)
- **AVV-Datum:** [Marcel-Pflicht: OpenAI Console → Billing → DPA Sign Date]
- **Datenkategorien:** **NUR pseudonymisierte Texte** (Server-side in `ki-proxy.js` vor Sendung) — KEINE Klardaten
- **Aufbewahrung:** 30T bei OpenAI (laut DPA), bei Opt-Out aus Training-Data-Use
- **Drittland-Schutz:** SCC + Pseudonymisierung + Opt-Out

### PDFMonkey (PDF-Generierung)

- **Sitz:** USA
- **Sub-Subprozessoren:** AWS
- **AVV-Datum:** [Marcel-Pflicht]
- **Datenkategorien:** Akten-Daten (Liquid-Variablen) + Resultat-PDFs
- **Aufbewahrung:** PDFs nach Generation 7T (PDFMonkey-Default), dann gelöscht
- **Drittland-Schutz:** SCC

### Make.com / Celonis Inc. (Workflow-Automation, Legacy)

- **Sitz:** USA + EU
- **Sub-Subprozessoren:** Cloudflare, AWS
- **AVV-Datum:** akzeptiert in Make-Account-Settings
- **Datenkategorien:** Trigger-Daten (z.B. Akten-IDs, Webhook-Bodies)
- **Status:** wird in Sprint K-1.5 Cutover schrittweise abgelöst

### Resend (Email)

- **Sitz:** USA, EU-Region nutzbar
- **AVV-Datum:** [Marcel-Pflicht beim Resend-Setup]
- **Datenkategorien:** Email-Adresse, Empfaenger, PDF-Anhaenge
- **Aufbewahrung:** Logs 30T

### IONOS SE (Email-SMTP)

- **Sitz:** Deutschland
- **AVV-Datum:** [in IONOS-Hosting-Vertrag akzeptiert]
- **Datenkategorien:** Email-Versand-Logs
- **Aufbewahrung:** 30T

### Netlify Inc. (Hosting)

- **Sitz:** USA
- **Sub-Subprozessoren:** AWS, Cloudflare
- **AVV-Datum:** [in Netlify-Account-Settings akzeptiert]
- **Datenkategorien:** Static Assets, Function-Logs, Request-Metadaten
- **Aufbewahrung:** Function-Logs 7T (Plan-abhaengig)

### Cloudflare (CDN, indirekt)

- **Sitz:** USA
- **AVV-Datum:** indirekt via Netlify-DPA
- **Datenkategorien:** Request-Headers, IP-Adressen (TLS-Termination)
- **Drittland-Schutz:** SCC

---

## Marcel-Pflicht-Aktionen

### Sofort (vor Pilot-Launch)
- [ ] Bei jedem Subprozessor: AVV-Status verifizieren (Dashboard-Login pro Service)
- [ ] AVV-Sign-Datum pro Service in `docs/compliance/AVV-DATEN.md` ergaenzen (kann am 1. Pilot-Tag)
- [ ] Subprozessor-Liste mit dieser Doku in `avv.html` synchronisieren

### Quartalsweise
- [ ] Sub-Subprozessoren-Listen pro Anbieter pruefen (oft AVV-Anlage)
- [ ] Bei Aenderungen: Pilot-Kunden informieren (Forced-Re-Consent)

### Bei AVV-Aenderung Subprozessor
- [ ] Neue Version in `versicherungs_partner` Tabelle
- [ ] Forced-Re-Consent-Flow auslösen ueber `record_einwilligung()`-Function

---

## Liste-Zusammenfassung

**Total:** 10 Subprozessoren, davon
- **6 EU-Region:** Supabase, Sentry, IONOS, Make.com (EU-Subset), Resend (EU-Subset)
- **4 Drittland (USA):** Stripe, OpenAI, PDFMonkey, Netlify, Cloudflare

Alle Drittland-Transfers durch SCC + Pseudonymisierung + DPF abgedeckt.

---

*AVV-Liste-Stand 04.05.2026 — Sprint MEGA⁶ S2.*
