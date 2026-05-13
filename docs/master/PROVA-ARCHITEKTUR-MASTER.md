# PROVA Architektur Master

**Stand:** 02.05.2026 nachmittags (Tag 8, post-Voll-Cleanup-Sprint)
**Single Source of Truth** — siehe `docs/master/README.md`

> **Status-Update 2026-05-14 (MEGA⁷³):** Counts haben sich seit Tag 8 vervielfacht.
> Aktueller Stand (verifiziert): **313 HTML-Files** (incl. Brief-Vorlagen, Form-Templates,
> PDF-Templates, Tools), **115 Netlify Functions** (alle aktiv per sw.js APP_SHELL-Audit),
> **143 Supabase Edge Functions** (deployed). Live-Auth-Stack: Supabase + `auth-guard.js`
> (Netlify Identity ist tot). DRY-Migration-Foundation: `lib/prova-supabase-adapters.js`
> (252 LOC) — wandelt Supabase-Rows zurück in Airtable-Style fields-Objects.
> Drift-Stand: **0 Airtable-Reads in P1+P2-Files** (akte/dashboard/freigabe/archiv/termine/
> rechnungen/beratung/wertgutachten/baubegleitung/erechnung/jahresbericht/statistiken).
> P3-Backlog: tools/, admin/, einzelne Edge-Function-Trigger.

---

## High-Level

```
┌─────────────────────────────────────────────────────────────────┐
│  prova-systems.de        →  LANDING (Marketing/Legal)           │
│    /                        index.html · Marketing-Hero          │
│    /pricing /preise         pricing.html (Solo 179€/Team 379€)   │
│    /kontakt /contact        kontakt.html (Mailto-Form)           │
│    /datenschutz /impressum  Legal (cross-domain canonical)       │
│    /agb /avv                Legal                                │
│    /login /dashboard /…     301 → app.prova-systems.de/…         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  app.prova-systems.de    →  SaaS-App (Login-protected)          │
│    /                        301 → /dashboard                     │
│    /login                   login.html (Supabase-Auth, ES256)    │
│    /dashboard               dashboard.html (lib/auth-guard.js)   │
│    /akte /briefe /…         51 Pages · alle auf lib/auth-guard   │
│    Service-Worker:          v249 (jose-Verify + Bridge-Defense)  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  admin.prova-systems.de  →  ADMIN (Founder-Cockpit)             │
│    Domain noch nicht aktiv — admin-dashboard.html lebt aktuell   │
│    via Path-Alias auf app-Subdomain (Sprint 18 separater Setup)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech-Stack (post-Voll-Supabase-Refactor)

### Frontend

```
Vanilla JavaScript (ESM + classic scripts hybrid)
  KEINE Frameworks (kein React/Vue/Svelte) — Marcel-Direktive
  KEIN Bundler (Module via esm.sh-CDN für Lib-Imports)

Service Worker (sw.js)
  CACHE_VERSION: prova-v249
  Strategie: Network-First für HTML, Cache-First für Assets, Network-Only für APIs
  APP_SHELL: ~80 Files (alle GREEN-Pages + Login + Lib-Stack)
  Bei jedem Deploy mit JS/CSS/HTML-Change: CACHE_VERSION inkrementieren (Regel 30)

Auth-Stack (Frontend)
  @supabase/supabase-js v2.105.0
    persistSession: true · autoRefreshToken: true · detectSessionInUrl: true
    storageKey: 'prova-auth-token' · flowType: 'pkce'
  lib/auth-guard.js: runAuthGuard, requireWorkspace, watchAuthState, bindLogoutButtons,
                     writeLegacyBridge, clearLegacyBridge, isFounder
  lib/supabase-client.js: Singleton, getSupabase, getCurrentUser, getCurrentSession,
                          getActiveWorkspaceId, signOut

Frontend-Helper (Legacy-Stack, bleibt mit Bridge-Layer)
  prova-fetch-auth.js  Bearer-Header-Injection in alle /.netlify/functions/-Calls
                       Defense-in-Depth: bei 401 mit Supabase-JWT erst refreshSession()
  auth-guard.js (Legacy, root) HMAC-Token-Format-Check, bleibt bis app-login.html migriert
  prova-fetch-auth.js, prova-pseudo.js, prova-sanitize.js, prova-notifications.js,
  prova-account-gate.js, theme.js, nav.js, prova-config.js, etc.
```

### Backend

```
Supabase Postgres (Frankfurt)
  Project-ID: cngteblrbpwsyypexjrv
  Multi-Tenancy via workspace_id + RLS-Policies
  ~61 Tabellen (post Schema-Refactor)
  Migrations:
    supabase-migrations/01-04 + 05_v2 + 06_v3 (alter Pfad, vermutlich applied)
    supabase/migrations/20260429-30 (neuer Pfad, applied)
    supabase/migrations/PLANNED_06b (pending Apply)

Supabase Storage
  Buckets: sv-files (per-workspace), sv-public (öffentlich), sv-system (intern)

Supabase Edge Functions (Deno + TypeScript)
  /supabase/functions/<name>/index.ts
  ki-proxy v1, whisper-diktat v1, send-email v1, stripe-webhook v1,
  lifecycle-trigger v1, audit-write v1, ical-feed v1
  brief-generate v3 (X3 Service-Role) ← LIVE seit 30.04. 00:30
  pdf-generate v3 (X4 Service-Role) ← LIVE

Supabase Auth
  ES256 (asymmetric ECC P-256) JWT seit Mai 2025
  JWKS-URL: https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json
  1 aktiver Public Key (kid: a3d72a1f-...)

