# TOKEN-EXPIRED-BUG — Diagnose

**Datum:** 01.05.2026 morgens
**Status:** ROOT-CAUSE identifiziert · KEIN Fix angewendet
**Symptom:** Login → Dashboard rendert ~1s → Redirect zurück zu `/login?reason=token_expired` (kein Endlos-Loop)

---

## TL;DR

Der Loop ist eliminiert, aber jetzt schlägt **Server-side HMAC-Verify** fehl. Der Bridge-Token aus `lib/auth-guard.js writeLegacyBridge()` ist client-side Format-valid (verifyProvaToken im Legacy-`auth-guard.js` macht nur Format-Check), aber **server-side macht `lib/auth-token.js verify()` echte HMAC-Verify mit `crypto.createHmac(ALG, secret)`**. Der „Signature"-Teil unseres Bridge-Tokens (`.bridge-supabase-<uuid>`) ist Müll-Bytes, kein HMAC — Verify failed → Function liefert 401 → `prova-fetch-auth.js clearAuthAndRedirect()` clearet Auth + Redirect zu `/login?reason=token_expired`.

Das war in `LOGIN-LOOP-SOLUTION.md` Risiko-Sektion erwähnt:
> Bridge-Token client-side gültig, server-side ungültig — mittel — „Falls einzelner Endpunkt 401, nicht-blocker (Marcel meldet pro Page)."

War zu optimistisch: `prova-status-hydrate.js` ruft `airtable`-Function automatisch beim Page-Load von dashboard.html auf, ohne Marcel-Klick. Damit ist 401 sofort und unvermeidlich.

---

## Bug-Trace (Schritt für Schritt)

```
Marcel logt ein auf /login
   ↓ supabase.auth.signInWithPassword OK
   ↓ writeLegacyBridge(user)  → schreibt prova_auth_token = "base64(payload).bridge-supabase-<id>"
   ↓ window.location.href = '/dashboard'
   ↓
/dashboard lädt
   ↓ Inline-IIFE-Pre-Check: prova_auth_token + prova_sv_email da → OK
   ↓ Page rendert (Marcel sieht Dashboard ~1s)
   ↓
prova-status-hydrate.js DOMContentLoaded läuft (Zeile 104):
   ↓ provaFetch('/.netlify/functions/airtable', { method:'POST', headers:{Authorization: 'Bearer <bridge-token>'} })
   ↓
Netlify-Function /airtable (oder Wrapper) ruft AuthToken.verify(token):
   ↓ lib/auth-token.js verify():
   ↓   crypto.createHmac(ALG, AUTH_HMAC_SECRET).update(head).digest()
   ↓   timingSafeEqual(received, expected)  ← BRIDGE-TOKEN.SIG ≠ ECHTER HMAC
   ↓   return null
   ↓
Function returns 401 { valid: false, error: 'invalid or expired' }
   ↓
prova-fetch-auth.js Zeile 100-102:
   ↓ if (res.status === 401 && isFunctionUrl(url)) clearAuthAndRedirect();
   ↓
clearAuthAndRedirect (Zeile 56-69):
   ↓ localStorage.removeItem(prova_auth_token)
   ↓ localStorage.removeItem(prova_user)
   ↓ localStorage.removeItem(prova_session_v2)
   ↓ localStorage.setItem('prova_logout_grund', 'token_expired')
   ↓ window.location.replace('/app-login.html?reason=token_expired')
   ↓
netlify.toml redirect: /app-login.html → 301 → /login
   ↓
/login?reason=token_expired
```

**Kein Endlos-Loop**, weil bei nächstem Login zwar wieder die Bridge-Token gesetzt wird, aber `clearAuthAndRedirect()` nur EINMAL pro 401 firet — User landet auf /login und sieht den Banner.

---

## Bug-Quelle

### `prova-fetch-auth.js` Zeile 56-67

