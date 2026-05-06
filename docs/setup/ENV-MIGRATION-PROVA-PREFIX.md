# ENV-Migration auf PROVA-Prefix (Regel 35)

**Datum:** 2026-05-10 (MEGA²⁸ W6P2-I5)
**Auditor:** Claude Opus 4.7
**Trigger:** W5-I8 Finding F3 — 17 ENVs ohne PROVA-Prefix in Multi-Tenant-Setup

---

## TL;DR

**Migrations-Pattern:** Defensiv mit Backwards-Compat
```js
const value = process.env.PROVA_X || process.env.X;
```

Beide ENVs funktionieren parallel. Marcel kann graduell von alten zu neuen Names umstellen ohne Production-Risk.

**W6P2-I5 Migration:**
- ✅ AUTH_HMAC_SECRET → PROVA_AUTH_HMAC_SECRET (3 Files defensiv migriert)
- ✅ ADMIN_PASSWORD_BCRYPT → PROVA_ADMIN_PASSWORD_BCRYPT (defensiv)
- ✅ ADMIN_PASSWORD_HASH → PROVA_ADMIN_PASSWORD_HASH (defensiv)

**Welle-7-Backlog:** 11 weitere ENVs ohne Prefix (siehe unten).

---

## Klassifikation aller ENVs

### 🟢 Externe Anbieter-Standards — KEINE Migration

| ENV | Anbieter | Begründung |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | Anbieter-Standard |
| `ANTHROPIC_API_KEY` | Anthropic | Anbieter-Standard |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, etc. | Stripe | Stripe-Standard |
| `AIRTABLE_API_KEY`, `AIRTABLE_PAT`, `AIRTABLE_TOKEN`, `AIRTABLE_*_TABLE` | Airtable | Anbieter-Standard |
| `IONOS_SMTP_HOST/USER/PASS` | IONOS | Anbieter-Standard |
| `MAKE_WEBHOOKS`, `MAKE_S` | Make.com | Anbieter-Standard |
| `PDFMONKEY_API_KEY`, `PDFMONKEY_*_TEMPLATE_ID` | PDFMonkey | Anbieter-Standard |
| `DOCRAPTOR_API_KEY`, `DOCRAPTOR_TEST_MODE` | DocRaptor (Stub) | Anbieter-Standard |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web-Push-Standard | RFC-Standard |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Anbieter-Standard |
| `SENTRY_PROJECT_SLUG_FUNCTIONS`, `SENTRY_DSN_FUNCTIONS` | Sentry | Anbieter-Standard |
| `NETLIFY_DEV`, `URL`, `DEPLOY_URL`, `COMMIT_REF`, `CONTEXT`, `SITE_NAME` | Netlify-System | Build-System |
| `NODE_ENV`, `AWS_*`, `CI` | Standards | Plattform-Standards |

### 🔴 PROVA-Critical — Migration empfohlen (Regel 35)

| Old ENV | Neue ENV | Status W6P2-I5 |
|---|---|---|
| `AUTH_HMAC_SECRET` | `PROVA_AUTH_HMAC_SECRET` | ✅ defensiv migriert (lib/auth-token.js + admin-impersonate.js + admin-system-health.js) |
| `ADMIN_PASSWORD_BCRYPT` | `PROVA_ADMIN_PASSWORD_BCRYPT` | ✅ defensiv migriert (admin-auth.js) |
| `ADMIN_PASSWORD_HASH` | `PROVA_ADMIN_PASSWORD_HASH` | ✅ defensiv migriert (admin-auth.js) |
| `CONFIRM_LIVE_CHECKOUT` | `PROVA_CONFIRM_LIVE_CHECKOUT` | 🟢 nur in scripts/ (Build-Tools, kein Production-Risk) |
| `FORCE_FALLBACK` | `PROVA_FORCE_FALLBACK` | 🟢 nur in scripts/ (Build-Tools) |
| `FW_PATH` | `PROVA_FW_PATH` | 🟢 nur in scripts/ (Build-Tools) |
| `IMPERSONATION_NOTIFY` | `PROVA_IMPERSONATION_NOTIFY` | ✅ W7-I1 defensiv migriert (admin-impersonate.js) |
| `UPTIME_WEBHOOK_SECRET` | `PROVA_UPTIME_WEBHOOK_SECRET` | ✅ W7-I1 defensiv migriert (uptime-webhook.js) |
| `TERMIN_REMINDER_SECRET` | `PROVA_TERMIN_REMINDER_SECRET` | ✅ W7-I1 defensiv migriert (termin-reminder.js) |
| `TEAM_INTEREST_SECRET` | `PROVA_TEAM_INTEREST_SECRET` | ✅ W7-I1 defensiv migriert (team-interest.js) |
| `TEST_CHECKOUT_EMAIL` | `PROVA_TEST_CHECKOUT_EMAIL` | 🟢 nur in scripts/ (Test-Tools) |
| `WEBHOOK_TEST_EMAIL` | `PROVA_WEBHOOK_TEST_EMAIL` | 🟢 nur in scripts/ (Test-Tools) |
| `WEBHOOK_TEST_URL` | `PROVA_WEBHOOK_TEST_URL` | 🟢 nur in scripts/ (Test-Tools) |
| `SITE_NAME` | (KEINE Migration) | 🟢 Netlify-System-ENV |

