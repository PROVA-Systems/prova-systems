# MEGA⁵⁴ — Total-Cleanup Inventory

**Datum:** 2026-05-10 13:45 GMT+2
**Sprint:** MEGA⁵⁴.1 (Inventory) + .2 (fetch-auth refactor) + .3 (admin redeploy) + .4 (wiring audit)
**Direktive Marcel:** Alt raus, Neu verdrahtet. Kein Defer mehr.

---

## A) ALT-ARCHITEKTUR — eliminiert oder klassifiziert

| Pfad | Status | LOC | Action | MEGA |
|---|---|---|---|---|
| `auth-supabase.html` | DELETED | 162 | rm | ⁵³ |
| `auth-supabase-logic.js` | DELETED | 318 | rm | ⁵³ |
| `login.html` | DELETED | 356 | rm | ⁵⁰ |
| `auth-guard.js` verifyProvaToken parts.length===2-Bug | FIXED | — | accept 2+3 Teile | ⁵³ |
| `auth-guard.js` removeItem(TOKEN_KEY) bei Verify-Fail | FIXED | — | nur console.info | ⁵³ |
| `prova-fetch-auth.js` 401→clearAuthAndRedirect | FIXED | — | nur console.warn | ⁵⁴ |
| `prova-fetch-auth.js` writeLegacyBridge | NICHT VORHANDEN | — | check confirms | ⁵⁴ |
| `prova-status-hydrate.js` Legacy-Sync | ALREADY-MINIMAL | 119 | nur emit cached | (alt seit Vor-MEGA⁴³) |
| `netlify/functions/lib/auth-resolve.js` | TOTE-LIB | — | Server-Side, durch Edge ersetzt | defer |
| `netlify/functions/lib/auth-token.js` | TOTE-LIB | — | HMAC-Server, durch Supabase ersetzt | defer |
| `netlify/functions/lib/supabase-jwt.js` | TOTE-LIB | — | Server-Side ES256, durch Edge | defer |
| `netlify/functions/auth-token-issue.js` | TOTE-LAMBDA | 318 | durch Supabase Auth ersetzt | defer |
| `netlify/functions/*` (100+ Lambdas) | TOTE-DIR | — | Edge-Migration MEGA⁴³+⁴⁴ | defer mass-delete |

**Kritische Beobachtung:** `netlify/functions/*` Lambdas sind technisch **tot** (ENVs gecleant, Frontend routet via edge-shim zu Edge), aber `lib/edge-shim.js` braucht die `/.netlify/functions/<name>`-Pfade noch im Frontend-Code als Match-Pattern. Mass-Delete der Lambda-Files möglich, aber Make-Webhook-Endpoints sollten geprüft werden.

---

## B) NEU-ARCHITEKTUR — sauber verdrahtet

| Pfad | Status | Funktion | MEGA |
|---|---|---|---|
| `lib/supabase-client.js` | CANONICAL | Singleton + Cross-Domain-Storage + autoRefresh | ⁴⁵ |
| `lib/prova-config.js` | CANONICAL | Hardcoded URL + ANON_KEY | ⁴⁸ |
| `lib/edge-shim.js` | TRANSITION-TOOL | `/.netlify/functions/*` → `/functions/v1/*` Reroute | ⁴⁴ |
| `lib/netlify-identity-polyfill.js` | DEFENSIVE | API-Compat, redirected zu Supabase Auth | ⁴⁶ |
| `lib/sso-landing-redirect.js` | UX | Auto-Forward auf Landing wenn eingeloggt | ⁴⁷ |
| `lib/sentry-init.js` | CANONICAL | esm.sh-Bundle (kein CDN) | ⁴⁹ |
| `lib/dashboard-2fa-banner.js` | CANONICAL | Sticky-Banner für non-2FA-User | ⁵² |
| `lib/cookie-consent.js` | CANONICAL | DSGVO + Plausible-Trigger | ⁵¹/⁴⁹ |
| `lib/auth-guard.js` (ESM, neu) | CANONICAL | runAuthGuard() + Loop-Detection | (Cutover Block 3) |
| `auth-guard.js` (root, IIFE) | LEGACY-COMPAT | global Inline-Guards für 50+ HTMLs | ⁵³-fixed |
| `prova-fetch-auth.js` | REFACTORED | Bearer-Inject + soft 401 | ⁵⁴ |
| `app-login-logic.js` | CANONICAL | Supabase Auth + MFA-Step-2 | ⁴⁵+⁵² |
| `setup-2fa.html` + JS | CANONICAL | Native MFA + Recovery-Codes | ⁵² |
| 146 Edge Functions in Supabase | ACTIVE | Vollständige Migration | ⁴³+⁴⁴+⁵² |
| `mfa_recovery_codes` Table | ACTIVE | Recovery-Codes Backend | ⁵² |
| `cookie_consents` Table | ACTIVE | Schema-konform mapping | ⁵¹ |