```js
function clearAuthAndRedirect() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('prova_user');
      localStorage.removeItem('prova_session_v2');
    } catch (e) {}
    var page = (window.location && window.location.pathname || '').split('/').pop();
    var publicPages = ['app-login.html', 'app-register.html', 'admin-login.html', 'index.html', ''];
    if (publicPages.indexOf(page) === -1) {
      try { localStorage.setItem('prova_logout_grund', 'token_expired'); } catch (e) {}
      window.location.replace('/app-login.html?reason=token_expired');     // ← der Redirect
    }
  }
```

Diese Funktion wird in Zeile 100-102 aufgerufen wenn ANY Function-Call HTTP 401 liefert.

### Auslöser auf Dashboard

`prova-status-hydrate.js` Zeile 104:
```js
provaFetch('/.netlify/functions/airtable', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ method: 'GET', path: path })
})
```

Wird in `DOMContentLoaded` ausgeführt — automatisch bei Page-Load, kein User-Klick nötig. Hydriert SV-Daten in den Page-Header (Email-Anzeige, Profil-Avatar).

### Server-Side HMAC-Verify

`netlify/functions/lib/auth-token.js verify()`:
```js
const expected = crypto.createHmac(ALG, secret).update(head).digest();
let received;
try { received = fromB64url(sig); } catch (e) { return null; }
if (received.length !== expected.length) return null;
if (!crypto.timingSafeEqual(received, expected)) return null;
```

Bridge-Token-Signature = String `bridge-supabase-<UUID>` (Marker-String, kein Base64URL-encodet HMAC). `fromB64url(sig)` returns evtl. nicht-mal-fehler aber definitiv nicht das gleiche wie `crypto.createHmac().digest()`. **timingSafeEqual returns false → null → 401.**

---

## Welche Functions sind betroffen?

11 Functions werden via `provaFetch` aus `*-logic.js` Files aufgerufen:

```
/.netlify/functions/airtable          ← prova-status-hydrate, viele -logic Files
/.netlify/functions/akte-export
/.netlify/functions/auth-token-issue  ← Login (relevant: nutzt KEIN HMAC-Auth)
/.netlify/functions/foto-anlage-pdf
/.netlify/functions/ki-proxy
/.netlify/functions/ki-statistik
/.netlify/functions/make-proxy
/.netlify/functions/normen-picker
/.netlify/functions/provision-sv
/.netlify/functions/smtp-senden
/.netlify/functions/stripe-checkout
```

Alle (außer `auth-token-issue` selbst) machen HMAC-Verify mit echter Signature → 401 für Bridge-Token.

---

## Lösungs-Optionen

### Option A — Server-Side Bridge: `auth-token-issue` Supabase-JWT-Pfad ⭐ EMPFEHLUNG

Erweitere `netlify/functions/auth-token-issue.js` um einen NEUEN Code-Pfad:
- Input: `POST { supabase_jwt }` (statt {email, password})
- Function verifiziert JWT gegen Supabase via `supabaseAdmin.auth.getUser(jwt)` (nutzt SUPABASE_SERVICE_ROLE_KEY env)
- Bei Success: ECHTEN HMAC-Token mit `AuthToken.sign({sub:email, ...})` ausstellen
- Output: `{ token, sv }` wie im normalen Pfad

Client-Seite (`auth-supabase-logic.js handleLogin()`):
- Nach erfolgreichem Supabase-Login einen POST zu `/.netlify/functions/auth-token-issue` mit `{ supabase_jwt: data.session.access_token }`
- Response-Token in `localStorage.prova_auth_token` schreiben (überschreibt Bridge-Token)
- Dann normaler Redirect zu /dashboard

**Pros:**
- Token ist server-side ECHT HMAC-validiert
- Alle 11 Legacy-Functions akzeptieren ihn ohne Änderung
- Architektur sauber (Server-Auth-Authority)
- Bridge-Layer in `lib/auth-guard.js` kann für alle anderen Bridges-Keys (sv_email, prova_user etc.) bleiben

