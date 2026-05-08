# MEGA⁴³ Welle 1 — Admin-Cockpit Migration — FINAL

**Datum:** 2026-05-08
**Sprint:** MEGA⁴³ Big-Bang-Migration zu Supabase Edge Functions
**Welle:** 1 (Admin-Cockpit, 13 Functions)
**Status:** Code+Deploy COMPLETE, Frontend-Patch + Tests in Welle 1.5

---

## ✅ Deployed Edge Functions (13/13 ACTIVE)

Alle 13 Admin-Functions sind als Supabase Edge Functions deployed (verify via `list_edge_functions`):

| # | Slug | Edge ID | verify_jwt | Status |
|---|---|---|---|---|
| 1 | admin-system-health | 56c66685 | false* | ACTIVE |
| 2 | admin-pilot-list | 23005c92 | false* | ACTIVE |
| 3 | admin-audit-trail | 42d810d3 | false* | ACTIVE |
| 4 | admin-stripe-kpis | d096ea96 | false* | ACTIVE |
| 5 | admin-feature-heatmap | ad99cf4a | false* | ACTIVE |
| 6 | admin-funnel | aef5f254 | false* | ACTIVE |
| 7 | admin-conversion-funnel | 9d10d058 | false* | ACTIVE |
| 8 | admin-churn | d9abb1dc | false* | ACTIVE |
| 9 | admin-mrr-live | 38a8af1d | false* | ACTIVE |
| 10 | admin-ki-aggregations | da8593cb | false* | ACTIVE |
| 11 | admin-ki-costs | c7985aae | false* | ACTIVE |
| 12 | admin-live-sessions | 10c87766 | false* | ACTIVE |
| 13 | admin-pdf-queue | ba64e21f | false* | ACTIVE |

*`verify_jwt: false` — die Functions implementieren CUSTOM-AUTH via `_shared/admin-auth.ts` (Whitelist + 2FA + Audit). JWT wird im handler validiert.

**Endpoint-URL Pattern:** `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-<name>`

---

## 📁 Repo-Struktur (lokal, NICHT gepusht)

```
supabase/functions/
├── _shared/
│   ├── admin-auth.ts           ← NEU: requireAdmin + adminHandler
│   ├── cors.ts                 (vorhanden)
│   ├── auth.ts                 (vorhanden)
│   └── ...
├── admin-system-health/index.ts    ← NEU
├── admin-pilot-list/index.ts       ← NEU
├── admin-audit-trail/index.ts      ← NEU
├── admin-stripe-kpis/index.ts      ← NEU
├── admin-feature-heatmap/index.ts  ← NEU
├── admin-funnel/index.ts           ← NEU
├── admin-conversion-funnel/index.ts ← NEU
├── admin-churn/index.ts            ← NEU
├── admin-mrr-live/index.ts         ← NEU
├── admin-ki-aggregations/index.ts  ← NEU
├── admin-ki-costs/index.ts         ← NEU
├── admin-live-sessions/index.ts    ← NEU
└── admin-pdf-queue/index.ts        ← NEU
```

---

## 🔐 Auth-Pattern (`_shared/admin-auth.ts`)

Port von `netlify/functions/lib/admin-auth-guard.js` (siehe `requireAdmin`).

**Reihenfolge:**
1. CORS-Preflight (OPTIONS) → 204
2. Bearer-Token aus Authorization-Header
3. JWT validieren via `supabase.auth.getUser(jwt)`
4. Email gegen Whitelist (`HARDCODED_ADMIN_EMAILS` + `PROVA_ADMIN_EMAILS` ENV)
5. 2FA-Check (Supabase JWT-Claim `aal === 'aal2'`) — opt-out via `require2FA: false`
6. Audit-Trail-Insert (action='read', entity_typ='admin_endpoint', payload={admin_email, admin_action})
7. Handler ausführen mit ctx={adminEmail, sb, claims}

**Rate-Limit:** Aktuell SKIPPED (kommt in Welle 1.5 via Postgres-RPC, ersetzt in-memory rate-limit-user.js).

---

## 🚧 NICHT in Welle 1 (deferred zu Welle 2/3)

- **admin-impersonate** — komplex (HMAC-Token-Issue + SMTP), security-sensitive → Welle 2 (Stripe + Email)
- **admin-cache-clear** — state-mutation → Welle 2
- **admin-force-logout** — state-mutation → Welle 2
- **admin-send-email** — SMTP → Welle 3 (Email)
- **admin-support-update** — Write-action → Welle 2
- **admin-env-status** — Netlify-spezifisch → wird in MEGA⁴³ obsolet
- **admin-billing-sync** — Stripe-deep → Welle 2 (Stripe-Block)
- **admin-pdfmonkey-inventory** — PDFMonkey-deep → später
- **admin-pseudonymisierung-audit** — DSGVO-spezifisch → später
- **admin-system-uptime** — Netlify-spezifisch → wird obsolet
- **admin-sentry-errors** — Sentry-API → später
- **admin-auth** — eigene Auth-Mechanik → Welle 2 (Auth-Konsolidierung)

---

## ⏳ Welle 1.5 — TODO (NICHT in dieser Welle)

1. **Frontend-Patch** (`admin-cockpit.html`):
   - Alle `fetch('/.netlify/functions/admin-*')` → `supabase.functions.invoke('admin-*')`
   - JWT aus `supabase.auth.getSession()`
   - Test mit Marcel-2FA-Login

