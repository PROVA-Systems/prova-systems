# MEGA⁴³ Welle 3 — Stripe + Email — IN PROGRESS

**Datum:** 2026-05-09
**Status:** 9/15 Functions ACTIVE (60% Welle 3 Progress)

---

## ✅ Deployed in Welle 3 (9/15)

| # | Slug | Edge ID | Typ | verify_jwt |
|---|---|---|---|---|
| 1 | pilot-seats | 47e2e937 | Public Stripe-Coupon | false |
| 2 | admin-billing-sync | 8c136bd9 | Admin Stripe-Aggregation | false* |
| 3 | stripe-portal | 4f14b018 | User Stripe-Portal-Session | true |
| 4 | dsgvo-loeschen-antrag | 701b630f | User DSGVO-Soft-Delete + Resend | true |
| 5 | fristen-reminder-cron | a55063f6 | Cron-Secret Resend-Mail | false |
| 6 | onboarding-mail-cron | 3d22c2b7 | Cron Resend (5 Day-Slots) | false |
| 7 | email-welcome | f8248241 | Cron Resend (Welcome) | false |
| 8 | email-pilot-feedback-cron | 85589c08 | Cron Resend (Day-7-Feedback) | false |
| 9 | email-trial-ending-cron | 6494d08a | Cron Resend (Trial-Ende-3-Tage) | false |

*Inline-admin-auth (Whitelist + 2FA + JWT-validierung im Body).

**Endpoint-Pattern:** `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/<slug>`

---

## ⏳ Pending Welle 3 (6 Functions)

### Stripe (2)
- **stripe-checkout** — komplex (~300 LOC, Pricing/Coupon/Founding-Check)
- **stripe-webhook-referral** — Webhook-Signature-Check via crypto.subtle

### Email-Cron (1)
- **mahnwesen-cron** — Resend-cron Pattern (straightforward, copy-paste)

### Referral (3)
- **redeem-referral-code** — Resend-only (straightforward)
- **check-referral-rewards** — nodemailer (Deno-Migration: Resend-Refactor)
- **create-referral** — nodemailer (Deno-Migration: Resend-Refactor)
- **send-referral-reminders** — nodemailer (Deno-Migration: Resend-Refactor)

### SMTP→Resend-Migration (3)
- **send-welcome-email** — nodemailer + IONOS SMTP
- **termin-reminder** — IONOS SMTP via nodemailer
- **admin-send-email** — admin-handler complex

### Skipped (DEPRECATED nach K-1.5)
- **emails** — Make-Webhook-Forwarder

### Already Edge (vorhanden vor MEGA⁴³)
- ki-proxy, whisper-diktat, pdf-generate, send-email, stripe-webhook, lifecycle-trigger, audit-write, ical-feed, brief-generate, apply-rls-migration-40

---

## 📝 Migration-Notes

### Edge-Architektur-Pattern (etabliert)
- **Inline-Code per Function** — kein _shared/-Bundle (nur Welle 1 Admin)
- **Stripe-API via fetch** — kein SDK-Bundle
- **Resend-API direkt** — HTTP-fetch
- **Cron-Auth via X-Cron-Secret-Header**
- **Service-Client via SERVICE_ROLE_KEY** für RLS-bypass
- **Inline-Templates** statt Liquid-Template-Loading

### Deno-spezifische Limitierungen
1. **nodemailer NICHT verfügbar** → SMTP-Functions zu Resend migrieren
2. **pdf-parse NICHT verfügbar** → parse-beweisbeschluss/parse-docx deferred
3. **stripe-Node-SDK** funktioniert via esm.sh, aber direkter fetch besser

---

## ⏳ Welle 3 Folge-Session ToDos

1. **Migrate mahnwesen-cron** (5 Min, copy-paste-Pattern)
2. **Migrate redeem-referral-code** (10 Min, Resend-only)
3. **Migrate stripe-checkout** (30-60 Min, komplex)
4. **Migrate stripe-webhook-referral** (15 Min, Signature-Check)
5. **Refactor 3 Referral-Lambdas zu Resend** (je 15 Min)
6. **Refactor send-welcome-email + termin-reminder zu Resend** (je 15 Min)
7. **Lokale Files für 9 deployed Welle-3-Functions** schreiben (aktuell nur Edge, nicht Repo)
8. **Commit + Tag** mega43-w3-complete

---

## Total Edge Functions ACTIVE nach Welle 1+2+3-Teil-1: 26

- **Welle 1 (Admin-Cockpit):** 13 Functions
- **Welle 2 (KI-Pipeline):** 4 Functions
- **Welle 3 (Stripe+Email):** 9 Functions
- **Pre-MEGA43 (existing):** 10 Functions (ki-proxy, whisper-diktat, etc.)

---

## Kontext für Folge-Session

**Lokale index.ts files für Welle-3-Functions wurden NICHT geschrieben** wegen Token-Knappheit. Folge-Session sollte:

1. `mcp__claude_ai_Supabase__get_edge_function` aufrufen pro Function um deployed Code abzurufen
2. ODER: Functions neu schreiben aus Pattern (Inline-Code, jeweils ~50-100 LOC)
3. Lokal in `supabase/functions/<slug>/index.ts` speichern
4. Commit als `mega43-w3-source-files-recovered`

**Project-ID:** `cngteblrbpwsyypexjrv`
**Supabase URL:** `https://cngteblrbpwsyypexjrv.supabase.co`

---

*Co-Authored-By: Claude Opus 4.7 (1M context)*