**Cons:**
- +1 Roundtrip beim Login (~100-300ms)
- Function muss SUPABASE_SERVICE_ROLE_KEY haben (sollte schon, da Edge-Functions das nutzen — aber Netlify-Function-ENV ist separat von Supabase-Edge-Function-ENV)
- Modifikation einer Production-Function — Risiko bestehende Pfade zu brechen → klein wenn Bridge-Pfad isoliert hinzugefügt wird

**Aufwand:** ~30 min Code + 10 min Test

### Option B — `prova-fetch-auth.js` 401-Auto-Logout deaktivieren bei Bridge-Token

Wenn Token-Marker `.bridge-supabase-` enthält, NICHT 401 als „expired" behandeln:

```js
function clearAuthAndRedirect() {
    var tok = getToken();
    // Bridge-Token (Cutover Block 3): nicht auto-logout, nur warn
    if (tok && tok.indexOf('.bridge-supabase-') !== -1) {
        console.warn('[prova-fetch] 401 mit Bridge-Token — Functions ignoriert, kein Logout');
        return;
    }
    // ... bisheriger Code
}
```

**Pros:**
- 1-File-Edit, super-minimal
- User bleibt eingeloggt

**Cons:**
- Function-Calls failen still (status-hydrate failed → keine SV-Daten in nav.js)
- prova-status-hydrate verzögert nicht-fatal, aber andere Functions (akte-export, ki-proxy etc.) failen ohne User-Feedback
- Quick-Fix, keine Server-Side-Auth — bei Pilot-Use-Case riskant
- User sieht später random "Speichern fehlgeschlagen" oder ähnliches

### Option C — Alle Logic-File-`provaFetch`-Calls auf Supabase-Edge-Functions umstellen

Architektonisch sauber, aber MASSIV — 11 Functions × N Logic-Files = ~50+ Code-Stellen.

**Pros:**
- Vollständige Architektur-Einheit
- Bridge-Layer wird obsolet

**Cons:**
- Sprint-Scope ist riesig
- Edge-Functions-Pendants existieren teilweise noch nicht (z.B. `airtable` Edge Function)
- Marcel ist gerade gesperrt — braucht JETZT Fix

### Option D — `prova-status-hydrate.js` direkt ausschalten

Status-Hydrate ist nur SV-Profil-Anzeige in der Navbar — nicht kritisch. Wenn ich es deaktiviere, schweigt der eine 401-Ausläufer.

```js
// prova-status-hydrate.js Zeile X — disable while bridge-token active
const tok = localStorage.getItem('prova_auth_token') || '';
if (tok.indexOf('.bridge-supabase-') !== -1) {
    console.info('[StatusHydrate] Bridge-Token aktiv — Hydrate ueberspringe');
    return;
}
```

**Pros:**
- Sehr lokal
- User-Experience: SV-Email-Anzeige fehlt, aber Login klappt

**Cons:**
- Andere `provaFetch`-Caller könnten auch fired (akte-logic, archiv-logic etc.) → next 401 → Redirect → Loop wieder da
- Whack-a-mole pro Logic-File

---

## Empfehlung

**Option A — Server-Side Bridge via auth-token-issue Erweiterung.**

Saubere architektonische Lösung in einem 30-Min-Hotfix:
1. `auth-token-issue.js` neuer Code-Pfad: nimmt Supabase-JWT entgegen, verifiziert ihn server-side, gibt echten HMAC-Token aus
2. `auth-supabase-logic.js handleLogin()` ruft die Function nach Supabase-Login auf, ersetzt Bridge-Token mit echtem
3. Alle 11 Legacy-Functions akzeptieren den echten Token sofort
4. Bridge-Layer in `lib/auth-guard.js` bleibt für alle anderen Legacy-Keys (sv_email, prova_user) — die sind kein Problem