Netlify Functions (~31 Stück, post-Voll-Cleanup)
  Server-Side JWT-Verify via lib/auth-resolve.js (async)
    → 3-Teiler-Token: lib/supabase-jwt.js (jose+JWKS, ES256)
    → 2-Teiler-Token: lib/auth-token.js (HMAC-SHA256 Legacy-Fallback)
  Auth-protected: ~18 Functions (alle via requireAuth oder resolveUser)
  Public: ~7 Functions (health, error-log, normen, auth-token-issue, etc.)
  Admin-only: ~3 Functions (admin-auth, admin-cache-clear, etc.)
  Server-triggered: ~3 Functions (stripe-webhook, termin-reminder, etc.)
  
  GELÖSCHT 02.05. (Voll-Cleanup-Sprint Block 3, 16 Functions + 1 Helper):
  airtable.js, airtable-rate-limiter.js, lib/airtable-query.js (Pure-Proxies)
  setup-tabellen.js, identity-signup.js (One-Time/Legacy)
  auth-token-verify.js, brief-pdf-senden.js, brief-senden.js,
  foto-pdf.js, mahnung-pdf.js, rechnung-pdf.js, jahresbericht-pdf.js,
  zugferd-rechnung.js, smtp-test.js, create-checkout-session.js,
  prova-subscription.js, pdf-analyse.js, normen-monitor.js, lib/prova-cache.js
```

### Externe Services

| Service | Rolle | Schaltbar? |
|---|---|---|
| **Supabase** | DB + Auth + Storage + Edge Functions | core |
| **OpenAI** (GPT-4o, GPT-4o-mini, Whisper) | KI via `ki-proxy` | core |
| **Stripe** | Zahlungen, Subscriptions, Webhook | core |
| **PDFMonkey** | PDF-Rendering | core |
| **Resend** | Emails (via Edge Function `email-send`) | core |
| **Netlify** | Frontend-Hosting + Functions | core |
| **Make.com** | Cron-Jobs (T3 Trial-Reminders, F1 Founding) | reduziert (raus ab Sprint K-1.5) |
| **IONOS SMTP** | Custom-SMTP-Forward | optional |
| ~~**Airtable**~~ | ~~Legacy-Read-Path~~ — **AUS DEM LIVE-PFAD ENTFERNT 02.05.2026** (`airtable.js` Function gelöscht, CSP `connect-src` clean, `prova-fetch-auth.js` blockt verbleibende Tot-Code-Calls hart). ~25 Functions referenzieren noch `process.env.AIRTABLE_*` (Refactor-Backlog). | **OUT (Live-Pfad)** |

---

## Stripe-Architektur (Stand 03.05.2026, neuer Account)

### Account-Migration
- 03.05.2026 — neuer Stripe-Account (alter war Sandbox, 0 Kunden, 0 Risiko)
- Tag `v205-stripe-account-migration` (pending nach Marcel-Test)

### Komponenten

| Komponente | Location | Zweck |
|---|---|---|
| **stripe-checkout.js** | Netlify Function | Erzeugt Checkout-Session (Subscription Solo/Team + Add-ons) |
| **stripe-webhook.js** | Netlify Function | Empfängt Stripe-Events (signed), schreibt in Supabase |
| **stripe-portal.js** | Netlify Function | Erzeugt Customer-Portal-Link für Abo-Verwaltung |
| **lib/prova-stripe-prices.js** | Helper | Price-ID-Resolution (ENV-First) |

### Architektur-Entscheidung: Netlify Function statt Supabase Edge

**Webhook bleibt Netlify Function**, weil:
1. **stripe**-npm-Package ist CommonJS — Deno-Edge bräuchte ESM-Anpassungen + alternative Imports
2. **Signature-Verify** (`stripe.webhooks.constructEvent`) ist im Node-Stack getestet + funktioniert
3. **Konsistenz:** stripe-checkout, stripe-portal sind auch Netlify
4. **Latenz nicht kritisch:** Stripe wartet bis 30s, Webhook braucht nur Idempotenz
5. **Wartbarkeit:** Marcel kennt Netlify-Functions-Stack
6. **Kein Vorteil Edge:** Cold-Start-Optimierung ist hier nicht gefragt

**DB-Backend:** Migrierung von Airtable auf **Supabase** (03.05.2026). Webhook schreibt jetzt in:
- `stripe_events` — Idempotenz via UNIQUE `stripe_event_id`, Audit-Spur
- `workspaces.abo_*` — Subscription-State (tier, status, customer_id, subscription_id, price_id, MRR-Snapshot)
- `audit_trail` — DSGVO-Pflicht-Logging pro Event

### Datenfluss

```
Stripe-Webhook → POST /.netlify/functions/stripe-webhook
  ↓ stripe.webhooks.constructEvent(body, sig, whSecret)
  ↓ Idempotenz-Check: stripe_events WHERE stripe_event_id = X
  ↓   → existiert? status='duplikat', return 200
  ↓ INSERT INTO stripe_events (status='empfangen')
  ↓ Switch event.type:
  ↓   checkout.session.completed → workspace.abo_status='aktiv'
  ↓   invoice.payment_succeeded   → workspace.letzte_zahlung_*
  ↓   customer.subscription.deleted → workspace.abo_status='gekuendigt'
  ↓ UPDATE stripe_events SET status='verarbeitet', verarbeitet_at=NOW()
  ↓ INSERT INTO audit_trail (DSGVO-Logging)
  ↓ return 200
