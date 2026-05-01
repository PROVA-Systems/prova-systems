# PROVA Architektur Master

**Stand:** 02.05.2026 nachmittags (Tag 8, post-Voll-Cleanup-Sprint)
**Single Source of Truth** — siehe `docs/master/README.md`

---

## High-Level

```
┌─────────────────────────────────────────────────────────────────┐
│  prova-systems.de        →  LANDING (Marketing/Legal)           │
│    /                        index.html · Marketing-Hero          │
│    /pricing /preise         pricing.html (Solo 149€/Team 279€)   │
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

*Architektur-Master 01.05.2026 abend · Single Source of Truth · Aktualisiert von Claude Code nach jedem Sprint*
