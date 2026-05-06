# Subprocessor-Audit (vor AVV-Update W5-I4)

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7 (W5-I3)
**Methodik:** grep-based Code-Inventory + ENV-Var-Scan

---

## TL;DR

| Tool | Aktiv? | Status | AVV-Pflicht |
|---|---|---|---|
| **OpenAI** | ✅ HIGH | Production-Critical (KI-Calls primary) | JA |
| **Anthropic** | ✅ HIGH | Production-Critical (KI-Backup-Provider seit W4-I0) | **JA — NEU im AVV** |
| **Stripe** | ✅ HIGH | Production-Critical (Subscriptions + Webhooks) | JA |
| **Supabase** | ✅ HIGH | Production-Critical (Database + Auth + Storage) | JA |
| **Netlify** | ✅ HIGH | Production-Critical (Hosting + Functions) | JA |
| **IONOS** | ✅ HIGH | Production-Critical (SMTP-Email) | JA |
| **PDFMonkey** | ✅ HIGH | Production-Critical (PDF-Generation) | JA |
| **Make.com** | ✅ MEDIUM | Aktiv (Webhook-Bridge — Migration-Plan zu Edge Functions) | JA — als "in Migration" markiert |
| **Airtable** | ✅ HIGH | Aktiv (19 Lambdas mit AIRTABLE_-ENVs) | **JA — NICHT raus, aktiv genutzt!** |
| **Sentry** | ✅ HIGH | Production-Critical (Error-Tracking) | JA |
| **Cloudflare** | 🔴 UNCLEAR | 0 Code-Refs, aber DNS-Setup vermutet | **MARCEL-CHECK pflicht** |
| **DocRaptor** | 🟡 BACKUP | ENV vorhanden (`DOCRAPTOR_API_KEY`) — Fallback für PDF? | **MARCEL-CHECK** |
| **Anthropic-OpenAI-OAuth** | n/a | nur API-Keys, keine OAuth | n/a |

---

## Detail pro Tool

### 1. OpenAI 🔴 HIGH
**Code-Refs:** `OPENAI_API_KEY` in 8+ Lambdas
- `ki-proxy.js` (primary)
- `foto-captioning.js`, `normen-picker.js`, `ki-konsistenz-check.js`
- `whisper-diktat.js`, `lib/ki-service-openai.js`

**Standort:** USA
**Datentransfer:** SCC + Pseudonymisierung-Pflicht (`lib/prova-pseudo`)
**Datenkategorien:** Diktat-Texte (pseudonymisiert), Gutachten-Inhalte (pseudonymisiert), Foto-Captioning (EXIF-stripped)
**Modelle:** gpt-5.5, gpt-5.4, gpt-5.4-mini, whisper-1
**DPA-Status:** OpenAI DPA standard (zero data retention bei Enterprise verfügbar)
**Sub-Subprocessor:** Microsoft Azure (USA)

### 2. Anthropic ⭐ NEU 🔴 HIGH
**Code-Refs:** `ANTHROPIC_API_KEY` in 5+ Stellen
- `netlify/functions/lib/ki-anthropic.js` (Drop-In-Wrapper)
- `lib/ki-service-anthropic.js` (Frontend-Service)
- `netlify/functions/ki-proxy.js` (Fallback bei OpenAI 429/5xx, seit W4-I0)

**Standort:** USA
**Datentransfer:** SCC + Pseudonymisierung
**Datenkategorien:** identisch zu OpenAI (Drop-In-Replacement)
**Modelle:** claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5-20251001
**DPA-Status:** Anthropic DPA standard (kein Training auf Customer-Data, 30 Tage Retention max)

### 3. Stripe 🔴 HIGH
**Code-Refs:** 15+ STRIPE_-ENVs
- Subscription-Pricing (`STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`)
- Webhook (`STRIPE_WEBHOOK_SECRET`, `STRIPE_REFERRAL_WEBHOOK_SECRET`)
- Founding-Coupon (`STRIPE_FOUNDING_COUPON_ID`)
- Auto-Tax (`STRIPE_AUTO_TAX`)

**Standort:** Irland (EU) + USA
**Datentransfer:** EU-DPA + SCC
**Datenkategorien:** Email, Name, Adresse, Karten-Daten (PCI-DSS, NICHT in PROVA-DB)
**DPA-Status:** Stripe DPA standard

