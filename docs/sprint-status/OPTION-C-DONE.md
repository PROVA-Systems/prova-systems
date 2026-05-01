# OPTION C — DONE (Server-Side Supabase-JWT-Verify)

**Datum:** 01.05.2026 mittag
**Status:** ✅ Code gemerged in main · Deploy läuft (sw.js v249) · Tag NICHT gesetzt
**Branch:** `fix/option-c-supabase-jwt-server-side` (merge `3b27cd1`)
**Commit:** `4ee128e`

---

## Was implementiert wurde

**Architektur-Migration vom Bridge-Hack zum Industry-Standard.**

Statt fake bridge-token (client-side format-valid, server-side bullshit) verifiziert der Server jetzt den **echten Supabase access_token** via JWKS-URL + jose npm-Package. Asymmetric ES256 (ECC P-256) — dasselbe Pattern wie Auth0, Stripe, Vercel, Cognito.

### Architektur-Trace nach Login

```
Marcel logt ein auf /login
   ↓ supabase.auth.signInWithPassword OK
   ↓ data.session.access_token = "eyJhbGciOiJFUzI1NiJ9.<payload>.<sig>" (echtes JWT)
   ↓ writeLegacyBridge(user, session) schreibt access_token in prova_auth_token
   ↓ window.location.href = '/dashboard'
   ↓
/dashboard rendert
   ↓ prova-status-hydrate.js → provaFetch('/.netlify/functions/airtable', ...)
   ↓ provaFetch sendet Authorization: Bearer <access_token>
   ↓
netlify/functions/airtable.js:
   ↓ resolveUser(event) async
   ↓ getTokenPayload erkennt 3-Teiler → SupabaseJWT.verify(tok)
   ↓ jose.jwtVerify(tok, JWKS, {issuer, audience:'authenticated', algorithms:['ES256']})
   ↓ Supabase-Public-Key aus JWKS-Cache → Signature OK → Payload returned
   ↓ Mapping: sub=email, sv_id=user-uuid, ...
   ↓ Function-Logik mit User-Email → Airtable-Query
   ↓ Response 200 mit Daten
   ↓
Dashboard rendert komplett, Status-Hydrate fuellt Sidebar mit SV-Daten
   ↓
KEIN /login?reason=token_expired Loop mehr.
```

---

## Welche Files geändert (8 Edits + 1 NEU + 2 npm + 2 Docs)

| Datei | Änderung |
|---|---|
| **NEU** `netlify/functions/lib/supabase-jwt.js` | jose-JWKS-Verify (~107 Z) — `verify(token)` returns Payload oder null |
| `netlify/functions/lib/auth-resolve.js` | `getTokenPayload`/`resolveUser` async · Supabase-First, HMAC-Fallback · klare Logs |
| `netlify/functions/lib/jwt-middleware.js` | `await resolveUser(event)` |
| `netlify/functions/airtable.js` | 2x `await resolveUser(event)` · `getUserEmailFromEvent` async |
| `netlify/functions/make-proxy.js` | `await resolveUser(event)` |
| `lib/auth-guard.js` | `writeLegacyBridge(user, session)` — schreibt echten `session.access_token` · `runAuthGuard` + `watchAuthState` reichen Session weiter |
| `auth-supabase-logic.js` | `handleLogin`/`handleSignUp` übergibt `data.session` |
| `prova-fetch-auth.js` | Defense-in-Depth: bei 401 mit Supabase-JWT erst `supabase.auth.refreshSession()` + 1× Retry, dann erst Logout |
| `sw.js` | `CACHE_VERSION` v248 → v249 |
| `package.json` + `package-lock.json` | jose@^6.2.3 |
| `docs/diagnose/TOKEN-EXPIRED-BUG.md` | Diagnose-Doc mit committed (Historie) |
| `docs/sprint-status/OPTION-C-INVENTORY.md` | Inventur-Doc mit committed (Phase-1+1.5-Plan) |

**Statistik:** 13 Files, +1167 / -39 LOC.

---

## ENV-Vars (Marcel hat in Netlify gesetzt)

| ENV | Wert |
|---|---|
| `PROVA_SUPABASE_JWKS_URL` | `https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json` |
| `PROVA_SUPABASE_PROJECT_URL` | (optional, wird sonst dynamisch aus JWKS_URL abgeleitet) |

PROVA-Prefix bewusst gewählt um nicht mit anderen Supabase-ENVs zu kollidieren.

---

## Smoke-Test-Ergebnis

**Pre-Deploy:** 15/15 PASS · Exit-Code 0

**Post-Deploy (siehe Polling-Output für v249-Confirmation):**
- sw.js v249 LIVE
- Negativ-Test (Garbage-JWT → 401): siehe finalen Output

---

## 🧪 Marcel-Test-Anweisung

### Schritt 1: Hard-Reset Browser

In DevTools (F12) auf einem `app.prova-systems.de`-Tab:
1. **Application → Local Storage → app.prova-systems.de** → Clear All
2. **Application → Session Storage** → Clear All
3. **Application → Cookies** → Delete All
4. **Application → Service Workers** → Unregister
5. Inkognito-Tab schließen, neuen öffnen

### Schritt 2: Login-Test

```
https://app.prova-systems.de/dashboard
```

Erwartet: Single-Redirect zu `/login?next=%2Fdashboard`, Page **stabil**.

### Schritt 3: Einloggen

Mit `marcel.schreiber@prova-systems.de`.

**Erwartung:** Single-Redirect zu `/dashboard`, Page **stabil**, **KEIN `?reason=token_expired`**.