Option B als **Defense-in-Depth-Layer** zusätzlich (1-Zeile-Check in `prova-fetch-auth.js`): falls Server-Side-Bridge mal failed (Function-Call timeout etc.), kein Auto-Logout durch 401. Banner statt Redirect.

---

## Files-Liste für Option A

| Datei | Änderung | Aufwand |
|---|---|---|
| `netlify/functions/auth-token-issue.js` | + Code-Pfad `body.supabase_jwt` → Supabase-Admin-Verify → AuthToken.sign() | ~15 min |
| `auth-supabase-logic.js` | `handleLogin()` Aufruf zu `auth-token-issue` mit Supabase-JWT, Token in `prova_auth_token` schreiben (ersetzt Bridge) | ~5 min |
| `lib/auth-guard.js writeLegacyBridge()` | Comment-Update: Bridge-Token jetzt nur Fallback wenn Server-Issue failed | ~2 min |
| `prova-fetch-auth.js` | + Defense-in-Depth: bridge-suffix → kein Auto-Logout (Option B als Safety-Net) | ~3 min |
| `sw.js` | CACHE_VERSION v248 → v249 | ~1 min |
| `docs/diagnose/TOKEN-EXPIRED-BUG.md` | Diese Datei mit committen | ~0 |

**Total: ~30 min Code + 10 min Test = 40 min.**

---

## ENV-Voraussetzung

`auth-token-issue.js` braucht `SUPABASE_SERVICE_ROLE_KEY` als Netlify-Function-ENV. Schon vorhanden für andere Functions (Edge-Functions wie X3, X4 nutzen es). Marcel muss bestätigen ob es auch in Netlify-Function-Scope verfügbar ist (Supabase-Edge ≠ Netlify-Function-Pool — separate ENV-Trees).

Falls ENV fehlt: Option B als Notfall, später ENV setzen + Option A nachziehen.

---

## Test-Plan

### Pre-Deploy
- `node --check auth-supabase-logic.js`
- `node --check netlify/functions/auth-token-issue.js`
- Smoke-Test 15/15 PASS muss bleiben (URL-Routing nicht betroffen)

### Post-Deploy (Marcel manuell)
1. localStorage clear + Inkognito-Tab
2. /dashboard → /login?next=/dashboard
3. Login mit `marcel.schreiber@prova-systems.de`
4. Erwartung: Single-Redirect zu /dashboard, Page **stabil**
5. DevTools Network-Tab: `auth-token-issue` POST = 200, Response enthält Token
6. DevTools Application → Local Storage:
   - `prova_auth_token` enthält **KEINEN** `.bridge-supabase-`-Marker mehr (echter HMAC-Token)
7. Reload /dashboard: bleibt stabil, kein Logout
8. Status-Hydrate (nav.js User-Menü): SV-Email-Anzeige funktioniert (Airtable-Function returns 200)

---

## Marcel-Frage

**Soll ich Phase 4 (Fix) starten? Welche Option?**

Empfehlung: **Option A + Option B als Safety-Net** (siehe Files-Liste oben, ~40 Min total). Eine ENV-Question müssen wir vorher klären (`SUPABASE_SERVICE_ROLE_KEY` in Netlify-Function-Scope).

Falls SERVICE_ROLE_KEY nicht in Netlify-Function-Scope verfügbar:
- Variante A1: ENV in Netlify-UI ergänzen (manueller Click, ~1 min) und dann Option A
- Variante A2: Function nutzt stattdessen das öffentliche JWKS-URL von Supabase (`https://<project>.supabase.co/auth/v1/.well-known/jwks.json`) und verifiziert JWT mit `jose` package — kein SERVICE_ROLE_KEY nötig, aber +1 npm-Dependency

---

*Diagnose-Doc erstellt 01.05.2026 morgens · KEIN Code-Change · KEIN Commit · wartet auf Marcel-OK*
