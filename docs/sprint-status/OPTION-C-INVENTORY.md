# OPTION C — Inventur (Phase 1 + 1.5-Update)

**Datum:** 01.05.2026 morgens
**Sprint:** Server-Side Auth-Migration: HMAC-only → HMAC + Supabase-JWT
**Status:** Inventar abgeschlossen · KEIN Code-Change · Plan steht
**Phase 1.5-Update (01.05.2026 ~10:00):** JWT-System ist asymmetric ECC P-256 (NICHT HS256). Strategie auf JWKS-URL + `jose`-Package umgestellt.

---

## TL;DR

**Großartige Nachricht für Option C:** Die Migration ist **architektonisch DRY**. Ein einziger File-Edit (`lib/auth-resolve.js`) erweitert die Auth-Resolution um Supabase-JWT-Akzeptanz, **alle 25 betroffenen Functions sind dadurch automatisch migriert** (sie nutzen alle die zentrale `resolveUser()`-API).

**Geschätzter Aufwand:** 75-90 Min Code + 10 Min Test + 2 Min ENV-Setup. Nicht 50+ Code-Stellen wie in der Solution-Doc grob veranschlagt.

**ENV-Voraussetzung (post Phase-1.5):** Marcel muss zwei ENVs ergänzen — `SUPABASE_URL` + **`SUPABASE_JWKS_URL`**. Die zuvor empfohlene `SUPABASE_JWT_SECRET`-Strategie (HS256-symmetric) wurde verworfen, weil das Projekt nach Mai-2025-Migration auf das **neue asymmetric JWT-System (ECC P-256, ES256)** umgestellt ist. Verifikation läuft über JWKS-URL + `jose`-npm-Package. **`jose` ist noch nicht in `package.json` installiert** — Marcel führt `npm install jose` einmalig aus.

---

## A. Functions-Tabelle (alle 48)

### A.1 — `requireAuth`-geschützt (23 Functions, NEEDS-MIGRATION)

Alle nutzen `lib/jwt-middleware.js requireAuth` → `lib/auth-resolve.js resolveUser` → `lib/auth-token.js verify` (HMAC-only). Werden mit dem 1-File-Edit alle automatisch migriert.

| Function | Zweck | Frontend-Caller |
|---|---|---|
| `akte-export.js` | PDF-Export einer Akte | akte-logic.js |
| `audit-log.js` | Audit-Trail-Insert | (intern aus anderen Functions) |
| `brief-pdf-senden.js` | Brief-PDF generieren + senden | (Legacy, eventuell durch X3 abgelöst) |
| `brief-senden.js` | Brief versenden | (Legacy) |
| `dsgvo-auskunft.js` | DSGVO-Datenexport | einstellungen-logic.js |
| `dsgvo-loeschen.js` | DSGVO-Löschen | einstellungen-logic.js |
| `emails.js` | Generic-Email-Endpoint | (Legacy) |
| `foto-anlage-pdf.js` | Foto-Anlage-PDF | app-logic.js |
| `foto-captioning.js` | KI-Foto-Caption | (intern) |
| `foto-pdf.js` | Foto-PDF | (Legacy) |
| `foto-upload.js` | Foto-Upload | (Legacy) |
| `jahresbericht-pdf.js` | Jahresbericht-PDF | jahresbericht-logic.js |
| `ki-proxy.js` | OpenAI-Proxy | 9+ Frontend-Files (auftragstyp, baubegleitung, beratung, briefvorlagen, compliance-check, diktat-parser, paragraph-generator, support-chat, prova-pseudo, prova-offline-queue, wertgutachten) |
| `ki-statistik.js` | KI-Cost-Tracking | stellungnahme-logic.js |
| `mahnung-pdf.js` | Mahnung-PDF | (Legacy) |
| `mein-aktivitaetsprotokoll.js` | User-Activity-Log | einstellungen-logic.js |
| `pdf-proxy.js` | Signed-PDF-Download | (intern) |
| `rechnung-pdf.js` | Rechnung-PDF | (Legacy) |
| `smtp-senden.js` | SMTP-Email-Senden | prova-auth-api.js |
| `stripe-checkout.js` | Stripe-Checkout-Session | prova-preise.js, trial-guard.js |
| `stripe-portal.js` | Stripe-Customer-Portal | (Legacy) |
| `whisper-diktat.js` | Whisper-Audio-Diktat | (Legacy, eventuell Edge-Function-Pendant) |
| `zugferd-rechnung.js` | ZUGFeRD-Rechnung | rechnungen-logic.js |