### 4. Supabase 🔴 HIGH
**Code-Refs:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in 30+ Lambdas
**Standort:** EU-Frankfurt (Project: `cngteblrbpwsyypexjrv`)
**Datentransfer:** intra-EU
**Datenkategorien:** Email, Auth-Tokens, Workspace-Daten, Audit-Trail, ki_protokoll, alle PROVA-Daten
**DPA-Status:** Supabase EU-DPA verfügbar
**Sub-Subprocessor:** AWS Frankfurt (eu-central-1)

### 5. Netlify 🔴 HIGH
**Code-Refs:** `NETLIFY_DEV`, `URL`, `DEPLOY_URL`, `COMMIT_REF`, `CONTEXT`
**Standort:** USA + EU-Edge-Nodes
**Datentransfer:** SCC + DPA
**Datenkategorien:** Hosting-Logs, IP-Adressen (anonymisiert in Reports), Build-Artefakte
**DPA-Status:** Netlify Business DPA verfügbar

### 6. IONOS (SMTP) 🔴 HIGH
**Code-Refs:** `IONOS_SMTP_HOST`, `IONOS_SMTP_USER`, `IONOS_SMTP_PASS` (auch Standard `SMTP_*`)
**Standort:** Deutschland
**Datentransfer:** intra-DE
**Datenkategorien:** Email-Header, Email-Inhalte (User-Korrespondenz, Mahnungen, Welcome-Emails)
**DPA-Status:** IONOS AV-Vertrag (Standard)

### 7. PDFMonkey 🔴 HIGH
**Code-Refs:** `PDFMONKEY_API_KEY`, `PDFMONKEY_FOTO_TEMPLATE_ID`, `PDFMONKEY_MODE_C_TEMPLATE_ID`
**Standort:** Frankreich (EU)
**Datentransfer:** intra-EU
**Datenkategorien:** vollständige Gutachten-Daten zur PDF-Generierung
**DPA-Status:** PDFMonkey EU-DPA

### 8. Airtable 🔴 HIGH (NICHT raus aus AVV!)
**Code-Refs:** AIRTABLE_-ENVs in **19 Lambdas** + 7 verschiedene ENV-Vars:
- `AIRTABLE_API_KEY`, `AIRTABLE_PAT`, `AIRTABLE_TOKEN` (Auth)
- `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_SV`, `AIRTABLE_BRIEFE_TABLE`, `AIRTABLE_AUDIT_TRAIL_TABLE`

**Status:** **AKTIV** (19 Lambdas inkl. `pdf-proxy`, `auth-token-issue`, `dsgvo-auskunft`, `dsgvo-loeschen`, `provision-sv`, `team-interest`, `health`, `error-log`, `audit-log`, `ki-statistik`, `mein-aktivitaetsprotokoll`, `normen.js`, `push-notify.js`, `smtp-credentials.js`)

**Erkenntnis:** Trotz Migration-Plan zu Supabase ist Airtable noch produktiv im Einsatz. **NICHT aus AVV entfernen!**

**Standort:** USA
**Datentransfer:** SCC
**Datenkategorien:** SV-Stammdaten, Auth-Trail, Briefe, KI-Statistik
**DPA-Status:** Airtable Enterprise DPA verfügbar (Marcel-Check)
**Migration-Status:** Cleanup-Sprint geplant (Memory: seit 01.05.2026), aber noch nicht abgeschlossen.

### 9. Sentry 🔴 HIGH
**Code-Refs:** `SENTRY_PROJECT_SLUG_FUNCTIONS` + DSN in `lib/sentry-init.js` + `lib/sentry-wrap.js`
**Standort:** USA (Default — könnte EU-Region sein, Marcel-Check)
**Datentransfer:** SCC + DPA + PII-Filter (Pseudonymisierung im Wrapper)
**Datenkategorien:** Stack-Traces, Error-Messages (pseudonymisiert), User-IDs (Hash)
**DPA-Status:** Sentry DPA verfügbar

### 10. Make.com 🟡 MEDIUM (in Migration)
**Code-Refs:** `MAKE_WEBHOOKS`, `MAKE_S` (interne Make-Webhook-URLs)
- `make-proxy.js` Lambda als Bridge