```

### Plan-Tier-Mapping (neuer Account)

| PROVA-Plan | Stripe-Modus | ENV-Var-Name | Default Price-ID (neuer Account 03.05.) |
|---|---|---|---|
| Solo (179€/Mo) | subscription | STRIPE_PRICE_SOLO | `price_1TSjMZRXumrtL2n5fgToRwyr` |
| Team (379€/Mo) | subscription | STRIPE_PRICE_TEAM | `price_1TSjNXRXumrtL2n56c6emN2k` |
| Founding (99€/Mo lifetime, 10 Plätze) | coupon | FOUNDING-99 | siehe STRIPE_FOUNDING_COUPON_ID |
| Add-on 5 Gutachten (25€) | payment (one-time) | STRIPE_PRICE_ADDON_5 | `price_1TSl2JRXumrtL2n52XSz85oC` |
| Add-on 10 Gutachten (45€) | payment (one-time) | STRIPE_PRICE_ADDON_10 | `price_1TSl3fRXumrtL2n5Gur4BmWL` |
| Add-on 20 Gutachten (80€) | payment (one-time) | STRIPE_PRICE_ADDON_20 | `price_1TSl4eRXumrtL2n5tIWx0ET8` |
| Founding-Coupon (50€ off, lifetime, 10 Plätze) | coupon | STRIPE_FOUNDING_COUPON_ID | TBD nach Marcel-Anlage |

### Setup-Doku
→ siehe `docs/strategie/STRIPE-SETUP.md`

### Verification-Suite (03.05.2026)
5 Skripte für Marcel:
- `npm run verify-stripe` — ENV + API + Webhook + Coupon + Supabase + Portal
- `npm run test-webhook` — Mock-Event signiert senden, End-to-End-Test
- `npm run test-checkouts` — 7 Test-Checkout-URLs (Solo/Team/Founding/3 Add-ons + Founding-Pilot)
- `npm run stripe-status` — Live-Webhook-Health (Catch-Up C4)
- `npm run stripe-replay` — Failed-Webhook Re-Delivery (Catch-Up C4)

→ Runbook + Troubleshooting in `docs/strategie/STRIPE-VERIFICATION-RUNBOOK.md`

### Founding-Pilot-Programm (Catch-Up C1, 03.05.2026)
- **Pilot-Signup-Page:** `/pilot` (`pilot.html`)
- **Backend:** `stripe-checkout.js` mit `pilot_program=true` body-Param
- **Mechanik:** 90 Tage Trial + Auto-Apply FOUNDING-99 Coupon → 99€/Mo lifetime
- **Pre-Check:** Coupon-Plätze via `stripe.coupons.retrieve()` (max 10 redemptions)
- **Webhook-Erweiterung:** `customer.subscription.trial_will_end` + Trial-zu-Paid-Transition
- **Audit-Trail-Types:**
  - `stripe.pilot.trial_started` (Signup)
  - `stripe.pilot.trial_ending_soon` (Tag 87, 3T vor Ende)
  - `stripe.pilot.founding_paid` (Tag 90, erste echte Zahlung)
- **Email-Templates:** `email-templates/founding/` (4 Templates: einladung, trial-welcome, trial-ending, founding-welcome)
- **Test-Coverage:** `tests/stripe/founding-pilot.test.js` (9/9 grün)
- **Marcel-Workflow:** `docs/strategie/PILOT-EINLADUNG-WORKFLOW.md`

---

## Subprozessoren (DSGVO Art. 28, Stand 02.05.2026)

Pflicht-Liste für AVV (`docs/public/AVV-VORLAGE.md`) und Datenschutzerklärung (`docs/public/DATENSCHUTZERKLAERUNG-ENTWURF.md`). Siehe auch `docs/audit/2026-05-02-supabprozessoren.md`.

| Anbieter | Sitz | Datenkategorien | Rechtsgrundlage | AVV-Status | Transfer-Mechanismus |
|---|---|---|---|---|---|
| **Supabase Inc.** | US (Hosting in Frankfurt EU, AWS eu-central-1) | Stammdaten, Auftragsdaten, Foto-Files, Audit-Logs, Auth-Tokens | Art. 6 Abs. 1 lit. b (Vertragserfüllung) + Art. 6 Abs. 1 lit. f (berechtigtes Interesse) | **Standard-AVV unterzeichnet** (Marcel-Action: Status verifizieren) | EU-Hosting, US-Mutter via SCC + DPA |
| **OpenAI Ireland Ltd.** | IE (API-Endpoints US) | Pseudonymisierte Diktat-Texte, KI-Prompt-Inputs | Art. 6 Abs. 1 lit. b + Marcel-Einwilligung Pilot-SV | **AVV erforderlich** — Marcel-Action: OpenAI-Business-Account + DPA | EU-Mutter, US-Verarbeitung via SCC + Pseudonymisierung |
| **Stripe Payments Europe Ltd.** | IE (Dublin) | Email, Zahlungsdaten (NICHT Kreditkarten — bei Stripe direkt) | Art. 6 Abs. 1 lit. b | **Standard-AVV** (Stripe-Side, durch Akzeptanz Stripe-Terms) | EU-Verarbeitung |
| **PDFMonkey SAS** | FR | Auftragsdaten (zur PDF-Generierung), Briefkopf-Daten | Art. 6 Abs. 1 lit. b | **AVV erforderlich** — Marcel-Action: DPA bei PDFMonkey anfordern | EU-Verarbeitung |
| **Make.com (Celonis SE / IFTTT EMEA)** | CZ (Prag) | Webhook-Payloads (Trial-Reminder, Founding-Coupon) | Art. 6 Abs. 1 lit. f | **AVV erforderlich** — Marcel-Action: DPA bei Make.com prüfen | EU-Verarbeitung |
| **Netlify Inc.** | US (Hosting San Francisco + Edge weltweit) | Frontend-Files (statisch), Function-Logs (anonymisiert) | Art. 6 Abs. 1 lit. b + lit. f | **AVV erforderlich** — Marcel-Action: Netlify Pro Plan + DPA | US-Verarbeitung via SCC + DPA |
| **Resend (Resend Inc.)** | US | E-Mail-Adressen + Mail-Body-Inhalte | Art. 6 Abs. 1 lit. b | **AVV erforderlich** — Marcel-Action: DPA bei Resend anfordern | US-Verarbeitung via SCC + DPA |
| **IONOS SE** | DE | DNS, Domain-Registry | Art. 6 Abs. 1 lit. b | Standard-Vertrag DE | EU-Verarbeitung |
| **GitHub Inc.** (Microsoft) | US | Source-Code (kein Production-User-Daten) | Art. 6 Abs. 1 lit. b (interne Entwicklung) | nicht subprozessor-relevant (keine Endkunden-Daten) | – |

### Pseudonymisierung (Pflicht vor OpenAI)

**Vor jedem KI-Call** durchläuft der Diktat-Text die Funktion `prova-pseudo.js` server-side:
- Namen → `[NAME-1]`, `[NAME-2]`, ...
- Adressen → `[ADRESSE-1]`, ...
- E-Mails → `[EMAIL-1]`, ...
- IBANs → `[IBAN-1]`, ...
- Telefonnummern → `[TEL-1]`, ...

**Reverse-Mapping** bleibt server-side, OpenAI sieht nur Platzhalter. Doku in `lib/prova-pseudo.js`.

### Datenflussdiagramm

→ siehe `docs/audit/DSGVO-DATAFLOW.md` (Phase 4 Audit 16, mit Mermaid-Diagram)

---

## Auth-Architektur (post-Option-C, KOMPLETT)

### Frontend Login-Flow

```
auth-supabase-logic.js (login.html lädt)
  ↓