### A.2 — `resolveUser`-direkt (2 Functions, NEEDS-MIGRATION)

Nutzen `auth-resolve.js` direkt statt `requireAuth`-Wrapper. Werden ebenfalls automatisch durch den 1-File-Edit migriert.

| Function | Zweck | Frontend-Caller |
|---|---|---|
| **`airtable.js`** | **Airtable-Proxy mit User-Filter (sv_email)** — DOMINANT | **40+ Frontend-Files** (alle -logic.js + Helper) |
| `make-proxy.js` | Make.com-Webhook-Proxy | archiv-logic, jveg-logic, kostenermittlung-logic, rechnungen-logic, schnelle-rechnung-logic, textbausteine-logic |

### A.3 — Auth-Endpoints (2 Functions, KEINE Migration nötig)

| Function | Zweck |
|---|---|
| `auth-token-issue.js` | Login-Endpoint, gibt HMAC-Token aus (für Legacy-Login-Pfad). Bleibt für Legacy-Login. |
| `auth-token-verify.js` | Token-Verify-Endpoint (öffentlicher Health-Check). Bleibt unverändert. |

### A.4 — Server-Triggered (3 Functions, KEINE Migration)

| Function | Auth-Methode |
|---|---|
| `stripe-webhook.js` | Stripe-Signature-Header (eigener Auth-Pfad) |
| `termin-reminder.js` | `TERMIN_REMINDER_SECRET` ENV-Token (Schedule-Triggered) |
| `team-interest.js` | Public + Rate-Limit (kein Auth) |

### A.5 — Admin-Only (6 Functions, separater Auth-Pfad)

`admin-auth.js`, `admin-cache-clear.js`, `smtp-credentials.js`, `smtp-test.js`, `setup-tabellen.js`, `invite-user.js`. Nutzen vermutlich `PROVA_SETUP_SECRET` oder `ADMIN_PASSWORD_HASH`. **Nicht in Scope** dieses Sprints.

### A.6 — Public / No-Auth (8 Functions, KEINE Migration)

`health.js`, `error-log.js`, `push-notify.js`, `identity-signup.js`, `normen.js`, `normen-monitor.js`, `normen-picker.js`, `pdf-analyse.js`. Public oder Rate-Limit-only.

### A.7 — Internal / Legacy (4 Functions, eventuell Cleanup-Kandidaten)

| Function | Status |
|---|---|
| `airtable-rate-limiter.js` | Helper für `airtable.js` |
| `provision-sv.js` | Sign-up-Provisioning (eigener Pfad) |
| `create-checkout-session.js` | Stripe-Helper (eventuell Duplikat von stripe-checkout) |
| `prova-subscription.js` | Subscription-Status-Helper |

---

## B. Frontend-Calls — Endpoints pro File

55 Frontend-Files nutzen `provaFetch`. Endpoints-Verteilung:

| Endpoint | Anzahl Frontend-Caller |
|---|---:|
| **`/.netlify/functions/airtable`** | **40+** (DOMINANT) |
| `/.netlify/functions/ki-proxy` | 11 |
| `/.netlify/functions/make-proxy` | 6 |
| `/.netlify/functions/stripe-checkout` | 2 |
| `/.netlify/functions/akte-export` | 1 (akte-logic.js) |
| `/.netlify/functions/foto-anlage-pdf` | 1 (app-logic.js) |
| `/.netlify/functions/auth-token-issue` | 1 (app-login-logic.js — Legacy) |
| `/.netlify/functions/ki-statistik` | 1 (stellungnahme-logic.js) |
| `/.netlify/functions/normen-picker` | 1 (wertgutachten-logic.js) |
| `/.netlify/functions/provision-sv` | 1 (prova-sv-airtable.js) |
| `/.netlify/functions/smtp-senden` | 1 (prova-auth-api.js) |

**Implikation:** Nach 1-File-Edit in `auth-resolve.js` sind 99% aller Calls automatisch grün. Die einzigen Calls die NICHT durch den Edit profitieren sind die zu `auth-token-issue` (selbst-Auth-Endpoint, fragt User-Login an).

---