### Schritt 4: DevTools Console-Logs prüfen

Erwartete Console-Outputs (in dieser Reihenfolge):
```
[auth-guard] Bridge: real Supabase access_token written
```

(Plus auf Server-Side-Logs in Netlify-Dashboard, wenn man ein bisschen scrollt:)
```
[auth] Verified via supabase-jwt
```

### Schritt 5: localStorage-Check

DevTools → Application → Local Storage → `app.prova-systems.de`:

| Key | Wert |
|---|---|
| `prova_auth_token` | **3-Teiler JWT** beginnt mit `eyJhbGciOiJFUzI1NiI...` (NICHT mehr `.bridge-supabase-`-Suffix) |
| `prova-auth-token` | JSON mit `access_token`, `refresh_token`, `user`, ... (Supabase-Standard) |
| `prova_sv_email` | `marcel.schreiber@prova-systems.de` |
| `prova_user` | `{"email":"...", "id":"...", "bridge":true}` |
| `prova_last_activity` | Unix-Timestamp |

### Schritt 6: Sidebar-Klicks

| Klick | Erwartung |
|---|---|
| Sidebar → `Meine Aufträge` (archiv.html) | Page lädt, Listen sichtbar (kein `token_expired` Logout) |
| Sidebar → `Akte öffnen` | Page lädt |
| Sidebar → `Profil & Briefkopf` | Page lädt mit echten Profil-Daten |

### Schritt 7: Long-Session-Test (optional, wenn Du Zeit hast)

- Lass Tab 1+ Stunde offen, dann klick durch Sidebar
- Erwartung: supabase-js refresht Token automatisch (alle ~50 Min) — `prova_auth_token` wird durch `watchAuthState SIGNED_IN/TOKEN_REFRESHED` neu geschrieben
- Console: `[auth-guard] Bridge: real Supabase access_token written` (erneut)

---

## Bei Problemen

### Loop weiterhin sichtbar
- DevTools Network-Tab Screenshot
- Application → Service Workers Status (muss `prova-v249` zeigen)
- Console-Log Output kompletter Reload

### `[supabase-jwt] verify rejected: <reason>` in Server-Logs
- `JWTExpired` → Token wirklich abgelaufen, `prova-fetch-auth.js` sollte refresh trigger'n
- `JWSInvalid` → Falsche Signature, JWKS-URL stimmt nicht oder Token aus anderem Projekt
- `JWTClaimValidationFailed` → audience oder issuer mismatch — ENV-Var-Check

### `[supabase-jwt] PROVA_SUPABASE_JWKS_URL fehlt` in Server-Logs
- ENV nicht gesetzt → Marcel muss in Netlify-UI ergänzen + Function-Restart (deploy)

### Komplett-Rollback (bei Major-Issue)

```bash
git revert -m 1 3b27cd1   # Merge-Revert
git push origin main
```

→ Bridge-Hack ist zurück, Loop kehrt zurück, aber kein neuer Bug. Marcel meldet, wir analysieren.

---

## Erwartete Browser-Console-Logs (Live-Test)

**Auf /login (vor Login):**
```
(nichts spezielles)
```

**Nach erfolgreichem Login (im Browser-Tab):**
```
[auth-guard] Bridge: real Supabase access_token written
```

**Bei einem 401 von einer Function (theoretisch, sollte nicht passieren wenn ENV korrekt):**
```
[fetch-auth] 401 with supabase-jwt, trying refresh...
[fetch-auth] refresh OK, retrying fetch with new token
```
ODER bei Refresh-Failure:
```
[fetch-auth] refresh failed <error>
[fetch-auth] refresh-retry failed → logout
```
(letztere = Edge-Case, sollte nicht im Normal-Flow auftreten)

**Auf Server-Side (Netlify-Function-Logs):**
```
[auth] Verified via supabase-jwt
```

---

## Was sich technisch jetzt von Phase B-1 + B-2 unterscheidet

| Aspekt | Phase B-1+B-2 (Bridge-Hack) | Phase 2 Option C (Real Verify) |
|---|---|---|
| `prova_auth_token` Inhalt | fake `base64(payload).bridge-supabase-<id>` | echter Supabase ES256-JWT |
| Server-Side-Verify | failed → 401 | success → Payload |
| Client-Side-Pre-Check | `verifyProvaToken` Format-only | Format-only (gleich) |
| Logic-Files | sehen `prova_sv_email` (Bridge-Key) — funktioniert | sehen `prova_sv_email` (Bridge-Key) — funktioniert |
| `provaFetch` 401 | clearAuthAndRedirect → Logout | refresh → retry → bei Erfolg weiter |
| Architektur | technical debt, temporäre Brücke | Industry-Standard, langfristig |

---

## Folge-Sprints (nicht Teil dieses Sprints)

1. **Logic-Files modernisieren** — `localStorage.prova_sv_email` → `await getCurrentUser()` (langfristig, Bridge wird obsolet)
2. **Headless-Login-Smoke-Test** — Playwright-basiert, fängt Auth-Pfad-Bugs vor Marcel-Test ab
3. **`auth-token-issue.js` deprecaten** — Legacy-Login-Endpoint, nicht mehr nötig nach Cutover
4. **HMAC-Fallback entfernen** — wenn alle Pages auf Supabase-Auth umgestellt sind, `lib/auth-token.js` + Legacy-Pfade in `auth-resolve.js` löschen

---

*Option C abgeschlossen 01.05.2026 mittag · Marcel-Test pending · v249 LIVE · KEIN Tag*