**Total Welle-7-Backlog:** 11 ENVs × 1-2 Files = ~15 Edits, ~30 Min.

---

## Marcel — Action-Plan

### Phase 1 — Production-ENV setzen (W6P2-I5 done)
1. Netlify-Dashboard → Site Settings → Environment Variables
2. Folgende **NEUE** ENVs setzen mit identischem Wert wie alte:
   - `PROVA_AUTH_HMAC_SECRET` = (Wert von `AUTH_HMAC_SECRET`)
   - `PROVA_ADMIN_PASSWORD_BCRYPT` = (Wert von `ADMIN_PASSWORD_BCRYPT`)
   - `PROVA_ADMIN_PASSWORD_HASH` = (Wert von `ADMIN_PASSWORD_HASH`, falls noch genutzt)
3. **Alte ENVs vorerst BEHALTEN** (Backwards-Compat erhält Verfügbarkeit während Migration)

### Phase 2 — Verifikation
4. Deploy → admin.prova-systems.de Login testen
5. Function-Logs prüfen: keine "AUTH_HMAC_SECRET fehlt"-Errors
6. Wenn alles grün: nach 1 Sprint alte ENVs aus Netlify löschen

### Phase 3 — Welle 7
7. Restliche 11 ENVs gleich migrieren

---

## Code-Pattern für Welle 7

```js
// VORHER:
const x = process.env.MY_ENV;
if (!x) throw new Error('MY_ENV fehlt');

// NACHHER (defensiv-migriert):
const x = process.env.PROVA_MY_ENV || process.env.MY_ENV;
if (!x) throw new Error('PROVA_MY_ENV (Legacy: MY_ENV) fehlt');
```

**Wichtig:**
- Nie nur die eine ENV ersetzen — immer beide lesen
- Error-Message muss beide ENV-Names erwähnen (Marcel-DX)
- Tests dürfen auf alte ENV setzen (Backwards-Compat-Verifikation)

---

## Verifikations-Skript

```bash
# Pre-Migration: Status checken
grep -rn "process\.env\.AUTH_HMAC_SECRET\|process\.env\.ADMIN_PASSWORD" \
  --include="*.js" --exclude-dir=node_modules --exclude-dir=tests

# Erwartete Migration:
#   alle Treffer haben Pattern: process.env.PROVA_X || process.env.X
```

---

## Bewertung

**Heute:** Auth-Critical ENVs (HMAC, Admin-Password) defensiv migriert. 0 Production-Risk durch Backwards-Compat.

**Welle 7:** Cleanup-Sprint für 11 weitere ENVs. Niedrige Priorität, da nicht Auth-Critical.

**Welle X (≥1 Jahr):** Alte ENV-Names aus Code entfernen, nur PROVA-Prefix-Names behalten.

---

*MEGA²⁸ W6P2-I5 ENV-Migration: 3 Auth-Critical defensiv, 11 als Welle-7-Backlog dokumentiert.*