## C. Auth-Lib-Analyse

### `lib/auth-token.js` (130 LOC)

- HMAC-SHA256 sign/verify mit `process.env.AUTH_HMAC_SECRET`
- Format: `base64url(payload).base64url(HMAC(payload))`
- Min. Secret-Länge 32 Zeichen
- Payload-Pflicht: `sub` (Email), `iat`, `exp` (set durch sign())
- `verify()` returnt Payload-Object oder `null` (nie throw)

### `lib/auth-resolve.js` (180 LOC)

- `getTokenPayload(event)`: Token aus `Authorization: Bearer ...` ODER `Cookie: prova_auth=...`, ruft `T.verify(tok)`
- `resolveUser(event)`: returnt `{email, source, mismatch, tokenPayload}`
- `_userEmail`-Cross-Check (Defense-in-Depth gegen Identity-Spoofing)
- Pseudonymisierte Audit-Logs bei Auth-Failures

### `lib/jwt-middleware.js` (82 LOC)

- `requireAuth(handler)`: wrapper, prüft Token, gibt 401/403 bei Failure
- CORS-Preflight ohne Auth-Check
- Setzt `context.userEmail` + `context.user` für Handler

**Fazit:** Saubere 3-Layer-Architektur. Migration-Punkt ist `auth-resolve.js getTokenPayload()` — wenn diese Function ZWEI Token-Formate akzeptiert (HMAC + Supabase-JWT), sind alle 25 Functions migriert.

---

## D. Supabase-JWT-Verify-Strategie (Phase 1.5 KORRIGIERT)

### Marcel-Befund am 01.05. ~10:00: Projekt nutzt neues asymmetric JWT-System

Im Supabase-Dashboard verifiziert:
- **Current key:** ECC P-256 (asymmetric, **ES256**)
- **Legacy HS256:** existiert nur als „Previously used keys" (4 Tage alt, für Tokens vor der Rotation)
- Nach Mai-2025 Supabase-Default für neue Projekte

JWKS-Endpoint live verifiziert (`curl https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json`):
```json
{
  "keys": [{
    "alg": "ES256",
    "crv": "P-256",
    "ext": true,
    "key_ops": ["verify"],
    "kid": "a3d72a1f-f303-4701-ae85-bae240d70b5c",
    "kty": "EC",
    "use": "sig",
    "x": "pG0CBobOWnr55BhaP8MV0IDTzNQYztbw-UBhBLjF38U",
    "y": "_WznpjypYgMMmF9NRlw3kcqJWjGr9TyXxxNTr5O2fhY"
  }]
}
```
1 aktiver Public-Key, Rotation-Phase abgeschlossen — sauberer Single-Key-State.

### Gewählte Strategie: **JWKS-URL + `jose`-npm-Package**

`jose` (von Filip Skokan / @panva, MIT-License, etablierter JWT-Standard für Node.js) bietet `createRemoteJWKSet(URL)` mit eingebautem In-Process-Cache (default 10 Min TTL, automatischer Background-Refresh).

```js
const { jwtVerify, createRemoteJWKSet } = require('jose');
const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));

exports.verify = async function (token) {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: process.env.SUPABASE_URL + '/auth/v1',
            audience: 'authenticated',
            algorithms: ['ES256']
        });
        if (!payload || !payload.email) return null;
        return payload;
    } catch (e) {
        return null;   // expired, invalid sig, malformed, key rotation, etc.
    }
};
```

### Pro Asymmetric-JWKS

- ✅ **Kein Secret im Server** — Public Key wird automatisch von Supabase JWKS abgeholt. Compromised-Server-ENV leakt KEIN Signing-Material.
- ✅ **Key-Rotation transparent** — wenn Supabase Key rotiert, fängt jose's Cache-Refresh es auf (ohne Neu-Deploy).
- ✅ **Architektur-Modern** — Industry-Standard für OAuth/OIDC-Provider (Auth0, Cognito, Okta machen genauso).
- ✅ **`jose` ist battle-tested** — Standard-Library für Node-JWT-Verify.
- ✅ **Issuer + Audience-Validation eingebaut** — verhindert Token-Reuse aus anderen Projekten.

### Contra (überschaubar)