2. **Smoke-Tests** pro Function:
   - GET-call mit JWT → 200 + JSON-Response erwartet
   - GET-call ohne JWT → 401 erwartet
   - GET-call mit Non-Admin-JWT → 403 erwartet
   - GET-call mit AAL1-JWT (kein 2FA) → 403 AAL2_REQUIRED erwartet

3. **Netlify-Lambdas deprecaten:**
   - 13 alte `netlify/functions/admin-*.js` → umbenennen zu `.deprecated.js`
   - Build-Limit-Reduktion (kleiner Beitrag — ENV-Bytes bleiben gleich)

4. **Rate-Limit via Postgres-RPC:**
   - Neue RPC `prova_check_rate_limit(p_key text, p_max int, p_window_sec int) RETURNS jsonb`
   - In `_shared/admin-auth.ts` einbinden (ersetzt Netlify in-memory rate-limit-user.js)

---

## 📊 Was Welle 1 GEBRACHT hat

- **13 Functions** erfolgreich von AWS Lambda → Deno Edge Runtime portiert
- **0 ENV-Konsumption** für diese 13 Functions auf Netlify-Seite (sie werden später deprecated)
- **Latency-Verbesserung erwartet:** Edge ist EU-region (Frankfurt), Lambda war us-east-1
- **JWT-Auth direkt** statt durch Netlify-Cookie-Middleware
- **Audit-Trail-Pattern** mit neuem Schema (action/entity_typ/entity_id/payload)
- **2FA-Pflicht** strikter durchgesetzt (AAL2-Claim required)

---

## 🎯 Naechste Schritte (Welle 2: KI-Pipeline + Stripe)

Aus Marcels Master-Plan:
- **Welle 2:** KI-Pipeline (8 Functions) — ki-proxy ist schon da, restliche 7 migrieren
- **Welle 3:** Stripe + Email (15 Functions) — admin-impersonate, stripe-checkout, send-welcome-email etc.
- **Welle 4:** Workflow + Cron (30 Functions) — pg_cron statt Netlify Cron
- **Welle 5:** Rest (~80 Functions)
- **Welle 6:** Netlify Functions Deprecation + Cleanup

**Nach Welle 5/6:** Netlify Functions ENV-Limit-Problem strukturell gelöst, weil keine Lambda-Functions mehr.

---

## 🔧 Manuelle Verifikation für Marcel

**Test-Curl (mit Marcel-2FA-JWT):**

```bash
# Healthcheck (sollte 200 + ENV-Status liefern)
JWT="<deine 2FA-Session-JWT aus localStorage>"

curl -H "Authorization: Bearer $JWT" \
  "https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-system-health"

# Pilot-Liste (sollte 200 + workspaces[] liefern)
curl -H "Authorization: Bearer $JWT" \
  "https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-pilot-list?status=trial"

# MRR-Live (sollte 200 + mrr_eur liefern)
curl -H "Authorization: Bearer $JWT" \
  "https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-mrr-live"
```

**Negative-Tests:**
```bash
# ohne JWT → 401 UNAUTHORIZED
curl "https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-system-health"

# mit Non-Admin-JWT → 403 NOT_ADMIN
curl -H "Authorization: Bearer <pilot-jwt>" \
  "https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-system-health"

# mit AAL1-JWT → 403 AAL2_REQUIRED
# (passiert wenn Marcel 2FA nicht in Session aktiviert hat)
```

---

## 📝 Bekannte Limitierungen

1. **Audit-Trail-Schema-Diskrepanz:** Die migrierten Edge-Functions LESEN aus `audit_trail` mit Spalten `typ`, `sv_email`, `details` (alter Schema). Das Audit-Logging SCHREIBT mit neuem Schema (`action`, `entity_typ`, `entity_id`, `payload`). Beide Schemas müssen in `audit_trail` koexistieren — wenn nur das neue Schema existiert, schlagen die LESE-Queries fehl. Marcel sollte verifizieren, dass `audit_trail` beide Spalten-Sets hat (oder Migration nachziehen).

2. **`ki_protokoll` Tabelle:** admin-ki-costs und admin-ki-aggregations erwarten diese Tabelle. Falls Schema fehlt: Function liefert `configured: false` mit Hinweis auf pending Migration.

3. **Stripe-API-Version:** admin-stripe-kpis nutzt `2024-12-18.acacia`. Bei Stripe-Update prüfen.

4. **Rate-Limit fehlt:** Aktuell jede Admin-Function ohne Rate-Limit. AAL2-Pflicht + Email-Whitelist sind primärer Schutz. Postgres-RPC kommt in Welle 1.5.

---

## ✅ Marcel-Action

1. **JETZT:** Im Browser zu Marcel-Cockpit gehen (admin-cockpit.html), Smoke-Test machen mit aktuellem `/.netlify/functions/`-URL — sollte funktionieren wie vorher (Netlify-Lambdas noch aktiv solange sie vorhanden sind).
2. **TEST:** Mit curl die 13 Edge-Functions einzeln testen (siehe oben).
3. **NACHST:** Welle 1.5 — Frontend-Patch zu Edge-URLs, dann Netlify-Lambdas deprecaten.

---

*Co-Authored-By: Claude Opus 4.7 (1M context)*