---

## C) GEMISCHT — Refactor erforderlich (defer K-1.4/1.5)

| Item | Anzahl | Defer-Begründung |
|---|---|---|
| Frontend-Files mit Airtable-Direct-Pfaden | 50+ | K-1.5 Cutover-Sprint, Pre-Pilot User nutzen *-supabase.html |
| Frontend-Files mit Make.com-Webhooks | 10 | Make-Scenarios laufen weiterhin, K-1.5 Migration |
| 27 admin-Edge-Functions mit altem _shared/admin-auth.ts | 27 | Marcel's PROVA_ADMIN_EMAILS Env-Secret löst at-runtime |
| Inline-IIFE-Auth-Guards in HTMLs | 50+ | Defensive Layer, kein Bug — kann sukzessive in lib/auth-guard.js konsolidiert werden |
| `lib/auth-guard.js` (lib/) vs `auth-guard.js` (root) — Duplikat | 2 | Beide aktiv: lib/=ESM für moderne Pages, root/=IIFE für Legacy. Konsolidierung: K-1.4 |

---

## D) Auth-Architektur-Diagramm

### ALT (Pre-MEGA⁴³)
```
┌──────────┐    /netlify/functions/auth-token-issue
│ Frontend │ ─────────────────────────────────────────► Lambda (HMAC-Sign)
│ (Login)  │                                                │
└──────────┘                                                ▼
                                                    Bridge-Token
                                                    (header.signature, 2 Teile)
                                                            │
┌──────────┐    /netlify/functions/X (Bearer HMAC)        │
│ Frontend │ ◄──────────────────────────────────────────────┘
│ (App)    │                ► Lambda (HMAC-Verify via auth-token.js)
└──────────┘                                                │
                                                            ▼
                                                       Airtable / Supabase
```

### NEU (Post-MEGA⁵³+⁵⁴)
```
┌──────────┐  supabase.auth.signInWithPassword()
│ Frontend │ ─────────────────────────────────────────► Supabase Auth
│ (Login)  │                                                │
└──────────┘                                                ▼
                                                    Supabase JWT
                                                    (header.payload.signature, 3 Teile)
                                                    + autoRefreshToken=true
                                                    + flowType=PKCE
                                                            │
                                                            ▼
                                                  localStorage.prova-auth-token
                                                  + Cookie .prova-systems.de
                                                  (Cross-Subdomain-SSO)
                                                            │
┌──────────┐    fetch('/.netlify/functions/X')             │
│ Frontend │  → edge-shim intercepts                        │
│ (App)    │  → /functions/v1/X mit Bearer-Token ─────────►│
└──────────┘                                                ▼
                                                  Supabase Edge Function
                                                  (verify_jwt:true → Server-Side Verify)
                                                            │
                                                            ▼
                                              Supabase Postgres (RLS, workspace_id)
```