- ⚠️ **+1 npm-Dependency** (~150 KB, kein dependency-tree-Risiko)
- ⚠️ **JWKS-Fetch beim Cold-Start** (+50-100ms beim ersten Request einer kalten Function-Instanz). Danach gecacht — keine Latenz.
- ⚠️ **Async-Verify** — `jwtVerify` ist async. `getTokenPayload()` muss async werden, damit auch alle Aufrufer (resolveUser, requireAuth-wrapped Handlers, airtable.js, make-proxy.js direct calls) — alle bereits async-Kontext, nur `await` ergänzen.

### Begründung warum JWKS-Asymmetric die richtige Wahl ist

1. **Realität-Anpassung:** Das Projekt nutzt bereits ES256/JWKS. HS256-Symmetric würde NICHT funktionieren — Supabase signiert mit privatem ECC-Key, Server bräuchte den gleichen privaten Key (was sicherheitstechnisch falsch wäre).
2. **Best-Practice:** Industry-Standard ist asymmetric JWT-Verify mit JWKS für Multi-Tenant-Provider.
3. **Operational:** Ohne JWKS müssten wir den HS256-Legacy-Key aus „Previously used keys" rauskramen — dieser ist 4 Tage alt und fällt jederzeit weg.
4. **Code-Qualität:** `jose` ist getestet, sicher, korrekt. Eigene Implementation eines ES256-Verify wäre kryptographische Selbstverletzung.

### Supabase-JWT-Payload (Standard-Claims, von Supabase-Auth ausgestellt)

```json
{
  "iss": "https://cngteblrbpwsyypexjrv.supabase.co/auth/v1",
  "sub": "<user-uuid>",
  "aud": "authenticated",
  "email": "marcel.schreiber@prova-systems.de",
  "exp": 1735000000,
  "iat": 1734996400,
  "role": "authenticated",
  "session_id": "<session-uuid>",
  "user_metadata": {...},
  "app_metadata": {...}
}
```

Mapping auf PROVA-Token-Format:
| PROVA | Supabase | Notiz |
|---|---|---|
| `sub` (Email) | `email` | direkter Mapping |
| `sv_id` | `sub` (User-UUID) | optionaler Sekundär-ID |
| `plan` | n/a | aus DB-Lookup oder leer lassen |
| `iat` | `iat` | direkter Mapping |
| `exp` | `exp` | direkter Mapping |
| `verified` | `aud === 'authenticated'` | Marker |
| (neu) `_source` | `'supabase'` vs `'hmac'` | Debugging-Marker |

---

## E. ENV-Vars Status

### Aktuell in Netlify-Function-Code referenziert

```
AUTH_HMAC_SECRET ← bestehend, für PROVA-HMAC-Token
AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_SV, etc. ← bestehend
OPENAI_API_KEY, STRIPE_*, MAKE_*, IONOS_SMTP_*, PDFMONKEY_* ← bestehend
TEAM_INTEREST_SECRET, TERMIN_REMINDER_SECRET ← bestehend
```

### FEHLEND für Option C (Phase 1.5 KORRIGIERT)

| ENV | Wert | Verwendung |
|---|---|---|
| **`SUPABASE_URL`** | `https://cngteblrbpwsyypexjrv.supabase.co` | Für `iss`-Validation (`SUPABASE_URL + '/auth/v1'`) |
| **`SUPABASE_JWKS_URL`** | `https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json` | Für Public-Key-Fetch in `createRemoteJWKSet` |

**Verworfen:**
- ~~`SUPABASE_JWT_SECRET`~~ — falsche Strategie, das Projekt nutzt asymmetric ES256, kein HS256-Symmetric mehr.

**Optional (nicht zwingend, nicht in Scope):**
- `SUPABASE_ANON_KEY` — Frontend-side, nicht für Server-JWT-Verify
- `SUPABASE_SERVICE_ROLE_KEY` — nur für Edge-Functions-Direct-Pattern (nicht unsere Strategie)

### Marcel-Action vor Phase 2

**Schritt A — `jose` installieren** (einmalig, im Repo-Root):
```bash
npm install jose
git add package.json package-lock.json
git commit -m "deps: jose for Supabase-JWT-Verify (Option C)"
```

**Schritt B — ENV in Netlify-UI** → Site Settings → Environment Variables:
1. **`SUPABASE_URL`** = `https://cngteblrbpwsyypexjrv.supabase.co`
2. **`SUPABASE_JWKS_URL`** = `https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json`