supabase.auth.signInWithPassword(email, password)
  ↓ data.session.access_token = ECHTES ES256 JWT (3-Teiler eyJ...)
  ↓ data.session.refresh_token
  ↓
writeLegacyBridge(user, session) in lib/auth-guard.js
  ↓ schreibt session.access_token in localStorage.prova_auth_token
  ↓ KEIN Bridge-Hack mehr — echter ES256 JWT (Option C)
  ↓ schreibt prova_sv_email + prova_user (für Hybrid-Pages mit Legacy-Inline-IIFE-Guard)
  ↓
window.location.href = '/dashboard'
```

### Server-Side Verify

```
netlify/functions/lib/auth-resolve.js (async)
  → Token-Source: Authorization: Bearer ... oder Cookie: prova_auth=...
  → Format-Detection: parts.length
      ↓ 3 (eyJ.payload.sig) → SupabaseJWT.verify() via jose+JWKS
      ↓ 2 (head.sig)        → AuthToken.verify() via crypto HMAC (Legacy-Fallback)
  → Returnt unified payload: {sub: email-lowercase, sv_id: uuid, plan, verified, iat, exp, _source}
```

### `lib/supabase-jwt.js` (NEU, ~107 Z)

```js
const { jwtVerify, createRemoteJWKSet } = await import('jose');  // ESM dynamic import
const JWKS = createRemoteJWKSet(new URL(PROVA_SUPABASE_JWKS_URL));

async function verify(token) {
    const { payload } = await jwtVerify(token, JWKS, {
        issuer: PROVA_SUPABASE_PROJECT_URL + '/auth/v1',
        audience: 'authenticated',
        algorithms: ['ES256']
    });
    return payload;  // oder null bei Fehler (nie throw)
}
```

### Defense-in-Depth (`prova-fetch-auth.js`)

```
provaFetch(url, options) at runtime:
  → Sende Authorization: Bearer <prova_auth_token>
  → Falls response.status === 401 UND token ist Supabase-JWT (eyJ...):
      ↓ supabase.auth.refreshSession() versuchen
      ↓ Bei Erfolg: localStorage.prova_auth_token = neuer access_token
      ↓ 1× Retry mit neuem Bearer-Header
      ↓ Falls retry erfolgreich → Caller bekommt fresh response
      ↓ Falls retry weiterhin 401 → clearAuthAndRedirect()
  → Falls 401 mit altem HMAC-Token (Legacy):
      ↓ direkt clearAuthAndRedirect()
```

### Bridge-Layer für Hybrid-Pages

`lib/auth-guard.js writeLegacyBridge(user, session)`:
- `prova_auth_token` = `session.access_token` (echter ES256 JWT)
- `prova_sv_email` = `user.email`
- `prova_user` = `JSON {email, id, bridge:true}`
- `prova_last_activity` = `Date.now()`

**Belt-and-Suspenders Loop-Counter:**
- `sessionStorage.prova-redirect-counter` + `prova-redirect-stamp`
- 5 Redirects in 30s → roter Banner statt weiter-redirecten
- Reset bei erfolgreichem `runAuthGuard` Page-Render
- Reset bei erfolgreichem Form-Login

**`watchAuthState`** schreibt Bridge bei:
- `SIGNED_IN` → bei Login
- `TOKEN_REFRESHED` → bei automatischem supabase-js-Refresh (alle ~50 Min)
- `SIGNED_OUT` → `clearLegacyBridge`

### ENV-Vars (PROVA-Prefix gegen Multi-Tenant-Konflikte)

```
PROVA_SUPABASE_JWKS_URL    Pflicht, public (kein Secret)
                           https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json
PROVA_SUPABASE_PROJECT_URL optional, sonst dynamisch aus JWKS_URL abgeleitet
                           https://cngteblrbpwsyypexjrv.supabase.co
AUTH_HMAC_SECRET           Legacy, weiterhin aktiv für 2-Teiler-Tokens (HMAC-Fallback)
```

### NPM-Packages

```
jose@^6.2.3               Industry-Standard JWT-Verify (panva, ~5M weekly)
                           ESM-only — Lazy Dynamic-Import in async Funktionen
@supabase/supabase-js@^2.105.0  Frontend Auth + Realtime + Storage
bcryptjs@^2.4.3           Legacy Login-Hashing (auth-token-issue Provisional-Pfad)
stripe@^14.25.0           Stripe-SDK für Server-Functions
nodemailer@^6.9.16        SMTP-Senden
web-push@^3.6.7           Web-Push-Notifications
form-data@^4.0.0          Multipart-Forms (Foto-Upload)
dotenv@^17.4.2            Local-Dev-ENV
```

---

## Routing-Architektur

### `netlify.toml` (v6.0 nach APP-LANDING-SPLIT + Option C)

**Block A — Auth/Login-Konsolidierung (alle Hosts):**
- `/app-login.html` → 301 → `https://app.prova-systems.de/login`
- `/auth-supabase.html` → 301 → `https://app.prova-systems.de/login`
- `/logout` → 302 → `https://prova-systems.de/`

**Block B — Cross-Domain LANDING → APP (host-conditioned):**
- 30+ Routes von `prova-systems.de/<path>*` → `app.prova-systems.de/<path>:splat` (301 force)
- z.B. `/dashboard`, `/akte`, `/briefe`, `/archiv`, `/kontakte`, `/profil`, etc.

