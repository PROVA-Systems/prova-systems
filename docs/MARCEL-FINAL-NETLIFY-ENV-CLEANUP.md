# Marcel-Aktion: Netlify ENV-Cleanup nach Edge-Migration

**Stand:** 2026-05-09 03:25 GMT+2
**Status:** Edge-Migration komplett (144 Functions ACTIVE), ENV-Putz pending
**Pflicht VOR git push origin main** — sonst kein Build durch wegen AWS Lambda 5KB-Limit.

---

## Warum?

Nach AWS-Lambda-ENV-Limit (`5KB Total`) muss Netlify ENVs aufgeräumt werden. Da Edge Functions ihre eigenen ENVs in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** verwalten, brauchen die meisten Variablen in Netlify nicht mehr da zu sein.

---

## ✅ BEHALTEN — nur Frontend-relevant + Build-Settings

Diese gehen über Vite/Netlify-Build oder werden direkt von HTML/JS im Browser ausgelesen:

```
SUPABASE_URL                    https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_ANON_KEY               eyJ... (für lib/prova-config.js Browser-Side)
STRIPE_PUBLISHABLE_KEY          pk_live_... (für stripe-portal Frontend-Init)
SENTRY_DSN_FRONTEND             https://...@de.sentry.io/... (Browser-Sentry)
NODE_VERSION                    18 oder 20
URL                             (Netlify auto-generated, nicht löschen)
DEPLOY_URL                      (Netlify auto-generated, nicht löschen)
DEPLOY_PRIME_URL                (Netlify auto-generated, nicht löschen)
SITE_NAME                       (Netlify auto-generated, nicht löschen)
```

Erwartete Größe: **< 500 Bytes Total**

---

## 🗑️ LÖSCHEN — diese sind NUR in Edge Functions verwendet

**ALLE Lambda-Backend-Secrets sind jetzt in Supabase Edge Secrets verschoben.**
Aus Netlify ENVs entfernen:

### Airtable (Legacy — komplett raus, da keine Lambda mehr Airtable nutzt)
```
AIRTABLE_PAT
AIRTABLE_TOKEN
AIRTABLE_BASE_ID
PROVA_AUDIT_TRAIL_TABLE
```

### Make.com Webhooks (Make wird in K-1.5 deaktiviert, alle Functions in Edge)
```
MAKE_WEBHOOK_*                  (alle Make-Webhook-Variablen)
MAKE_API_KEY
```

### PDFMonkey
```
PDFMONKEY_API_KEY
PDFMONKEY_PRIVATE_KEY
PDFMONKEY_TEMPLATE_*            (alle Template-IDs)
```

### Stripe (Backend-Secrets — Edge nutzt jetzt eigene Kopie)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_WEBHOOK_SECRET_REFERRAL
PROVA_STRIPE_*
```

### Email/SMTP (Edge nutzt RESEND_API_KEY direkt)
```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
PROVA_SMTP_*
RESEND_API_KEY                  (in Netlify löschen, in Supabase setzen)
```

### KI-APIs
```
OPENAI_API_KEY                  (in Netlify löschen, in Supabase setzen)
ANTHROPIC_API_KEY               (in Netlify löschen, in Supabase setzen)
```

### Sentry Backend (Frontend-DSN bleibt!)
```
SENTRY_DSN                      (das ist Backend, frontend bleibt SENTRY_DSN_FRONTEND)
SENTRY_DSN_FUNCTIONS
SENTRY_AUTH_TOKEN
SENTRY_ORG_SLUG
SENTRY_PROJECT_SLUG_FUNCTIONS
SENTRY_PROJECT_SLUG_BROWSER     (für admin-sentry-errors Edge-Function in Supabase setzen)
```

### Supabase Service-Role (NIE im Frontend!)
```
SUPABASE_SERVICE_ROLE_KEY       (NUR in Edge Secrets, nie in Netlify)
```

### Push-Notifications
```
VAPID_PUBLIC_KEY                (in Netlify löschen, in Supabase setzen)
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

### Internal-Secrets / Cron-Secrets (alles Backend)
```
PROVA_INTERNAL_WRITE_SECRET
PROVA_AUTH_HMAC_SECRET
AUTH_HMAC_SECRET
PROVA_TOTP_ENCRYPTION_KEY
PROVA_SMTP_ENCRYPTION_KEY
PROVA_PROVISION_SECRET
ADMIN_TOKEN_ISSUE_SECRET
HEALTH_CHECK_CRON_SECRET
FRISTEN_CRON_SECRET
PROVA_STATUS_CRON_SECRET
STATUS_CRON_SECRET
PROVA_EMAIL_CRON_SECRET
UPTIME_WEBHOOK_SECRET
```