**JWKS-URL Live-Test (jetzt erfolgt, ✓):**
```bash
$ curl https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json
{"keys":[{"alg":"ES256","crv":"P-256",...,"kid":"a3d72a1f-...","kty":"EC","use":"sig",...}]}
```
1 aktiver Public-Key, Rotation-Phase clean. JWKS-Endpoint reagiert in <100ms.

---

## F. Migrations-Plan

### Schritt 0 — `npm install jose` (Marcel macht einmalig, ~1 min)

Im Repo-Root, ergänzt `dependencies` in `package.json`. Netlify-Functions teilen Root-`package.json` (kein separates `netlify/functions/package.json` vorhanden — verifiziert).

### Schritt 1 — `netlify/functions/lib/supabase-jwt.js` NEU (10 min)

Neue Helper-Datei mit `jose`-JWKS-Pattern, ~30 Zeilen Code:

```js
// netlify/functions/lib/supabase-jwt.js
'use strict';

const { jwtVerify, createRemoteJWKSet } = require('jose');

let _jwks = null;
function getJWKS() {
    if (_jwks) return _jwks;
    const url = process.env.SUPABASE_JWKS_URL;
    if (!url) {
        const e = new Error('SUPABASE_JWKS_URL fehlt');
        e.code = 'NO_JWKS_URL';
        throw e;
    }
    // jose's createRemoteJWKSet hat eingebauten Cache (default cooldownDuration 30s,
    // cacheMaxAge 10min). JWKS wird beim ersten verify() lazy-geladen, dann gecacht.
    _jwks = createRemoteJWKSet(new URL(url));
    return _jwks;
}

exports.verify = async function (token) {
    if (!token || typeof token !== 'string') return null;
    if (token.split('.').length !== 3) return null;   // kein JWT-Format

    let JWKS;
    try { JWKS = getJWKS(); }
    catch (e) { return null; }   // Server-Misconfig → caller behandelt als 401

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: process.env.SUPABASE_URL + '/auth/v1',
            audience: 'authenticated',
            algorithms: ['ES256']
        });
        if (!payload || !payload.email) return null;
        return payload;
    } catch (e) {
        // expired, invalid sig, malformed, key rotation, audience mismatch
        return null;
    }
};
```

### Schritt 2 — `lib/auth-resolve.js getTokenPayload()` ASYNC erweitern (15 min)

**WICHTIG:** `jwtVerify` ist async. `getTokenPayload` und `resolveUser` müssen async werden. Alle Aufrufer ergänzen `await`.

```js
// alt (sync):
function getTokenPayload(event) {
    let tok = ... extract ...;
    if (!tok) return null;
    try { return T.verify(tok); } catch (e) { return null; }
}

// neu (async):
const SupabaseJWT = require('./supabase-jwt');

async function getTokenPayload(event) {
    let tok = ... extract ...;
    if (!tok) return null;
    const parts = tok.split('.');

    // 1) PROVA-HMAC-Token (Format: head.sig — 2 Teile, sync verify)
    if (parts.length === 2) {
        try {
            const p = T.verify(tok);
            if (p) return Object.assign({}, p, { _source: 'hmac' });
        } catch (e) {}
        return null;
    }

    // 2) Supabase-JWT (Format: head.payload.sig — 3 Teile, async verify via jose)
    if (parts.length === 3) {
        const sp = await SupabaseJWT.verify(tok);
        if (sp) {
            return {
                sub: String(sp.email).toLowerCase(),     // PROVA: sub = Email (lowercase)
                sv_id: sp.sub,                            // Supabase-UUID
                plan: 'unknown',                          // optional, aus DB falls nötig
                verified: true,
                iat: sp.iat,
                exp: sp.exp,
                _source: 'supabase'
            };
        }
    }

    return null;
}

async function resolveUser(event) {
    const tokenPayload = await getTokenPayload(event);
    // ... rest unchanged ...
}
```

### Schritt 2b — Alle Aufrufer auf `await` umstellen (10 min)

Aufrufer-Map von `resolveUser`:

| Datei | Aktuell | Neu |
|---|---|---|
| `netlify/functions/lib/jwt-middleware.js` Zeile 51 | `const u = resolveUser(event);` | `const u = await resolveUser(event);` |
| `netlify/functions/airtable.js` Zeile 91 | `return resolveUser(event).email;` | `return (await resolveUser(event)).email;` (Function muss async sein → ist es schon, da im async-Handler) |
| `netlify/functions/airtable.js` Zeile 254 | `const userInfo = resolveUser(event);` | `const userInfo = await resolveUser(event);` |
| `netlify/functions/make-proxy.js` Zeile ~45-46 | `resolveUser(event).email` | `(await resolveUser(event)).email` |

`requireAuth(handler)` in jwt-middleware.js ist schon async-Handler-Wrapper, Aufruf von `resolveUser` muss `await` bekommen. Alle `requireAuth`-geschützten Functions sind nicht betroffen — sie bekommen `context.user` direkt.

### Schritt 3 — `lib/auth-guard.js writeLegacyBridge` umstellen (10 min)

Statt fake bridge-token: nehme den ECHTEN Supabase-`access_token` und schreibe ihn in `prova_auth_token`. Beim Server-Roundtrip via prova-fetch-auth wird er via `Authorization: Bearer ...` gesendet, und `auth-resolve.js` versteht ihn jetzt.

```js
export function writeLegacyBridge(user, session) {
    // session ist optional — falls vorhanden, nutze access_token
    const accessToken = session && session.access_token;
    if (!accessToken) {
        // Fallback: format-valid Token wie bisher (für nicht-Server-Routen)
        // Code wie aktuell
        return;
    }
    try {
        localStorage.setItem('prova_auth_token', accessToken);   // ECHTER Supabase-JWT
        localStorage.setItem('prova_sv_email', user.email);
        localStorage.setItem('prova_user', JSON.stringify({email: user.email, id: user.id, bridge: true}));
        localStorage.setItem('prova_last_activity', String(Date.now()));
    } catch (e) {}
}
```

Plus `runAuthGuard()` muss `session` an `writeLegacyBridge(user, session)` weiterreichen.

### Schritt 4 — `auth-supabase-logic.js handleLogin` anpassen (5 min)

`writeLegacyBridge(data.user, data.session)` mit Session aufrufen (statt nur user).

### Schritt 5 — `prova-fetch-auth.js` Defense-in-Depth (10 min)

- 401-Auto-Logout-Trigger lockern: nicht aggressiv ausloggen wenn Token ein JWT (3 Teile) ist und der Server-Verify möglicherweise wegen ENV-Misconfig failed
- Alternativ: bei `?reason=token_expired` einen einmaligen Cooldown setzen damit kein Loop entsteht

### Schritt 6 — `sw.js` v248 → v249 (1 min)

### Schritt 7 — Smoke-Test-Erweiterung (10 min)

Fügen einen Headless-curl-Test hinzu der mit synthetischem JWT (signed mit Secret) eine Function aufruft und 200 erwartet.

### Aufwand-Summary (Phase 1.5 KORRIGIERT)

| Schritt | Zeit |
|---|---:|
| 0. `npm install jose` (Marcel manuell) | 1 |
| 1. supabase-jwt.js neu (jose-JWKS-Pattern) | 10 |
| 2. auth-resolve.js getTokenPayload async + erweitern | 15 |
| 2b. Aufrufer auf `await` umstellen (jwt-middleware, airtable, make-proxy) | 10 |
| 3. lib/auth-guard.js writeLegacyBridge | 10 |
| 4. auth-supabase-logic.js handleLogin | 5 |
| 5. prova-fetch-auth.js Defense | 10 |
| 6. sw.js Bump | 1 |
| 7. Smoke-Test mit synthetic-JWT | 10 |
| 8. Test + Deploy + Marcel-Verify | 15 |
| **Total** | **~85-90 min** |

**Plus:** Marcel-Action vor Phase 2 — `npm install jose` + 2 ENV-Vars in Netlify-UI.

---

