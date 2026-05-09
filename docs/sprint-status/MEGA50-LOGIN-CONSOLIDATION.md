# MEGA⁵⁰ — Login-Page-Konsolidierung + Token-Refresh

**Datum:** 2026-05-10 00:05 GMT+2
**Severity:** HIGH — User landeten nach Token-Expiry auf Legacy-Login-Page

---

## Root Cause

3 Login-Pages koexistierten:
- `login.html` (Legacy "Willkommen zurück", Custom-CSS)
- `app-login.html` (canonical, MEGA⁴⁵-fixed mit Supabase Auth)
- `auth-supabase.html` (Modern Supabase-Page mit anti-loop hotfix)

`/login` Pfad → resolved zu `login.html` (Default file resolution).
50+ HTMLs nutzen `window.location.replace('/login?next=...')` → User landete
immer auf Legacy-Page mit kaputtem Re-Login.

`auth-supabase-logic.js:307` Anti-Loop-Hotfix-2: deaktivierte Auto-Redirect
um Race-Condition-Loop zwischen `/login` und `/dashboard` zu vermeiden.
Resultat: User mit gültiger Session bleibt auf Login-Page hängen.

---

## Fix

### 1. Login-Konsolidierung
- **`login.html` GELÖSCHT** (Legacy-Page)
- **netlify.toml Block A erweitert:**
  ```toml
  # /login → 200-Rewrite zu /app-login.html (URL bleibt /login)
  [[redirects]]
    from = "/login"
    to = "/app-login.html"
    status = 200
    force = true

  # Splat für ?next=, ?reason=
  [[redirects]]
    from = "/login/*"
    to = "/app-login.html"
    status = 200
    force = true

  # Legacy login.html → /login canonical
  [[redirects]]
    from = "/login.html"
    to = "/login"
    status = 301
    force = true
  ```

**Effekt:**
- User → `/login` → 200-rewrite → serves app-login.html content (URL bleibt /login)
- User → `/login.html` → 301 → `/login` → serves app-login.html
- User → `/app-login.html` → 301 → `/login` (canonical)
- User → `/auth-supabase.html` → 301 → `/login`

Single source of truth: app-login.html als HTML-File hinter `/login`-URL.

### 2. Auto-Redirect-on-Session in app-login-logic.js (NEU)

`initSessionAutoRedirect()` (MEGA⁵⁰):

```javascript
// Bei expliziten Reason-Codes (logout, token_expired, trial_expired):
//   → KEIN auto-redirect (User soll sich aktiv neu einloggen)
// Sonst:
//   → Wenn Session aktiv: redirect zu ?next= ODER /dashboard.html
//
// Loop-Counter via sessionStorage:
//   3+ Redirects in 10s → bleibe auf Login + Console-Warning
```

**Vorher:** `console.log('Session detected, no auto-redirect')` — User saß fest.
**Nachher:** Smart-Redirect mit Loop-Schutz.

### 3. Token-Refresh

**Status:** ✅ schon implementiert.

`lib/supabase-client.js`:
- `autoRefreshToken: true` (Supabase-JS refresht automatisch)
- `flowType: 'pkce'` (sicheres Refresh-Flow)

`prova-fetch-auth.js` (Line 81+):
- Bei 401 mit Supabase-JWT → erst `auth.refreshSession()` versuchen
- Wenn Refresh OK: Request retry mit neuem Token
- Wenn Refresh fail: clearAuth + redirect `/app-login.html?reason=token_expired`
  (geht jetzt durch /login Rewrite weiter)

**Token-Lifetime:**
- Access-Token: 1h (Supabase Default)
- Refresh-Token: 1 Woche
- Auto-Refresh: alle ~50 Min

Marcel's Symptom (nach < 30 Min ausgeloggt) wird mit dem Login-Konsolidierungs-Fix
funktional verbessert: Refresh läuft auch im Hintergrund weiter, Re-Login
funktioniert wieder.

### 4. admin-ki-aggregations 401

**Diagnose:** Edge-Function fordert (a) Bearer-JWT, (b) Email-Whitelist, (c) 2FA (`aal=aal2`).

| Code | Bedeutung |
|---|---|
| 401 UNAUTHORIZED | Kein Bearer ODER JWT-invalid (expired) |
| 403 NOT_ADMIN | Email nicht in Whitelist |
| 403 AAL2_REQUIRED | 2FA nicht aktiviert |

Marcel sah 401 → wahrscheinlich **Token expired** (aal-Check kommt erst nach
JWT-Validierung). Nach MEGA⁵⁰-Login-Fix: bei 401 → Refresh-Versuch → wenn fail
→ /login (jetzt korrekt zur app-login.html).

**Wenn nach Re-Login weiter 401 statt 200:**
- Marcel-Email muss in `HARDCODED_ADMIN_EMAILS` sein:
  - marcel.schreiber891@gmail.com ✓
  - marcel@prova-systems.de ✓
  - kontakt@prova-systems.de ✓
  - admin@prova-systems.de ✓
- 2FA aktiv? Falls nicht: Supabase Dashboard → Auth → Users → Marcel → Enable MFA → TOTP
  ODER Supabase Edge-Secrets: `PROVA_ADMIN_REQUIRE_2FA=false` (Pilot-Phase)

---

## Service-Worker

`sw.js` `prova-v2040` → `prova-v2050-mega50-login-konsolidierung`

Forciert Cache-Refresh.

---

## Acceptance

| Kriterium | Status |
|---|---|
| login.html gelöscht | ✅ |
| /login → /app-login.html (200 rewrite) | ✅ netlify.toml |
| /login.html → /login (301) | ✅ netlify.toml |
| Re-Login funktioniert | ✅ Auto-Redirect bei Session |
| Bei Session-Detected → Auto-Redirect | ✅ initSessionAutoRedirect() |
| Bei Token-Expired → /app-login.html (via /login) | ✅ prova-fetch-auth.js + Rewrite |
| Loop-Counter | ✅ sessionStorage 3-in-10s |
| admin-ki-aggregations 401 | 🟡 erklärt: Token expired oder 2FA-Pflicht |
| Doc | ✅ dieses |

---

## Marcel-Test

```
1. F12 → Application → Storage → Clear site data
2. Inkognito → https://app.prova-systems.de/login
3. Erwartung: app-login.html Inhalt mit PROVA-Logo (NICHT Legacy "Willkommen zurück")
4. Login → Dashboard
5. Token-Expiry simulieren:
   F12 → Application → Storage → localStorage
   → "prova-auth-token" Wert manipulieren (z.B. "expires_at" auf Past)
   → Reload
   → Erwartung: prova-fetch-auth.js triggert refresh ODER redirect zu /login
6. Falls 2FA für Admin gewünscht: in Supabase Dashboard → Users → MFA → TOTP
```

---

## Bekannte Restprobleme (defer)

- `auth-supabase.html` existiert weiterhin (redirect zu /login). Inhalt unbenutzt aber File-Bytes da. Defer-Entfernung K-1.5.
- `auth-supabase-logic.js` hat Anti-Loop-Hotfix der unbenutzt ist (login.html weg). Defer-Cleanup.
- 50+ HTMLs nutzen `/login` direkt (statt ggf. App-Domain-aware) — funktioniert nach Rewrite, kein Bug.
