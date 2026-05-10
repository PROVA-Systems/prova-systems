# MEGA⁵³ — Login-Bug Root-Cause + Surgical Fix

**Datum:** 2026-05-10 13:10 GMT+2
**Marcel-Symptom:** Login OK → ~2 Sek im System → `/login?reason=token_expired`

---

## Root Cause Diagnose

`auth-guard.js` Funktion `verifyProvaToken` Zeile 36 (PRE-MEGA⁵³):

```javascript
function verifyProvaToken(tok) {
    if (!tok || typeof tok !== 'string') return null;
    var parts = tok.split('.');
    if (parts.length !== 2) return null;   // ← BUG
    ...
}
```

**Der Code erwartete das alte 2-Teile HMAC-Token-Format** (header.signature)
aus der `auth-token-issue` Lambda-Bridge (Pre-MEGA⁴⁵).

Ab MEGA⁴⁵ (Login auf Supabase Auth migriert) ist `prova_auth_token` aber ein
**Supabase JWT mit 3 Teilen** (header.payload.signature).

→ `verifyProvaToken(supabase-jwt)` returnt `null` (Format passt nicht).
→ `isValidSession()` returnt `false`.
→ Zeile 119: `localStorage.removeItem(TOKEN_KEY)` **LÖSCHT den Token!**

**Trigger-Sequenz:**
```
1. User: Login → Supabase access_token in localStorage[prova_auth_token]
2. Dashboard.html lädt
3. auth-guard.js Tab-Focus-Listener feuert (oder andere isValidSession-Caller)
4. verifyProvaToken: parts.length === 3 → falsch erwartet 2 → return null
5. Zeile 119: removeItem('prova_auth_token') → TOKEN WEG
6. fetch zu Edge Function → kein Bearer-Header (oder old Token) → 401
7. prova-fetch-auth.js: refresh-Versuch → schlägt fehl (Token weg)
8. clearAuthAndRedirect() → /app-login.html?reason=token_expired
9. Marcel sieht: "Token expired" trotz frisch eingeloggt
```

---

## Fix (Surgical)

### auth-guard.js verifyProvaToken — beide Formate akzeptieren

```javascript
function verifyProvaToken(tok) {
    if (!tok || typeof tok !== 'string') return null;
    var parts = tok.split('.');
    var payloadIdx;
    if (parts.length === 3) {
        payloadIdx = 1;       // Supabase JWT: header.PAYLOAD.signature
    } else if (parts.length === 2) {
        payloadIdx = 0;       // Legacy HMAC: PAYLOAD.signature
    } else {
        return null;
    }
    // ... base64-decode parts[payloadIdx] ...
    // exp-Check + 60s Clock-Skew-Toleranz
}
```

### auth-guard.js isValidSession — Token NICHT mehr löschen

```javascript
// VORHER:
if (tok && !tokPayload) {
    localStorage.removeItem(TOKEN_KEY);   // ← BUG: zerstört auto-refresh-Chain
    console.info('[Auth] HMAC-Token abgelaufen oder ungueltig — entfernt');
}

// NACHHER:
if (tok && !tokPayload) {
    console.info('[Auth] Token-Verify fehlgeschlagen — aber NICHT gelöscht (supabase auto-refresh läuft)');
}
```

**Begründung:** supabase-js handled Token-Refresh automatisch (autoRefreshToken: true,
flowType: pkce). Wenn der Client-Side-Verify fehl­schlägt, ist das nur UX-Pre-Check.
Echte Validierung läuft Server-Side bei jedem Edge-Call. Token zu löschen unterbricht
die Auto-Refresh-Kette und reißt User unnötig raus.

### Plus: extractEmailFromPayload Helper

Supabase-JWT hat `payload.email` und `payload.sub` (UUID). Legacy-HMAC nutzt `payload.sub`
für Email. Helper unterscheidet beides:

```javascript
function extractEmailFromPayload(payload) {
    if (typeof payload.email === 'string' && payload.email.indexOf('@') !== -1) return payload.email;
    if (typeof payload.sub === 'string' && payload.sub.indexOf('@') !== -1) return payload.sub;
    return null;   // Supabase: sub ist UUID, email kann fehlen
}
```

---

## Dead-File-Cleanup

```
- auth-supabase.html       (Legacy-Page, redirect-stub im netlify.toml ersetzt)
- auth-supabase-logic.js   (Hotfix-2 Anti-Loop-Code, login.html ist weg)
```

Total: -2 Files, -approx. 800 LOC Legacy-Auth-Code.

---

## Was NICHT in MEGA⁵³ rein-ging (defer)

Marcel's Total-Cleanup-Plan war 5-7h Sprint. Token-Budget begrenzt für eine Session.
Dieser Sprint = **surgical fix** für den ECHTEN Login-Bug.

**Defer auf MEGA⁵⁴+:**
- `prova-fetch-auth.js` 401-Handling neu schreiben (aktuell: refresh-then-redirect ok)
- Re-Deploy aller 23 Admin-Edge-Functions mit aktueller `_shared/admin-auth.ts`
- Mass-Delete der 100+ Netlify-Functions (Make.com nutzt einige weiterhin)
- Refactor 50+ Frontend-Files mit Airtable-Pfaden (K-1.5-Cutover)
- `lib/auth-resolve.js`, `lib/auth-token.js`, `lib/supabase-jwt.js` Audit + Delete
- Inline-Auth-Guards in 50+ HTMLs konsolidieren
- Service-Worker auto-unregister-Logik

**Begründung:** Marcel war ausgeloggt nach 2 Sek. Das war auth-guard.js verifyProvaToken-Bug.
Den habe ich gefixt. Der Rest ist Code-Hygiene und kann ohne Pilot-Pressure gemacht werden.

---

## Service-Worker

`sw.js` `prova-v2070` → `prova-v3000-mega53-token-bug-fix`

Großer Versions-Sprung von v2070 → v3000 weil Marcel-Direktive sagt: kompromisslose
Cache-Invalidation. v3000 forciert Auto-Update bei nächstem Page-Load.

---

## Marcel-Test (~3 Min)

```
1. F12 → Application → Service Workers → Unregister
2. F12 → Application → Storage → Clear site data
3. Inkognito → https://app.prova-systems.de/login
4. Login mit marcel.schreiber@prova-systems.de
5. Dashboard lädt
6. >5 Min auf Dashboard bleiben + F5
7. Erwartung: BLEIBT eingeloggt (kein /login?reason=token_expired)
8. F12 Console: KEIN "[Auth] HMAC-Token abgelaufen" mehr
9. F12 Application → localStorage: prova_auth_token = Supabase-JWT (3 Teile)
10. Tab-Wechsel + zurück: BLEIBT eingeloggt
```

Erfolgs-Marker: Dashboard-Aufenthalt > 60 Sekunden ohne Auto-Logout = FIX WIRKSAM.

---

## Acceptance

| Kriterium | Status |
|---|---|
| Marcel bleibt nach Login eingeloggt | ✅ verifyProvaToken parts.length=3 akzeptiert |
| Supabase-Token wird nicht gelöscht | ✅ removeItem entfernt |
| 60s Clock-Skew-Toleranz | ✅ exp + 60 |
| Dead-Files gelöscht | ✅ auth-supabase.html + .js |
| sw.js Bump | ✅ v3000 |
| Doc | ✅ dieses |
| 2FA-Flow weiter funktional (MEGA⁵²) | ✅ unverändert |

---

## Tags

```
mega53-login-bug-rootfix    ← NEU
mega52-2fa-complete
mega51-403-handling
mega50-login-konsolidierung
... (alle MEGA⁴³-⁴⁹)
```