**Block C-pre — APP-Subdomain Path-Rewrites (host-conditioned auf `app.`):**
- 37 Rewrites — `https://app.prova-systems.de/dashboard` → `/dashboard.html` (200)
- Diese Rewrites greifen NUR auf app-Subdomain (Hotfix `redirect-precedence`)

**Block C — APP-Root:**
- `https://app.prova-systems.de/` → 301 → `/dashboard` (force)

**Block D — Legacy-Redirects:**
- `/app-starter.html`, `/app-pro.html`, `/app-enterprise.html` → `/app.html` (Sprint K1)
- `/bescheinigungen*` → `/dashboard.html`
- `/* → /404.html` (Catch-all)

### `_redirects` (post-Hotfix v6.1)

Path-only Aliase für **LANDING-Hosts** (das App-Path-Rewrites stehen in netlify.toml):
- Marketing: `/pricing`, `/preise`, `/kontakt`, `/contact`
- Admin: `/admin`, `/admin-dashboard`, `/admin-login`
- Legal: `/agb`, `/datenschutz`, `/impressum`, `/avv`
- Edge-Function-Aliase: `/webhook/stripe`

---

## Migrations-Stand (Frontend-HTML)

| Status | Anzahl | Notiz |
|---|---:|---|
| **Migriert auf `lib/auth-guard.js`** | 51 | Cutover Block 3 (sw.js v248), 11 Critical mit Inline-IIFE-Guard + 40 Tier-2 |
| **Bewusst Legacy belassen** | 2 | `app-login.html` (wird obsolet), `admin-dashboard.html` (Sprint 18) |
| **Pages mit altem Inline-IIFE-Guard** | 0 | alle entfernt |
| **20 SAFE-DELETED** | 20 | Branch `cleanup/cluster-review-auto` (pending Merge) |
| **Pure-Supabase GREEN-Pages** | 5 | briefe, kontakte-supabase, profil-supabase, gutachterliche-stellungnahme, onboarding-supabase |

**Total HTML im Repo-Root post-Cleanup:** ~109 Files (war 129).

---

## Service-Worker Versions-Historie

| Version | Datum | Anlass |
|---|---|---|
| v204-v211 | Apr 25-26 | S-SICHER P4A/P4B |
| v240-v241 | K-UI | Profil/Kontakte-Pages |
| v243 | 30.04. | APP-LANDING-SPLIT 3d (LOGIN_PAGE → /login) |
| v244 | 30.04. | split-3d nav.js Logout/Logo |
| v245 | 30.04. abend | Hotfix redirect-precedence |
| v246 | 01.05. morgens | Hotfix login-redirect-default |
| v247 | 01.05. morgens | Hotfix-2 disable auto-redirect |
| v248 | 01.05. nachts | Cutover Block 3: Bridge + Belt-and-Suspenders |
| **v249** | **01.05. mittag** | **Option C: Server-Side Supabase-JWT-Verify (jose JWKS)** |

**Bei jedem JS/CSS/HTML-Change in APP_SHELL:** CACHE_VERSION inkrementieren in DEMSELBEN Commit (Regel 30).

---

## Datenmodell (Top-Level)

> ⚠️ **TBD Marcel:** Schema ist 61 Tabellen post-Refactor. Vollständige Doku in `supabase-migrations/01_-06_*.sql` Files. Hier Top-Level-Übersicht:

| Tabelle | Inhalt |
|---|---|
| `workspaces` | Workspace pro SV-Solo oder Team-Büro |
| `workspace_memberships` | User → Workspace mit Rolle + is_active |
| `users` | Auth-User (synct mit Supabase auth.users) + `is_founder` |
| `auftraege` | Akten/Vorgänge mit `typ` (ENUM auftrag_typ), Schadensart, Phase |
| `kontakte` | Adressbuch (Auftraggeber, Beteiligte, Geschädigte) |
| `eintraege` | Diktate, Notizen, Skizzen pro Akte (gerichtsfeste Chronologie) |
| `dokumente` | PDFs, Briefe, Fotos pro Akte |
| `rechnungen` | Rechnungen + Mahnungen + Status |
| `termine` | Kalender-Events (Ortstermine, etc.) |
| `audit_trail` | Audit-Logs (DSGVO + KI-Calls + Auth-Events) |
| `ki_protokoll` | KI-Call-Logging mit Token-Counts + Kosten |
| `feature_events` | Telemetrie-Events |
| `textbausteine` | SV-Floskeln + Standardtexte |
| `floskeln` | Standard-Floskeln (Admin-kuratiert) |
| `normen` | DIN/WTA/VOB-Katalog (read-only) |
| `rechtsdokumente` | AGB/Datenschutz/AVV-Versionen mit `aktuell`-Flag |
| `einwilligungen` | DSGVO-Einwilligungen pro User mit Re-Consent-Trail |
| `versicherungs_partner` | Liste der Versicherer für AVV-Compliance |
| `stripe_events` | Stripe-Webhook-Events mit UNIQUE-Constraint (Idempotenz) |

**RLS-Pattern:** Jede User-bezogene Tabelle filtert via `workspace_id`-Match aus `workspace_memberships`.

---

## Edge Functions (Live-State)

| Function | Version | Status |
|---|---|---|
| `ki-proxy` | v1 | live |
| `whisper-diktat` | v1 | live |
| `send-email` | v1 | live |
| `stripe-webhook` | v1 | live |
| `lifecycle-trigger` | v1 | live |
| `audit-write` | v1 | live |
| `ical-feed` | v1 | live |
| **`brief-generate`** | **v3 (X3 Service-Role)** | **LIVE seit 30.04. 00:30** |
| **`pdf-generate`** | **v3 (X4 Service-Role)** | **LIVE** |

> ⚠️ **Drift-Notiz:** Die Liste hier ist aus DONE-Files. Aktuelle Edge-Function-Liste in `supabase/functions/` (Filesystem) verifizieren bei Bedarf.

---

## Netlify Functions (Stand 02.05.2026, ~31 Stück, post-Voll-Cleanup)