## G. Risiko-Bewertung

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| `SUPABASE_JWKS_URL` / `SUPABASE_URL` nicht gesetzt | mittel | hoch | `getJWKS()` throw, `verify()` returnt null → Caller bekommt 401. PROVA-HMAC-Pfad (2-Teiler) bleibt funktional für Legacy-Login-Flow. **Marcel muss ENV setzen vor Deploy.** |
| `npm install jose` schlägt fehl | niedrig | hoch | jose ist battle-tested (~5M weekly downloads). Falls trotzdem: Fallback auf eigene ES256-Verify-Implementation mit Node `crypto.verify()` + JWKS-Manual-Fetch (~80 LOC zusätzlich, +1h Aufwand). |
| Cold-Start +50-100ms beim ersten Request einer Function-Instanz | sicher | niedrig | Netlify-Functions cold-starten oft. JWKS-Fetch ist parallel zu Function-Init nutzbar. Bei Need: Pre-Warm via jose's `cooldownDuration` config. Akzeptabel — User sieht das nicht (initialer Page-Load hat eh mehrere Functions). |
| Supabase rotiert ECC-Public-Key | niedrig | mittel | jose's `createRemoteJWKSet` macht automatischen Background-Refresh (default 10min Cache + cooldownDuration 30s). Token mit altem Key während Übergangs-Window: jose probiert alle JWKS-Keys. Saubere Rotation. |
| Async-Migration bricht Edge-Cases in resolveUser-Aufrufern | mittel | mittel | Sorgfältige `await`-Anpassung in jwt-middleware.js + airtable.js + make-proxy.js. Smoke-Test fängt 401-Regressionen ab. |
| Token-Refresh: alter JWT in localStorage, neuer JWT erst beim nächsten Login | niedrig | niedrig | `watchAuthState SIGNED_IN/TOKEN_REFRESHED` schreibt bei jedem Refresh den neuen `access_token` rein. |
| `airtable.js` User-Filter mit `sv_email` | niedrig | hoch wenn falsch | Supabase-JWT `email` wird auf `sub` gemappt (lowercase). Filter kompatibel. |
| `_userEmail`-Mismatch (Defense-in-Depth) bricht | niedrig | mittel | Mismatch-Logik bleibt wie bisher (Token-sub vs body-`_userEmail`). Bridge-Flow füllt sv_email aus session.user.email — konsistent. |
| Logic-Files nutzen `prova_user.<irgendein-Feld>` das Bridge nicht setzt | mittel | niedrig | Bridge-Schema minimal: `{email, id, bridge:true}`. Falls Logic-File mehr braucht: undefined-Read → defensives Fallback. Marcel meldet pro Page bei FAIL. |
| `prova-fetch-auth.js` 401 → Auto-Logout (alter Bug) | hoch (wenn JWT-Verify failed) | hoch | Defense-in-Depth Schritt 5 |
| Service-Worker cached alte `auth-resolve.js` | n/a | n/a | Server-Side Code nicht im SW. Nur Frontend-Files (lib/auth-guard.js etc.) im APP_SHELL — durch sw.js v249 invalidiert. |
| `jose` Version-Bump bricht API | niedrig | mittel | Pin auf `jose@^5` (stabile Major). Breaking-Changes nur in Major-Versionen. |

---

## H. Test-Strategie

### Pre-Deploy

```bash
node --check netlify/functions/lib/supabase-jwt.js
node --check netlify/functions/lib/auth-resolve.js
node --check lib/auth-guard.js
node --check auth-supabase-logic.js
node --check prova-fetch-auth.js
bash scripts/smoke-test-cutover.sh   # 15/15 PASS bleiben
```

### Headless-Auth-Test (neu in smoke-test-cutover.sh)

**Bei asymmetric ES256 können wir KEINEN synthetic Token client-side signieren** (Supabase hat den private ECC-Key, wir nicht). Test-Strategie statt synthetic:

**Variante A — Live-Login-Test mit echtem User** (post-Phase-2 manuell durch Marcel):
```bash
# Nach Login mit marcel.schreiber@prova-systems.de:
# DevTools-Console:
const sess = JSON.parse(localStorage.getItem('prova-auth-token'));
const jwt = sess.access_token;
console.log('JWT 3-Teiler:', jwt.split('.').length === 3);

# Dann curl test:
curl -i -X POST https://app.prova-systems.de/.netlify/functions/airtable \
     -H "Authorization: Bearer <JWT-aus-Console>" \
     -H "Content-Type: application/json" \
     -d '{"method":"GET","path":"/v0/.../tbl...?maxRecords=1"}'
# Expect: 200 OK (oder 4xx von Airtable bei Filter-Issue, aber NICHT 401 von auth-resolve)
```

