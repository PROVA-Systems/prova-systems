# Subprocessor-Liste

**Verantwortlicher:** PROVA-Systems / Marcel Schreiber
**Stand:** 2026-05-10 (MEGA²⁸ W5-I4)
**Anwalt-Review:** ⚠️ pflicht vor Pilot-Launch

Diese Liste ist Pflichtbestandteil des AVV (Art. 28 DSGVO). Aktualisierung quartalsweise.

---

## Aktive Subprocessor

### 1. OpenAI, L.L.C.
- **URL:** api.openai.com
- **Standort:** USA
- **Datentransfer-Mechanismus:** SCC (EU-Standardvertragsklauseln) + Pseudonymisierung
- **Datenkategorien:** pseudonymisierte Diktat-Texte, Gutachten-Inhalte (Konjunktiv-II-Check, Halluzinations-Check, Strukturierung), Foto-Captioning (EXIF-stripped), Whisper-Audio (Klartext-Person-Names ersetzt)
- **Zweck:** KI-Strukturhilfe (gpt-5.5/5.4/5.4-mini), Speech-to-Text (whisper-1)
- **DPA:** OpenAI DPA standard, kein Training auf API-Daten (gemäß OpenAI-API-DPA, opt-out default)
- **Sub-Subprocessor:** Microsoft Azure (USA, Hosting)
- **Speicherdauer:** 30 Tage (OpenAI-Default), Logs nach Anfrage löschbar
- **Kontakt-DPO:** dpo@openai.com

### 2. Anthropic, PBC ⭐ NEU
- **URL:** api.anthropic.com
- **Standort:** USA
- **Datentransfer-Mechanismus:** SCC + Pseudonymisierung
- **Datenkategorien:** identisch zu OpenAI (Drop-In-Backup-Provider)
- **Zweck:** KI-Backup-Provider bei OpenAI-429/5xx (claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5-20251001) — automatischer Fallback via `callOpenAIWithFallback()` in `netlify/functions/ki-proxy.js`
- **DPA:** Anthropic DPA standard, kein Training auf Customer-Data, 30-Tage-Retention max
- **Sub-Subprocessor:** AWS (USA), Google Cloud (USA)
- **Speicherdauer:** 30 Tage (Default), Zero Data Retention auf Anfrage
- **Kontakt-DPO:** privacy@anthropic.com

### 3. Stripe, Inc.
- **URL:** api.stripe.com
- **Standort:** Stripe Payments Europe Ltd. (Irland, EU) + USA
- **Datentransfer-Mechanismus:** EU-DPA + SCC für US-Datenflüsse
- **Datenkategorien:** Email, Vor-/Nachname, Rechnungsanschrift, Karten-Daten (PCI-DSS — NICHT in PROVA-DB!), Subscription-Status, Stripe-Customer-ID
- **Zweck:** Zahlungsabwicklung (Subscriptions Solo €149/Team €279), Founding-Coupon-Verwaltung, Invoice-Generation, Webhook-Empfang
- **DPA:** Stripe DPA standard
- **Sub-Subprocessor:** AWS (USA + EU)
- **Speicherdauer:** 7 Jahre (Buchhaltungspflicht USA + EU)
- **Kontakt-DPO:** privacy@stripe.com

### 4. Supabase, Inc.
- **URL:** supabase.co + supabase.com (Project: cngteblrbpwsyypexjrv)
- **Standort:** EU-Region Frankfurt
- **Datentransfer-Mechanismus:** intra-EU (kein Drittland-Transfer)
- **Datenkategorien:** alle PROVA-Hauptdaten — Email, Auth-Tokens (JWT), Workspace-Daten, Auftrag-Stammdaten, Audit-Trail, ki_protokoll, Storage-Files (Gutachten-PDFs, Fotos pseudonymisiert)
- **Zweck:** Datenbank, Authentifizierung, Storage, Edge Functions
- **DPA:** Supabase EU-DPA verfügbar (Marcel-Action: Tier-DPA bestellen)
- **Sub-Subprocessor:** AWS Frankfurt (eu-central-1)
- **Speicherdauer:** Workspace-Lifetime, Soft-Delete 30 Tage nach Account-Cancel
- **Kontakt-DPO:** privacy@supabase.com

### 5. Netlify, Inc.
- **URL:** netlify.com / netlify.app
- **Standort:** USA + EU-Edge-Nodes
- **Datentransfer-Mechanismus:** SCC + DPA (Business-Tier)
- **Datenkategorien:** Hosting-Logs (anonymisierte IPs), Build-Artefakte, Function-Logs (PII-pseudonymisiert via `prova-pseudo`)
- **Zweck:** Frontend-Hosting (prova-systems.de, app.prova-systems.de, admin.prova-systems.de), Edge Functions, Build-Pipeline
- **DPA:** Netlify Business DPA — Marcel-Action: Tier verifizieren
- **Sub-Subprocessor:** AWS, Google Cloud (multi-region)
- **Speicherdauer:** Logs 30 Tage
- **Kontakt-DPO:** privacy@netlify.com

