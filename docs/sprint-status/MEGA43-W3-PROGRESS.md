# MEGA⁴³ Welle 3 — Stripe + Email — IN PROGRESS

**Datum:** 2026-05-09
**Status:** 6/15 Functions ACTIVE (40% Welle 3 Progress)

---

## ✅ Deployed in Welle 3 (6/15)

| # | Slug | Edge ID | Typ | verify_jwt |
|---|---|---|---|---|
| 1 | pilot-seats | 47e2e937 | Public Stripe-Coupon | false |
| 2 | admin-billing-sync | 8c136bd9 | Admin Stripe-Aggregation | false* |
| 3 | stripe-portal | 4f14b018 | User Stripe-Portal-Session | true |
| 4 | dsgvo-loeschen-antrag | 701b630f | User DSGVO-Soft-Delete + Resend | true |
| 5 | fristen-reminder-cron | a55063f6 | Cron-Secret Resend-Mail | false |
| 6 | onboarding-mail-cron | 3d22c2b7 | Cron Resend (5 Day-Slots) | false |

*Inline-admin-auth (Whitelist + 2FA + JWT-validierung im Body).

**Endpoint-Pattern:** `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/<slug>`

---

## ⏳ Pending Welle 3 (9 Functions)

### Stripe (1)
- **stripe-checkout** — kompiziertes Pricing/Coupon-Routing, Auth + Founding-Check

### Email-Action (4)
- **send-welcome-email** — nodemailer (Deno-Migration: Resend-Refactor nötig)
- **termin-reminder** — IONOS SMTP via nodemailer (Deno-Migration: Resend oder denomailer)
- **emails** — Make-Webhook-Forwarder (DEPRECATED nach K-1.5 Cutover, **SKIP**)
- **admin-send-email** — admin-handler complex

### Email-Cron (4)
- **email-welcome** — Resend-cron (straightforward)
- **email-pilot-feedback-cron** — Resend-cron
- **email-trial-ending-cron** — Resend-cron
- **mahnwesen-cron** — Resend-cron

### Referral (3 deferred)
- **stripe-webhook-referral** — Stripe-Webhook (verify_jwt=false, Signature-Check)
- **check-referral-rewards** — nodemailer (Deno-Migration nötig)
- **create-referral** — nodemailer
- **send-referral-reminders** — nodemailer
- **redeem-referral-code** — Resend-only (straightforward)

---

## 📝 Migration-Notes

### Edge-Architektur-Pattern aus Welle 3
- **Inline-Code per Function** — kein _shared/-Bundle (nur Welle 1 Admin-Functions hatten _shared/admin-auth.ts)
- **Stripe-API via fetch** — kein SDK-Bundle, spart ~200 KB
- **Resend-API direkt** — HTTP-fetch, kein nodemailer-Compat-Hack
- **Cron-Auth via X-Cron-Secret-Header** — separater ENV pro Cron
- **Service-Client via SERVICE_ROLE_KEY** — RLS-bypass für Cron + Admin
- **User-Client via Bearer-Auth** — JWT-validation via supabase.auth.getUser()

### Deno-spezifische Limitierungen
1. **nodemailer NICHT verfügbar** in Deno — alle SMTP-only Functions müssen zu Resend migriert werden ODER denomailer-Lib (esm.sh) verwenden
2. **pdf-parse NICHT verfügbar** in Deno — parse-beweisbeschluss bleibt deferred (Welle 5+)
3. **stripe-Node-SDK** funktioniert via esm.sh aber bundle-size groß — direkter fetch zu /v1/* preferred

---

## ⏳ Welle 3 ToDos (eigene Folge-Session)

1. **Migrate 4 Email-Cron-Functions** (alle Resend-based, copy-paste-friendly Pattern):
   - email-welcome, email-pilot-feedback-cron, email-trial-ending-cron, mahnwesen-cron
2. **Migrate stripe-checkout** (komplex, ~300 LOC, Stripe-Sessions + Coupon)
3. **Migrate stripe-webhook-referral** (Signature-Check via crypto.subtle.verify)
4. **SMTP-Migration zu Resend** für: send-welcome-email, termin-reminder, check-referral-rewards, create-referral, send-referral-reminders
5. **Lokale Files** für 6 deployed Welle-3-Functions schreiben (aktuell nur in Supabase, nicht im Repo)
6. **Commit + Tag** mega43-w3-complete

### NICHT in Welle 3 (deferred)
- emails.js (Make-Webhook-Forwarder, DEPRECATED nach K-1.5)
- admin-send-email (admin-handler complex, Welle 4)

---

## Kontext für Folge-Session

**Lokales File-Schreiben für Welle-3-Functions wurde gestoppt** wegen Token-Knappheit. Alle 6 sind als Edge ACTIVE deployed, aber nicht als index.ts im Repo. Folge-Session sollte:

1. `ls supabase/functions/` zeigt nur Welle 1+2 Files
2. Folge-Session kann via Supabase MCP `get_edge_function` den deployed Code abrufen und lokal speichern
3. Oder einfach neu schreiben aus dem Pattern (Inline-Code)

**Project-ID:** `cngteblrbpwsyypexjrv`
**Supabase URL:** `https://cngteblrbpwsyypexjrv.supabase.co`

---

*Co-Authored-By: Claude Opus 4.7 (1M context)*