### `lib/` (Helper)

| Datei | Zweck |
|---|---|
| **`supabase-jwt.js`** | NEU — jose-JWKS-Verify (~107 Z) async, returnt null bei Fehler |
| `auth-resolve.js` | async, dual-verify (Supabase-First + HMAC-Fallback) |
| `auth-token.js` | Legacy HMAC-SHA256 sign/verify (130 Z) |
| `auth-validate.js` | Email-Validation + HTML-Escape |
| `jwt-middleware.js` | `requireAuth(handler)` Wrapper |
| `cors-helper.js` | CORS-Headers per ENV |
| `rate-limit-user.js` | In-Memory Rate-Limit-Bucket per Token-sub |
| `prova-pseudo.js`, `prova-logger.js`, `prova-stripe-prices.js`, `prova-fachwissen.js`, `prova-fetch.js` | weitere Helpers |

### Auth-protected (~18, alle via `requireAuth` oder direkter `resolveUser`)

`make-proxy.js`, `akte-export.js`, `audit-log.js`, `dsgvo-auskunft.js`, `dsgvo-loeschen.js`, `emails.js`, `foto-anlage-pdf.js`, `foto-captioning.js`, `foto-upload.js`, `ki-proxy.js`, `ki-statistik.js`, `mein-aktivitaetsprotokoll.js`, `pdf-proxy.js`, `smtp-senden.js`, `stripe-checkout.js`, `stripe-portal.js`, `whisper-diktat.js`

> ⚠️ **Refactor-Backlog:** Diese Functions referenzieren noch `process.env.AIRTABLE_*`. Nach Marcel-ENV-Löschung schlagen Airtable-Calls mit `401` fehl — Funktionen müssen in Folge-Sprints auf Supabase migriert werden.

### Public / Server-Triggered (~7)

`health.js`, `error-log.js`, `push-notify.js`, `normen.js`, `normen-picker.js`, `team-interest.js`, `stripe-webhook.js`, `termin-reminder.js`, `auth-token-issue.js`

### Admin-Only (~3, separater Auth-Pfad — Sprint 18)

`admin-auth.js`, `admin-cache-clear.js`, `smtp-credentials.js`, `invite-user.js`

### Internal/Helper

`provision-sv.js`

---

## ENV-Vars (Netlify-Function-Pool)

```
# Supabase (Option C)
PROVA_SUPABASE_JWKS_URL          ← Pflicht
PROVA_SUPABASE_PROJECT_URL       ← optional

# Auth (Legacy, weiterhin für HMAC-Fallback)
AUTH_HMAC_SECRET

# Airtable — DEPRECATED (Marcel-Action: manuell in Netlify-UI löschen)
# Liste in docs/sprint-status/AIRTABLE-ENV-CLEANUP-LIST.md (12 Vars)
# Nach Löschung: ~18 Auth-Functions schlagen Airtable-Calls mit 401 fehl
# (Refactor-Backlog für Folge-Sprints)

# OpenAI
OPENAI_API_KEY

# Stripe
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_SOLO, STRIPE_PRICE_TEAM,
STRIPE_AUTO_TAX

# Make.com (reduziert)
MAKE_K, MAKE_S, MAKE_WEBHOOK_A, MAKE_WEBHOOK_F, MAKE_WEBHOOK_G, MAKE_WEBHOOK_K,
MAKE_WEBHOOK_KAUF, MAKE_WEBHOOK_L, MAKE_WEBHOOK_S, MAKE_WEBHOOK_SUPPORT,
MAKE_WEBHOOK_TRIAL, MAKE_WEBHOOK_WHISPER, MAKE_WEBHOOK_WILLKOMMEN

# Email
PROVA_SMTP_HOST, PROVA_SMTP_PORT, PROVA_SMTP_USER, PROVA_SMTP_PASS,
PROVA_SMTP_FROM_NAME, PROVA_SMTP_ENCRYPTION_KEY
IONOS_SMTP_HOST, IONOS_SMTP_USER, IONOS_SMTP_PASS

# PDFMonkey
PDFMONKEY_API_KEY, PDFMONKEY_BRIEF_TEMPLATE_ID, PDFMONKEY_FOTO_TEMPLATE_ID,
PDFMONKEY_RECHNUNG_TEMPLATE_ID, PDFMONKEY_TEMPLATE_F

# Internal
PROVA_INTERNAL_SECRET, PROVA_INTERNAL_WRITE_SECRET, PROVA_SETUP_SECRET,
PROVA_AUDIT_TRAIL_TABLE, PDF_PROXY_SECRET, TERMIN_REMINDER_SECRET,
TEAM_INTEREST_SECRET, TEAM_INTEREST_RATE_LIMIT_IP_PER_MIN

# Admin
ADMIN_PASSWORD_BCRYPT, ADMIN_PASSWORD_HASH

# Push-Notifications
VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

# Netlify-Standard
URL, DEPLOY_URL, DEPLOY_PRIME_URL, NODE_ENV, SITE_NAME,
NETLIFY_ACCESS_TOKEN, NETLIFY_SITE_ID
```

---

## Deployment

### Live-Hosts

| Subdomain | Was | DNS |
|---|---|---|
| `prova-systems.de` (Apex + www) | LANDING (Marketing/Legal) | IONOS A-Record → Netlify |
| `app.prova-systems.de` | SaaS-App | IONOS CNAME `app` → `prova-systems.netlify.app` |
| `admin.prova-systems.de` | (geplant Sprint 18) | TBD |

### Build-Pipeline

- GitHub-Push zu `main` triggert Netlify-Auto-Deploy (~2-3 Min)
- Single-Site-Setup: beide Domains alias auf eine Netlify-Site
- Edge-Functions: separater Deploy via Supabase-CLI (`supabase functions deploy <name>`)

### Smoke-Test

`scripts/smoke-test-cutover.sh`:
- 5 LANDING-Tests (HTTP 200)
- 7 Cross-Domain-Redirect-Tests (HTTP 301 + Location-Header)
- 3 APP-Tests (HTTP 200/301)
- Total: **15/15 PASS = Deploy grün**
- Headless-Login-Test: TBD (Folge-Sprint, Playwright)