### 6. 1&1 IONOS SE (SMTP)
- **URL:** smtp.ionos.de
- **Standort:** Deutschland
- **Datentransfer-Mechanismus:** intra-DE
- **Datenkategorien:** Email-Header (Sender, Recipient), Email-Body (User-Korrespondenz, Mahnungen, Welcome-Emails, Referral-Notifications)
- **Zweck:** SMTP-Email-Versand für SV-Korrespondenz + System-Benachrichtigungen
- **DPA:** IONOS AV-Vertrag (Standard)
- **Sub-Subprocessor:** keine (eigenes Rechenzentrum)
- **Speicherdauer:** 30 Tage Mail-Server-Logs
- **Kontakt:** datenschutz@ionos.de

### 7. PDFMonkey (par tlrk SAS)
- **URL:** pdfmonkey.io
- **Standort:** Frankreich (EU)
- **Datentransfer-Mechanismus:** intra-EU
- **Datenkategorien:** vollständige Gutachten-Daten zur PDF-Generierung (Templates F-04 bis F-19), Foto-Embeds, Rechnungsdaten
- **Zweck:** Server-side PDF-Rendering aus Liquid-Templates
- **DPA:** PDFMonkey EU-DPA
- **Sub-Subprocessor:** OVHcloud (Frankreich)
- **Speicherdauer:** 7 Tage (PDF-URL-Lifetime), danach gelöscht
- **Kontakt:** privacy@pdfmonkey.io

### 8. Functional Software, Inc. dba Sentry
- **URL:** sentry.io
- **Standort:** USA (EU-Region möglich — **Marcel-Action: Region prüfen**)
- **Datentransfer-Mechanismus:** SCC + DPA + PII-Filter (Pseudonymisierung im Wrapper `lib/sentry-wrap.js`)
- **Datenkategorien:** Stack-Traces, Error-Messages (pseudonymisiert), User-IDs (Hash, KEIN Klartext-Email)
- **Zweck:** Error-Tracking + Performance-Monitoring (39/64 Lambdas + Frontend)
- **DPA:** Sentry DPA verfügbar
- **Sub-Subprocessor:** AWS (USA / EU)
- **Speicherdauer:** 90 Tage Default, konfigurierbar
- **Kontakt:** privacy@sentry.io

### 9. Formagrid Inc. (Airtable)
- **URL:** airtable.com / api.airtable.com
- **Standort:** USA
- **Datentransfer-Mechanismus:** SCC
- **Datenkategorien:** SV-Stammdaten, Auth-Trail, Briefe, KI-Statistik (in 19 aktiven Lambdas)
- **Zweck:** Legacy-Datenhaltung (Migration-Plan zu Supabase via Sprint K-1.x in Arbeit, MEGA-Stand)
- **DPA:** Airtable Enterprise DPA (Marcel-Action: Tier-Verifikation)
- **Sub-Subprocessor:** AWS (USA)
- **Speicherdauer:** Workspace-Lifetime
- **Migration-Status:** geplante Reduktion. Bis Cutover-Tag bleibt Subprocessor.
- **Kontakt:** privacy@airtable.com

### 10. Make.com (in Migration)
- **URL:** make.com / hook.eu1.make.com
- **Standort:** Tschechien (EU)
- **Datentransfer-Mechanismus:** intra-EU
- **Datenkategorien:** Webhook-Payloads (nicht-PII), Email-Trigger, Bridge-Events
- **Zweck:** Webhook-Bridge zwischen Stripe/Frontend und Make-Scenarios (E-Mails, Backups). Migration zu Edge Functions geplant (CLAUDE.md K-1.5 Cutover).
- **DPA:** Make.com EU-DPA
- **Sub-Subprocessor:** AWS Frankfurt
- **Speicherdauer:** 90 Tage Execution-Logs
- **Migration-Status:** wird zu Subprocessor mit reduziertem Scope nach K-1.5 Cutover.
- **Kontakt:** privacy@make.com

---

## Status-unklar — Marcel-Check pflicht

### 11. Cloudflare, Inc. (TBD)
- **Code-Refs:** 0 in Code, aber `cf-email`-Pattern in `onboarding-welcome.html` deutet auf DNS-Service hin
- **Marcel-Action:** Cloudflare-Dashboard öffnen, prüfen welche Features für `prova-systems.de` aktiv sind (DNS, CDN, WAF, Workers, Email-Routing). Falls aktiv → vollständig in AVV ergänzen. Falls inaktiv → bestätigen + ENV-Vars-Doku updaten.
- **Erwartung:** vermutlich DNS aktiv (Domain-Routing Cloudflare-Stats üblich)

### 12. DocRaptor (TBD)
- **Code-Refs:** `DOCRAPTOR_API_KEY`, `DOCRAPTOR_TEST_MODE` in pdf-service-Logic
- **Marcel-Action:** Aktiv genutzt (Fallback-PDF) oder ENV legacy? Falls aktiv → AVV. Falls nicht → ENV bereinigen.

---

## Aktualisierungs-Verfahren

- Quartalsweise Marcel-Review
- Bei jedem neuen Subprocessor: 14 Tage Vor-Ankündigung an Pilot-User (gemäß Art. 28 DSGVO)
- AVV-Anpassung pflicht
- Verfahrensverzeichnis-Sync (`VERFAHRENSVERZEICHNIS.md`)

---

⚠️ **Anwalt-Review pflicht vor Pilot-Launch.**

*MEGA²⁸ W5-I4 — Erstellt von Claude Opus 4.7 (1M context), basierend auf SUBPROCESSOR-AUDIT.md*