**Variante B — Negativ-Test mit Garbage-Token** (jeder kann ausführen):
```bash
curl -i -X POST https://app.prova-systems.de/.netlify/functions/airtable \
     -H "Authorization: Bearer eyJhbGciOiJFUzI1NiJ9.garbage.signature" \
     -H "Content-Type: application/json" \
     -d '{"method":"GET","path":"/v0/.../tbl..."}'
# Expect: 401 (verify failed → null → 401 von requireAuth)
```

Variante B ist im automatisierten Smoke-Test machbar.

### Marcel-Live-Test (manuell)

1. localStorage clearen + Inkognito
2. /dashboard → /login → Login
3. Erwartet: stabiles Dashboard, **kein** `?reason=token_expired`
4. DevTools → Network: `airtable`-Call returned 200 (von Airtable, oder 4xx von Airtable bei Filter-Issue, aber NICHT 401 von Auth-Layer)
5. DevTools → Local Storage: `prova_auth_token` enthält **echten Supabase-JWT** (3-Teiler `header.payload.sig`, NICHT mehr `.bridge-supabase-`)

---

## Summary

- **23 Functions mit `requireAuth`** + **2 Functions mit `resolveUser`-direkt** = **25 Functions automatisch migriert** durch 1-File-Edit in `lib/auth-resolve.js`.
- **3 neue Files** insgesamt (1 Server `lib/supabase-jwt.js`, 0 neue Frontend-Files — nur Edits) + **5 bestehende Files** angepasst.
- **2 ENV-Vars** müssen Marcel in Netlify ergänzen: `SUPABASE_URL` + **`SUPABASE_JWT_SECRET`** (kritisch).
- **Geschätzter Aufwand:** ~80 Min Code + 15 Min Test = **95 Min total**.
- **Risiko:** mittel-niedrig. Hauptsächlich ENV-Konfig + Edge-Cases bei alten Bridge-Tokens in fortlaufenden Sessions (sw.js v249 invalidiert Cache).

---

## Marcel-Frage (Phase 1.5 KORRIGIERT)

**Bestätige aktualisierten Plan? Soll ich Phase 2 starten?**

**Marcel-Action vor Phase 2 (~3 min):**
1. **`npm install jose`** im Repo-Root → `package.json` + `package-lock.json` updaten
2. **`SUPABASE_URL`** in Netlify-UI: `https://cngteblrbpwsyypexjrv.supabase.co`
3. **`SUPABASE_JWKS_URL`** in Netlify-UI: `https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json`

**Phase 2 von mir (~85-90 min):**
1. Branch `fix/option-c-supabase-jwt-server` von main
2. Schritt 1-7 (Code) als 1-2 Commits
3. Push + Smoke-Test (mit garbage-JWT-Negativ-Test) → 15/15 PASS
4. Merge in main + Deploy-Polling auf v249
5. Marcel-Live-Login-Test (Schritt-Plan im Doc)

Falls **`npm install jose` Probleme macht**: Fallback Plan B mit eigener ES256-Verify-Implementation (~1h zusätzlich) — aber sehr unwahrscheinlich, jose ist Industry-Standard.

Falls **ENV-Vars nicht jetzt setzbar:** Phase 2 startet, Code wird gepusht, aber **NICHT in main gemerged**. Marcel setzt ENV, dann mergen wir.

---

## Phase 1.5 Änderungs-Summary

| Bereich | Phase 1 | Phase 1.5 (KORRIGIERT) |
|---|---|---|
| **JWT-Verify-Methode** | HS256 symmetric (HMAC) | **ES256 asymmetric (JWKS)** |
| **ENV-Vars** | `SUPABASE_JWT_SECRET` | **`SUPABASE_JWKS_URL`** + `SUPABASE_URL` |
| **npm-Package** | keins | **`jose@^5`** |
| **Verify-Latenz** | 0ms (sync) | +50-100ms cold-start, dann 0ms (gecacht) |
| **`getTokenPayload`-Signatur** | sync | **async** |
| **Aufrufer betroffen (await)** | keine | jwt-middleware, airtable, make-proxy |
| **Code-Aufwand** | ~80 min | **~85-90 min** |
| **Synthetic-JWT-Test möglich** | ja (gleicher Secret) | nein (Server hat private Key) — Negativ-Test mit Garbage-JWT statt |

---

*Inventur abgeschlossen 01.05.2026 morgens · Phase 1.5-Update ~10:00 · KEIN Code-Change · KEIN Commit · wartet auf Marcel-OK*