### Misc Backend
```
PROVA_ADMIN_EMAILS              (jetzt in Edge admin-auth.ts hardcoded + via PROVA_ADMIN_EMAILS in Supabase)
PROVA_ADMIN_REQUIRE_2FA
PROVA_ADMIN_PRIMARY_EMAIL
PROVA_IMPERSONATION_NOTIFY
IMPERSONATION_NOTIFY
NETLIFY_IDENTITY_*              (alle Identity-bezogenen — Identity wird in K-1.5 deaktiviert)
```

---

## Schritt-für-Schritt

### 1. Backup der ENVs

Geh zu **Netlify Dashboard → prova-systems → Site Configuration → Environment Variables**.

Klick auf "Export" oder kopiere alle Werte in eine LOCALE TXT-Datei (NICHT committen!).

### 2. Edge-Secrets in Supabase setzen

Geh zu **Supabase Dashboard → cngteblrbpwsyypexjrv → Project Settings → Edge Functions → Secrets**.

Pflicht-Variablen die dort gesetzt sein müssen:

```
SUPABASE_URL                    (auto, nicht editieren)
SUPABASE_ANON_KEY               (auto)
SUPABASE_SERVICE_ROLE_KEY       (auto)

# KI/External
OPENAI_API_KEY                  sk-...
ANTHROPIC_API_KEY               sk-ant-...

# Stripe
STRIPE_SECRET_KEY               sk_live_...
STRIPE_WEBHOOK_SECRET           whsec_...

# Email
RESEND_API_KEY                  re_...
PROVA_SMTP_FROM_NAME            "Marcel von PROVA"
PROVA_FROM_EMAIL                marcel@prova-systems.de

# PDF
PDFMONKEY_API_KEY               pk_...

# Sentry (Backend für admin-sentry-errors Edge)
SENTRY_AUTH_TOKEN               <token>
SENTRY_ORG_SLUG                 prova-systems
SENTRY_PROJECT_SLUG_FUNCTIONS   functions
SENTRY_PROJECT_SLUG_BROWSER     browser

# Auth
AUTH_HMAC_SECRET                <32+ chars>
PROVA_TOTP_ENCRYPTION_KEY       <64 hex chars / 32 bytes für AES-GCM>
PROVA_PROVISION_SECRET          <32+ chars internal>
ADMIN_TOKEN_ISSUE_SECRET        <32+ chars internal>

# Cron-Secrets
FRISTEN_CRON_SECRET             <32+ chars>
HEALTH_CHECK_CRON_SECRET        <32+ chars>
PROVA_STATUS_CRON_SECRET        <32+ chars>
UPTIME_WEBHOOK_SECRET           <32+ chars>

# Push
VAPID_PUBLIC_KEY                <pub-key>
VAPID_PRIVATE_KEY               <priv-key>
VAPID_SUBJECT                   mailto:kontakt@prova-systems.de

# Admin
PROVA_ADMIN_REQUIRE_2FA         true
PROVA_IMPERSONATION_NOTIFY      on
PROVA_ADMIN_EMAILS              marcel@prova-systems.de,kontakt@prova-systems.de
```

Wert-Transfer: aus Netlify-Backup → Supabase-Secrets-UI per Hand. Das ist der Pflicht-Aufwand (~15 Min).

### 3. Netlify ENVs löschen

Per "Delete" Knopf in Netlify-UI je Variable (kein bulk-delete leider).

Nach dem Putz: **Erwartete Total-Größe < 500 Bytes**.

### 4. Verify

Trigger einen Build via:
- `netlify deploy --prod` (CLI) ODER
- Push zu main → automatischer Deploy

Falls der Build wegen ENV-Größen-Limit failt, sind noch zu viele Variablen drin.

### 5. Smoke-Test

1. Frontend laden: https://prova-systems.de
2. Login bei https://app.prova-systems.de
3. Dashboard sollte ohne 500er laden
4. Admin-Cockpit (https://admin.prova-systems.de) — alle Sektionen prüfen
5. Console schauen nach `[edge-shim] reroute ...` Logs

Falls Browser 401/403 von Edge-Functions: Token-Auth-Pfad checken (siehe edge-shim.js).

---

## Was passiert wenn vergessen?

- `git push origin main` failt mit AWS Lambda 5KB-Limit-Error
- Netlify-Build cancelt
- Site bleibt auf altem Stand

**Fix:** in der Reihenfolge: ENVs in Supabase setzen → ENVs in Netlify löschen → push.

---

## ENV-Reduktion zum Vergleich

```
VOR:  ~120 Variablen × ~50 Bytes Avg = ~6000 Bytes (über AWS-Limit!)
NACH: ~10 Variablen × ~50 Bytes Avg = ~500 Bytes (deutlich unter Limit)
```

Permanenter Win: AWS-Limit-Problem ist mit dieser Migration vom Tisch. Edge-Functions skalieren mit eigenen Secrets ohne Lambda-Constraints.