---

## Externe-Service-Limits

| Service | Limit | Aktuell |
|---|---|---|
| Netlify Functions | 125k Requests/Monat (Pro), 10s Timeout | TBD Marcel — Pilot wird das messen |
| Netlify Build | 300 Build-Min/Monat (Pro) | TBD |
| Supabase Postgres | 500 MB, 2 GB Egress (Free) → Plus 8 GB / 50 GB Egress | TBD — wahrscheinlich Plus seit Pilot-Setup |
| Supabase Storage | 1 GB Free → 100 GB Plus | TBD |
| Supabase Edge | 500K Invocations Free / 2M Plus | TBD |
| OpenAI | Bezahl-Konto (Pay-as-you-go) | KI-Kosten via `ki_protokoll` getrackt |
| Stripe | Standard (2,5% + 0,25€) | live |
| PDFMonkey | $19/mo Plan (1k PDFs/mo) | TBD aktueller Plan |

> ⚠️ **TBD Marcel:** Welcher Supabase-Plan? Welcher PDFMonkey-Plan?

---

## Backup & Disaster-Recovery

> ⚠️ **TBD Marcel** — `masterplan-v2/` v2.1 sah Netlify Blobs + R2 als Backup-Strategie vor (Audio-Diktate). Nach Voll-Supabase-Refactor:
> - Supabase macht Daily-Backups automatisch (PITR im Plus-Plan)
> - Audio/Foto/PDF in Supabase Storage hat eigene Snapshots
> - Custom-Backup-Strategie? → Sprint 15 Operations adressiert das

---

## Tech-Stack-Update — MEGA-SKALIERUNG 03.05.2026 nachmittag

**Production-Dependencies neu ergänzt:**
- `zod@^4.4.2` — Schema-Validation (`lib/schemas/_common.js` + 5 Function-Schemas). OWASP ASVS V2.1.2.
- `@sentry/node@^10.51.0` — Backend Error-Tracking + Performance-Monitoring (`netlify/functions/lib/sentry-wrap.js`)
- `@sentry/browser@^10.51.0` — Frontend Error-Tracking (Browser-CDN-Bundle in `lib/sentry-init.js`, npm-Package fuer Local-Dev)

**Architektur-Pattern post-M2/M3:**
- Function-Validation: `parseXxx(body)` → `{ ok, data, error }` (zod safeParse-Wrapper) ersetzt manuelle if-Ketten
- Function-Wrapping: `withSentry(handler, { functionName })` als äusserste Schicht (vor `requireAuth`)
- DSGVO-Filter: `beforeSend`-Hook scrubbed Auth-Header / Cookies / Body / user.email/IP / breadcrumb-URLs

**Subprozessor-Liste:** Sentry (Functional Software, Inc.) als 7. Subprozessor in `avv.html` + `legal/avv.html` Anlage 2 ergänzt. EU-Region (`ingest.de.sentry.io`, Frankfurt), AVV unterschrieben. **Marcel-Pflicht:** AVV-Re-Consent für Bestands-User triggern (Regel 20 CLAUDE.md).

**Endpoints neu:**
- `GET /pilot-seats` — Public, Cache 5min, liefert `{ available, remaining, total }` für pilot.html Live-Counter
- `GET /sentry-test?secret=PROVA_SENTRY_TEST_SECRET` — Test-Trigger fuer Sentry-Verifikation

**Endpoints entfernt (Tot-Code post-K-1.5):**
- `POST /foto-upload` (foto-archiv.js Caller mitgelöscht)
- `POST /invite-user`

**Endpoints unverändert aber abgesichert:**
- `POST /auth-token-issue` — 5/15min IP-Limit + 1h Lockout (legacy, Migration in Sprint AUTH-PERFEKT 2.0)

**Neue Permissions-Konfig:** `.claude/settings.json` — `Bash(git push)` jetzt auto-allowed; kritische Files (CLAUDE.md, package.json, netlify.toml, sw.js, supabase/migrations) bleiben unter ask-Schutz; rm -rf-Varianten + sudo + curl|sh unter deny.

---

*Architektur-Master 03.05.2026 nachmittag · Single Source of Truth · Aktualisiert von Claude Code nach jedem Sprint*

---

## MEGA²⁰-²⁴ Architektur-Erweiterungen (09.05.2026)

### F-Slot-Mapping (UPDATED)
| F-Slot | Name | Status | Page |
|---|---|---|---|
| F-01 | JVEG-Gerichtsrechnung | ✅ | rechnungen.html |
| F-04 | Kurzstellungnahme | ✅ Mode-A | stellungnahme.html / gutachterliche-stellungnahme.html |
| F-09 | Kurzgutachten | ✅ Mode-A | (Vorlage) |
| F-15 | Gerichtsgutachten | ✅ Mode-A | gericht-auftrag.html |
| F-19 | Wertgutachten | 🚧 NEU (geplant Sep 2026) | wertgutachten.html |
| F-20 | Beratungsprotokoll | ✅ | beratung.html |
| F-21 | Baubegleitung-Protokoll | ✅ | baubegleitung.html |

### Triple-Mode-Architektur (MEGA¹⁴-¹⁷)
```
lib/workflow-mode-router.js
  ├─ resolve({auftragOverride, userDefault}) → 'A'|'B'|'C'
  ├─ effectiveMode({...,isMobile}) → mobile-fallback C → A
  └─ openForAuftrag(id) → lazy-load Mode-UI

Mode A = Templates (default)
Mode B = TipTap-Editor
Mode C = Word-Vorlagen (Mobile-disabled)
```

### KI-Service-Abstraction (MEGA²²)
```
lib/ki-service-interface.js  — abstract base
  ├─ ki-service-anthropic.js (Claude Sonnet 4.6 Vision)
  └─ ki-service-openai.js    (GPT-4o Text + Whisper)

ENV-Routing:
  KI_VISION_PROVIDER = anthropic|openai
  KI_TEXT_PROVIDER   = openai
  KI_FALLBACK_MODEL  = gpt-4o-mini

Pflicht-Logging: lib/ki-stats.js → ki_protokoll-Tabelle
```