**Standort:** Tschechien (EU)
**Datentransfer:** intra-EU
**Datenkategorien:** Webhook-Payloads (nicht-PII), Email-Trigger
**DPA-Status:** Make.com EU-DPA
**Migration-Status:** geplante Reduktion in K-1.5 Cutover (CLAUDE.md), bisher noch aktiv

### 11. Cloudflare 🤔 UNCLEAR (Marcel-Check pflicht)
**Code-Refs:** **0 Code-Refs**, aber:
- `cf-email`-Pattern wurde in W3-I2 als Email-Obfuscation entdeckt (= Cloudflare ist DNS-Provider)
- `netlify.toml` enthält `skip_processing = true` (CLAUDE.md Regel 26 — Cloudflare-Email-Obfuscation deaktivieren)

**Marcel-Action-Item:**
1. Cloudflare-Dashboard → ist Domain `prova-systems.de` aktiv?
2. Welche Cloudflare-Features sind on (DNS, CDN, WAF, Workers)?
3. Falls aktiv: AVV pflicht (USA + EU). Falls nicht aktiv → aus AVV raus.

### 12. DocRaptor 🤔 UNCLEAR (Marcel-Check)
**Code-Refs:** `DOCRAPTOR_API_KEY`, `DOCRAPTOR_TEST_MODE` in `pdf-service`-Logic
**Status:** vermutet Fallback-PDF-Service falls PDFMonkey ausfällt
**Standort:** USA
**Marcel-Action:** Aktiv? Wenn JA → AVV. Wenn nicht: ENV bereinigen + dokumentieren.

### 13. VAPID/Push (Web-Push)
**Code-Refs:** `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` in `push-notify.js`
**Status:** Web-Push-Keys (kein externer Subprocessor — direkter Browser-Push via VAPID-Standard)
**AVV-Pflicht:** NEIN (kein Drittanbieter — Push-Subscription bleibt im PROVA-Ökosystem)

---

## Status-Matrix

| Tool | Code-Refs | Standort | DPA-Status | AVV-Pflicht | Marcel-Action |
|---|---|---|---|---|---|
| OpenAI | 8+ | USA | DPA standard | ✅ JA | dokumentiert |
| Anthropic | 5+ | USA | DPA standard | ⭐ NEU | DPA verifizieren |
| Stripe | 15+ | EU/USA | DPA EU | ✅ JA | dokumentiert |
| Supabase | 30+ | EU-Frankfurt | EU-DPA | ✅ JA | dokumentiert |
| Netlify | mehrfach | USA + EU-Edge | DPA Business | ✅ JA | DPA-Tier prüfen |
| IONOS | 3 | DE | AV-Vertrag | ✅ JA | dokumentiert |
| PDFMonkey | 3 | EU-FR | EU-DPA | ✅ JA | dokumentiert |
| Make.com | 2 | EU-CZ | EU-DPA | 🟡 in Migration | Cutover-Plan |
| Airtable | 19 Lambdas | USA | DPA | ✅ JA aktiv | NICHT raus |
| Sentry | 2+ | USA | DPA | ✅ JA | EU-Region prüfen |
| Cloudflare | 0 | USA+EU | DPA | 🤔 unclear | Dashboard-Check |
| DocRaptor | 2 | USA | (unklar) | 🤔 unclear | aktiv? |
| VAPID | 3 | n/a | n/a | n/a | n/a |

---

## Marcel — Action-Items vor AVV-Final

### 🔴 PRIORITÄT 1
1. **Anthropic DPA** verifizieren (oder neu unterzeichnen — Marcel hat $50 Credit Setup gemacht)
2. **Cloudflare-Status** klären — Dashboard öffnen + welche Features aktiv?
3. **Airtable-Migration-Timeline** finalisieren — wann wirklich raus?

### 🟡 PRIORITÄT 2
4. **Sentry-Region** prüfen (US-Default oder EU-aktiviert?)
5. **DocRaptor** — aktiv oder ENV bereinigen?
6. **Netlify-DPA-Tier** — Free vs. Business (DPA nur bei Business)

### 🟢 PRIORITÄT 3
7. **Make.com-Cutover** definitiv terminieren (K-1.5 oder früher?)

---

*MEGA²⁸ W5-I3 Subprocessor-Audit — Basis für AVV-Komplett-Update in W5-I4*