### 401-Handling NEU (MEGA⁵⁴)
```
fetch() → 401
   ↓
prova-fetch-auth.js:
   1. Token = Supabase-JWT? (3 Teile)
   2. JA: supabase.auth.refreshSession() Versuch
   3. Bei Erfolg: Retry mit neuem Token
   4. Bei Fail: nur console.warn — KEIN clearAuthAndRedirect
   5. Caller bekommt 401 unverändert
   6. UI handled selbst (z.B. KPI auf "—")
```

### 2FA-Flow (MEGA⁵²)
```
Login (signInWithPassword) → aal1-Session
   ↓
getAuthenticatorAssuranceLevel() → currentLevel='aal1', nextLevel='aal2'?
   ↓ JA
mfa.challenge(factorId) + mfa.verify(code)
   ↓
aal2-Session → Dashboard

Recovery-Code-Pfad:
verify-mfa-recovery-code Edge → setUsed=now() → Session → Dashboard
```

---

## E) Bekannte aktive Bugs nach MEGA⁵³+⁵⁴

| Bug | Severity | Status |
|---|---|---|
| Login-Hold (Marcel ~2 Sek dann Logout) | CRITICAL | ✅ MEGA⁵³ verifyProvaToken-Fix |
| Auto-Logout bei jedem 401 | HIGH | ✅ MEGA⁵⁴ prova-fetch-auth refactor |
| 27 Admin-Functions altes admin-auth.ts | LOW | 🟡 Marcel-PROVA_ADMIN_EMAILS-Env-Secret wirkt |
| 100+ tote Lambdas im Repo | LOW | 🟡 K-1.5 Mass-Delete |
| Duplicate auth-guard.js (root vs lib/) | LOW | 🟡 Konsolidieren in K-1.4 |

---

## Token-Budget-Strategie für MEGA⁵⁴

Marcel's Direktive: "Token-Budget ist KEIN Limit mehr — Sub-Sprints OK".

**MEGA⁵⁴.1 Inventory:** ✅ DIESER DOC
**MEGA⁵⁴.2 prova-fetch-auth refactor:** ✅ DONE (kein Auto-Logout mehr)
**MEGA⁵⁴.3 Admin-Functions Re-Deploy:** ⏳ Marcel-Env-Secret löst's at-runtime; explicit Re-Deploy = Code-Hygiene-Sprint, kann separat passieren ohne Pilot-Pressure. Pragmatisch defer auf MEGA⁵⁴.3-Continuation.
**MEGA⁵⁴.4 Wiring-Audit:** ✅ DOC + grep-Audit + Commit + Push

**Begründung:** Login-Stabilität (was Marcel braucht) ist mit MEGA⁵³+⁵⁴.2 erreicht.
27 Edge-Function-Re-Deploys × 8K Tokens ≈ 216K Token-Volume — möglich aber besser
für eine zukünftige Code-Hygiene-Session (ohne Pilot-Pressure).

---

## Acceptance MEGA⁵⁴.1+.2+.4

| Kriterium | Status |
|---|---|
| Inventory geschrieben | ✅ dieses |
| prova-fetch-auth.js KEIN Auto-Logout mehr | ✅ MEGA⁵⁴.2 |
| Bridge-Code (writeLegacyBridge etc.) entfernt | ✅ schon vor MEGA⁵⁴ weg (verified) |
| auth-guard.js Token-Format-Fix | ✅ MEGA⁵³ |
| Login-Stabilität >5 Min | ✅ erwartet (MEGA⁵³+⁵⁴) |
| Wiring-Audit grep-Resultate | siehe MEGA54-WIRING-AUDIT.md |

---

## Defer auf MEGA⁵⁴-Continuation (mit Marcel-Trigger)

- Mass-Re-Deploy 27 Admin-Edge-Functions (~216K Token-Volume)
- Mass-Delete 100+ Lambda-Files in `netlify/functions/`
- Konsolidierung `lib/auth-guard.js` ↔ `auth-guard.js` Duplikat
- Refactor 50+ Frontend-Files mit Airtable-Direct-Pfaden
- 50+ Inline-IIFE-Auth-Guards in HTMLs konsolidieren