### Admin-Cockpit (MEGA²¹+²³ — 8 Tabs)
| # | Tab | Zweck |
|---|---|---|
| 1 | Übersicht | KPI-Grid (User, Revenue, Errors) |
| 2 | Kunden | User-Tabelle + Login-as-User Quick-Action (MEGA²¹) |
| 3 | Finanzen | Stripe-KPIs (MRR, Churn, etc.) |
| 4 | KI & Workflow | KI-Stats + Charts (MEGA²³ Block 4) |
| 5 | Support | Ticket-Liste |
| 6 | Health | UptimeRobot + Sentry-Status |
| 7 | Pipeline | Pilot-SV-Funnel + Conversion (MEGA²¹) |
| 8 | Settings | System-Info + Feature-Flags + Sprint-Historie (MEGA²³ Block 3) |

### Beweisbeschluss-Foundation (MEGA²²+²³)
```
Migration 11 (auftraege.beweisbeschluss_*):
  - beweisbeschluss_pdf_extrakt   JSONB
  - beweisbeschluss_pdf_extrakt_version  INT
  - beweisbeschluss_pdf_uploaded_at      TIMESTAMP
  - beweisbeschluss_pdf_storage_path     TEXT

Lambda: netlify/functions/parse-beweisbeschluss.js
  - PDF max 10MB, MIME-Check, Magic-Bytes
  - pdf-parse → Pattern-Matching (Marcel-C1: kein LLM)
  - Pattern: Aktenzeichen, Frist, Hauptfragen, Parteien
  - Storage: sv-files Bucket, fire-and-forget

Frontend: lib/beweisbeschluss-upload.js (UMD)
  - drag-drop + click-to-pick
  - validatePdf, fileToBase64, isValidAuftragId
  - renderPreview (escaped, editable)
  - collectEdits (DOM read-back)
  - attach(rootEl, opts) inkl. fetchImpl-Override fuer Tests

Page-Integration: gericht-auftrag.html
  - Section "📄 Beweisbeschluss-PDF — Pattern-Extraktion"
  - Auto-Form-Uebernahme nach SV-Edit-and-Save
  - Fallback: alte text-basierte KI-Section bleibt
```

### Disclaimer-System (MEGA²¹+²²+²³)
```
lib/prova-disclaimer.js (UMD):
  ProvaDisclaimer.html({variant})  → standard|foto|beweisbeschluss
  ProvaDisclaimer.tooltipText()    → Plain-Text fuer title=""
  ProvaDisclaimer.aiBoxHtml({context}) → EU AI Act Box

Wiring (8 Pages mit script-tag):
  gericht-auftrag, stellungnahme, ortstermin-modus, akte, app, freigabe,
  gutachterliche-stellungnahme, wertgutachten

Inline-Disclaimer (3 Pages mit class="prova-ki-disclaimer"):
  gericht-auftrag.html, ortstermin-modus.html, stellungnahme.html

Tooltips (title=""...§407a):
  Foto-KI-Btn, Diktat-KI-Btn, KI-Assist-Btn
```


---

## MEGA²⁸ Architektur-Update (10.05.2026)

### Edge Functions (Stand 10.05., gesamt ~50)

**MEGA²⁷ Referral-System (5 NEU):**
- `create-referral.js` — Werber initiiert Empfehlung (HTML-Email aktiviert MEGA²⁷.6)
- `redeem-referral-code.js` — Code-Lookup für Pricing-Page
- `check-referral-rewards.js` — Cron 02:00 UTC (30d Hold + Reward + HTML-Email)
- `stripe-webhook-referral.js` — Multi-Strategy User-Linking
- `send-referral-reminders.js` — Cron 14:00 UTC Auto-Reminder Tag 5-6

**MEGA²⁸ V3-V3.2 (3 NEU):**
- `dsgvo-portability.js` — DSGVO Art. 20 JSON-Export (V3.1 KORR-19)
- `ki-konsistenz-check.js` — §4↔§6 Widerspruchs-Detection (V3.2-W1-I2, GPT-4o Pflicht)
- `send-welcome-email.js` (Erweitert MEGA²⁷.6 mit IS_REFERRED-Block)

**MEGA²⁸ Lib-Helpers (3 NEU):**
- `lib/rate-limit-helper.js` — Per-User-Per-Function Rate-Limiting (V3.1 KORR-21)
- `lib/ki-cost-calc.js` — Cost-Calculation für ki_protokoll-Inserts (V3.2-W1-I4)
- `lib/sv-eigenleistung-validator.js` — §407a Pre-Send-Validator (V3.2-W1-I3)

### Migrations Status (12 → 15 live)

| # | Name | Status | Sprint |
|---|---|---|---|
| 11 | auftraege_beweisbeschluss | ✅ live | MEGA²² |
| 12 | referrals_system | ✅ live | MEGA²⁷ |
| 13 | (skipped, stillgelegt) | — | — |
| 14 | (workspace_member_roles deferred) | — | (AUTH-PERFEKT 2.0) |
| 15 | auftraege.is_demo | ✅ live | MEGA²⁸ V3.1 |

### KI-Modell-Compliance (post-V3.2-W1-I1)

| Action | Modell | Compliance |
|---|---|---|
| `pruefe_fachurteil` | gpt-4o ✅ | Regel 14 erfüllt (vorher mini, gefixt) |
| `fachurteil_entwurf` | gpt-4o (default) ✅ | Regel 14 erfüllt (vorher mini, gefixt) |
| `assist_inline` | gpt-4o ✅ | Regel 14 erfüllt |
| `freitext` | mini default | User-Override-fähig, OK für S1 |
| `support_chat` | mini | OK (S1 mechanisch, Latenz wichtig) |
| Foto-Vision | claude-sonnet-4-6 | KI_VISION_PROVIDER=anthropic |
| Whisper | whisper-1 | OK |

